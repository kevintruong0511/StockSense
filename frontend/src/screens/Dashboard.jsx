import { useEffect, useState } from 'react'
import { Clock, LineChart, AlertCircle } from '../components/icons.jsx'
import { STOCKS, formatVND, upDown, pctStr, chgStr } from '../data/stocks.js'
import { fetchMarketOverview, fetchMarketNews } from '../data/market.js'

const UP = '#16A34A'
const DOWN = '#DC2626'
const BLUE = '#2563EB'

// Màu theo chiều VN-Index.
const vniColor = (pct) => (pct >= 0 ? UP : DOWN)

// Định dạng chỉ số VN-Index.
const idxFmt = (n) =>
  n == null ? '—' : n.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Tính stat cards từ dữ liệu thị trường thật.
function buildDashStats(vni, breadth) {
  const pct = vni?.pct
  const deltaColor = pct != null ? vniColor(pct) : BLUE
  const deltaLabel = pct != null
    ? (pct >= 0 ? '+' : '') + pct.toFixed(2).replace('.', ',') + '% hôm nay'
    : 'đang cập nhật'
  return [
    {
      label: 'VN-Index',
      value: idxFmt(vni?.index),
      delta: deltaLabel,
      color: deltaColor,
    },
    {
      label: 'Mã tăng',
      value: breadth?.gainers != null ? String(breadth.gainers) : '…',
      delta:
        breadth?.gainers != null
          ? `${breadth.gainers + breadth.losers + breadth.unchanged} mã đang giao dịch`
          : 'đang cập nhật',
      color: UP,
    },
    {
      label: 'Mã giảm',
      value: breadth?.losers != null ? String(breadth.losers) : '…',
      delta:
        breadth?.gainers != null
          ? `${breadth.gainers} tăng · ${breadth.unchanged} đứng giá`
          : 'đang cập nhật',
      color: DOWN,
    },
    {
      label: 'Khối lượng',
      value: vni?.vol != null ? (vni.vol / 1e6).toFixed(1).replace('.', ',') + 'M' : '…',
      delta: 'khớp lệnh phiên hôm nay',
      color: BLUE,
    },
  ]
}

const WATCH = ['FPT', 'HPG', 'VNM', 'VCB', 'MWG', 'CMG']
const TOP = ['FPT', 'VCB', 'HPG', 'MWG', 'VNM']

export default function Dashboard({ newsState: newsStateProp, onRetryNews }) {
  // Dữ liệu thị trường thật.
  const [dashStats, setDashStats] = useState(null)
  const [dashLoading, setDashLoading] = useState(true)
  const [dashError, setDashError] = useState(null)
  const [newsData, setNewsData] = useState(null)
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsError, setNewsError] = useState(null)

  // Gộp trạng thái news (user-triggered retry vs initial load).
  const effectiveNewsLoading = newsStateProp === 'loading' || (newsLoading && newsData === null)
  const effectiveNewsError = newsStateProp === 'error' || newsError
  const effectiveNewsReady = newsData !== null && newsStateProp !== 'error' && newsStateProp !== 'loading'

  useEffect(() => {
    setDashLoading(true)
    setDashError(null)
    fetchMarketOverview()
      .then((r) => {
        if (r.vni?.source === 'unavailable' && r.breadth?.source === 'unavailable') {
          setDashError('Không tải được dữ liệu thị trường.')
        } else {
          setDashStats(buildDashStats(r.vni, r.breadth))
        }
      })
      .catch((e) => setDashError(e.message))
      .finally(() => setDashLoading(false))
  }, [])

  useEffect(() => {
    setNewsLoading(true)
    setNewsError(null)
    fetchMarketNews(8)
      .then((r) => {
        if (r.source === 'unavailable') setNewsError('Không tải được tin tức.')
        else setNewsData(r.items || [])
      })
      .catch((e) => setNewsError(e.message))
      .finally(() => setNewsLoading(false))
  }, [])

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
          <Clock size={14} />
          VN-Index &amp; tin tức cập nhật thật · giá danh mục là số liệu tham khảo
        </div>
      </div>

      {/* stat cards */}
      <div className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {dashLoading && !dashStats ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-[14px] border border-slate-200 bg-white px-5 py-[18px]">
              <div className="ss-skel mb-2 h-3 w-1/3" />
              <div className="ss-skel mb-1 h-7 w-2/3" />
              <div className="ss-skel h-3 w-1/2" />
            </div>
          ))
        ) : dashError ? (
          <div className="col-span-4 rounded-[14px] border border-slate-200 bg-white px-5 py-[18px] text-sm text-slate-500">
            {dashError}
          </div>
        ) : (
          dashStats.map((s) => (
            <div key={s.label} className="rounded-[14px] border border-slate-200 bg-white px-5 py-[18px]">
              <div className="mb-2 text-[12.5px] font-semibold text-slate-500">{s.label}</div>
              <div className="tnum mb-1 text-2xl font-extrabold tracking-[-0.02em]">{s.value}</div>
              <div className="tnum text-[13px] font-semibold" style={{ color: s.color }}>
                {s.delta}
              </div>
            </div>
          ))
        )}
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
                  <th className="px-5 py-[11px] font-semibold">Khối lượng</th>
                </tr>
              </thead>
              <tbody>
                {WATCH.map((code) => (
                  <WatchRow key={code} code={code} />
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
              <span className="text-xs text-slate-400">Nguồn: CafeF</span>
            </div>

            {effectiveNewsError && (
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

            {effectiveNewsLoading && (
              <div className="px-5 pb-4 pt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border-t border-slate-100 py-3">
                    <div className="ss-skel mb-2 h-[13px] w-[90%]" />
                    <div className="ss-skel h-[11px] w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {effectiveNewsReady && (
              <div className="px-5 pb-2 pt-1">
                {newsData.map((n, idx) => (
                  <a
                    key={idx}
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block cursor-pointer border-t border-slate-100 py-[13px] transition-opacity hover:opacity-75"
                  >
                    <div className="text-[13.5px] font-semibold leading-[1.4] text-slate-800">
                      {n.title}
                    </div>
                    <div className="mt-[3px] text-[11.5px] text-slate-400">
                      CafeF · {n.relative}
                    </div>
                  </a>
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
                <div
                  key={t.code}
                  className="flex w-full items-center gap-3 rounded-[9px] px-2 py-[11px] text-left"
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Một dòng danh mục (số liệu tham khảo tĩnh).
function WatchRow({ code }) {
  const s = STOCKS[code]
  const price = s.price
  const pct = s.pct
  const chg = s.chg
  const color = upDown(pct)
  return (
    <tr className="border-t border-slate-100 text-right">
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
      <td className="tnum px-3 py-[13px] text-sm font-bold">{formatVND(price)}</td>
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
      <td className="tnum px-5 py-[13px] text-[13px] text-slate-500">{s.vol}</td>
    </tr>
  )
}
