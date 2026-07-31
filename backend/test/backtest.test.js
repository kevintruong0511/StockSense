// Validate đầu vào runBacktest — chạy TRƯỚC mọi request mạng nên test được xác định.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runBacktest } from '../src/quant/backtest.js'

test('runBacktest_invalidCode_throwsInvalidCodeError', async () => {
  await assert.rejects(() => runBacktest({ code: 'FPT!', strategy: 'buyHold' }), /Mã không hợp lệ/)
})

test('runBacktest_unknownStrategy_throwsInvalidStrategyError', async () => {
  await assert.rejects(() => runBacktest({ code: 'FPT', strategy: 'martingale' }), /Chiến lược không hợp lệ/)
})
