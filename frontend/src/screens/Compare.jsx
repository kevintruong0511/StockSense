import { Sparkle, Plus, InfoCircle } from '../components/icons.jsx'
import { STOCKS, formatVND, upDown, pctStr, decimal } from '../data/stocks.js'
import { compareVerdict } from '../data/appData.js'

const BLUE = '#2563EB'
const DARK = '#1E293B'

const METRICS = [
  { label: 'Giá hiện tại', val: (s) => formatVND(s.price) },
  { label: 'Vốn hóa', val: (s) => s.cap },
  { label: 'P/E', val: (s) => decimal(s.pe), best: 'min', num: (s) => s.pe },
  { label: 'P/B', val: (s) => decimal(s.pb), best: 'min', num: (s) => s.pb },
  { label: 'ROE', val: (s) => s.roe, best: 'max', num: (s) => parseFloat(s.roe.replace(',', '.')) },
  { label: 'EPS (đồng)', val: (s) => s.eps },
  { label: '+/- hôm nay', val: (s) => pctStr(s.pct), pctColor: true },
]

const truncate = (name) => (name.length > 18 ? name.slice(0, 17) + '…' : name)

export default function Compare({ compare, onRemove, onAdd, canAdd }) {
  const cols = compare.map((t) => ({ code: t, name: truncate(STOCKS[t].name) }))

  const rows = METRICS.map((m) => {
    let bestT = null
    if (m.best) {
      const vals = compare.map((t) => ({ t, v: m.num(STOCKS[t]) }))
      vals.sort((a, b) => (m.best === 'min' ? a.v - b.v : b.v - a.v))
      bestT = vals[0].t
    }
    return {
      label: m.label,
      cells: compare.map((t) => {
        const s = STOCKS[t]
        return {
          value: m.val(s),
          weight: t === bestT ? 800 : 600,
          color: m.pctColor ? upDown(s.pct) : t === bestT ? BLUE : DARK,
        }
      }),
    }
  })

  return (
    <div>
      <h1 className="m-0 mb-1 text-[26px] font-extrabold tracking-[-0.02em]">
        So sánh doanh nghiệp cùng ngành
      </h1>
      <p className="m-0 mb-[22px] text-sm text-slate-500">
        Ngành Công nghệ thông tin · chọn 2–4 mã để so sánh chỉ số định giá.
      </p>

      {/* chosen chips */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        {compare.map((t) => {
          const s = STOCKS[t]
          return (
            <div
              key={t}
              className="flex items-center gap-2.5 rounded-[11px] border-[1.5px] border-blue-100 bg-white py-2 pl-3 pr-2.5"
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[10px] font-bold"
                style={{ background: s.logoBg, color: s.logoFg }}
              >
                {s.short}
              </div>
              <span className="tnum text-sm font-bold">{t}</span>
              <button
                onClick={() => onRemove(t)}
                className="px-0.5 text-lg leading-none text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
          )
        })}
        {canAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 rounded-[11px] border-[1.5px] border-dashed border-slate-300 bg-white px-3.5 py-[9px] text-[13px] font-semibold text-slate-600 hover:border-slate-400"
          >
            <Plus size={15} />
            Thêm mã
          </button>
        )}
      </div>

      {/* comparison table */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="tnum w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Chỉ tiêu
                </th>
                {cols.map((c) => (
                  <th key={c.code} className="min-w-[120px] px-4 py-3.5 text-right">
                    <div className="flex flex-col items-end gap-[3px]">
                      <span className="text-[15px] font-extrabold">{c.code}</span>
                      <span className="text-[11px] font-medium text-slate-400">{c.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-slate-100">
                  <td className="px-5 py-3 text-left font-semibold text-slate-600">{r.label}</td>
                  {r.cells.map((c, i) => (
                    <td
                      key={i}
                      className="px-4 py-3 text-right"
                      style={{ fontWeight: c.weight, color: c.color }}
                    >
                      {c.value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI verdict */}
      <div className="rounded-2xl border-[1.5px] border-blue-100 bg-gradient-to-b from-[#F8FAFF] to-white px-[22px] py-5">
        <div className="mb-3.5 flex items-center gap-2.5">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-gradient-to-br from-blue-600 to-violet-600">
            <Sparkle size={17} className="text-white" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold">Nhận xét tổng hợp từ AI</div>
            <div className="text-[11px] font-semibold text-blue-600">Phân tích bởi Claude AI</div>
          </div>
        </div>
        <p className="m-0 mb-3.5 text-sm leading-[1.7] text-slate-800 [text-wrap:pretty]">{compareVerdict}</p>
        <div className="flex gap-2 rounded-[10px] bg-slate-100 px-3 py-[11px]">
          <InfoCircle size={15} className="mt-px flex-none text-slate-400" />
          <span className="text-[11.5px] leading-[1.5] text-slate-400">
            Nội dung do AI tạo, chỉ để tham khảo — <strong className="text-slate-500">không phải lời khuyên đầu tư</strong>.
          </span>
        </div>
      </div>
    </div>
  )
}
