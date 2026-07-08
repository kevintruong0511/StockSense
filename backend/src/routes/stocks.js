import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { getMarketOverview, getMarketNews } from '../market/marketOverview.js'

const router = Router()

// Mọi route dữ liệu đều yêu cầu đăng nhập (app đã gate login).
router.use(requireAuth)

// Tổng quan thị trường: VN-Index + số mã tăng/giảm.
router.get('/market/overview', async (req, res) => {
  res.json(await getMarketOverview())
})

// Tin tức thị trường từ CafeF RSS.
router.get('/market/news', async (req, res) => {
  const size = Math.min(20, Math.max(5, Number(req.query.size) || 10))
  res.json(await getMarketNews({ size }))
})

export default router
