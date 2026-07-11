// Client gọi API phân tích AI (SSE stream). Không dùng api() trong auth.js vì
// api() đọc res.json(); ở đây cần đọc dần response body.
import { getToken } from './auth.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Kiểm tra tính năng AI có bật ở backend không.
export async function fetchAiStatus() {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/ai/status`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Danh sách toàn bộ mã niêm yết để gợi ý autocomplete. Trả [] nếu lỗi.
export async function fetchTickers() {
  try {
    const token = getToken()
    const res = await fetch(`${API_BASE}/api/ai/tickers`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data?.tickers) ? data.tickers : []
  } catch {
    return []
  }
}

// Gửi hội thoại và stream kết quả. Trả về hàm abort().
// Callbacks: onSession({id,title}), onToken(text), onCitation({url,title,cited_text}),
// onSources([{url,title}]), onStatus({phase,query}), onReset(), onDone(), onError(message).
export function streamAnalyze({ ticker, stock, userContext, messages, sessionId, onSession, onToken, onCitation, onSources, onStatus, onReset, onDone, onError }) {
  const controller = new AbortController()
  const token = getToken()

  ;(async () => {
    let res
    try {
      res = await fetch(`${API_BASE}/api/ai/analyze`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ticker, stock, userContext, messages, sessionId }),
      })
    } catch {
      onError?.('Không thể kết nối tới máy chủ. Kiểm tra kết nối mạng rồi thử lại.')
      return
    }

    // Lỗi trước khi stream (401/400/429/503…) — thường trả JSON.
    if (!res.ok || !res.body) {
      let msg = `Có lỗi xảy ra (HTTP ${res.status}).`
      let code = null
      try {
        const data = await res.json()
        if (data?.error) msg = data.error
        if (data?.code) code = data.code
      } catch {
        /* để nguyên msg mặc định */
      }
      // meta.code === 'quota_exceeded' khi hết lượt (HTTP 429) để UI hiện nút nâng cấp.
      onError?.(msg, { status: res.status, code })
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let sep
        while ((sep = buf.indexOf('\n\n')) !== -1) {
          const chunk = buf.slice(0, sep)
          buf = buf.slice(sep + 2)
          const dataLine = chunk.split('\n').find((l) => l.startsWith('data:'))
          if (!dataLine) continue
          const payload = dataLine.slice(5).trim()
          if (!payload) continue
          let evt
          try {
            evt = JSON.parse(payload)
          } catch {
            continue
          }
          if (evt.type === 'session') onSession?.({ id: evt.id, title: evt.title })
          else if (evt.type === 'token') onToken?.(evt.text || '')
          else if (evt.type === 'citation') onCitation?.(evt)
          else if (evt.type === 'sources') onSources?.(Array.isArray(evt.items) ? evt.items : [])
          else if (evt.type === 'status') onStatus?.({ phase: evt.phase, query: evt.query || '' })
          else if (evt.type === 'reset') onReset?.()
          else if (evt.type === 'done') {
            onDone?.()
            return
          } else if (evt.type === 'error') {
            onError?.(evt.error || 'Lỗi không xác định từ AI.')
            return
          }
        }
      }
      onDone?.()
    } catch (err) {
      if (!controller.signal.aborted) onError?.('Kết nối bị gián đoạn khi đang nhận phản hồi.')
    }
  })()

  return () => controller.abort()
}
