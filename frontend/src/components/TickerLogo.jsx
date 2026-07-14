import { useState } from 'react'
import { tickerBadge } from '../data/stocks.js'

// Logo doanh nghiệp (nguồn ảnh Vietstock). Nếu ảnh lỗi / mã không có logo → fallback
// về badge màu + 3 ký tự đầu (tickerBadge). Dùng chung ở bảng giá, top mã, chi tiết mã.
const logoUrl = (code) => `https://finance.vietstock.vn/image/${String(code || '').trim().toUpperCase()}`

export default function TickerLogo({ code = '', size = 32, rounded = 'rounded-lg', className = '' }) {
  const [failed, setFailed] = useState(false)
  const badge = tickerBadge(code)
  const style = { width: size, height: size }

  if (failed) {
    return (
      <div
        className={`flex flex-none items-center justify-center ${rounded} text-[11px] font-bold ${className}`}
        style={{ ...style, background: badge.bg, color: badge.fg }}
      >
        {code.slice(0, 3)}
      </div>
    )
  }
  return (
    <img
      src={logoUrl(code)}
      alt={code}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`flex-none border border-slate-100 bg-white object-contain dark:border-slate-700 ${rounded} ${className}`}
      style={style}
    />
  )
}
