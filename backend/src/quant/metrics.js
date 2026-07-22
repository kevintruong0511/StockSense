// Chỉ số hiệu quả backtest — port từ HKUDS/Vibe-Trading agent/backtest/metrics.py.
// Toán THUẦN trên đường vốn (equity curve) + danh sách lệnh; không phụ thuộc thị trường.
// Giữ guard mẫu nhỏ (std ddof=1 → NaN khi <2 điểm) như bản gốc.

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0)

// Độ lệch chuẩn MẪU (ddof=1) — khớp pandas Series.std() dùng trong bản Python.
function std(a) {
  if (a.length < 2) return 0
  const m = mean(a)
  const v = a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)
  return Math.sqrt(v)
}

// Chuỗi tỷ suất theo bar từ đường vốn: r[i] = eq[i]/eq[i-1] - 1 (r[0] = 0).
function pctChange(eq) {
  const out = new Array(eq.length).fill(0)
  for (let i = 1; i < eq.length; i++) out[i] = eq[i - 1] ? eq[i] / eq[i - 1] - 1 : 0
  return out
}

// Thống kê từ danh sách lệnh đã đóng (mỗi lệnh có pnl, holdingBars).
function tradeStats(trades) {
  const n = trades.length
  if (n === 0) {
    return {
      winRate: 0,
      profitFactor: 0,
      profitLossRatio: 0,
      maxConsecutiveLoss: 0,
      avgHoldingBars: 0,
      tradeCount: 0,
    }
  }
  const wins = trades.filter((t) => t.pnl > 0)
  const losses = trades.filter((t) => t.pnl < 0)
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
  const avgWin = wins.length ? grossProfit / wins.length : 0
  const avgLoss = losses.length ? grossLoss / losses.length : 0

  // Chuỗi thua liên tiếp dài nhất.
  let maxStreak = 0
  let streak = 0
  for (const t of trades) {
    if (t.pnl < 0) {
      streak += 1
      if (streak > maxStreak) maxStreak = streak
    } else streak = 0
  }

  return {
    winRate: wins.length / n,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    profitLossRatio: avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0,
    maxConsecutiveLoss: maxStreak,
    avgHoldingBars: mean(trades.map((t) => t.holdingBars || 0)),
    tradeCount: n,
  }
}

// Bộ chỉ số đầy đủ. equityValues = số (không phải {time,value}); benchReturns = tỷ suất
// theo bar của benchmark (VN-Index) căn cùng chỉ số với equity (tùy chọn).
export function calcMetrics(equityValues, trades, initialCash, { barsPerYear = 252, benchReturns = null } = {}) {
  const n = equityValues.length
  if (n === 0) {
    return {
      finalValue: initialCash,
      totalReturn: 0,
      annualReturn: 0,
      maxDrawdown: 0,
      sharpe: 0,
      sortino: 0,
      calmar: 0,
      benchmarkReturn: 0,
      excessReturn: 0,
      ...tradeStats([]),
    }
  }

  const rets = pctChange(equityValues)
  const totalRet = equityValues[n - 1] / initialCash - 1

  // Sổ đòn bẩy/short có thể cháy về ≤0 → tránh lũy thừa cơ số âm; cháy = -100%/năm.
  const growth = 1 + totalRet
  const annRet = growth <= 0 ? -1 : Math.pow(growth, barsPerYear / Math.max(n, 1)) - 1

  const vol = n > 1 ? std(rets) : 0
  const sharpe = (mean(rets) / (vol + 1e-10)) * Math.sqrt(barsPerYear)

  // Drawdown (mức sụt so đỉnh vốn).
  let peak = -Infinity
  let maxDd = 0
  for (const v of equityValues) {
    if (v > peak) peak = v
    const dd = (v - peak) / (peak || 1)
    if (dd < maxDd) maxDd = dd
  }
  const calmar = Math.abs(maxDd) > 1e-10 ? annRet / Math.abs(maxDd) : 0

  const downside = rets.filter((r) => r < 0)
  const downStd = downside.length > 1 ? std(downside) : 1e-10
  const sortino = (mean(rets) / (downStd + 1e-10)) * Math.sqrt(barsPerYear)

  let benchmarkReturn = 0
  let excessReturn = 0
  if (Array.isArray(benchReturns) && benchReturns.length) {
    benchmarkReturn = benchReturns.reduce((p, r) => p * (1 + r), 1) - 1
    excessReturn = totalRet - benchmarkReturn
  }

  return {
    finalValue: equityValues[n - 1],
    totalReturn: totalRet,
    annualReturn: annRet,
    maxDrawdown: maxDd,
    sharpe,
    sortino,
    calmar,
    benchmarkReturn,
    excessReturn,
    ...tradeStats(trades),
  }
}
