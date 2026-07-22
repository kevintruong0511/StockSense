// Orchestrator KIỂM CHỨNG CHIẾN LƯỢC (backtest) cho 1 mã VN. Ghép: nạp nến ngày thật
// (VNDIRECT dchart) + VN-Index benchmark → sinh tín hiệu → khớp lệnh luật VN → chỉ số
// hiệu quả + so sánh VN-Index. KHÔNG cache snapshot (đúng nguyên tắc dự án).
import { config } from '../config.js'
import { getDailyHistory } from '../market/candles.js'
import { STRATEGIES, STRATEGY_META } from './signals.js'
import { runEngine } from './engine.js'
import { calcMetrics } from './metrics.js'

const YEARS_ALLOWED = new Set([1, 3, 5])
const dayStr = (t) => new Date(t * 1000).toISOString().slice(0, 10)

// Kẹp tham số người dùng theo metadata (min/max/int) để chặn input xấu.
function sanitizeParams(strategy, raw = {}) {
  const meta = STRATEGY_META[strategy]
  const out = {}
  for (const p of meta.params) {
    const v = Math.round(Number(raw[p.key]))
    out[p.key] = Number.isFinite(v) ? Math.min(p.max, Math.max(p.min, v)) : p.default
  }
  return out
}

// Căn VN-Index theo TỪNG phiên của mã (map theo ngày, forward-fill nếu lệch phiên) →
// đường vốn benchmark (mua & giữ index, cùng vốn khởi điểm, KHÔNG phí) + tỷ suất theo bar.
function alignBenchmark(stockCandles, indexCandles, initialCash) {
  const byDay = new Map(indexCandles.map((c) => [dayStr(c.time), c.close]))
  let last = null
  const closes = stockCandles.map((c) => {
    const v = byDay.get(dayStr(c.time))
    if (v != null) last = v
    return last
  })
  const base = closes.find((v) => v != null)
  const equity = stockCandles.map((c, i) => ({
    time: c.time,
    value: base && closes[i] != null ? (initialCash * closes[i]) / base : initialCash,
  }))
  const benchReturns = equity.map((e, i) => (i === 0 || !equity[i - 1].value ? 0 : e.value / equity[i - 1].value - 1))
  return { equity, benchReturns }
}

// runBacktest({ code, strategy, params, years }) → kết quả cho FE + AI.
export async function runBacktest({ code, strategy, params, years = 3 }) {
  const sym = String(code || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{2,10}$/.test(sym)) throw new Error('Mã không hợp lệ.')
  if (!STRATEGIES[strategy]) throw new Error('Chiến lược không hợp lệ.')
  const y = YEARS_ALLOWED.has(Number(years)) ? Number(years) : 3
  const cleanParams = sanitizeParams(strategy, params)

  const [candles, indexCandles] = await Promise.all([
    getDailyHistory(sym, y, 1000),
    getDailyHistory('VNINDEX', y, 1).catch(() => []),
  ])
  if (candles.length < 30) {
    throw new Error('Không đủ dữ liệu lịch sử để kiểm chứng (cần ≥30 phiên).')
  }

  const pos = STRATEGIES[strategy](candles, cleanParams)
  const { initialCash, feeRate, sellTaxRate, lotSize, minHoldingBars } = config.backtest
  const { equity, trades, markers } = runEngine(candles, pos, {
    initialCash,
    feeRate,
    sellTaxRate,
    lotSize,
    minHoldingBars,
  })

  const bench = indexCandles.length ? alignBenchmark(candles, indexCandles, initialCash) : null
  const metrics = calcMetrics(
    equity.map((e) => e.value),
    trades,
    initialCash,
    { barsPerYear: 252, benchReturns: bench?.benchReturns || null },
  )

  return {
    code: sym,
    strategy,
    strategyLabel: STRATEGY_META[strategy].label,
    params: cleanParams,
    years: y,
    range: { from: dayStr(candles[0].time), to: dayStr(candles[candles.length - 1].time), bars: candles.length },
    settings: { initialCash, feeRate, sellTaxRate, lotSize, minHoldingBars },
    metrics,
    equity,
    benchmark: bench?.equity || [],
    markers,
    trades,
  }
}
