import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { config } from '../config.js'
import { query } from '../db.js'
import { dailyLimit, effectivePlan, resolveModelTier } from '../billing/plans.js'
import { consume, getUsage } from '../billing/usage.js'
import { getMarketNews, getMarketOverview } from '../market/marketOverview.js'
import { getStockSnapshot, getTickerUniverse } from '../market/stockData.js'
import { BASE_SYSTEM, buildContext } from '../ai/analyst.js'
import { runAnalysisStream } from '../ai/analysisStream.js'
import {
  addMessage,
  createSession,
  deleteSession,
  getMessages,
  getSession,
  listSessions,
  renameSession,
  touchSession,
} from '../chat/history.js'

const router = Router()
router.use(requireAuth)

// Cho frontend biết tính năng AI có bật không (đủ để ẩn/hiện UI).
router.get('/status', (_req, res) => {
  res.json({ enabled: config.ai.enabled, model: config.ai.model })
})

// Danh sách toàn bộ mã niêm yết (gợi ý autocomplete).
router.get('/tickers', async (_req, res) => {
  res.json({ tickers: await getTickerUniverse().catch(() => []) })
})

// ── Lịch sử trò chuyện (phiên chat) ─────────────────────────────────────────

// Danh sách phiên của user (panel bên trái).
router.get('/sessions', async (req, res) => {
  try {
    res.json({ sessions: await listSessions(req.userId) })
  } catch (err) {
    console.error('[ai:sessions:list]', err)
    res.status(500).json({ error: 'Không tải được danh sách cuộc trò chuyện.' })
  }
})

// Tạo phiên trống (ít dùng — thường phiên tạo tự động khi phân tích).
router.post('/sessions', async (req, res) => {
  try {
    const { title, ticker } = req.body || {}
    res.json({ session: await createSession(req.userId, { title, ticker }) })
  } catch (err) {
    console.error('[ai:sessions:create]', err)
    res.status(500).json({ error: 'Không tạo được cuộc trò chuyện.' })
  }
})

// Xem lại 1 phiên: thông tin phiên + toàn bộ tin nhắn.
router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await getSession(req.userId, req.params.id)
    if (!session) return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện.' })
    const messages = await getMessages(req.userId, req.params.id)
    res.json({ session, messages })
  } catch (err) {
    console.error('[ai:sessions:get]', err)
    res.status(500).json({ error: 'Không tải được cuộc trò chuyện.' })
  }
})

// Đổi tên phiên.
router.patch('/sessions/:id', async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim().slice(0, 120)
    if (!title) return res.status(400).json({ error: 'Tên cuộc trò chuyện không hợp lệ.' })
    const session = await renameSession(req.userId, req.params.id, title)
    if (!session) return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện.' })
    res.json({ session })
  } catch (err) {
    console.error('[ai:sessions:rename]', err)
    res.status(500).json({ error: 'Không đổi được tên cuộc trò chuyện.' })
  }
})

// Xóa phiên (CASCADE xóa tin nhắn).
router.delete('/sessions/:id', async (req, res) => {
  try {
    const ok = await deleteSession(req.userId, req.params.id)
    if (!ok) return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện.' })
    res.json({ ok: true })
  } catch (err) {
    console.error('[ai:sessions:delete]', err)
    res.status(500).json({ error: 'Không xóa được cuộc trò chuyện.' })
  }
})

// Phân tích / chat AI — trả về SSE (text/event-stream) để stream token realtime.
router.post('/analyze', async (req, res) => {
  if (!config.ai.enabled) {
    return res.status(503).json({ error: 'Tính năng AI chưa được cấu hình (thiếu DEEPSEEK_API_KEY).' })
  }

  const { ticker, stock, userContext, messages, sessionId } = req.body || {}

  // Ảnh đính kèm (chỉ tin user): media_type nằm trong whitelist Anthropic + data base64
  // trong hạn mức. Lọc bỏ ảnh sai định dạng/quá lớn; tối đa 4 ảnh/tin để chặn payload.
  const OK_IMG_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
  const MAX_IMG_B64 = 7 * 1024 * 1024 // ~5MB nhị phân sau giải mã base64
  const sanitizeImages = (arr) =>
    (Array.isArray(arr) ? arr : [])
      .filter(
        (im) =>
          im &&
          OK_IMG_TYPES.has(im.media_type) &&
          typeof im.data === 'string' &&
          im.data.length > 0 &&
          im.data.length <= MAX_IMG_B64,
      )
      .slice(0, 4)
      .map((im) => ({ media_type: im.media_type, data: im.data }))

  // Chỉ nhận message hợp lệ user/assistant, cắt bớt để tránh prompt quá dài.
  const safeMessages = Array.isArray(messages)
    ? messages
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m) => {
          const out = { role: m.role, content: m.content.slice(0, 8000) }
          if (m.role === 'user') {
            const imgs = sanitizeImages(m.images)
            if (imgs.length) out.images = imgs
          }
          return out
        })
    : []

  if (safeMessages.length === 0 || safeMessages[safeMessages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Thiếu nội dung yêu cầu hợp lệ.' })
  }

  // Giới hạn lượt theo gói (Free 2 / Pro 15 / Ultra không giới hạn) — mỗi request trừ 1 lượt.
  // Kiểm tra TRƯỚC khi gọi mạng lấy dữ liệu để không phí công khi đã hết lượt.
  // Đồng thời CHỐT MODEL theo gói: Free luôn flash; Pro/Ultra được chọn pro.
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
    // Bậc model yêu cầu ('flash'|'pro') bị kẹp theo quyền của gói.
    const tier = resolveModelTier(plan, req.body?.model)
    modelId = tier === 'pro' ? config.ai.model : config.ai.modelFlash
    await consume(req.userId)
  } catch (err) {
    console.error('[ai:quota]', err)
    return res.status(500).json({ error: 'Không kiểm tra được hạn mức, vui lòng thử lại.' })
  }

  // Giải quyết phiên chat TRƯỚC khi mở SSE (còn trả JSON lỗi được nếu phiên sai chủ).
  // - Không có sessionId → tạo phiên mới, tiêu đề suy từ tin nhắn user đầu / mã.
  // - Có sessionId → xác thực thuộc về user hiện tại.
  const lastUserMsg = safeMessages[safeMessages.length - 1].content
  let session
  try {
    if (sessionId) {
      session = await getSession(req.userId, sessionId)
      if (!session) return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện.' })
    } else {
      const t = ticker ? String(ticker).toUpperCase() : ''
      const title = (t ? t + ' · ' : '') + lastUserMsg.replace(/\s+/g, ' ').trim().slice(0, 48)
      session = await createSession(req.userId, { title: title || undefined, ticker: t || undefined })
    }
    // Lưu tin nhắn user vừa gửi (chỉ lượt cuối — các lượt trước đã lưu ở request trước).
    await addMessage(session.id, { role: 'user', content: lastUserMsg })
  } catch (err) {
    console.error('[ai:session]', err)
    return res.status(500).json({ error: 'Không lưu được cuộc trò chuyện, vui lòng thử lại.' })
  }

  // Nhồi dữ liệu THẬT: snapshot mã (SSI/Vietstock, VNDIRECT fallback) + tin CafeF + VN-Index.
  const [snapshot, news, overview] = await Promise.all([
    ticker ? getStockSnapshot(ticker).catch(() => null) : null,
    getMarketNews({ size: 6 }).catch(() => null),
    getMarketOverview().catch(() => null),
  ])
  const system =
    BASE_SYSTEM +
    '\n\n' +
    buildContext({ ticker, stock, userContext, news, overview, snapshotText: snapshot?.text })

  // Stream ra SSE (lõi dùng chung). preludeEvents báo phiên đang ghi để client gắn
  // activeSessionId; onAssistantDone lưu lượt assistant (kèm marker nguồn) + đẩy phiên lên đầu.
  await runAnalysisStream({
    req,
    res,
    system,
    messages: safeMessages,
    modelId,
    preludeEvents: [{ type: 'session', id: session.id, title: session.title }],
    onAssistantDone: async ({ content, sources }) => {
      await addMessage(session.id, {
        role: 'assistant',
        content,
        sources: sources.length ? sources : undefined,
      })
      await touchSession(session.id, { ticker: ticker ? String(ticker).toUpperCase() : undefined })
    },
  })
})

export default router
