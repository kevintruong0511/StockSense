// Vietstock — chỉ số cơ bản (P/E, P/B, ROE), BCTC & hồ sơ doanh nghiệp.
//
// ⚠️ Vietstock KHÔNG có API công khai chính thức. Muốn lấy dữ liệu phải:
//   1) GET một trang của mã để nhận cookie phiên + __RequestVerificationToken,
//   2) POST kèm cookie + token tới endpoint dữ liệu nội bộ (finance.vietstock.vn/data/...).
// Cấu trúc này DỄ VỠ khi Vietstock đổi trang/endpoint và có thể vi phạm ToS.
//
// Vì chưa xác nhận được endpoint + mapping field với dữ liệu THẬT, module này:
//   - Tắt mặc định (chỉ chạy khi VIETSTOCK_ENABLED=true),
//   - Kể cả khi bật, trả null có kiểm soát cho tới khi chốt mapping — KHÔNG bịa số.
// Nhờ vậy orchestrator luôn fallback VNDIRECT (có P/E, P/B, ROE thật) và app không vỡ.
import { config } from '../../config.js'

const TIMEOUT_MS = 9000
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StockSense/1.0'

function enabled() {
  return config.data?.vietstock?.enabled === true
}

// Lấy cookie phiên + verification token từ trang tài chính của mã.
async function getSession(code) {
  const url = `https://finance.vietstock.vn/${encodeURIComponent(code)}/tai-chinh.htm`
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': UA, 'accept-language': 'vi,en;q=0.9' },
  })
  if (!res.ok) throw new Error(`Vietstock page HTTP ${res.status}`)
  const setCookie = res.headers.get('set-cookie') || ''
  const cookie = setCookie
    .split(/,(?=[^ ;]+=)/) // tách nhiều cookie
    .map((c) => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
  const html = await res.text()
  const m = /name="__RequestVerificationToken"[^>]*value="([^"]+)"/.exec(html)
  return { cookie, token: m?.[1] || null }
}

// Trả { valuation, fundamentals, profile } — hiện luôn null cho tới khi chốt mapping.
export async function vietstockFundamentals(code) {
  const empty = { valuation: null, fundamentals: null, profile: null }
  if (!enabled()) return empty
  try {
    const { cookie, token } = await getSession(code)
    if (!token) throw new Error('Không lấy được __RequestVerificationToken')

    // Endpoint chỉ số tài chính nội bộ của Vietstock (cần XÁC NHẬN LẠI khi họ đổi).
    const res = await fetch('https://finance.vietstock.vn/data/financeinfo', {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'User-Agent': UA,
        cookie,
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
      },
      body: new URLSearchParams({
        code,
        type: 'CDKT',
        page: '1',
        pageSize: '4',
        __RequestVerificationToken: token,
      }).toString(),
    })
    if (!res.ok) throw new Error(`Vietstock financeinfo HTTP ${res.status}`)
    const raw = await res.json()

    // TODO(cùng chủ sản phẩm): map raw -> { pe, pb, roe, ... } sau khi xem cấu trúc
    // trả về thật. Cho tới lúc đó KHÔNG suy diễn số → trả null (fallback VNDIRECT).
    void raw
    return empty
  } catch (err) {
    console.warn('[vietstock]', err.message)
    return empty
  }
}
