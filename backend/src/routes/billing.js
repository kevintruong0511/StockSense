// Thanh toán QR tự động (MB Bank + SePay) và mã ưu đãi.
// Nguyên tắc: việc NÂNG GÓI chỉ xảy ra ở server sau khi đã xác thực (webhook API key /
// requireAuth). KHÔNG bao giờ tin client tự đặt gói.
import { Router } from 'express'
import crypto from 'crypto'
import { requireAuth } from '../auth.js'
import { config } from '../config.js'
import { pool, query } from '../db.js'
import { dailyLimit, effectivePlan } from '../billing/plans.js'
import { getUsage } from '../billing/usage.js'

const router = Router()
const PAID_PLANS = ['pro', 'ultra']

// Mã đơn = nội dung chuyển khoản. Chỉ chữ IN HOA + số để khớp regex webhook dễ dàng.
const genOrderCode = () => 'SS' + crypto.randomBytes(4).toString('hex').toUpperCase()

// Kích hoạt/gia hạn gói trả phí theo tháng (cộng dồn nếu còn hạn). Chạy trong 1 transaction:
// khoá đơn FOR UPDATE, kiểm tra pending + chưa hết hạn + đủ tiền, rồi mark paid + nâng gói.
async function settleOrder({ orderCode, amount, refCode }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      'SELECT * FROM payment_orders WHERE order_code = $1 FOR UPDATE',
      [orderCode],
    )
    const order = rows[0]
    if (!order) {
      await client.query('ROLLBACK')
      return { ok: false, reason: 'not_found' }
    }
    if (order.status === 'paid') {
      await client.query('ROLLBACK')
      return { ok: true, already: true, order } // idempotent
    }
    if (order.status !== 'pending') {
      await client.query('ROLLBACK')
      return { ok: false, reason: 'not_pending' }
    }
    if (new Date(order.expires_at).getTime() < Date.now()) {
      await client.query('ROLLBACK')
      return { ok: false, reason: 'expired' }
    }
    if (amount != null && Number(amount) < Number(order.amount)) {
      await client.query('ROLLBACK')
      return { ok: false, reason: 'amount_mismatch' }
    }
    await client.query(
      `UPDATE payment_orders SET status = 'paid', paid_at = now(), ref_code = $2 WHERE id = $1`,
      [order.id, refCode || null],
    )
    await client.query(
      `UPDATE users
         SET plan = $2,
             plan_expires_at = GREATEST(now(), COALESCE(plan_expires_at, now())) + ($3 || ' days')::interval
       WHERE id = $1`,
      [order.user_id, order.plan, String(config.billing.planDurationDays)],
    )
    await client.query('COMMIT')
    return { ok: true, order }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// GET /api/billing/status — gói hiện tại + hạn mức hôm nay (cho Sidebar / màn AI).
router.get('/status', requireAuth, async (req, res) => {
  try {
    const { rows } = await query('SELECT plan, plan_expires_at FROM users WHERE id = $1', [req.userId])
    const plan = effectivePlan(rows[0])
    const limit = dailyLimit(plan)
    const unlimited = limit === Infinity
    const used = await getUsage(req.userId)
    res.json({
      plan,
      planExpiresAt: rows[0]?.plan_expires_at ?? null,
      usage: {
        used,
        limit: unlimited ? null : limit,
        remaining: unlimited ? null : Math.max(0, limit - used),
        unlimited,
      },
    })
  } catch (err) {
    console.error('[billing:status]', err)
    res.status(500).json({ error: 'Lỗi máy chủ.' })
  }
})

// POST /api/billing/orders { plan, cycle } — tạo đơn + trả thông tin QR VietQR (SePay).
router.post('/orders', requireAuth, async (req, res) => {
  const plan = String(req.body?.plan || '').toLowerCase()
  const cycle = req.body?.cycle === 'annual' ? 'annual' : 'monthly'
  if (!PAID_PLANS.includes(plan)) {
    return res.status(400).json({ error: 'Gói không hợp lệ.' })
  }
  const amount = config.billing.prices[plan]
  const ttl = String(config.billing.orderTtlMinutes)

  try {
    let inserted
    for (let i = 0; i < 5; i++) {
      try {
        const { rows } = await query(
          `INSERT INTO payment_orders (user_id, plan, billing_cycle, amount, order_code, expires_at)
           VALUES ($1, $2, $3, $4, $5, now() + ($6 || ' minutes')::interval)
           RETURNING order_code, amount, expires_at`,
          [req.userId, plan, cycle, amount, genOrderCode(), ttl],
        )
        inserted = rows[0]
        break
      } catch (e) {
        if (e.code === '23505') continue // trùng order_code (hiếm) → thử lại
        throw e
      }
    }
    if (!inserted) return res.status(500).json({ error: 'Không tạo được đơn, vui lòng thử lại.' })

    const { bankAccount, bankCode, accountName } = config.billing
    // QR SePay: quét bằng app ngân hàng bất kỳ, tự điền số tiền + nội dung = order_code.
    const qrImageUrl =
      `https://qr.sepay.vn/img?acc=${encodeURIComponent(bankAccount)}` +
      `&bank=${encodeURIComponent(bankCode)}` +
      `&amount=${amount}&des=${encodeURIComponent(inserted.order_code)}`

    res.json({
      orderCode: inserted.order_code,
      amount: inserted.amount,
      content: inserted.order_code,
      bankAccount,
      bankName: bankCode,
      accountName,
      expiresAt: inserted.expires_at,
      qrImageUrl,
      mockPay: config.billing.allowMockPay, // báo frontend hiện nút test khi dev
    })
  } catch (err) {
    console.error('[billing:orders]', err)
    res.status(500).json({ error: 'Lỗi máy chủ.' })
  }
})

// GET /api/billing/orders/:code — frontend poll trạng thái (chỉ chủ đơn).
router.get('/orders/:code', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT order_code, plan, amount, status, expires_at, paid_at
         FROM payment_orders WHERE order_code = $1 AND user_id = $2`,
      [req.params.code, req.userId],
    )
    const o = rows[0]
    if (!o) return res.status(404).json({ error: 'Không tìm thấy đơn.' })
    let status = o.status
    if (status === 'pending' && new Date(o.expires_at).getTime() < Date.now()) status = 'expired'
    res.json({
      orderCode: o.order_code,
      plan: o.plan,
      amount: o.amount,
      status,
      expiresAt: o.expires_at,
      paidAt: o.paid_at,
    })
  } catch (err) {
    console.error('[billing:order]', err)
    res.status(500).json({ error: 'Lỗi máy chủ.' })
  }
})

// POST /api/billing/orders/:code/mock-pay — giả lập thanh toán để TEST khi chưa gắn SePay.
// Tắt hoàn toàn ở production (config.billing.allowMockPay = false).
router.post('/orders/:code/mock-pay', requireAuth, async (req, res) => {
  if (!config.billing.allowMockPay) return res.status(403).json({ error: 'Không khả dụng.' })
  try {
    const { rows } = await query(
      'SELECT amount FROM payment_orders WHERE order_code = $1 AND user_id = $2',
      [req.params.code, req.userId],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy đơn.' })
    const result = await settleOrder({
      orderCode: req.params.code,
      amount: rows[0].amount,
      refCode: 'MOCK-' + Date.now(),
    })
    if (!result.ok) return res.status(400).json({ error: `Không kích hoạt được đơn (${result.reason}).` })
    res.json({ success: true })
  } catch (err) {
    console.error('[billing:mock-pay]', err)
    res.status(500).json({ error: 'Lỗi máy chủ.' })
  }
})

// POST /api/billing/webhook/sepay — SePay gọi khi có biến động số dư. KHÔNG dùng JWT;
// xác thực bằng API key SePay gửi ở header `Authorization: Apikey <key>`.
router.post('/webhook/sepay', async (req, res) => {
  const key = config.billing.webhookApiKey
  const header = req.headers.authorization || ''
  const provided = header.startsWith('Apikey ') ? header.slice(7).trim() : null
  if (!key || provided !== key) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const body = req.body || {}
  if (body.transferType && body.transferType !== 'in') {
    return res.json({ success: true, ignored: 'not_incoming' }) // bỏ qua tiền ra
  }
  const content = `${body.content || ''} ${body.description || ''}`
  const match = content.match(/SS[0-9A-Z]+/i)
  if (!match) return res.json({ success: true, ignored: 'no_order_code' })
  const orderCode = match[0].toUpperCase()

  try {
    const result = await settleOrder({
      orderCode,
      amount: body.transferAmount,
      refCode: body.referenceCode || String(body.id || ''),
    })
    // Luôn 200 để SePay không retry với các case không khớp/không xử lý được.
    return res.json(
      result.ok
        ? { success: true, paid: true, already: result.already || false }
        : { success: true, ignored: result.reason },
    )
  } catch (err) {
    console.error('[billing:webhook]', err)
    return res.status(500).json({ error: 'Lỗi xử lý webhook.' })
  }
})

// POST /api/billing/redeem { code } — mã ưu đãi (vd BACUAKHANG → Ultra).
router.post('/redeem', requireAuth, async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase()
  if (!code) return res.status(400).json({ error: 'Vui lòng nhập mã ưu đãi.' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query('SELECT * FROM promo_codes WHERE code = $1 FOR UPDATE', [code])
    const promo = rows[0]
    if (!promo || !promo.active) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Mã ưu đãi không tồn tại hoặc đã ngừng áp dụng.' })
    }
    if (promo.max_uses != null && promo.used_count >= promo.max_uses) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Mã ưu đãi đã hết lượt sử dụng.' })
    }
    const dup = await client.query(
      'SELECT 1 FROM promo_redemptions WHERE code = $1 AND user_id = $2',
      [code, req.userId],
    )
    if (dup.rowCount > 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Bạn đã sử dụng mã này rồi.' })
    }

    // duration_days NULL = vĩnh viễn (plan_expires_at = NULL).
    if (promo.duration_days == null) {
      await client.query('UPDATE users SET plan = $2, plan_expires_at = NULL WHERE id = $1', [
        req.userId,
        promo.plan,
      ])
    } else {
      await client.query(
        `UPDATE users
           SET plan = $2,
               plan_expires_at = GREATEST(now(), COALESCE(plan_expires_at, now())) + ($3 || ' days')::interval
         WHERE id = $1`,
        [req.userId, promo.plan, String(promo.duration_days)],
      )
    }
    await client.query('INSERT INTO promo_redemptions (code, user_id) VALUES ($1, $2)', [code, req.userId])
    await client.query('UPDATE promo_codes SET used_count = used_count + 1 WHERE code = $1', [code])
    const { rows: urows } = await client.query(
      'SELECT plan, plan_expires_at FROM users WHERE id = $1',
      [req.userId],
    )
    await client.query('COMMIT')
    res.json({
      plan: effectivePlan(urows[0]),
      planExpiresAt: urows[0]?.plan_expires_at ?? null,
      message: `Đã kích hoạt gói ${String(promo.plan).toUpperCase()}.`,
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[billing:redeem]', err)
    res.status(500).json({ error: 'Lỗi máy chủ.' })
  } finally {
    client.release()
  }
})

export default router
