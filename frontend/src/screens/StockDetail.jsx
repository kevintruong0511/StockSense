import { useEffect, useState } from 'react'
import { Sparkle, AlertCircle, Refresh, ArrowRight } from '../components/icons.jsx'
import PriceChart from '../components/PriceChart.jsx'
import TickerLogo from '../components/TickerLogo.jsx'
import { fetchStockDetail, fetchCandles } from '../data/market.js'

const UP = '#16A34A'
const DOWN = '#DC2626'

// Preset khoảng thời gian kiểu TradingView (khớp nhãn với cửa sổ hiển thị).
const TIMEFRAMES = [
  ['1D', '1 Ngày'],
  ['5D', '5 Ngày'],
  ['1M', '1 Tháng'],
  ['3M', '3 Tháng'],
  ['6M', '6 Tháng'],
  ['YTD', 'YTD'],
  ['1Y', '1 Năm'],
  ['5Y', '5 Năm'],
  ['ALL', 'Tất cả'],
]

// ── Định dạng số chuẩn quốc tế (en-US: nghìn = phẩy, thập phân = chấm) ─────────
const vnd = (n) => (n == null ? '—' : Math.round(n).toLocaleString('en-US'))
const num = (n, d = 2) => (n == null ? '—' : Number(n).toFixed(d))
const pctRaw = (p) => (p == null ? '—' : (p >= 0 ? '+' : '') + Number(p).toFixed(2) + '%') // p là % thật
const chgStr = (n) => (n == null ? '—' : (n >= 0 ? '+' : '') + Math.round(n).toLocaleString('en-US')) // ±điểm/đồng
const pctFrac = (x) => (x == null ? '—' : (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%') // x là phân số
const billions = (n) => (n == null ? '—' : (n / 1e9).toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' tỷ')
const volShort = (v) => {
  if (v == null) return '—'
  if (v >= 1e6) return (v / 1e6).toFixed(2) + ' tr'
  if (v >= 1e3) return Math.round(v / 1e3).toLocaleString('en-US') + ' K'
  return v.toLocaleString('en-US')
}
const trendColor = (x) => (x == null ? '#64748B' : x >= 0 ? UP : DOWN)

// Ô số liệu nhỏ.
function Stat({ label, value, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-1 text-[12px] font-semibold text-slate-500 dark:text-slate-400">{label}</div>
      <div
        className={'tnum text-[15px] font-bold' + (color ? '' : ' dark:text-slate-100')}
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="m-0 mb-3.5 text-[15px] font-bold text-slate-900 dark:text-white">{title}</h3>
      {children}
    </div>
  )
}

export default function StockDetail({ code, onBack, onAnalyze, theme }) {
  const [tf, setTf] = useState('6M')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [candles, setCandles] = useState(null)
  const [chartLoading, setChartLoading] = useState(true)

  // Nến cho biểu đồ — nạp lại khi đổi mã hoặc đổi khung thời gian.
  useEffect(() => {
    let cancelled = false
    setChartLoading(true)
    fetchCandles(code, tf)
      .then((r) => {
        if (!cancelled) setCandles(Array.isArray(r.candles) ? r.candles : [])
      })
      .catch(() => {
        if (!cancelled) setCandles([])
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [code, tf, reloadKey])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchStockDetail(code)
      .then((r) => {
        if (!cancelled) setData(r)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Không tải được dữ liệu.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [code, reloadKey])

  const p = data?.price
  const up = p?.pctChange != null && p.pctChange >= 0
  const priceColor = p?.pctChange == null ? (theme === 'dark' ? '#F1F5F9' : '#0F172A') : up ? UP : DOWN

  return (
    <div>
      {/* thanh trên: quay lại + phân tích AI */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowRight size={15} className="rotate-180" />
          Quay lại
        </button>
        <button
          onClick={() => onAnalyze?.(code)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,.3)] transition-colors hover:bg-blue-700"
        >
          <Sparkle size={15} />
          Phân tích bằng AI
          <ArrowRight size={15} />
        </button>
      </div>

      {/* header mã */}
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <TickerLogo code={code} size={48} rounded="rounded-xl" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="tnum text-2xl font-extrabold tracking-[-0.02em] dark:text-white">{code}</span>
            {data?.exchange && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {data.exchange}
              </span>
            )}
          </div>
          <div className="max-w-[420px] truncate text-[13px] text-slate-500 dark:text-slate-400">
            {loading ? 'Đang tải…' : data?.name || '—'}
          </div>
        </div>
        {p && (
          <div className="ml-auto text-right">
            <div className="tnum text-2xl font-extrabold" style={{ color: priceColor }}>
              {vnd(p.close)}
            </div>
            <div className="tnum text-[13px] font-bold" style={{ color: priceColor }}>
              {chgStr(p.change)} ({pctRaw(p.pctChange)})
              {p.date ? <span className="ml-2 font-medium text-slate-400 dark:text-slate-500">· phiên {p.date}</span> : null}
            </div>
          </div>
        )}
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <AlertCircle size={18} className="text-red-500 dark:text-red-400" /> {error}
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Refresh size={13} /> Thử lại
          </button>
        </div>
      ) : (
        <>
          {/* biểu đồ giá thật + chọn khoảng thời gian */}
          <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
              <span className="mr-1 text-[12.5px] font-semibold text-slate-500 dark:text-slate-400">Khung:</span>
              {TIMEFRAMES.map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setTf(val)}
                  className={
                    'rounded-lg px-2.5 py-1 text-[12.5px] font-semibold transition-colors ' +
                    (tf === val
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800')
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            {candles && candles.length > 0 ? (
              <PriceChart candles={candles} height="74vh" theme={theme} />
            ) : (
              <div
                className="flex items-center justify-center text-sm text-slate-400 dark:text-slate-500"
                style={{ height: '74vh' }}
              >
                {chartLoading ? 'Đang tải biểu đồ…' : 'Không có dữ liệu biểu đồ cho mã này.'}
              </div>
            )}
          </div>

          {/* số liệu THẬT */}
          {loading && !data ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="ss-skel mb-2 h-3 w-1/2" />
                  <div className="ss-skel h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : data ? (
            <div className="grid gap-4">
              {/* giá & thanh khoản */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                <Stat label="Giá đóng cửa" value={vnd(p?.close) + ' đ'} color={priceColor} />
                <Stat label="+/- phiên" value={`${chgStr(p?.change)} (${pctRaw(p?.pctChange)})`} color={priceColor} />
                <Stat label="Mở cửa" value={vnd(p?.open)} />
                <Stat label="Cao / Thấp" value={vnd(p?.high) + ' / ' + vnd(p?.low)} />
                <Stat label="Khối lượng" value={volShort(p?.volume) + ' cp'} />
                <Stat
                  label="Vùng 52 tuần"
                  value={vnd(data.low52) + ' – ' + vnd(data.high52)}
                />
              </div>

              {/* định giá & hiệu quả */}
              {(data.valuation || data.fundamentals) && (
                <Section title="Định giá & hiệu quả">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
                    <Stat label="Vốn hóa" value={billions(data.valuation?.marketcap)} />
                    <Stat label="P/E" value={num(data.valuation?.pe)} />
                    <Stat label="P/B" value={num(data.valuation?.pb)} />
                    <Stat label="P/S" value={num(data.valuation?.ps)} />
                    <Stat label="Beta" value={num(data.valuation?.beta)} />
                    <Stat label="ROE (TB 4 quý)" value={pctFrac(data.fundamentals?.roe)} color={trendColor(data.fundamentals?.roe)} />
                    <Stat label="ROAA" value={pctFrac(data.fundamentals?.roaa)} />
                    <Stat
                      label="Tăng trưởng LN (YoY)"
                      value={pctFrac(data.fundamentals?.netProfitGrowthYoY)}
                      color={trendColor(data.fundamentals?.netProfitGrowthYoY)}
                    />
                  </div>
                </Section>
              )}

              {/* xu hướng giá */}
              {data.trend && (
                <Section title="Xu hướng giá">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
                    <Stat label="1 tháng" value={pctFrac(data.trend.m1)} color={trendColor(data.trend.m1)} />
                    <Stat label="3 tháng" value={pctFrac(data.trend.m3)} color={trendColor(data.trend.m3)} />
                    <Stat label="6 tháng" value={pctFrac(data.trend.m6)} color={trendColor(data.trend.m6)} />
                    <Stat label="1 năm" value={pctFrac(data.trend.y1)} color={trendColor(data.trend.y1)} />
                  </div>
                </Section>
              )}

              {/* chỉ báo kỹ thuật */}
              {data.technical && (
                <Section title="Chỉ báo kỹ thuật (tính từ nến ngày)">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
                    <Stat label="MA20" value={vnd(data.technical.ma20)} />
                    <Stat label="MA50" value={vnd(data.technical.ma50)} />
                    <Stat label="MA200" value={vnd(data.technical.ma200)} />
                    <Stat label="RSI (14)" value={data.technical.rsi14 ?? '—'} />
                    <Stat label="Hỗ trợ 20 phiên" value={vnd(data.technical.support20)} color={UP} />
                    <Stat label="Kháng cự 20 phiên" value={vnd(data.technical.resistance20)} color={DOWN} />
                  </div>
                </Section>
              )}

              {/* hồ sơ doanh nghiệp */}
              {data.profile && (data.profile.summary || data.profile.foundDate || data.profile.employees) && (
                <Section title="Hồ sơ doanh nghiệp">
                  <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1.5 text-[13px] text-slate-500 dark:text-slate-400">
                    {data.profile.floor && <span>Sàn: <b className="text-slate-700 dark:text-slate-200">{data.profile.floor}</b></span>}
                    {data.profile.foundDate && <span>Thành lập: <b className="text-slate-700 dark:text-slate-200">{data.profile.foundDate}</b></span>}
                    {data.profile.employees && <span>Nhân sự: <b className="text-slate-700 dark:text-slate-200">{Number(data.profile.employees).toLocaleString('en-US')}</b></span>}
                  </div>
                  {data.profile.summary && (
                    <p className="m-0 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">{data.profile.summary}</p>
                  )}
                </Section>
              )}

              <p className="text-[12px] text-slate-400 dark:text-slate-500">
                Số liệu cập nhật {data.asOf} · nguồn VNDIRECT. Biểu đồ do TradingView cung cấp.
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
