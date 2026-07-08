import { HistoryIcon } from '../components/icons.jsx'
import { STOCKS } from '../data/stocks.js'
import { allHistory, histFilterDefs } from '../data/appData.js'

const matches = (h, filter) =>
  filter === 'all' ||
  (filter === 'stock' && h.cat === 'stock') ||
  (filter === 'report' && h.cat === 'report') ||
  (filter === 'compare' && h.cat === 'compare')

export default function History({ histFilter, onFilter, onOpen }) {
  const items = allHistory.filter((h) => matches(h, histFilter)).map((h) => {
    const base = STOCKS[h.code] || { logoBg: '#F1F5F9', logoFg: '#475569' }
    return { ...h, logoBg: base.logoBg, logoFg: base.logoFg, short: (h.code.split(' ')[0] || h.code).slice(0, 3) }
  })

  return (
    <div>
      <h1 className="m-0 mb-1 text-[26px] font-extrabold tracking-[-0.02em]">Lịch sử phân tích</h1>
      <p className="m-0 mb-5 text-sm text-slate-500">Các phân tích bạn đã lưu. Lọc theo loại để xem nhanh.</p>

      {/* filters */}
      <div className="mb-[18px] flex flex-wrap gap-2">
        {histFilterDefs.map(([key, label]) => {
          const active = histFilter === key
          return (
            <button
              key={key}
              onClick={() => onFilter(key)}
              className={
                'rounded-[9px] border px-[15px] py-2 text-[13px] font-semibold transition-colors ' +
                (active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')
              }
            >
              {label}
            </button>
          )
        })}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-[30px] py-[60px] text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[15px] bg-slate-100">
            <HistoryIcon size={26} className="text-slate-400" />
          </div>
          <div className="mb-1.5 text-base font-bold">Chưa có phân tích nào ở mục này</div>
          <p className="m-0 mb-[18px] text-[13.5px] text-slate-400">
            Thử đổi bộ lọc hoặc bắt đầu một phân tích mới.
          </p>
          <button
            onClick={() => onOpen({ cat: 'stock', code: 'FPT' })}
            className="rounded-[10px] bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Phân tích một mã
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((h, i) => (
            <button
              key={i}
              onClick={() => onOpen(h)}
              className="flex items-center gap-4 rounded-[14px] border border-slate-200 bg-white px-5 py-4 text-left transition-colors hover:border-slate-300"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-[11px] text-[13px] font-bold"
                style={{ background: h.logoBg, color: h.logoFg }}
              >
                {h.short}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-[3px] flex items-center gap-2.5">
                  <span className="tnum text-[15px] font-bold">{h.code}</span>
                  <span
                    className="rounded-[5px] px-2 py-0.5 text-[10.5px] font-bold"
                    style={{ color: h.typeFg, background: h.typeBg }}
                  >
                    {h.type}
                  </span>
                </div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-slate-500">
                  {h.summary}
                </div>
              </div>
              <div className="flex-none text-right">
                <div className="tnum text-[12.5px] text-slate-400">{h.date}</div>
                <div className="mt-1 text-xs font-semibold text-blue-600">Mở lại ›</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
