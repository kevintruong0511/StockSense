// Định dạng + tô màu ô trên bảng điện. Tách khỏi PriceBoard.jsx để test thuần logic.

// Màu bảng điện chuẩn VN: trần = tím, sàn = lơ (cyan), tham chiếu = vàng, tăng = lá, giảm = đỏ.
export const CEIL = '#8B5CF6'
export const FLOORC = '#06B6D4'
export const REF = '#CA8A04'
export const UP = '#16A34A'
export const DOWN = '#DC2626'
export const MUTED = '#94A3B8'

// Màu ô giá khớp theo tương quan trần/sàn/tham chiếu.
export function priceColor(r) {
  if (r.price == null) return MUTED
  if (r.ceiling != null && r.price >= r.ceiling) return CEIL
  if (r.floorPrice != null && r.price <= r.floorPrice) return FLOORC
  if (r.ref != null && r.price > r.ref) return UP
  if (r.ref != null && r.price < r.ref) return DOWN
  return REF
}

export const vnd = (n) => (n == null ? '—' : n.toLocaleString('en-US'))
export const pctStr = (p) => (p == null ? '—' : (p >= 0 ? '+' : '') + p.toFixed(2) + '%')
export const chgStr = (c) => (c == null ? '—' : (c >= 0 ? '+' : '') + c.toLocaleString('en-US'))

export function volShort(v) {
  if (v == null) return '—'
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'tr'
  if (v >= 1e3) return Math.round(v / 1e3).toLocaleString('en-US') + 'K'
  return v.toLocaleString('en-US')
}

// Bội số KL hôm nay so với bình quân 20 phiên (volRatio). ≥ 1× = KL hôm nay ≥ TB20 (đột biến).
export const ratioStr = (x) => (x == null ? '—' : x.toFixed(2) + '×')
export function ratioStyle(x) {
  if (x == null) return { color: MUTED, background: 'transparent' } // chưa có TB20
  if (x >= 2) return { color: '#15803D', background: 'rgba(22,163,74,.20)' } // đột biến mạnh (≥2×)
  if (x >= 1) return { color: UP, background: 'rgba(22,163,74,.12)' } // trên bình quân (≥1×)
  return { color: MUTED, background: 'transparent' } // dưới bình quân
}
