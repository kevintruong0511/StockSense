// Token + dữ liệu user trả ra client (chống lộ hash mật khẩu / lách gói hết hạn).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { publicUser, signToken, verifyToken } from '../src/auth.js'

const DAY = 24 * 60 * 60 * 1000

test('publicUser_rowWithPasswordHash_omitsPasswordHash', () => {
  const row = {
    id: 7,
    name: 'Khang',
    email: 'a@b.com',
    created_at: '2026-01-01',
    password_hash: '$2a$10$secret',
    plan: 'free',
    plan_expires_at: null,
  }
  assert.equal('password_hash' in publicUser(row), false, 'publicUser không được trả password_hash')
})

test('publicUser_expiredPaidPlan_exposesFreePlan', () => {
  const row = {
    id: 7,
    name: 'Khang',
    email: 'a@b.com',
    created_at: '2026-01-01',
    plan: 'ultra',
    plan_expires_at: new Date(Date.now() - DAY).toISOString(),
  }
  assert.equal(publicUser(row).plan, 'free')
})

test('signToken_thenVerify_returnsUserIdInSub', () => {
  const token = signToken({ id: 42, email: 'a@b.com' })
  assert.equal(verifyToken(token).sub, 42)
})

test('verifyToken_tamperedToken_throws', () => {
  const token = signToken({ id: 42, email: 'a@b.com' })
  const tampered = token.slice(0, -1) + (token.at(-1) === 'x' ? 'y' : 'x')
  assert.throws(() => verifyToken(tampered))
})
