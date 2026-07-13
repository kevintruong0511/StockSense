import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import authRoutes from './routes/auth.js'
import stockRoutes from './routes/stocks.js'
import aiRoutes from './routes/ai.js'
import portfolioRoutes from './routes/portfolio.js'
import billingRoutes from './routes/billing.js'
import communityRoutes from './routes/community.js'

const app = express()

app.use(cors({ origin: config.corsOrigin }))
// Giới hạn body rộng để nhận ảnh đính kèm trong chat (base64, tối đa 4 ảnh/tin).
app.use(express.json({ limit: '30mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/stocks', stockRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/portfolio', portfolioRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/community', communityRoutes)

// Bắt lỗi JSON hỏng và các lỗi chưa xử lý.
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON không hợp lệ.' })
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Ảnh đính kèm quá lớn. Hãy dùng ảnh nhỏ hơn hoặc bớt số ảnh.' })
  }
  console.error('[server]', err)
  res.status(500).json({ error: 'Lỗi máy chủ.' })
})

app.listen(config.port, () => {
  console.log(`[server] API chạy tại http://localhost:${config.port}`)
})
