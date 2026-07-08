// Lớp dữ liệu thị trường phía client:
//  - REST: nến/hồ sơ/chỉ số thật (VNDIRECT qua backend).
//  - WebSocket: giá realtime (backend đẩy từ provider mô phỏng hoặc DNSE).
import { useEffect, useRef, useState } from 'react'
import { getToken } from './auth.js'

async function authedGet(path) {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Không tải được dữ liệu.')
  }
  return res.json()
}

export const fetchCandles = (t, resolution = 'D', days = 300) =>
  authedGet(`/stocks/${t}/candles?resolution=${resolution}&days=${days}`)
export const fetchOverview = (t) => authedGet(`/stocks/${t}/overview`)
export const fetchRatios = (t) => authedGet(`/stocks/${t}/ratios`)

function wsUrl() {
  const token = getToken() || ''
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws?token=${encodeURIComponent(token)}`
}

// Mở 1 WebSocket, subscribe danh sách mã, trả về map { ticker -> quote } cập
// nhật realtime. Tự kết nối lại khi rớt. Danh sách mã truyền vào dạng mảng.
export function useRealtimeQuotes(tickers) {
  const key = (tickers || []).join(',')
  const [quotes, setQuotes] = useState({})
  const [provider, setProvider] = useState(null)

  useEffect(() => {
    const list = key ? key.split(',') : []
    if (list.length === 0 || !getToken()) return

    let ws
    let closed = false
    let retry

    const connect = () => {
      ws = new WebSocket(wsUrl())
      ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', tickers: list }))
      ws.onmessage = (e) => {
        let m
        try {
          m = JSON.parse(e.data)
        } catch {
          return
        }
        if (m.type === 'ready') setProvider(m.provider)
        else if (m.type === 'quote')
          setQuotes((prev) => ({ ...prev, [m.quote.ticker]: m.quote }))
      }
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 2000)
      }
      ws.onerror = () => ws && ws.close()
    }
    connect()

    return () => {
      closed = true
      clearTimeout(retry)
      if (ws) ws.close()
    }
  }, [key])

  return { quotes, provider }
}

// Trả về class nhấp nháy nền ('ss-flash-up' / 'ss-flash-down') trong ~0,6s mỗi
// khi `value` thay đổi so với lần trước. Dùng cho ô giá realtime.
export function useFlash(value) {
  const prev = useRef(value)
  const [cls, setCls] = useState('')
  useEffect(() => {
    if (prev.current == null || value == null) {
      prev.current = value
      return
    }
    if (value > prev.current) setCls('ss-flash-up')
    else if (value < prev.current) setCls('ss-flash-down')
    prev.current = value
    const id = setTimeout(() => setCls(''), 600)
    return () => clearTimeout(id)
  }, [value])
  return cls
}
