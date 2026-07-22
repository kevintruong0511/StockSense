import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TickerPicker from '../components/TickerPicker.jsx'
import EquityChart from '../components/EquityChart.jsx'
import Markdown from '../components/Markdown.jsx'
import { StatusIndicator } from '../components/AiSources.jsx'
import { BarChart3, Sparkle, AlertTriangle, ChevronDown } from '../components/icons.jsx'
import { fetchTickers } from '../data/ai.js'
import { fetchStrategies, runBacktest as apiRunBacktest } from '../data/market.js'
import { streamBacktestComment } from '../data/ai.js'

// Bản dự phòng nếu /stocks/strategies lỗi — khớp STRATEGY_META ở backend.
const FALLBACK_META = {
  maCross: {
    label: 'Giao cắt MA (nhanh/chậm)',
    desc: 'Mua khi MA nhanh cắt lên trên MA chậm; bán khi cắt xuống.',
    params: [
      { key: 'fast', label: 'MA nhanh', default: 20, min: 2, max: 100, step: 1 },
      { key: 'slow', label: 'MA chậm', default: 50, min: 5, max: 250, step: 1 },
    ],
  },
  rsiReversion: {
    label: 'RSI đảo chiều',
    desc: 'Mua khi RSI xuống vùng quá bán; bán khi RSI lên vùng quá mua.',
    params: [
      { key: 'period', label: 'Chu kỳ RSI', default: 14, min: 2, max: 50, step: 1 },
      { key: 'buy', label: 'Ngưỡng mua (quá bán)', default: 30, min: 5, max: 50, step: 1 },
      { key: 'sell', label: 'Ngưỡng bán (quá mua)', default: 70, min: 50, max: 95, step: 1 },
    ],
  },
  breakout: {
    label: 'Breakout kênh giá',
    desc: 'Mua khi giá vượt đỉnh N phiên; bán khi thủng đáy N phiên.',
    params: [{ key: 'window', label: 'Số phiên kênh giá', default: 20, min: 5, max: 120, step: 1 }],
  },
  buyHold: { label: 'Mua & giữ', desc: 'Mua đầu kỳ, giữ tới cuối kỳ — làm chuẩn đối chiếu.', params: [] },
}

const YEARS = [1, 3, 5]

// ── Định dạng số theo chuẩn quốc tế (en-US): nghìn = phẩy, thập phân = chấm ──────
const pctStr = (x) => (x == null ? '—' : (x >= 0 ? '+' : '') + (x * 100).toFixed(2) + '%')
const pctPlain = (x) => (x == null ? '—' : (x * 100).toFixed(2) + '%')
const ratioStr = (x) => (x == null ? '—' : x === Infinity ? '∞' : x.toFixed(2))
const moneyStr = (x) => (x == null ? '—' : Math.round(x).toLocaleString('en-US') + 'đ')
const dateStr = (t) => (t ? new Date(t * 1000).toLocaleDateString('vi-VN') : '—')
const signClass = (x) => (x == null ? 'text-slate-900 dark:text-slate-100' : x >= 0 ? 'text-green-600' : 'text-red-600')

// Một thẻ chỉ số.
function Metric({ label, value, cls, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`tnum mt-1 text-lg font-bold ${cls || 'text-slate-900 dark:text-slate-100'}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{hint}</div>}
    </div>
  )
}

export default function Backtest({ code: initialCode, theme = 'light', billing, onRefreshBilling, onNavigate }) {
  const [universe, setUniverse] = useState([])
  const [meta, setMeta] = useState(FALLBACK_META)
  const [code, setCode] = useState((initialCode || '').toUpperCase())
  const [strategy, setStrategy] = useState('maCross')
  const [params, setParams] = useState({})
  const [years, setYears] = useState(3)

  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [showTrades, setShowTrades] = useState(false)

  // AI bình luận
  const [aiText, setAiText] = useState('')
  const [aiStatus, setAiStatus] = useState(null)
  const [aiStreaming, setAiStreaming] = useState(false)
  const [aiError, setAiError] = useState('')
  const [quotaHit, setQuotaHit] = useState(false)
  const aiAbortRef = useRef(null)

  const usage = billing?.usage
  const quotaLabel = usage ? (usage.unlimited ? 'Không giới hạn lượt AI' : `Còn ${usage.remaining}/${usage.limit} lượt AI hôm nay`) : ''

  // Nạp danh sách mã + danh mục chiến lược.
  useEffect(() => {
    fetchTickers().then((list) => Array.isArray(list) && setUniverse(list))
    fetchStrategies()
      .then((r) => r?.strategies && setMeta(r.strategies))
      .catch(() => {})
  }, [])

  // Khi đổi chiến lược: đặt lại tham số về mặc định của chiến lược đó.
  const currentMeta = meta[strategy] || FALLBACK_META[strategy]
  useEffect(() => {
    const m = meta[strategy] || FALLBACK_META[strategy]
    const next = {}
    for (const p of m?.params || []) next[p.key] = p.default
    setParams(next)
  }, [strategy, meta])

  // Dọn stream AI khi rời màn.
  useEffect(() => () => aiAbortRef.current?.(), [])

  const setParam = (key, val) => setParams((p) => ({ ...p, [key]: val }))

  const run = useCallback(async () => {
    const c = String(code || '').trim().toUpperCase()
    if (!/^[A-Z0-9]{2,10}$/.test(c)) {
      setError('Nhập mã cổ phiếu hợp lệ (ví dụ HPG, FPT).')
      return
    }
    // Hủy bình luận AI cũ + reset kết quả trước.
    aiAbortRef.current?.()
    setAiText('')
    setAiError('')
    setAiStatus(null)
    setAiStreaming(false)
    setQuotaHit(false)
    setError('')
    setRunning(true)
    setResult(null)
    try {
      const r = await apiRunBacktest({ code: c, strategy, params, years })
      setResult(r)
    } catch (err) {
      setError(err?.message || 'Không chạy được kiểm chứng.')
    } finally {
      setRunning(false)
    }
  }, [code, strategy, params, years])

  const askAi = useCallback(() => {
    if (!result || aiStreaming) return
    setAiText('')
    setAiError('')
    setQuotaHit(false)
    setAiStreaming(true)
    setAiStatus({ phase: 'thinking' })
    aiAbortRef.current = streamBacktestComment({
      code: result.code,
      strategy: result.strategy,
      params: result.params,
      years: result.years,
      onToken: (t) => setAiText((prev) => prev + t),
      onStatus: (st) => st?.phase && setAiStatus(st),
      onReset: () => setAiText(''),
      onDone: () => {
        setAiStreaming(false)
        setAiStatus(null)
        onRefreshBilling?.()
      },
      onError: (msg, m) => {
        setAiStreaming(false)
        setAiStatus(null)
        if (m?.code === 'quota_exceeded' || m?.status === 429) setQuotaHit(true)
        else setAiError(msg)
        onRefreshBilling?.()
      },
    })
  }, [result, aiStreaming, onRefreshBilling])

  const m = result?.metrics
  const strategyOptions = useMemo(() => Object.entries(meta), [meta])

  return (
    <div className="mx-auto max-w-6xl">
      {/* Tiêu đề */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <BarChart3 size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Kiểm chứng chiến lược</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Chạy chiến lược kỹ thuật trên lịch sử giá thật, đo hiệu quả và so với mua &amp; giữ VN-Index.
          </p>
        </div>
      </div>

      {/* Bảng điều khiển */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Mã cổ phiếu</label>
            <TickerPicker value={code} onChange={setCode} universe={universe} onSelect={setCode} onEnter={run} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Chiến lược</label>
            <div className="relative">
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {strategyOptions.map(([key, sMeta]) => (
                  <option key={key} value={key}>
                    {sMeta.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            {currentMeta?.desc && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{currentMeta.desc}</p>}
          </div>
        </div>

        {/* Tham số động + khung thời gian */}
        <div className="mt-4 flex flex-wrap items-end gap-4">
          {(currentMeta?.params || []).map((p) => (
            <div key={p.key} className="w-32">
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">{p.label}</label>
              <input
                type="number"
                min={p.min}
                max={p.max}
                step={p.step || 1}
                value={params[p.key] ?? p.default}
                onChange={(e) => setParam(p.key, Number(e.target.value))}
                className="tnum w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Khoảng thời gian</label>
            <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
              {YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYears(y)}
                  className={`px-3.5 py-2 text-sm font-medium transition ${
                    years === y
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {y} năm
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="ml-auto rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {running ? 'Đang chạy…' : 'Chạy kiểm chứng'}
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">
            <AlertTriangle size={15} className="shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Kết quả */}
      {result && m && (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {result.code} · {result.strategyLabel}
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {result.range.from} → {result.range.to} · {result.range.bars} phiên
            </span>
          </div>

          {/* Thẻ chỉ số */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Tổng lợi nhuận" value={pctStr(m.totalReturn)} cls={signClass(m.totalReturn)} />
            <Metric label="Lãi kép/năm (CAGR)" value={pctStr(m.annualReturn)} cls={signClass(m.annualReturn)} />
            <Metric label="Sharpe" value={ratioStr(m.sharpe)} hint="Hiệu quả / rủi ro" />
            <Metric label="Sụt giảm sâu nhất" value={pctPlain(m.maxDrawdown)} cls="text-red-600" hint="Max drawdown" />
            <Metric label="Tỷ lệ thắng" value={pctPlain(m.winRate)} hint={`${m.tradeCount} lệnh`} />
            <Metric label="Profit factor" value={ratioStr(m.profitFactor)} hint="Lãi gộp / lỗ gộp" />
            <Metric label="Số lệnh" value={m.tradeCount} hint={`Giữ TB ${Math.round(m.avgHoldingBars || 0)} phiên`} />
            <Metric
              label="Chênh vs VN-Index"
              value={pctStr(m.excessReturn)}
              cls={signClass(m.excessReturn)}
              hint={`VN-Index ${pctStr(m.benchmarkReturn)}`}
            />
          </div>

          {/* Biểu đồ đường vốn */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" /> Chiến lược
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" /> VN-Index (mua &amp; giữ)
              </span>
              <span className="ml-auto text-slate-400 dark:text-slate-500">Chuẩn hoá về 100 ở phiên đầu</span>
            </div>
            <EquityChart equity={result.equity} benchmark={result.benchmark} theme={theme} />
          </div>

          {/* AI bình luận */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkle size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">AI bình luận kết quả</h3>
              </div>
              {!aiText && !aiStreaming && (
                <button
                  type="button"
                  onClick={askAi}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Nhờ AI nhận định
                </button>
              )}
            </div>
            {quotaLabel && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{quotaLabel}</p>}

            {quotaHit && (
              <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                Bạn đã hết lượt phân tích AI hôm nay.{' '}
                <button className="font-semibold underline" onClick={() => onNavigate?.('pricing')}>
                  Nâng cấp gói
                </button>{' '}
                để tiếp tục.
              </div>
            )}
            {aiError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">
                <AlertTriangle size={15} className="shrink-0" />
                {aiError}
              </div>
            )}
            {aiStreaming && !aiText && <div className="mt-3"><StatusIndicator status={aiStatus} /></div>}
            {aiText && (
              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Markdown text={aiText} />
              </div>
            )}
          </div>

          {/* Bảng lệnh */}
          {result.trades.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setShowTrades((s) => !s)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                <span>Danh sách lệnh ({result.trades.length})</span>
                <ChevronDown size={16} className={`text-slate-400 transition ${showTrades ? 'rotate-180' : ''}`} />
              </button>
              {showTrades && (
                <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                        <th className="px-5 py-2 font-medium">Mua</th>
                        <th className="px-3 py-2 font-medium">Bán</th>
                        <th className="px-3 py-2 text-right font-medium">Giá mua</th>
                        <th className="px-3 py-2 text-right font-medium">Giá bán</th>
                        <th className="px-3 py-2 text-right font-medium">Lãi/lỗ</th>
                        <th className="px-5 py-2 text-right font-medium">Giữ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades.map((t, i) => (
                        <tr key={i} className="border-t border-slate-50 dark:border-slate-800/60">
                          <td className="px-5 py-2 text-slate-600 dark:text-slate-400">{dateStr(t.entryTime)}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{dateStr(t.exitTime)}</td>
                          <td className="tnum px-3 py-2 text-right text-slate-700 dark:text-slate-300">{moneyStr(t.entryPrice)}</td>
                          <td className="tnum px-3 py-2 text-right text-slate-700 dark:text-slate-300">{moneyStr(t.exitPrice)}</td>
                          <td className={`tnum px-3 py-2 text-right font-medium ${signClass(t.pnl)}`}>{moneyStr(t.pnl)}</td>
                          <td className="tnum px-5 py-2 text-right text-slate-500 dark:text-slate-400">{t.holdingBars} phiên</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!result && !running && !error && (
        <p className="mt-8 text-center text-sm text-slate-400 dark:text-slate-500">
          Chọn mã và chiến lược rồi bấm “Chạy kiểm chứng” để xem hiệu quả trên lịch sử giá thật.
        </p>
      )}
    </div>
  )
}
