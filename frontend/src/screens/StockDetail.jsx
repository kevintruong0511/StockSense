import { useEffect, useMemo, useState } from 'react'
import StockChart from '../components/StockChart.jsx'
import { Sparkle, Refresh, DownloadFile, Flag, AlertTriangle, InfoCircle } from '../components/icons.jsx'
import { STOCKS, candles, sliceByTf, formatVND, upDown, pctStr, chgStr, decimal } from '../data/stocks.js'
import { tabDef, tfDef, finYears, finRows, techRows, aiMetrics, aiRedFlags, aiRisks, news } from '../data/appData.js'
import { useRealtimeQuotes, useFlash, fetchCandles, fetchRatios, fetchOverview } from '../data/market.js'

const PEER_MARGIN = { FPT: '40,5%', CMG: '21,3%', ELC: '18,7%' }
const providerLabel = (p) =>
  p === 'dnse' ? 'DNSE realtime' : p === 'simulated' ? 'mô phỏng realtime' : 'vnstock'
const pctVN = (x) => (x * 100).toFixed(1).replace('.', ',') + '%'

export default function StockDetail({ ticker, tab, onTab, tf, onTf, aiText, aiStatus, onReanalyze, onGoDashboard, onGoCompare }) {
  const cur = STOCKS[ticker]

  // ----- giá realtime (WebSocket) -----
  const { quotes, provider } = useRealtimeQuotes([ticker])
  const live = quotes[ticker]
  const price = live ? live.price : cur.price
  const pct = live ? live.pct : cur.pct
  const chg = live ? live.change : cur.chg
  const color = upDown(pct)
  const priceFlash = useFlash(live?.price)

  // ----- nến thật (VNDIRECT), fallback về nến mô phỏng -----
  const [chartData, setChartData] = useState(() => {
    const cd = candles(ticker)
    return { candles: cd.candles, vols: cd.vols, source: 'mock' }
  })
  useEffect(() => {
    let cancelled = false
    const cd = candles(ticker)
    setChartData({ candles: cd.candles, vols: cd.vols, source: 'mock' })
    fetchCandles(ticker)
      .then((r) => {
        if (cancelled || r.source !== 'vndirect' || !r.candles?.length) return
        setChartData({ candles: r.candles, vols: r.vols, source: 'vndirect' })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [ticker])
  const chart = useMemo(
    () => ({ candles: sliceByTf(chartData.candles, tf), vols: sliceByTf(chartData.vols, tf) }),
    [chartData, tf],
  )

  // ----- chỉ số & hồ sơ thật (VNDIRECT), fallback về mock -----
  const [ratios, setRatios] = useState(null)
  const [overview, setOverview] = useState(null)
  useEffect(() => {
    let cancelled = false
    setRatios(null)
    setOverview(null)
    fetchRatios(ticker).then((r) => !cancelled && r.source === 'vndirect' && setRatios(r)).catch(() => {})
    fetchOverview(ticker).then((r) => !cancelled && r.source === 'vndirect' && setOverview(r)).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [ticker])

  const peStr = ratios?.pe != null ? decimal(ratios.pe) : decimal(cur.pe)
  const pbStr = ratios?.pb != null ? decimal(ratios.pb) : decimal(cur.pb)
  const divStr = ratios?.dividendYield != null ? pctVN(ratios.dividendYield) : '~2,5%'

  const stats = [
    { label: 'Vốn hóa', value: cur.cap },
    { label: 'P/E', value: peStr },
    { label: 'P/B', value: pbStr },
    { label: 'ROE', value: cur.roe },
    { label: 'EPS', value: cur.eps },
    { label: 'KLGD', value: live ? live.volume.toLocaleString('vi-VN') : cur.vol },
    { label: 'Đỉnh 52T', value: cur.high52 },
    { label: 'Đáy 52T', value: cur.low52 },
  ]
  const profileFacts = [
    { label: 'Sàn niêm yết', value: overview?.exchange || cur.exch },
    { label: 'Ngành', value: cur.sector },
    { label: 'Cao/Thấp 52 tuần', value: cur.low52 + ' – ' + cur.high52 },
    { label: 'Cổ tức (dự phóng)', value: divStr },
    ...(overview?.foundedDate
      ? [{ label: 'Năm thành lập', value: overview.foundedDate.slice(0, 4) }]
      : []),
    ...(overview?.employees
      ? [{ label: 'Nhân sự', value: overview.employees.toLocaleString('vi-VN') }]
      : []),
  ]
  const peerRows = ['FPT', 'CMG', 'ELC'].map((t) => {
    const s = STOCKS[t]
    return { code: t, pe: decimal(s.pe), pb: decimal(s.pb), roe: s.roe, margin: PEER_MARGIN[t] || '—', hl: t === ticker }
  })

  const streaming = aiStatus === 'streaming'
  const done = aiStatus === 'done'

  return (
    <div>
      {/* breadcrumb */}
      <div className="mb-3.5 flex items-center gap-[7px] text-[12.5px] text-slate-400">
        <button onClick={onGoDashboard} className="hover:text-slate-600">Trang chủ</button> ›
        <span className="text-slate-500">Cổ phiếu</span> ›
        <span className="tnum font-semibold text-slate-900">{ticker}</span>
      </div>

      {/* header */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-6 py-[22px]">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-[13px] text-lg font-extrabold"
              style={{ background: cur.logoBg, color: cur.logoFg }}
            >
              {cur.short}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="tnum m-0 text-[26px] font-extrabold tracking-[-0.02em]">{ticker}</h1>
                <span className="rounded-md bg-blue-50 px-2.5 py-[3px] text-[11.5px] font-bold text-blue-600">
                  {cur.exch}
                </span>
                <span className="rounded-md bg-slate-100 px-2.5 py-[3px] text-[11.5px] font-semibold text-slate-500">
                  {cur.sector}
                </span>
              </div>
              <p className="m-0 mt-[5px] text-sm text-slate-500">{cur.name}</p>
            </div>
          </div>
          <div className="text-right">
            <div
              className={'tnum rounded-lg px-1 text-[34px] font-extrabold leading-none tracking-[-0.02em] ' + priceFlash}
              style={{ color }}
            >
              {formatVND(price)}
            </div>
            <div className="tnum mt-1.5 text-[15px] font-bold" style={{ color }}>
              {chgStr(chg)} ({pctStr(pct)})
            </div>
            <div className="mt-[5px] flex items-center justify-end gap-1.5 text-[11.5px] text-slate-400">
              <span
                className={'inline-block h-[7px] w-[7px] rounded-full bg-green-600' + (provider ? ' ss-pulse' : '')}
              />
              {provider ? 'Giá trực tiếp' : 'Cập nhật 09:15 08/07/2026'} — nguồn {providerLabel(provider)}
            </div>
          </div>
        </div>

        {/* key stats row */}
        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-px overflow-hidden rounded-xl bg-slate-100">
          {stats.map((k) => (
            <div key={k.label} className="bg-white px-4 py-[13px]">
              <div className="mb-1 text-[11.5px] text-slate-400">{k.label}</div>
              <div className="tnum text-[15px] font-bold">{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* chart card */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 pb-5 pt-[18px]">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="m-0 text-base font-bold">Biểu đồ giá &amp; khối lượng</h2>
          <div className="flex gap-1 rounded-[9px] bg-slate-100 p-[3px]">
            {tfDef.map((t) => {
              const active = tf === t
              return (
                <button
                  key={t}
                  onClick={() => onTf(t)}
                  className={
                    'tnum rounded-[7px] px-3.5 py-1.5 text-[12.5px] font-semibold ' +
                    (active ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,.1)]' : 'text-slate-500')
                  }
                >
                  {t}
                </button>
              )
            })}
          </div>
        </div>
        <div className="h-[340px] w-full">
          <StockChart candles={chart.candles} vols={chart.vols} />
        </div>
        <div className="mt-3 flex items-center gap-[18px] text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-green-600" />
            Tăng
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-red-600" />
            Giảm
          </span>
          <span className="ml-auto text-slate-400">
            Giá đơn vị nghìn đồng ·{' '}
            {chartData.source === 'vndirect'
              ? 'nguồn VNDIRECT (nến EOD thật)'
              : 'dữ liệu nến mô phỏng'}
          </span>
        </div>
      </div>

      {/* tabs */}
      <div className="mb-[22px] flex gap-0.5 overflow-x-auto border-b border-slate-200">
        {tabDef.map(([key, label]) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => onTab(key)}
              className={
                'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ' +
                (active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700')
              }
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* main + AI */}
      <div className="grid gap-5">
        {/* tab content */}
        <div>
          {tab === 'overview' && (
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-6 py-[22px]">
              <h3 className="m-0 mb-3.5 text-[15px] font-bold">Hồ sơ doanh nghiệp</h3>
              <p className="m-0 mb-[18px] text-sm leading-[1.7] text-slate-700 [text-wrap:pretty]">{cur.profile}</p>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
                {profileFacts.map((p) => (
                  <div key={p.label} className="border-l-2 border-slate-200 pl-3">
                    <div className="mb-[3px] text-xs text-slate-400">{p.label}</div>
                    <div className="tnum text-sm font-semibold">{p.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'fin' && (
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-6 py-[22px]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="m-0 text-[15px] font-bold">Chỉ số tài chính</h3>
                <span className="text-xs text-slate-400">Đơn vị: tỷ đồng · năm 2021–2025</span>
              </div>
              <div className="overflow-x-auto">
                <table className="tnum w-full min-w-[520px] border-collapse text-[13.5px]">
                  <thead>
                    <tr className="text-right text-xs text-slate-400">
                      <th className="px-2.5 py-2 text-left font-semibold">Chỉ tiêu</th>
                      {finYears.map((y) => (
                        <th key={y} className="px-2.5 py-2 font-semibold">{y}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {finRows.map((r) => (
                      <tr key={r.label} className="border-t border-slate-100 text-right">
                        <td className="px-2.5 py-2.5 text-left font-semibold text-slate-600">{r.label}</td>
                        {r.cells.map((c, i) => (
                          <td key={i} className="px-2.5 py-2.5 text-slate-800">{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'news' && (
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-6 py-[22px]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="m-0 text-[15px] font-bold">Tin tức &amp; tâm lý thị trường</h3>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-slate-500">Sentiment 7 ngày</span>
                  <span className="rounded-md bg-green-100 px-2.5 py-[3px] text-[12.5px] font-bold text-green-600">
                    Tích cực 68%
                  </span>
                </div>
              </div>
              <div className="mb-5 flex h-2 overflow-hidden rounded-md">
                <div className="bg-green-600" style={{ width: '68%' }} />
                <div className="bg-slate-300" style={{ width: '20%' }} />
                <div className="bg-red-600" style={{ width: '12%' }} />
              </div>
              {news.map((n) => (
                <div key={n.title} className="flex gap-3.5 border-t border-slate-100 py-3.5">
                  <span
                    className="mt-0.5 h-fit flex-none rounded-[5px] px-2 py-[3px] text-[10.5px] font-bold"
                    style={{ color: n.sentFg, background: n.sentBg }}
                  >
                    {n.sent}
                  </span>
                  <div>
                    <div className="text-sm font-semibold leading-[1.45] text-slate-800">{n.title}</div>
                    <div className="mt-1 text-xs text-slate-400">{n.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'peers' && (
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-6 py-[22px]">
              <h3 className="m-0 mb-1.5 text-[15px] font-bold">So sánh nhanh trong ngành</h3>
              <p className="m-0 mb-4 text-[13px] text-slate-500">
                Mở màn{' '}
                <button onClick={onGoCompare} className="font-semibold text-blue-600">So sánh ngành</button>{' '}
                để tuỳ chọn đầy đủ.
              </p>
              <div className="overflow-x-auto">
                <table className="tnum w-full min-w-[480px] border-collapse text-[13.5px]">
                  <thead>
                    <tr className="text-right text-xs text-slate-400">
                      <th className="px-2.5 py-2 text-left font-semibold">Mã</th>
                      <th className="px-2.5 py-2 font-semibold">P/E</th>
                      <th className="px-2.5 py-2 font-semibold">P/B</th>
                      <th className="px-2.5 py-2 font-semibold">ROE</th>
                      <th className="px-2.5 py-2 font-semibold">Biên LN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peerRows.map((r) => (
                      <tr key={r.code} className="border-t border-slate-100 text-right" style={{ background: r.hl ? '#F8FAFF' : '#fff' }}>
                        <td className="px-2.5 py-2.5 text-left font-bold">{r.code}</td>
                        <td className="px-2.5 py-2.5">{r.pe}</td>
                        <td className="px-2.5 py-2.5">{r.pb}</td>
                        <td className="px-2.5 py-2.5">{r.roe}</td>
                        <td className="px-2.5 py-2.5">{r.margin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'tech' && (
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-6 py-[22px]">
              <h3 className="m-0 mb-4 text-[15px] font-bold">Chỉ báo kỹ thuật</h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3.5">
                {techRows.map((t) => (
                  <div key={t.label} className="rounded-[11px] border border-slate-100 px-4 py-3.5">
                    <div className="mb-[5px] text-xs text-slate-400">{t.label}</div>
                    <div className="tnum mb-1 text-base font-bold">{t.value}</div>
                    <div className="text-[11.5px] font-semibold" style={{ color: t.sigFg }}>{t.signal}</div>
                  </div>
                ))}
              </div>
              <p className="m-0 mt-4 text-xs leading-[1.6] text-slate-400">
                Chỉ báo kỹ thuật chỉ phản ánh diễn biến giá quá khứ, không đảm bảo xu hướng tương lai.
              </p>
            </div>
          )}
        </div>

        {/* AI analysis panel */}
        <div className="overflow-hidden rounded-[18px] border-[1.5px] border-blue-100 bg-gradient-to-b from-[#F8FAFF] to-white">
          <div className="flex items-center justify-between border-b border-blue-50 bg-gradient-to-br from-blue-600/[.06] to-transparent px-[22px] py-[18px]">
            <div className="flex items-center gap-[11px]">
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-600 to-violet-600">
                <Sparkle size={19} className="text-white" />
              </div>
              <div>
                <div className="text-[15px] font-extrabold tracking-[-0.01em]">Phân tích AI</div>
                <div className="flex items-center gap-[5px] text-[11px] font-semibold text-blue-600">
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-100 text-[9px]">C</span>
                  Phân tích bởi Claude AI
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onReanalyze}
                title="Phân tích lại"
                className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-blue-100 bg-white hover:bg-blue-50"
              >
                <Refresh size={16} className="text-blue-600" />
              </button>
              <button
                title="Xuất PDF"
                className="flex h-[34px] items-center gap-[7px] rounded-[9px] border border-blue-100 bg-white px-3.5 text-[13px] font-semibold text-blue-600 hover:bg-blue-50"
              >
                <DownloadFile size={15} />
                PDF
              </button>
            </div>
          </div>

          <div className="px-[22px] py-5">
            {streaming && (
              <div className="mb-3.5 flex items-center gap-[9px] text-[13px] font-semibold text-blue-600">
                <span className="ss-spin inline-block h-4 w-4 rounded-full border-2 border-blue-100 border-t-blue-600" />
                AI đang phân tích…
              </div>
            )}

            {/* summary */}
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">Tóm tắt</div>
            <p className="m-0 mb-5 min-h-[20px] whitespace-pre-wrap text-sm leading-[1.7] text-slate-800 [text-wrap:pretty]">
              {aiText}
              {streaming && <span className="ss-blink" />}
            </p>

            {done && (
              <div>
                {/* metrics */}
                <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">
                  Chỉ số then chốt
                </div>
                <div className="mb-5 flex flex-col gap-0.5">
                  {aiMetrics.map((m) => (
                    <div key={m.label} className="flex items-center justify-between rounded-[9px] bg-slate-50 px-3 py-[9px]">
                      <span className="text-[13.5px] font-medium text-slate-600">{m.label}</span>
                      <span className="flex items-center gap-[7px]">
                        <span className="tnum text-sm font-bold text-slate-800">{m.value}</span>
                        <span
                          className="tnum inline-flex items-center gap-0.5 text-[12.5px] font-bold"
                          style={{ color: m.trendColor }}
                        >
                          {m.arrow} {m.delta}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>

                {/* red flags */}
                <div className="mb-3.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
                  <div className="mb-2.5 flex items-center gap-2 text-[13px] font-extrabold text-red-600">
                    <Flag size={16} />
                    Red Flags
                  </div>
                  {aiRedFlags.map((r, i) => (
                    <div key={i} className="flex gap-[9px] py-1.5 text-[13px] leading-[1.5] text-red-900">
                      <span className="flex-none font-extrabold text-red-600">•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>

                {/* risks */}
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                  <div className="mb-2.5 flex items-center gap-2 text-[13px] font-extrabold text-amber-700">
                    <AlertTriangle size={16} />
                    Rủi ro cần lưu ý
                  </div>
                  {aiRisks.map((r, i) => (
                    <div key={i} className="flex gap-[9px] py-1.5 text-[13px] leading-[1.5] text-amber-900">
                      <span className="flex-none font-extrabold text-amber-700">•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>

                {/* confidence */}
                <div className="mb-3.5 rounded-xl border border-slate-200 px-4 py-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[12.5px] font-bold text-slate-600">Độ tin cậy phân tích</span>
                    <span className="tnum text-[12.5px] font-extrabold text-green-600">Cao · 82%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-[5px] bg-slate-100">
                    <div className="h-full bg-green-600" style={{ width: '82%' }} />
                  </div>
                  <p className="m-0 mt-2.5 text-[11.5px] leading-[1.55] text-slate-400">
                    <strong className="text-slate-500">Giả định:</strong> dựa trên BCTC kiểm toán 2021–2025
                    và tin tức 30 ngày gần nhất. Chưa phản ánh biến động sau ngày cập nhật.
                  </p>
                </div>
              </div>
            )}

            {/* disclaimer */}
            <div className="flex gap-2 rounded-[10px] bg-slate-100 px-3 py-[11px]">
              <InfoCircle size={15} className="mt-px flex-none text-slate-400" />
              <span className="text-[11.5px] leading-[1.5] text-slate-400">
                Nội dung do AI tạo, chỉ để tham khảo — <strong className="text-slate-500">không phải lời khuyên đầu tư</strong>.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
