import { Clock, LineChart, AlertCircle } from '../components/icons.jsx'
import { STOCKS, formatVND, upDown, pctStr, chgStr } from '../data/stocks.js'
import { dashStats, news } from '../data/appData.js'
import { useRealtimeQuotes, useFlash } from '../data/market.js'

const WATCH = ['FPT', 'HPG', 'VNM', 'VCB', 'MWG', 'CMG']
const TOP = ['FPT', 'VCB', 'HPG', 'MWG', 'VNM']

// Khối lượng dạng gọn kiểu Việt (6,71tr / 540ng).
const volShort = (v) =>
  v >= 1e6
    ? (v / 1e6).toFixed(2).replace('.', ',') + 'tr'
    : (v / 1e3).toFixed(0) + 'ng'

const providerLabel = (p) =>
  p === 'dnse' ? 'DNSE realtime' : p === 'simulated' ? 'mô phỏng realtime' : 'vnstock'

export default function Dashboard({ onSelectTicker, newsState, onRetryNews }) {
  const { quotes, provider } = useRealtimeQuotes(WATCH)

  const topAnalyzed = TOP.map((t, i) => {
    const s = STOCKS[t]
    return {
      rank: i + 1, code: t, short: s.short, logoBg: s.logoBg, logoFg: s.logoFg,
      count: formatVND(1240 - i * 180), pct: pctStr(s.pct), color: upDown(s.pct),
    }
  })

  return (
    <div>
      {/* heading */}
      <div className="mb-[22px] flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="m-0 mb-1 text-[26px] font-extrabold tracking-[-0.02em]">Chào buổi sáng 👋</h1>
          <p className="m-0 text-sm text-slate-500">
            Tổng quan danh mục theo dõi và diễn biến thị trường hôm nay.
          </p>
        </div>
        <div className="flex items-center gap-[7px] text-[12.5px] text-slate-400">
          {provider ? (
            <span className="inline-block h-[7px] w-[7px] rounded-full bg-green-600 ss-pulse" />
          ) : (
            <Clock size={14} />
          )}
          {provider ? 'Giá cập nhật trực tiếp' : 'Cập nhật 09:15 · 08/07/2026'} — nguồn{' '}
          <strong className="text-slate-500">{providerLabel(provider)}</strong>
        </div>
      </div>

      {/* stat cards */}
      <div className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {dashStats.map((s) => (
          <div key={s.label} className="rounded-[14px] border border-slate-200 bg-white px-5 py-[18px]">
            <div className="mb-2 text-[12.5px] font-semibold text-slate-500">{s.label}</div>
            <div className="tnum mb-1 text-2xl font-extrabold tracking-[-0.02em]">{s.value}</div>
            <div className="tnum text-[13px] font-semibold" style={{ color: s.color }}>
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5">
        {/* watchlist */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="m-0 text-base font-bold">Danh mục theo dõi</h2>
            <span className="text-[12.5px] text-slate-400">{WATCH.length} mã</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="text-right text-[11.5px] uppercase tracking-[0.05em] text-slate-400">
                  <th className="px-5 py-[11px] text-left font-semibold">Mã</th>
                  <th className="px-3 py-[11px] font-semibold">Giá</th>
                  <th className="px-3 py-[11px] font-semibold">+/-</th>
                  <th className="px-3 py-[11px] font-semibold">%</th>
                  <th className="px-3 py-[11px] font-semibold">Khối lượng</th>
                  <th className="px-5 py-[11px] font-semibold" />
                </tr>
              </thead>
              <tbody>
                {WATCH.map((code) => (
                  <WatchRow key={code} code={code} quote={quotes[code]} onSelect={onSelectTicker} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* two widgets */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
          {/* market news */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="m-0 text-base font-bold">Tin tức nổi bật</h2>
              <span className="text-xs text-slate-400">Nguồn: CafeF · vietstock</span>
            </div>

            {newsState === 'error' && (
              <div className="px-5 py-[34px] text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
                  <AlertCircle size={22} className="text-red-600" />
                </div>
                <p className="m-0 mb-3 text-[13.5px] text-slate-600">
                  Không tải được tin tức. Vui lòng thử lại.
                </p>
                <button
                  onClick={onRetryNews}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Thử lại
                </button>
              </div>
            )}

            {newsState === 'loading' && (
              <div className="px-5 pb-4 pt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border-t border-slate-100 py-3">
                    <div className="ss-skel mb-2 h-[13px] w-[90%]" />
                    <div className="ss-skel h-[11px] w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {newsState === 'ready' && (
              <div className="px-5 pb-2 pt-1">
                {news.map((n) => (
                  <div
                    key={n.title}
                    className="cursor-pointer border-t border-slate-100 py-[13px] transition-opacity hover:opacity-75"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 flex-none rounded-[5px] px-[7px] py-0.5 text-[10.5px] font-bold"
                        style={{ color: n.sentFg, background: n.sentBg }}
                      >
                        {n.sent}
                      </span>
                      <div>
                        <div className="text-[13.5px] font-semibold leading-[1.4] text-slate-800">
                          {n.title}
                        </div>
                        <div className="mt-[3px] text-[11.5px] text-slate-400">{n.meta}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* top analyzed */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="m-0 text-base font-bold">Được phân tích nhiều</h2>
              <span className="inline-flex items-center gap-[5px] text-[11.5px] font-semibold text-blue-600">
                <LineChart size={13} />
                24h qua
              </span>
            </div>
            <div className="px-3 pb-3 pt-1.5">
              {topAnalyzed.map((t) => (
                <button
                  key={t.code}
                  onClick={() => onSelectTicker(t.code)}
                  className="flex w-full items-center gap-3 rounded-[9px] px-2 py-[11px] text-left hover:bg-slate-50"
                >
                  <span className="tnum w-5 text-center text-[13px] font-extrabold text-slate-300">
                    {t.rank}
                  </span>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold"
                    style={{ background: t.logoBg, color: t.logoFg }}
                  >
                    {t.short}
                  </div>
                  <div className="flex-1 leading-tight">
                    <div className="tnum text-[13.5px] font-bold">{t.code}</div>
                    <div className="text-[11.5px] text-slate-400">{t.count} lượt phân tích</div>
                  </div>
                  <span className="tnum text-[12.5px] font-bold" style={{ color: t.color }}>
                    {t.pct}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Một dòng danh mục: dùng giá realtime nếu có, fallback về dữ liệu tĩnh.
function WatchRow({ code, quote, onSelect }) {
  const s = STOCKS[code]
  const price = quote ? quote.price : s.price
  const pct = quote ? quote.pct : s.pct
  const chg = quote ? quote.change : s.chg
  const color = upDown(pct)
  const flash = useFlash(quote?.price)
  return (
    <tr
      onClick={() => onSelect(code)}
      className="cursor-pointer border-t border-slate-100 text-right hover:bg-slate-50"
    >
      <td className="px-5 py-[13px] text-left">
        <div className="flex items-center gap-[11px]">
          <div
            className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-xs font-bold"
            style={{ background: s.logoBg, color: s.logoFg }}
          >
            {s.short}
          </div>
          <div className="leading-tight">
            <div className="tnum text-sm font-bold">{code}</div>
            <div className="max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] text-slate-400">
              {s.name}
            </div>
          </div>
        </div>
      </td>
      <td className={'tnum px-3 py-[13px] text-sm font-bold ' + flash}>{formatVND(price)}</td>
      <td className="tnum px-3 py-[13px] text-[13px] font-semibold" style={{ color }}>
        {chgStr(chg)}
      </td>
      <td className="px-3 py-[13px]">
        <span
          className="tnum inline-block rounded-md px-2 py-[3px] text-[12.5px] font-bold"
          style={{ color, background: pct >= 0 ? '#DCFCE7' : '#FEF2F2' }}
        >
          {pctStr(pct)}
        </span>
      </td>
      <td className="tnum px-3 py-[13px] text-[13px] text-slate-500">
        {quote ? volShort(quote.volume) : s.vol}
      </td>
      <td className="px-5 py-[13px]">
        <span className="whitespace-nowrap text-[12.5px] font-semibold text-blue-600">
          Chi tiết ›
        </span>
      </td>
    </tr>
  )
}
