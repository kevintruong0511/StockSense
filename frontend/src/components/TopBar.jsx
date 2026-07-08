import { Search, Bell } from './icons.jsx'

export default function TopBar({ query, onQuery, autoResults, onSelectTicker }) {
  const showAuto = autoResults.length > 0

  return (
    <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-slate-100/85 px-8 py-3.5 backdrop-blur">
      {/* search */}
      <div className="relative w-full max-w-[520px]">
        <div className="flex items-center gap-2.5 rounded-[11px] border-[1.5px] border-slate-200 bg-white px-3.5 py-2.5 focus-within:border-blue-600">
          <Search size={18} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Tìm mã cổ phiếu, doanh nghiệp…"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded-[5px] border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-400">
            /
          </kbd>
        </div>

        {/* autocomplete */}
        {showAuto && (
          <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,.12)]">
            {autoResults.map((r) => (
              <button
                key={r.code}
                onClick={() => onSelectTicker(r.code)}
                className="flex w-full items-center gap-3 border-b border-slate-100 px-3.5 py-2.5 text-left last:border-b-0 hover:bg-slate-50"
              >
                <span className="tnum w-[52px] text-sm font-bold">{r.code}</span>
                <span className="flex-1 text-[13px] text-slate-600">{r.name}</span>
                <span className="rounded-[5px] bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-400">
                  {r.exch}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* right cluster */}
      <div className="ml-auto flex items-center gap-2">
        <div className="tnum flex items-center gap-1.5 rounded-[9px] border border-slate-200 bg-white px-3 py-[7px] text-[13px] font-semibold">
          <span className="text-slate-500">VN-Index</span>
          <span>1.284,7</span>
          <span className="text-green-600">+0,84%</span>
        </div>
        <button className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50">
          <Bell size={18} />
        </button>
      </div>
    </div>
  )
}
