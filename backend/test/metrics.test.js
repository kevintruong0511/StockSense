// Chỉ số hiệu quả backtest tính trên đường vốn + danh sách lệnh (toán thuần).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcMetrics } from '../src/quant/metrics.js'

const trade = (pnl, holdingBars = 1) => ({ pnl, holdingBars })

test('calcMetrics_emptyEquity_returnsInitialCashAndZeroedMetrics', () => {
  const m = calcMetrics([], [], 100_000_000)
  assert.equal(m.finalValue, 100_000_000)
  assert.equal(m.totalReturn, 0)
  assert.equal(m.tradeCount, 0)
})

test('calcMetrics_flatEquity_totalReturnZero', () => {
  const m = calcMetrics([100, 100, 100], [], 100)
  assert.equal(m.totalReturn, 0)
  assert.equal(m.maxDrawdown, 0)
})

test('calcMetrics_equityDrawdown_maxDrawdownIsPeakToTrough', () => {
  const m = calcMetrics([100, 120, 60, 90], [], 100)
  assert.equal(m.maxDrawdown, -0.5, 'sụt từ đỉnh 120 xuống 60 = -50%')
})

test('calcMetrics_equityWipedToZero_annualReturnMinusOne', () => {
  const m = calcMetrics([100, 0], [], 100)
  assert.equal(m.annualReturn, -1, 'cháy tài khoản không được ra NaN từ lũy thừa cơ số âm')
})

test('calcMetrics_noTrades_winRateAndProfitFactorZero', () => {
  const m = calcMetrics([100, 110], [], 100)
  assert.equal(m.winRate, 0)
  assert.equal(m.profitFactor, 0)
})

test('calcMetrics_allWinsNoLosses_profitFactorInfinity', () => {
  const m = calcMetrics([100, 110], [trade(10), trade(5)], 100)
  assert.equal(m.profitFactor, Infinity)
  assert.equal(m.winRate, 1)
})

test('calcMetrics_mixedTrades_winRateAndProfitFactorCorrect', () => {
  const m = calcMetrics([100, 120], [trade(10), trade(-5), trade(20), trade(-5)], 100)
  assert.equal(m.winRate, 0.5)
  assert.equal(m.profitFactor, 3, 'lãi gộp 30 / lỗ gộp 10')
  assert.equal(m.profitLossRatio, 3, 'lãi TB 15 / lỗ TB 5')
})

test('calcMetrics_consecutiveLosses_maxStreakIsLongest', () => {
  const trades = [trade(-1), trade(-1), trade(5), trade(-1), trade(-1), trade(-1), trade(2)]
  const m = calcMetrics([100, 110], trades, 100)
  assert.equal(m.maxConsecutiveLoss, 3)
})

test('calcMetrics_benchReturnsProvided_excessReturnIsTotalMinusBenchmark', () => {
  const m = calcMetrics([100, 110], [], 100, { benchReturns: [0, 0.05] })
  assert.ok(Math.abs(m.benchmarkReturn - 0.05) < 1e-12, `benchmarkReturn = ${m.benchmarkReturn}`)
  assert.ok(Math.abs(m.excessReturn - 0.05) < 1e-12, `excessReturn = ${m.excessReturn}`)
})

test('calcMetrics_singleBar_sharpeIsZeroNotNaN', () => {
  const m = calcMetrics([100], [], 100)
  assert.equal(m.sharpe, 0)
})
