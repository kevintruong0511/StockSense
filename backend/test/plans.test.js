// Gói cước + quyền model — nguồn chân lý enforcement ở backend.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { effectivePlan, dailyLimit, resolveModelTier, allowedModelTiers } from '../src/billing/plans.js'

const DAY = 24 * 60 * 60 * 1000

test('effectivePlan_planFree_returnsFree', () => {
  assert.equal(effectivePlan({ plan: 'free', plan_expires_at: null }), 'free')
})

test('effectivePlan_paidPlanNullExpiry_returnsPlan', () => {
  assert.equal(effectivePlan({ plan: 'ultra', plan_expires_at: null }), 'ultra')
})

test('effectivePlan_expiryInPast_downgradesToFree', () => {
  const yesterday = new Date(Date.now() - DAY).toISOString()
  assert.equal(effectivePlan({ plan: 'pro', plan_expires_at: yesterday }), 'free')
})

test('effectivePlan_expiryInFuture_returnsPlan', () => {
  const tomorrow = new Date(Date.now() + DAY).toISOString()
  assert.equal(effectivePlan({ plan: 'pro', plan_expires_at: tomorrow }), 'pro')
})

test('effectivePlan_unknownPlanKey_returnsFree', () => {
  assert.equal(effectivePlan({ plan: 'enterprise', plan_expires_at: null }), 'free')
})

test('effectivePlan_nullRow_returnsFree', () => {
  assert.equal(effectivePlan(null), 'free')
})

test('dailyLimit_perPlan_returnsQuota', async (t) => {
  const cases = [
    { plan: 'free', expected: 2 },
    { plan: 'pro', expected: 15 },
    { plan: 'ultra', expected: Infinity },
    { plan: 'khong-ton-tai', expected: 2 },
  ]
  for (const c of cases) {
    await t.test(`plan=${c.plan}`, () => {
      assert.equal(dailyLimit(c.plan), c.expected)
    })
  }
})

test('resolveModelTier_freeRequestsPro_forcedToFlash', () => {
  assert.equal(resolveModelTier('free', 'pro'), 'flash', 'Free không được phép dùng model pro')
})

test('resolveModelTier_proRequestsPro_returnsPro', () => {
  assert.equal(resolveModelTier('pro', 'pro'), 'pro')
})

test('resolveModelTier_undefinedRequest_returnsFlash', () => {
  assert.equal(resolveModelTier('ultra', undefined), 'flash')
})

test('allowedModelTiers_unknownPlan_fallsBackToFreeTiers', () => {
  assert.deepEqual(allowedModelTiers('khong-ton-tai'), ['flash'])
})
