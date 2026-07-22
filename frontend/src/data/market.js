// Lớp dữ liệu thị trường phía client (REST, cần đăng nhập).
// Chỉ còn tổng quan thị trường + tin tức cho Dashboard.
import { getToken } from './auth.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

async function authedGet(path) {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Không tải được dữ liệu.')
  }
  return res.json()
}

async function authedPost(path, body) {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body || {}),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Không thực hiện được yêu cầu.')
  }
  return res.json()
}

export const fetchMarketOverview = () => authedGet('/stocks/market/overview')
export const fetchMarketNews = (size = 10) => authedGet(`/stocks/market/news?size=${size}`)

// Bảng điện: giá thật nhiều mã trong 1 request. Truyền danh sách mã hoặc dùng nhóm VN30.
export const fetchPriceBoard = (codes) =>
  authedGet(`/stocks/market/board?codes=${encodeURIComponent((codes || []).join(','))}`)
export const fetchPriceBoardGroup = (group = 'vn30') =>
  authedGet(`/stocks/market/board?group=${encodeURIComponent(group)}`)

// Xếp hạng: { gainers, losers, active, asOf }. active = phổ biến nhất (theo giá trị khớp).
export const fetchMovers = (limit = 10) => authedGet(`/stocks/market/movers?limit=${limit}`)

// Mã được phân tích nhiều nhất (đếm phiên chat thật) trong N ngày qua.
export const fetchTopAnalyzed = (days = 7, limit = 5) =>
  authedGet(`/stocks/market/top-analyzed?days=${days}&limit=${limit}`)

// Chi tiết một mã (giá, định giá, cơ bản, kỹ thuật, hồ sơ) — dữ liệu THẬT, fetch mới.
export const fetchStockDetail = (code) =>
  authedGet(`/stocks/detail?code=${encodeURIComponent(String(code || '').trim().toUpperCase())}`)

// Nến OHLCV thật cho biểu đồ. tf: '15' | '60' | 'D' | 'W' | 'M'.
export const fetchCandles = (code, tf = 'D') =>
  authedGet(`/stocks/candles?code=${encodeURIComponent(String(code || '').trim().toUpperCase())}&tf=${encodeURIComponent(tf)}`)

// Nến VN-Index cho biểu đồ tổng quan trang chủ. tf: 'D' | 'W' | 'M'.
export const fetchIndexCandles = (tf = 'D') =>
  authedGet(`/stocks/market/index-candles?tf=${encodeURIComponent(tf)}`)

// Danh mục chiến lược kiểm chứng + tham số mặc định (để render form). Trả { strategies }.
export const fetchStrategies = () => authedGet('/stocks/strategies')

// Chạy kiểm chứng (backtest) một mã. Trả metrics + đường vốn + benchmark + lệnh + markers.
export const runBacktest = ({ code, strategy, params, years }) =>
  authedPost('/stocks/backtest', { code, strategy, params, years })
