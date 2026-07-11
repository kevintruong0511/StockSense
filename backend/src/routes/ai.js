import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { config } from '../config.js'
import { query } from '../db.js'
import { dailyLimit, effectivePlan, resolveModelTier } from '../billing/plans.js'
import { consume, getUsage } from '../billing/usage.js'
import { getMarketNews, getMarketOverview } from '../market/marketOverview.js'
import { getStockSnapshot, getTickerUniverse } from '../market/stockData.js'
import { BASE_SYSTEM, buildContext, streamMessages } from '../ai/analyst.js'
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

// Tên miền gọn (bỏ www.) — dùng để dựng marker chip nguồn ⟦host|url⟧ khớp hệt client.
function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

// Đổi lỗi DeepSeek (SDK Anthropic-compatible) thành thông báo tiếng Việt dễ hiểu.
function friendlyAiError(err) {
  const msg = String(err?.error?.error?.message || err?.message || '')
  const status = err?.status
  if (status === 402 || /insufficient balance|insufficient_balance|balance/i.test(msg))
    return 'Tài khoản DeepSeek đã hết số dư. Vào platform.deepseek.com → Top up để nạp thêm.'
  if (status === 401 || /authentication|invalid x-api-key|invalid api key|authorization/i.test(msg))
    return 'Khóa DEEPSEEK_API_KEY không hợp lệ hoặc đã bị thu hồi.'
  if (status === 429 || /rate limit/i.test(msg))
    return 'DeepSeek đang giới hạn tần suất. Thử lại sau giây lát.'
  return 'Không gọi được AI: ' + (msg || 'lỗi không xác định')
}

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

  // Chỉ nhận message hợp lệ user/assistant, cắt bớt để tránh prompt quá dài.
  const safeMessages = Array.isArray(messages)
    ? messages
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }))
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

  // Mở SSE.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)

  // Báo client biết phiên nào đang ghi (nhất là phiên mới vừa tạo) để nó gắn activeSessionId.
  send({ type: 'session', id: session.id, title: session.title })

  // Tích lũy lượt assistant để lưu DB. Chèn marker ⟦host|url⟧ đúng như client (chống trùng URL
  // liền nhau) để khi tải lại phiên cũ chip nguồn inline vẫn khớp và bấm được.
  let assistantBuf = ''
  let lastCite = null
  const collectedSources = []
  let saved = false
  const persistAssistant = async () => {
    if (saved) return
    saved = true
    if (!assistantBuf) return
    try {
      await addMessage(session.id, {
        role: 'assistant',
        content: assistantBuf,
        sources: collectedSources.length ? collectedSources : undefined,
      })
      await touchSession(session.id, { ticker: ticker ? String(ticker).toUpperCase() : undefined })
    } catch (err) {
      console.error('[ai:session:persist]', err)
    }
  }

  const ac = new AbortController()
  req.on('close', () => {
    ac.abort()
    // Client ngắt giữa chừng → vẫn lưu phần assistant đã sinh để không mất.
    persistAssistant()
  })

  try {
    await streamMessages({
      system,
      messages: safeMessages,
      model: modelId,
      signal: ac.signal,
      onText: (text) => {
        if (text) {
          assistantBuf += text
          lastCite = null // có text mới → cho phép trích lại cùng nguồn cho luận điểm sau
          send({ type: 'token', text })
        }
      },
      onCitation: (c) => {
        // Giữ để tương thích: nếu endpoint có trả citation → chip inline ngay sau câu.
        // DeepSeek bỏ qua citations nên nhánh này thường không chạy.
        if (c?.url) {
          if (c.url !== lastCite) {
            lastCite = c.url
            assistantBuf += `⟦${hostOf(c.url)}|${c.url}⟧`
            if (!collectedSources.some((s) => s.url === c.url))
              collectedSources.push({ url: c.url, title: c.title || c.url })
          }
          send({ type: 'citation', url: c.url, title: c.title || '', cited_text: c.cited_text || '' })
        }
      },
      onSource: (s) => {
        // Nguồn AI research qua web_search (DeepSeek) → gom thành danh sách "Nguồn tham khảo".
        if (s?.url && !collectedSources.some((x) => x.url === s.url)) {
          collectedSources.push({ url: s.url, title: s.title || s.url })
          send({ type: 'sources', items: [{ url: s.url, title: s.title || s.url }] })
        }
      },
      onStatus: (st) => {
        // Trạng thái thực của AI: thinking (suy nghĩ) / searching (tìm web, kèm query) / writing (soạn).
        if (st?.phase) send({ type: 'status', phase: st.phase, query: st.query || '' })
      },
      onReset: () => {
        // Pha 1 (research) rò rỉ/cụt → bỏ text đã stream, chuẩn bị nhận bản viết lại (pha 2).
        // GIỮ nguồn đã gom (nguồn research vẫn đúng cho bản phân tích).
        assistantBuf = ''
        lastCite = null
        send({ type: 'reset' })
      },
    })
    await persistAssistant()
    send({ type: 'done' })
  } catch (err) {
    if (!ac.signal.aborted) {
      console.error('[ai]', err)
      await persistAssistant()
      send({ type: 'error', error: friendlyAiError(err) })
    }
  } finally {
    res.end()
  }
})

export default router
