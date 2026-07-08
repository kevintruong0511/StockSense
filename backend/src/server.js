import http from 'node:http'
import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import authRoutes from './routes/auth.js'
import stockRoutes from './routes/stocks.js'
import { attachWebSocket } from './ws.js'

const app = express()

app.use(cors({ origin: config.corsOrigin }))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/stocks', stockRoutes)

// Bắt lỗi JSON hỏng và các lỗi chưa xử lý.
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON không hợp lệ.' })
  }
  console.error('[server]', err)
  res.status(500).json({ error: 'Lỗi máy chủ.' })
})

// HTTP + WebSocket dùng chung một cổng.
const server = http.createServer(app)
attachWebSocket(server)

server.listen(config.port, () => {
  console.log(`[server] API + WS chạy tại http://localhost:${config.port}`)
})
