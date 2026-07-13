// Client gọi API phân tích AI (SSE stream). Không dùng api() trong auth.js vì
// api() đọc res.json(); ở đây cần đọc dần response body.
import { getToken } from './auth.js'
import { streamSSE } from './sse.js'

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
export function streamAnalyze({ ticker, stock, userContext, messages, sessionId, model, onSession, onToken, onCitation, onSources, onStatus, onReset, onDone, onError }) {
  return streamSSE({
    path: '/ai/analyze',
    body: { ticker, stock, userContext, messages, sessionId, model },
    onEvent: (evt) => {
      if (evt.type === 'session') onSession?.({ id: evt.id, title: evt.title })
      else if (evt.type === 'token') onToken?.(evt.text || '')
      else if (evt.type === 'citation') onCitation?.(evt)
      else if (evt.type === 'sources') onSources?.(Array.isArray(evt.items) ? evt.items : [])
      else if (evt.type === 'status') onStatus?.({ phase: evt.phase, query: evt.query || '' })
      else if (evt.type === 'reset') onReset?.()
      else if (evt.type === 'done') {
        onDone?.()
        return true
      } else if (evt.type === 'error') {
        onError?.(evt.error || 'Lỗi không xác định từ AI.')
        return true
      }
    },
    onEnd: () => onDone?.(),
    onError,
  })
}
