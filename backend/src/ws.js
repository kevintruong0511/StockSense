import { WebSocketServer, WebSocket } from 'ws'
import { verifyToken } from './auth.js'
import { marketProvider } from './market/index.js'
import { isKnownTicker } from './market/universe.js'

// WebSocket realtime: client kết nối /ws?token=<JWT>, gửi subscribe/unsubscribe
// theo mã, nhận message { type:'quote', quote }. Backend giữ 1 kết nối upstream
// (provider) và fan-out cho mọi client đang theo dõi mã đó.
export function attachWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })
  // Mỗi client giữ Set các mã đang theo dõi.
  const clients = new Map() // ws -> Set<ticker>

  // Đẩy quote tới các client đang theo dõi đúng mã.
  marketProvider.on('quote', (quote) => {
    for (const [ws, tickers] of clients) {
      if (ws.readyState === WebSocket.OPEN && tickers.has(quote.ticker)) {
        ws.send(JSON.stringify({ type: 'quote', quote }))
      }
    }
  })

  wss.on('connection', (ws, req) => {
    // Xác thực bằng JWT (app yêu cầu đăng nhập).
    const url = new URL(req.url, 'http://localhost')
    const token = url.searchParams.get('token')
    try {
      verifyToken(token)
    } catch {
      ws.close(4001, 'Phiên không hợp lệ')
      return
    }

    const tickers = new Set()
    clients.set(ws, tickers)

    const subscribe = (list) => {
      for (const raw of list || []) {
        const t = String(raw).toUpperCase()
        if (!isKnownTicker(t) || tickers.has(t)) continue
        tickers.add(t)
        marketProvider.subscribe(t)
        // Gửi ngay snapshot gần nhất để UI có giá hiển thị tức thì.
        const latest = marketProvider.getLatest(t)
        if (latest) ws.send(JSON.stringify({ type: 'quote', quote: latest }))
      }
    }

    const unsubscribe = (list) => {
      for (const raw of list || []) {
        const t = String(raw).toUpperCase()
        if (tickers.delete(t)) marketProvider.unsubscribe(t)
      }
    }

    ws.on('message', (buf) => {
      let msg
      try {
        msg = JSON.parse(buf.toString())
      } catch {
        return
      }
      if (msg.type === 'subscribe') subscribe(msg.tickers)
      else if (msg.type === 'unsubscribe') unsubscribe(msg.tickers)
    })

    ws.on('close', () => {
      for (const t of tickers) marketProvider.unsubscribe(t)
      clients.delete(ws)
    })

    ws.send(JSON.stringify({ type: 'ready', provider: marketProvider.name }))
  })

  console.log('[ws] WebSocket realtime sẵn sàng tại /ws')
  return wss
}
