import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { config } from '../config.js'
import { getMarketNews, getMarketOverview } from '../market/marketOverview.js'
import { getStockSnapshot, getTickerUniverse } from '../market/stockData.js'
import { BASE_SYSTEM, buildContext, streamMessages } from '../ai/analyst.js'

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

// Phân tích / chat AI — trả về SSE (text/event-stream) để stream token realtime.
router.post('/analyze', async (req, res) => {
  if (!config.ai.enabled) {
    return res.status(503).json({ error: 'Tính năng AI chưa được cấu hình (thiếu ANTHROPIC_API_KEY).' })
  }

  const { ticker, stock, userContext, messages } = req.body || {}

  // Chỉ nhận message hợp lệ user/assistant, cắt bớt để tránh prompt quá dài.
  const safeMessages = Array.isArray(messages)
    ? messages
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }))
    : []

  if (safeMessages.length === 0 || safeMessages[safeMessages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Thiếu nội dung yêu cầu hợp lệ.' })
  }

  // Nhồi dữ liệu THẬT: số liệu thời gian thực của mã (VNDIRECT) + tin CafeF + VN-Index.
  const [snapshot, news, overview] = await Promise.all([
    ticker ? getStockSnapshot(ticker).catch(() => null) : null,
    getMarketNews({ size: 6 }).catch(() => null),
    getMarketOverview().catch(() => null),
  ])
  const system =
    BASE_SYSTEM +
    '\n\n' +
    buildContext({ ticker, stock, userContext, news, overview, snapshotText: snapshot?.text })

  // Mở SSE.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)

  const ac = new AbortController()
  req.on('close', () => ac.abort())

  try {
    await streamMessages({
      system,
      messages: safeMessages,
      signal: ac.signal,
      onText: (text) => {
        if (text) send({ type: 'token', text })
      },
    })
    send({ type: 'done' })
  } catch (err) {
    if (!ac.signal.aborted) {
      console.error('[ai]', err)
      send({ type: 'error', error: 'Không gọi được AI: ' + (err?.message || 'lỗi không xác định') })
    }
  } finally {
    res.end()
  }
})

export default router
