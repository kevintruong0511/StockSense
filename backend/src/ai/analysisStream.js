// Lõi stream phân tích AI ra HTTP response (SSE) — dùng chung cho phân tích MÃ
// (routes/ai.js) và phân tích DANH MỤC (routes/portfolio.js). Gói trọn: mở SSE,
// chạy streamMessages, chèn marker nguồn ⟦host|url⟧, gom nguồn, gửi token/status,
// và (tùy chọn) lưu lượt assistant qua onAssistantDone.
import { streamMessages } from './analyst.js'

// Tên miền gọn (bỏ www.) — dựng marker chip nguồn khớp hệt client.
export function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

// Đổi lỗi DeepSeek (SDK Anthropic-compatible) thành thông báo tiếng Việt dễ hiểu.
export function friendlyAiError(err) {
  const msg = String(err?.error?.error?.message || err?.message || '')
  const status = err?.status
  if (status === 402 || /insufficient balance|insufficient_balance|balance/i.test(msg))
    return 'Tài khoản DeepSeek đã hết số dư. Vào platform.deepseek.com → Top up để nạp thêm.'
  if (status === 401 || /authentication|invalid x-api-key|invalid api key|authorization/i.test(msg))
    return 'Khóa DEEPSEEK_API_KEY không hợp lệ hoặc đã bị thu hồi.'
  if (status === 429 || /rate limit/i.test(msg))
    return 'DeepSeek đang giới hạn tần suất. Thử lại sau giây lát.'
  if (/image|vision|multimodal|media_type|content.?type/i.test(msg))
    return 'Model AI hiện tại chưa hỗ trợ đọc ảnh. Hãy mô tả bằng chữ, hoặc chuyển sang model có thị giác (vision).'
  return 'Không gọi được AI: ' + (msg || 'lỗi không xác định')
}

// Mở SSE và stream phân tích. Gọi res.writeHead → gửi preludeEvents → streamMessages →
// done/error → res.end(). onAssistantDone({content, sources}) chạy khi có nội dung để
// caller lưu lịch sử (bỏ trống nếu không cần). Tự abort + finalize khi client ngắt.
export async function runAnalysisStream({
  req,
  res,
  system,
  messages,
  modelId,
  preludeEvents = [],
  onAssistantDone,
}) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)
  for (const ev of preludeEvents) send(ev)

  // Tích lũy lượt assistant (kèm marker ⟦host|url⟧) để lưu; chống trích trùng URL liền nhau.
  let assistantBuf = ''
  let lastCite = null
  const collectedSources = []
  let finalized = false
  const finalize = async () => {
    if (finalized) return
    finalized = true
    if (onAssistantDone && assistantBuf) {
      try {
        await onAssistantDone({ content: assistantBuf, sources: collectedSources })
      } catch (err) {
        console.error('[ai:stream:persist]', err)
      }
    }
  }

  const ac = new AbortController()
  req.on('close', () => {
    ac.abort()
    // Client ngắt giữa chừng → vẫn finalize phần đã sinh để không mất.
    finalize()
  })

  try {
    await streamMessages({
      system,
      messages,
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
        // Giữ để tương thích: nếu endpoint trả citation → chip inline. DeepSeek bỏ qua nên hiếm chạy.
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
        // Nguồn AI research qua web_search → gom thành danh sách "Nguồn tham khảo".
        if (s?.url && !collectedSources.some((x) => x.url === s.url)) {
          collectedSources.push({ url: s.url, title: s.title || s.url })
          send({ type: 'sources', items: [{ url: s.url, title: s.title || s.url }] })
        }
      },
      onStatus: (st) => {
        // thinking (suy nghĩ) / searching (tìm web, kèm query) / writing (soạn).
        if (st?.phase) send({ type: 'status', phase: st.phase, query: st.query || '' })
      },
      onReset: () => {
        // Pha research rò rỉ/cụt → bỏ text đã stream, chờ bản viết lại. GIỮ nguồn đã gom.
        assistantBuf = ''
        lastCite = null
        send({ type: 'reset' })
      },
    })
    await finalize()
    send({ type: 'done' })
  } catch (err) {
    if (!ac.signal.aborted) {
      console.error('[ai]', err)
      await finalize()
      send({ type: 'error', error: friendlyAiError(err) })
    }
  } finally {
    res.end()
  }
}
