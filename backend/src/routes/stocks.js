import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { getCandles, getOverview, getRatios } from '../market/vndirect.js'
import { marketProvider } from '../market/index.js'
import { isKnownTicker } from '../market/universe.js'

const router = Router()

// Mọi route dữ liệu đều yêu cầu đăng nhập (app đã gate login).
router.use(requireAuth)

const sym = (req) => String(req.params.ticker || '').toUpperCase()

// Snapshot giá gần nhất (REST) — tiện cho lần tải đầu trước khi WS kịp đẩy.
router.get('/:ticker/quote', (req, res) => {
  const t = sym(req)
  if (!isKnownTicker(t)) return res.status(404).json({ error: 'Không có mã này.' })
  res.json({ source: marketProvider.name, quote: marketProvider.getLatest(t) })
})

// Nến lịch sử thật (VNDIRECT). ?resolution=D&days=300
router.get('/:ticker/candles', async (req, res) => {
  const resolution = String(req.query.resolution || 'D')
  const days = Math.min(2000, Math.max(20, Number(req.query.days) || 300))
  res.json(await getCandles(sym(req), { resolution, days }))
})

router.get('/:ticker/overview', async (req, res) => {
  res.json(await getOverview(sym(req)))
})

router.get('/:ticker/ratios', async (req, res) => {
  res.json(await getRatios(sym(req)))
})

export default router
