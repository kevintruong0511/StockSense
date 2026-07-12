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

export const fetchMarketOverview = () => authedGet('/stocks/market/overview')
export const fetchMarketNews = (size = 10) => authedGet(`/stocks/market/news?size=${size}`)

// Bảng điện: giá thật nhiều mã trong 1 request. Truyền danh sách mã hoặc dùng nhóm VN30.
export const fetchPriceBoard = (codes) =>
  authedGet(`/stocks/market/board?codes=${encodeURIComponent((codes || []).join(','))}`)
export const fetchPriceBoardGroup = (group = 'vn30') =>
  authedGet(`/stocks/market/board?group=${encodeURIComponent(group)}`)

// Mã được phân tích nhiều nhất (đếm phiên chat thật) trong N ngày qua.
export const fetchTopAnalyzed = (days = 7, limit = 5) =>
  authedGet(`/stocks/market/top-analyzed?days=${days}&limit=${limit}`)
