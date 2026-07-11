// Định nghĩa gói cước + giới hạn lượt phân tích AI theo ngày.
// Nguồn chân lý cho enforcement ở backend — frontend chỉ phản ánh lại.

// Số lượt phân tích AI mỗi ngày theo gói. Infinity = không giới hạn.
export const PLAN_LIMITS = {
  free: 2,
  pro: 15,
  ultra: Infinity,
}

export const PLAN_KEYS = ['free', 'pro', 'ultra']

// Gói còn hiệu lực của user: nếu đã quá hạn (plan_expires_at trong quá khứ) → coi như 'free'.
// plan_expires_at NULL nghĩa là vĩnh viễn (free mặc định hoặc ưu đãi lifetime).
export function effectivePlan(userRow) {
  const plan = userRow?.plan || 'free'
  if (plan === 'free') return 'free'
  const exp = userRow?.plan_expires_at
  if (exp && new Date(exp).getTime() < Date.now()) return 'free'
  return PLAN_KEYS.includes(plan) ? plan : 'free'
}

// Giới hạn lượt/ngày cho một gói (mặc định về free nếu không rõ).
export function dailyLimit(plan) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
}
