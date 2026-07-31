// Giờ giao dịch VN (T2–T6, 9:00–15:15) — chỉ khi này mới poll giá cho đỡ tốn.
// Dùng chung cho PriceBoard và Portfolio (trước đây mỗi nơi một bản sao).
export function isMarketHours() {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const wd = p.find((x) => x.type === 'weekday')?.value
  if (wd === 'Sat' || wd === 'Sun') return false
  const t = Number(p.find((x) => x.type === 'hour')?.value) * 60 + Number(p.find((x) => x.type === 'minute')?.value)
  return t >= 540 && t <= 915
}
