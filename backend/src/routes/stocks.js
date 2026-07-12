import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { getMarketOverview, getMarketNews } from '../market/marketOverview.js'
import { getPriceBoard, VN30 } from '../market/priceBoard.js'
import { topTickers } from '../chat/history.js'

const router = Router()

// Mọi route dữ liệu đều yêu cầu đăng nhập (app đã gate login).
router.use(requireAuth)

// Tổng quan thị trường: VN-Index + số mã tăng/giảm.
router.get('/market/overview', async (req, res) => {
  res.json(await getMarketOverview())
})

// Bảng điện: giá thật nhiều mã (?codes=FPT,HPG,… hoặc ?group=vn30). Dùng cho poll ~20s.
router.get('/market/board', async (req, res) => {
  const raw = String(req.query.codes || '').trim()
  let codes
  if (req.query.group === 'vn30' || !raw) codes = VN30
  else codes = raw.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 50)
  res.json(await getPriceBoard(codes))
})

// Mã được phân tích nhiều nhất (đếm phiên chat thật) + % thay đổi thật từ bảng giá.
router.get('/market/top-analyzed', async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 7))
  const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 5))
  try {
    const top = await topTickers({ days, limit })
    if (top.length === 0) return res.json({ items: [], days })
    const board = await getPriceBoard(top.map((t) => t.code)).catch(() => ({ rows: [] }))
    const byCode = new Map((board.rows || []).map((r) => [r.code, r]))
    const items = top.map((t) => {
      const r = byCode.get(t.code) || {}
      return { code: t.code, count: t.count, name: r.name ?? null, pctChange: r.pctChange ?? null }
    })
    res.json({ items, days })
  } catch (err) {
    console.error('[stocks:top-analyzed]', err)
    res.status(500).json({ error: 'Không tải được bảng xếp hạng.' })
  }
})

// Tin tức thị trường từ CafeF RSS.
router.get('/market/news', async (req, res) => {
  const size = Math.min(20, Math.max(5, Number(req.query.size) || 10))
  res.json(await getMarketNews({ size }))
})

export default router
