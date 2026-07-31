// Sinh tín hiệu vị thế (0 = tiền, 1 = cổ) từ nến ngày.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { STRATEGIES } from '../src/quant/signals.js'

const { maCross, rsiReversion, breakout, buyHold } = STRATEGIES

// Nến phẳng: chỉ close có ý nghĩa cho MA/RSI.
const closeBars = (closes) =>
  closes.map((c, i) => ({ time: i + 1, open: c, high: c, low: c, close: c, volume: 0 }))

// Dãy giá tăng đều 1..n.
const rising = (n) => closeBars(Array.from({ length: n }, (_, i) => i + 1))

// slow bị kẹp sàn 5 phiên (clampInt min=5) → MA chậm chỉ có giá trị từ index 4.
test('maCross_beforeSlowMaWarmup_positionZero', () => {
  const pos = maCross(rising(5), { fast: 2, slow: 5 })
  assert.equal(pos[3], 0, 'MA chậm chưa đủ 5 phiên thì không được vào lệnh')
})

test('maCross_fastAboveSlow_positionOne', () => {
  const pos = maCross(rising(5), { fast: 2, slow: 5 })
  assert.equal(pos[4], 1)
})

test('maCross_slowLteFast_slowClampedAboveFast', () => {
  // slow=5 < fast=20 → bị ép về fast+1 = 21 → phải đợi tới phiên thứ 21 (index 20).
  const pos = maCross(rising(21), { fast: 20, slow: 5 })
  assert.equal(pos[19], 0, 'index 19 chưa đủ 21 phiên cho MA chậm đã bị kẹp')
  assert.equal(pos[20], 1)
})

test('maCross_nanParams_usesDefault20And50', () => {
  const pos = maCross(rising(50), { fast: 'abc', slow: 'xyz' })
  assert.equal(pos[48], 0, 'MA50 mặc định cần 50 phiên')
  assert.equal(pos[49], 1)
})

test('rsiReversion_rsiBelowBuyThreshold_enters', () => {
  const pos = rsiReversion(closeBars([100, 90, 80, 70, 120, 130, 140]), { period: 2, buy: 30, sell: 70 })
  assert.equal(pos[2], 1, 'RSI = 0 (< 30) phải vào lệnh')
  assert.equal(pos[3], 1, 'giữ vị thế khi RSI chưa lên vùng quá mua')
})

test('rsiReversion_rsiAboveSellThreshold_exits', () => {
  const pos = rsiReversion(closeBars([100, 90, 80, 70, 120, 130, 140]), { period: 2, buy: 30, sell: 70 })
  assert.equal(pos[4], 0, 'RSI vượt 70 phải thoát vị thế')
})

test('rsiReversion_beforeWarmup_positionZero', () => {
  const pos = rsiReversion(closeBars([100, 90, 80, 70, 60]), { period: 14 })
  assert.deepEqual(pos, [0, 0, 0, 0, 0])
})

const breakoutBars = () => {
  const flat = Array.from({ length: 5 }, (_, i) => ({ time: i + 1, open: 95, high: 100, low: 90, close: 95, volume: 0 }))
  return [
    ...flat,
    { time: 6, open: 100, high: 105, low: 100, close: 105, volume: 0 }, // vượt đỉnh 5 phiên (100)
    { time: 7, open: 90, high: 90, low: 85, close: 85, volume: 0 }, // thủng đáy 5 phiên (90)
  ]
}

test('breakout_beforeWindowFilled_positionZero', () => {
  const pos = breakout(breakoutBars(), { window: 5 })
  assert.deepEqual(pos.slice(0, 5), [0, 0, 0, 0, 0])
})

test('breakout_closeAbovePriorWindowHigh_enters', () => {
  const pos = breakout(breakoutBars(), { window: 5 })
  assert.equal(pos[5], 1)
})

test('breakout_closeBelowPriorWindowLow_exits', () => {
  const pos = breakout(breakoutBars(), { window: 5 })
  assert.equal(pos[6], 0)
})

test('buyHold_anyCandles_allOnes', () => {
  assert.deepEqual(buyHold(rising(4)), [1, 1, 1, 1])
})
