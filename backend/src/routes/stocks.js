import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { getMarketOverview, getMarketNews } from '../market/marketOverview.js'
import { getPriceBoard, VN30 } from '../market/priceBoard.js'
import { getStockData } from '../market/stockData.js'
import { getCandles, getIndexCandles } from '../market/candles.js'
import { getMovers } from '../market/movers.js'
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

// Chi tiết một mã: dữ liệu THẬT có cấu trúc cho màn chi tiết (giá, định giá, cơ bản,
// xu hướng, kỹ thuật, hồ sơ). Biểu đồ do widget TradingView tự phục vụ → chỉ trả tvSymbol.
router.get('/detail', async (req, res) => {
  const code = String(req.query.code || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{2,10}$/.test(code)) return res.status(400).json({ error: 'Mã không hợp lệ.' })
  try {
    const d = await getStockData(code)
    if (!d) return res.status(404).json({ error: 'Không có dữ liệu cho mã này.' })
    const { price, valuation, fundamentals, trend, technical, profile, high52, low52, exchange } = d
    res.json({
      code,
      name: profile?.name || code,
      exchange, // 'HOSE' | 'HNX' | 'UPCOM' | null
      tvSymbol: exchange ? `${exchange}:${code}` : code, // symbol cho widget TradingView
      asOf: d.asOf,
      price: price
        ? {
            close: price.closeVnd ?? null,
            // Mức thay đổi tuyệt đối (đồng) so với tham chiếu: ưu tiên số thật từ nguồn,
            // nếu thiếu thì suy ra từ giá đóng cửa + %thay đổi.
            change:
              price.changeVnd ??
              (price.closeVnd != null && price.pctChange != null && price.pctChange !== -100
                ? Math.round(price.closeVnd - price.closeVnd / (1 + price.pctChange / 100))
                : null),
            pctChange: price.pctChange ?? null,
            open: price.openVnd ?? null,
            high: price.highVnd ?? null,
            low: price.lowVnd ?? null,
            volume: price.nmVolume ?? null,
            date: price.date ?? null,
          }
        : null,
      high52,
      low52,
      valuation: valuation
        ? {
            marketcap: valuation.marketcap ?? null,
            outstandingShares: valuation.outstandingShares ?? null,
            pe: valuation.pe ?? null,
            pb: valuation.pb ?? null,
            ps: valuation.ps ?? null,
            beta: valuation.beta ?? null,
          }
        : null,
      fundamentals: fundamentals
        ? {
            roe: fundamentals.roe ?? null,
            roaa: fundamentals.roaa ?? null,
            netProfitGrowthYoY: fundamentals.netProfitGrowthYoY ?? null,
          }
        : null,
      trend: trend ? { m1: trend.m1, m3: trend.m3, m6: trend.m6, y1: trend.y1 } : null,
      technical: technical
        ? {
            ma20: technical.ma20 ?? null,
            ma50: technical.ma50 ?? null,
            ma200: technical.ma200 ?? null,
            rsi14: technical.rsi14 ?? null,
            support20: technical.support20 ?? null,
            resistance20: technical.resistance20 ?? null,
          }
        : null,
      profile: profile
        ? {
            floor: profile.floor ?? null,
            foundDate: profile.foundDate ?? null,
            employees: profile.employees ?? null,
            summary: profile.summary ?? null,
          }
        : null,
    })
  } catch (err) {
    console.error('[stocks:detail]', err)
    res.status(500).json({ error: 'Không tải được dữ liệu cổ phiếu.' })
  }
})

// Nến OHLCV thật cho biểu đồ (?code=FPT&tf=D|W|M|15|60). Giá VND.
router.get('/candles', async (req, res) => {
  const code = String(req.query.code || '').trim().toUpperCase()
  const tf = String(req.query.tf || 'D').trim()
  if (!/^[A-Z0-9]{2,10}$/.test(code)) return res.status(400).json({ error: 'Mã không hợp lệ.' })
  try {
    res.json(await getCandles(code, tf))
  } catch (err) {
    console.error('[stocks:candles]', err)
    res.status(500).json({ error: 'Không tải được dữ liệu biểu đồ.' })
  }
})

// Xếp hạng bảng giá: tăng/giảm mạnh nhất + phổ biến nhất (giá trị khớp) trong rổ thanh khoản cao.
router.get('/market/movers', async (req, res) => {
  const limit = Math.min(20, Math.max(3, Number(req.query.limit) || 10))
  try {
    res.json(await getMovers(limit))
  } catch (err) {
    console.error('[stocks:movers]', err)
    res.status(500).json({ error: 'Không tải được bảng xếp hạng.' })
  }
})

// Nến VN-Index cho biểu đồ tổng quan ở trang chủ (?tf=D|W|M). Giá chỉ số (không ×1000).
router.get('/market/index-candles', async (req, res) => {
  const tf = String(req.query.tf || 'D').trim()
  try {
    res.json(await getIndexCandles(tf))
  } catch (err) {
    console.error('[stocks:index-candles]', err)
    res.status(500).json({ error: 'Không tải được biểu đồ VN-Index.' })
  }
})

// Tin tức thị trường từ CafeF RSS.
router.get('/market/news', async (req, res) => {
  const size = Math.min(20, Math.max(5, Number(req.query.size) || 10))
  res.json(await getMarketNews({ size }))
})

export default router
