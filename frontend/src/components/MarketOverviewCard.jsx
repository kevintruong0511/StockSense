import { useEffect, useState } from 'react'
import { AlertCircle, Refresh } from './icons.jsx'
import PriceChart from './PriceChart.jsx'
import { fetchMarketOverview, fetchIndexCandles } from '../data/market.js'

const UP = '#16A34A'
const DOWN = '#DC2626'

// Preset khoảng thời gian kiểu TradingView (bản gọn cho thẻ tổng quan).
const TF = [
  ['1D', '1N'],
  ['5D', '5N'],
  ['1M', '1Th'],
  ['3M', '3Th'],
  ['6M', '6Th'],
  ['1Y', '1 Năm'],
]

const dec2 = (n) =>
  n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const signed2 = (n) => (n == null ? '—' : (n >= 0 ? '+' : '') + dec2(n))
const pct2 = (n) => (n == null ? '—' : (n >= 0 ? '+' : '') + Number(n).toFixed(2) + '%')
const volM = (v) => (v == null ? '—' : (v / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'M')

// Ô chỉ số nhỏ trên panel tối.
function Tile({ label, value, color }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-400">{label}</div>
      <div className="tnum text-[15px] font-bold" style={{ color: color || '#F1F5F9' }}>
        {value}
      </div>
    </div>
  )
}

// Thẻ tổng quan thị trường "kiểu bàn giao dịch": panel tối VN-Index + biểu đồ nến thật.
export default function MarketOverviewCard() {
  const [tf, setTf] = useState('6M')
  const [ov, setOv] = useState(null)
  const [ovErr, setOvErr] = useState(false)
  const [candles, setCandles] = useState(null)
  const [chartLoading, setChartLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setOvErr(false)
    fetchMarketOverview()
      .then((r) => !cancelled && setOv(r))
      .catch(() => !cancelled && setOvErr(true))
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  useEffect(() => {
    let cancelled = false
    setChartLoading(true)
    fetchIndexCandles(tf)
      .then((r) => !cancelled && setCandles(Array.isArray(r.candles) ? r.candles : []))
      .catch(() => !cancelled && setCandles([]))
      .finally(() => !cancelled && setChartLoading(false))
    return () => {
      cancelled = true
    }
  }, [tf, reloadKey])

  const vni = ov?.vni
  const breadth = ov?.breadth
  const up = vni?.pct != null && vni.pct >= 0
  const idxColor = vni?.pct == null ? '#F1F5F9' : up ? UP : DOWN

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,.04)]">
      <div className="flex flex-col lg:flex-row">
        {/* panel tối: chỉ số VN-Index + độ rộng */}
        <div className="flex flex-col gap-4 bg-slate-900 p-5 lg:w-[300px] lg:flex-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">VN-Index</span>
            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10.5px] font-semibold text-slate-400">HOSE</span>
          </div>

          {ovErr ? (
            <div className="flex items-center gap-2 text-[13px] text-slate-300">
              <AlertCircle size={16} className="text-red-400" /> Không tải được dữ liệu.
              <button onClick={() => setReloadKey((k) => k + 1)} className="underline">
                Thử lại
              </button>
            </div>
          ) : (
            <>
              <div>
                <div className="tnum text-[38px] font-extrabold leading-none tracking-[-0.02em]" style={{ color: idxColor }}>
                  {dec2(vni?.index)}
                </div>
                <div className="tnum mt-1.5 text-[15px] font-bold" style={{ color: idxColor }}>
                  {vni ? `${signed2(vni.change)}  ${pct2(vni.pct)}` : '…'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Tile label="Mã tăng" value={breadth?.gainers ?? '—'} color={UP} />
                <Tile label="Mã giảm" value={breadth?.losers ?? '—'} color={DOWN} />
                <Tile label="Đứng giá" value={breadth?.unchanged ?? '—'} />
                <Tile label="Khối lượng" value={volM(vni?.vol)} />
                <Tile label="Cao nhất" value={dec2(vni?.high)} />
                <Tile label="Thấp nhất" value={dec2(vni?.low)} />
              </div>
              <div className="mt-auto text-[11px] text-slate-500">
                Độ rộng tính trên rổ VN30 · nguồn VNDIRECT
              </div>
            </>
          )}
        </div>

        {/* biểu đồ nến VN-Index thật */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-[13px] font-bold text-slate-700">Biểu đồ VN-Index</span>
            <div className="flex flex-wrap items-center justify-end gap-1">
              {TF.map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setTf(val)}
                  className={
                    'rounded-lg px-2.5 py-1 text-[12.5px] font-semibold transition-colors ' +
                    (tf === val ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100')
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {candles && candles.length > 0 ? (
            <PriceChart candles={candles} height="300px" precision={2} />
          ) : (
            <div className="flex items-center justify-center text-sm text-slate-400" style={{ height: 300 }}>
              {chartLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Refresh size={15} className="animate-spin" /> Đang tải biểu đồ…
                </span>
              ) : (
                'Không có dữ liệu biểu đồ.'
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
