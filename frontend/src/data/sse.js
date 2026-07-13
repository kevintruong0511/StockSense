// Lõi đọc SSE dùng chung cho các luồng stream AI (phân tích mã & phân tích danh mục).
// Xử lý: POST kèm Bearer token, lỗi trước stream (401/400/429/503 → JSON {error,code}),
// khung `data: …\n\n`, và ngắt giữa chừng. Trả về hàm abort().
import { getToken } from './auth.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

// onEvent(evt) → trả true để KẾT THÚC (đã gặp sự kiện done/error).
// onEnd() → gọi khi stream đóng tự nhiên mà chưa có sự kiện kết thúc (fallback).
// onError(message, meta) → lỗi kết nối / trước stream / gián đoạn.
export function streamSSE({ path, body, onEvent, onEnd, onError }) {
  const controller = new AbortController()
  const token = getToken()

  ;(async () => {
    let res
    try {
      res = await fetch(`${API_BASE}/api${path}`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
    } catch {
      onError?.('Không thể kết nối tới máy chủ. Kiểm tra kết nối mạng rồi thử lại.')
      return
    }

    // Lỗi trước khi stream (thường trả JSON). meta.code === 'quota_exceeded' khi hết lượt.
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
          if (onEvent?.(evt) === true) return
        }
      }
      onEnd?.()
    } catch {
      if (!controller.signal.aborted) onError?.('Kết nối bị gián đoạn khi đang nhận phản hồi.')
    }
  })()

  return () => controller.abort()
}
