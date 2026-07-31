// Giá vốn bình quân + lãi/lỗ đã hiện thực của danh mục (logic TIỀN — sai là mất tiền thật).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeHoldings } from '../src/portfolio/portfolio.js'

const buy = (ticker, quantity, price, tradeDate = '2026-01-01') => ({
  ticker, side: 'buy', quantity, price, tradeDate,
})
const sell = (ticker, quantity, price, tradeDate = '2026-01-01') => ({
  ticker, side: 'sell', quantity, price, tradeDate,
})

test('computeHoldings_buysOnly_avgCostIsWeightedAverage', () => {
  const { holdings } = computeHoldings([buy('FPT', 100, 10000), buy('FPT', 100, 20000)])
  assert.equal(holdings[0].avgCost, 15000)
  assert.equal(holdings[0].qty, 200)
})

test('computeHoldings_partialSell_realizedUsesAvgCost', () => {
  const trades = [buy('FPT', 200, 10000), sell('FPT', 100, 15000)]
  const { holdings, realized } = computeHoldings(trades)
  assert.equal(realized.FPT, 500000, 'lãi = (15000-10000) x 100')
  assert.equal(holdings[0].qty, 100)
  assert.equal(holdings[0].avgCost, 10000, 'bán một phần không làm đổi giá vốn bình quân')
})

test('computeHoldings_fullSell_positionExcludedFromHoldings', () => {
  const { holdings } = computeHoldings([buy('FPT', 100, 10000), sell('FPT', 100, 12000)])
  assert.deepEqual(holdings, [])
})

test('computeHoldings_sellMoreThanHeld_realizedCappedAtHeldQty', () => {
  const { realized } = computeHoldings([buy('FPT', 100, 10000), sell('FPT', 150, 12000)])
  assert.equal(realized.FPT, 200000, 'chỉ hiện thực trên 100 cp đang nắm, không phải 150')
})

test('computeHoldings_sellWithNoPriorBuy_recordsNoRealizedPnl', () => {
  const { holdings, realized } = computeHoldings([sell('FPT', 100, 12000)])
  assert.equal(realized.FPT, undefined)
  assert.deepEqual(holdings, [])
})

test('computeHoldings_multipleTickers_sortedByInvestedDesc', () => {
  const { holdings } = computeHoldings([buy('SSI', 100, 10000), buy('FPT', 100, 90000)])
  assert.deepEqual(holdings.map((h) => h.ticker), ['FPT', 'SSI'])
})

test('computeHoldings_buySellRebuy_lastBuyDateIsLatestBuy', () => {
  const trades = [
    buy('FPT', 100, 10000, '2026-01-01'),
    sell('FPT', 100, 12000, '2026-02-01'),
    buy('FPT', 100, 11000, '2026-03-01'),
  ]
  const { holdings } = computeHoldings(trades)
  assert.equal(holdings[0].lastBuyDate, '2026-03-01')
})

test('computeHoldings_noTrades_returnsEmptyHoldings', () => {
  const { holdings, realized } = computeHoldings([])
  assert.deepEqual(holdings, [])
  assert.deepEqual(realized, {})
})
