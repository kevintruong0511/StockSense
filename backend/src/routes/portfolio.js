import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { config } from '../config.js'
import { query } from '../db.js'
import { dailyLimit, effectivePlan, resolveModelTier } from '../billing/plans.js'
import { consume, getUsage } from '../billing/usage.js'
import { getMarketOverview } from '../market/marketOverview.js'
import { getPriceBoard } from '../market/priceBoard.js'
import { getStockSnapshot } from '../market/stockData.js'
import { PORTFOLIO_SYSTEM, buildPortfolioContext } from '../ai/analyst.js'
import { runAnalysisStream } from '../ai/analysisStream.js'
import {
  addTrade,
  computeHoldings,
  deleteTrade,
  deleteTradesByTicker,
  listTrades,
  updateTrade,
} from '../portfolio/portfolio.js'

const router = Router()
router.use(requireAuth)

const MAX_SNAPSHOTS = 8 // trần số mã lấy snapshot cho AI (chặn chi phí/độ trễ upstream)

// Kiểm tra & chuẩn hóa body 1 lệnh. Trả { value } hoặc { error }.
function validateTradeBody(body) {
  const ticker = String(body?.ticker || '').trim().toUpperCase()
  const side = body?.side
  const quantity = Number(body?.quantity)
  const price = Number(body?.price)
  const tradeDate = String(body?.tradeDate || '').slice(0, 10)
  const note = body?.note != null ? String(body.note).slice(0, 500) : null
  if (!/^[A-Z0-9]{2,10}$/.test(ticker)) return { error: 'Mã cổ phiếu không hợp lệ.' }
  if (side !== 'buy' && side !== 'sell') return { error: 'Loại lệnh phải là Mua hoặc Bán.' }
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: 'Số lượng phải lớn hơn 0.' }
  if (!Number.isFinite(price) || price <= 0) return { error: 'Giá phải lớn hơn 0.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tradeDate)) return { error: 'Ngày giao dịch không hợp lệ.' }
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  if (tradeDate > today) return { error: 'Ngày giao dịch không được ở tương lai.' }
  return { value: { ticker, side, quantity, price, tradeDate, note } }
}

// Ghép vị thế với giá hiện tại (bảng điện) → lãi/lỗ chưa hiện thực.
async function enrichHoldings(holdings, realized) {
  const board = holdings.length
    ? await getPriceBoard(holdings.map((h) => h.ticker)).catch(() => ({ rows: [], asOf: null, asOfTime: null }))
    : { rows: [], asOf: null, asOfTime: null }
  const rowByCode = new Map((board.rows || []).map((r) => [r.code, r]))
  const enriched = holdings.map((h) => {
    const r = rowByCode.get(h.ticker)
    const cur = r?.price ?? null
    return {
      ...h,
      name: r?.name ?? null,
      price: cur,
      pctChange: r?.pctChange ?? null,
      marketValue: cur != null ? cur * h.qty : null,
      unrealizedPnl: cur != null ? (cur - h.avgCost) * h.qty : null,
      unrealizedPct: cur != null && h.avgCost > 0 ? (cur / h.avgCost - 1) * 100 : null,
      realizedPnl: realized[h.ticker] ?? 0,
    }
  })
  return { enriched, board }
}

// ── Sổ lệnh (CRUD) ───────────────────────────────────────────────────────────

// Danh sách lệnh + vị thế đang nắm (kèm giá hiện tại + lãi/lỗ).
router.get('/trades', async (req, res) => {
  try {
    const trades = await listTrades(req.userId)
    const { holdings, realized } = computeHoldings(trades)
    const { enriched, board } = await enrichHoldings(holdings, realized)
    res.json({ trades, holdings: enriched, asOf: board.asOf ?? null, asOfTime: board.asOfTime ?? null })
  } catch (err) {
    console.error('[portfolio:list]', err)
    res.status(500).json({ error: 'Không tải được sổ lệnh.' })
  }
})

// Thêm 1 lệnh.
router.post('/trades', async (req, res) => {
  const v = validateTradeBody(req.body)
  if (v.error) return res.status(400).json({ error: v.error })
  try {
    const trade = await addTrade(req.userId, v.value)
    res.json({ trade })
  } catch (err) {
    console.error('[portfolio:add]', err)
    res.status(500).json({ error: 'Không lưu được lệnh.' })
  }
})

// Sửa 1 lệnh.
router.patch('/trades/:id', async (req, res) => {
  const v = validateTradeBody(req.body)
  if (v.error) return res.status(400).json({ error: v.error })
  try {
    const trade = await updateTrade(req.userId, req.params.id, v.value)
    if (!trade) return res.status(404).json({ error: 'Không tìm thấy lệnh.' })
    res.json({ trade })
  } catch (err) {
    console.error('[portfolio:update]', err)
    res.status(500).json({ error: 'Không sửa được lệnh.' })
  }
})

// Xóa toàn bộ lệnh của 1 mã khỏi danh mục.
router.delete('/trades/ticker/:ticker', async (req, res) => {
  const ticker = String(req.params.ticker || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{2,10}$/.test(ticker)) return res.status(400).json({ error: 'Mã cổ phiếu không hợp lệ.' })
  try {
    const deleted = await deleteTradesByTicker(req.userId, ticker)
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy lệnh của mã này.' })
    res.json({ ok: true, deleted })
  } catch (err) {
    console.error('[portfolio:delete:ticker]', err)
    res.status(500).json({ error: 'Không xóa được mã khỏi danh mục.' })
  }
})

// Xóa 1 lệnh.
router.delete('/trades/:id', async (req, res) => {
  try {
    const ok = await deleteTrade(req.userId, req.params.id)
    if (!ok) return res.status(404).json({ error: 'Không tìm thấy lệnh.' })
    res.json({ ok: true })
  } catch (err) {
    console.error('[portfolio:delete]', err)
    res.status(500).json({ error: 'Không xóa được lệnh.' })
  }
})

// ── AI phân tích danh mục (SSE) ──────────────────────────────────────────────

router.post('/analyze', async (req, res) => {
  if (!config.ai.enabled) {
    return res.status(503).json({ error: 'Tính năng AI chưa được cấu hình (thiếu DEEPSEEK_API_KEY).' })
  }

  // Trừ 1 lượt theo gói (y hệt phân tích mã). Kiểm TRƯỚC khi fetch dữ liệu.
  let modelId = config.ai.modelFlash
  try {
    const { rows } = await query('SELECT plan, plan_expires_at FROM users WHERE id = $1', [req.userId])
    const plan = effectivePlan(rows[0])
    const limit = dailyLimit(plan)
    if (limit !== Infinity) {
      const used = await getUsage(req.userId)
      if (used >= limit) {
        return res.status(429).json({
          error: `Bạn đã dùng hết ${limit} lượt phân tích AI hôm nay (gói ${plan}). Nâng cấp gói để tiếp tục.`,
          code: 'quota_exceeded',
          plan,
          limit,
          used,
        })
      }
    }
    const tier = resolveModelTier(plan, req.body?.model)
    modelId = tier === 'pro' ? config.ai.model : config.ai.modelFlash
  } catch (err) {
    console.error('[portfolio:quota]', err)
    return res.status(500).json({ error: 'Không kiểm tra được hạn mức, vui lòng thử lại.' })
  }

  // Nạp danh mục + tính vị thế. Rỗng → không có gì để phân tích.
  let holdings
  let realized
  try {
    const trades = await listTrades(req.userId)
    ;({ holdings, realized } = computeHoldings(trades))
  } catch (err) {
    console.error('[portfolio:analyze:load]', err)
    return res.status(500).json({ error: 'Không đọc được sổ lệnh, vui lòng thử lại.' })
  }
  if (!holdings.length) {
    return res.status(400).json({ error: 'Chưa có vị thế nào trong danh mục để phân tích. Hãy thêm lệnh mua trước.' })
  }

  // Trừ lượt SAU khi chắc có vị thế để phân tích (không phí lượt khi danh mục rỗng).
  await consume(req.userId).catch((err) => console.error('[portfolio:consume]', err))

  // Dữ liệu THẬT: giá hiện tại (batch) + snapshot từng mã (cap 8, song song) + VN-Index.
  const tickers = holdings.map((h) => h.ticker)
  const [board, overview, ...snaps] = await Promise.all([
    getPriceBoard(tickers).catch(() => ({ rows: [] })),
    getMarketOverview().catch(() => null),
    ...tickers.slice(0, MAX_SNAPSHOTS).map((t) => getStockSnapshot(t).catch(() => null)),
  ])
  const snapshots = snaps.filter(Boolean).map((s) => ({ code: s.code, text: s.text }))

  const system =
    PORTFOLIO_SYSTEM + '\n\n' + buildPortfolioContext({ holdings, realized, board, overview, snapshots })
  const messages = [
    {
      role: 'user',
      content:
        'Hãy phân tích danh mục hiện tại của tôi và đưa kế hoạch hành động cho TỪNG mã (Giữ/Mua thêm/Chốt lời/Cắt lỗ) theo khung đã hướng dẫn.',
    },
  ]

  await runAnalysisStream({ req, res, system, messages, modelId })
})

export default router
