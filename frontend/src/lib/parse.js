// Đọc số người dùng gõ ở ô nhập (Portfolio) theo thói quen VN.
// Tách khỏi màn Portfolio để test được mà không kéo React.

// Chỉ cho gõ chữ số + phân cách kiểu Việt ('.' nghìn, ',' thập phân) vào ô số.
export const sanitizeNumInput = (s) => String(s ?? '').replace(/[^\d.,]/g, '')

// Số lượng cổ phiếu kiểu Việt: '.' phân cách nghìn, ',' thập phân (hiếm dùng).
// "1.000" → 1000 ; "1500" → 1500. NaN nếu sai.
export function parseShares(s) {
  const t = String(s ?? '').trim().replace(/\s/g, '')
  if (!t) return NaN
  const normalized = t.replace(/\./g, '').replace(',', '.')
  if (!/^\d*\.?\d+$/.test(normalized)) return NaN
  return Number(normalized)
}

// Giá cổ phiếu nhập theo NGHÌN đồng — đúng cách niêm yết quen thuộc (71,25 = 71.250đ).
// Dấu chấm HOẶC phẩy đều là dấu THẬP PHÂN. Trả về ĐỒNG (đã ×1000). NaN nếu sai.
export function parsePriceToVnd(s) {
  const t = String(s ?? '').trim().replace(/\s/g, '').replace(',', '.')
  if (!t || !/^\d*\.?\d+$/.test(t)) return NaN
  return Math.round(Number(t) * 1000)
}
