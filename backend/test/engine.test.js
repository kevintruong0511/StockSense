// Khớp lệnh backtest theo luật VN: lô 100, phí mua, phí + thuế bán, T+2.5, chống look-ahead.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runEngine } from '../src/quant/engine.js'

// Nến phẳng giá `p` (open = close = p) — mọi biến động do test tự đặt.
const flat = (n, p = 30000, start = 1) =>
  Array.from({ length: n }, (_, i) => ({ time: start + i, open: p, high: p, low: p, close: p, volume: 0 }))

const OPTS = { initialCash: 10_000_000, feeRate: 0.0015, sellTaxRate: 0.001, lotSize: 100, minHoldingBars: 3 }

test('runEngine_signalAtBarI_executesAtOpenOfNextBar', () => {
  const candles = flat(3)
  candles[1].open = 31000 // giá mở cửa phiên sau tín hiệu
  const { markers } = runEngine(candles, [1, 1, 1], OPTS)
  assert.equal(markers[0].time, candles[1].time, 'tín hiệu phiên 0 phải khớp ở phiên 1')
  assert.equal(markers[0].price, 31000, 'khớp tại giá MỞ CỬA, không phải đóng cửa phiên tín hiệu')
})

test('runEngine_buy_roundsSharesDownToLot', () => {
  // 10.000.000 / 30.000 = 333,33 cp → làm tròn xuống bội số 100 = 300 cp.
  const { trades } = runEngine(flat(3), [1, 1, 1], { ...OPTS, feeRate: 0, sellTaxRate: 0 })
  assert.equal(trades[0].shares, 300)
})

test('runEngine_buy_cashDeductedIncludesFee', () => {
  // 300 cp x 30.000 = 9.000.000 + phí 13.500 → còn 986.500 tiền mặt.
  const { equity } = runEngine(flat(3), [1, 1, 1], OPTS)
  assert.equal(equity[1].value, 9_986_500, 'vốn phiên mua = tiền còn lại + giá trị cổ phiếu')
})

test('runEngine_cashBelowOneLot_noTradeExecuted', () => {
  const { trades, markers } = runEngine(flat(3), [1, 1, 1], { ...OPTS, initialCash: 1_000_000 })
  assert.equal(trades.length, 0, '1 triệu không mua nổi 1 lô 100 cp giá 30.000')
  assert.equal(markers.length, 0)
})

test('runEngine_sellSignalBeforeMinHold_holdsUntilMinHoldReached', () => {
  const { trades } = runEngine(flat(6), [1, 0, 0, 0, 0, 0], OPTS)
  assert.equal(trades[0].holdingBars, 3, 'T+2.5: phải giữ đủ 3 phiên mới bán được')
  assert.equal(trades[0].exitReason, 'signal')
})

test('runEngine_sell_pnlIsNetOfFeeAndSellTax', () => {
  const candles = flat(6)
  candles[5].open = 33000
  candles[5].close = 33000
  const { trades } = runEngine(candles, [1, 1, 1, 1, 0, 0], OPTS)
  // Mua 300 @30.000 = 9.000.000 + phí 13.500. Bán 300 @33.000 = 9.900.000 - (phí+thuế) 24.750.
  assert.equal(trades[0].pnl, 861_750)
})

test('runEngine_openPositionAtEnd_forceClosedAtLastClose', () => {
  const candles = flat(4)
  candles[3].open = 20000 // khác close để chứng minh đóng theo giá ĐÓNG CỬA
  candles[3].close = 32000
  const { trades } = runEngine(candles, [1, 1, 1, 1], OPTS)
  assert.equal(trades[0].exitReason, 'end')
  assert.equal(trades[0].exitPrice, 32000)
})

test('runEngine_zeroOpenPrice_skipsBuyAndRetriesNextBar', () => {
  const candles = flat(3)
  candles[1].open = 0
  const { markers } = runEngine(candles, [1, 1, 1], OPTS)
  assert.equal(markers[0].time, candles[2].time, 'phiên giá mở cửa = 0 bị bỏ qua, mua ở phiên sau')
})

test('runEngine_noBuySignal_equityStaysInitialCash', () => {
  const { equity, trades } = runEngine(flat(4), [0, 0, 0, 0], OPTS)
  assert.deepEqual(equity.map((e) => e.value), [10_000_000, 10_000_000, 10_000_000, 10_000_000])
  assert.equal(trades.length, 0)
})
