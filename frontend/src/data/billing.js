// Lớp gọi API gói cước & thanh toán. Tái dùng api() (tự đính Bearer token) từ auth.js.
import { api } from './auth.js'

// Gói hiện tại + hạn mức lượt AI hôm nay: { plan, planExpiresAt, usage:{used,limit,remaining,unlimited} }
export const getBillingStatus = () => api('/billing/status', { auth: true })

// Tạo đơn thanh toán cho gói (pro|ultra), chu kỳ (monthly|annual). Trả QR + order_code.
export const createOrder = (plan, cycle = 'monthly') =>
  api('/billing/orders', { method: 'POST', auth: true, body: { plan, cycle } })

// Trạng thái đơn để poll: { status: 'pending'|'paid'|'expired', ... }
export const getOrder = (code) => api(`/billing/orders/${encodeURIComponent(code)}`, { auth: true })

// Giả lập thanh toán (chỉ khả dụng khi backend bật allowMockPay — môi trường dev).
export const mockPay = (code) =>
  api(`/billing/orders/${encodeURIComponent(code)}/mock-pay`, { method: 'POST', auth: true })

// Áp mã ưu đãi → nâng gói. Trả { plan, planExpiresAt, message }.
export const redeemCode = (code) =>
  api('/billing/redeem', { method: 'POST', auth: true, body: { code } })
