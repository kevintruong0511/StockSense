import { useEffect, useState } from 'react'
import { Bell } from './icons.jsx'
import { fetchMarketOverview } from '../data/market.js'

const idxFmt = (n) =>
  n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pctFmt = (p) => (p == null ? '' : (p >= 0 ? '+' : '') + p.toFixed(2) + '%')

// Thanh trên cùng của app: VN-Index THẬT (VNDIRECT) + chuông thông báo.
// Tự làm mới mỗi 60s để khớp diễn biến trong ngày.
export default function TopBar() {
  const [vni, setVni] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchMarketOverview()
        .then((r) => !cancelled && r?.vni?.source !== 'unavailable' && setVni(r.vni))
        .catch(() => {})
    load()
    const t = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  const pct = vni?.pct
  const color = pct == null ? 'text-slate-400' : pct >= 0 ? 'text-green-600' : 'text-red-600'

  return (
    <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-slate-100/85 px-8 py-3.5 backdrop-blur">
      <div className="ml-auto flex items-center gap-2">
        <div className="tnum flex items-center gap-1.5 rounded-[9px] border border-slate-200 bg-white px-3 py-[7px] text-[13px] font-semibold">
          <span className="text-slate-500">VN-Index</span>
          <span>{idxFmt(vni?.index)}</span>
          {pct != null && <span className={color}>{pctFmt(pct)}</span>}
        </div>
        <button className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50">
          <Bell size={18} />
        </button>
      </div>
    </div>
  )
}
