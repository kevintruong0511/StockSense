// Lớp gọi API xác thực + lưu token phía client.
// Token lưu ở localStorage để giữ phiên qua các lần tải lại trang.

const TOKEN_KEY = 'stocksense.token'

// Base URL cho API — dùng biến môi trường khi có, fallback về proxy tương đối (dev).
const API_BASE = import.meta.env.VITE_API_URL || ''

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// Tạo message dự phòng theo mã HTTP khi server không trả về `error` cụ thể
// (vd. phản hồi 404/502 dạng HTML khi cấu hình API sai). Kèm mã để dễ chẩn đoán.
function fallbackMessage(status) {
  if (status === 429) return 'Bạn thao tác quá nhanh, vui lòng thử lại sau giây lát.'
  if (status >= 500) return `Lỗi máy chủ (HTTP ${status}), vui lòng thử lại sau.`
  if (status === 404) return 'Không tìm thấy dịch vụ máy chủ (HTTP 404). Kiểm tra cấu hình API.'
  return `Có lỗi xảy ra (HTTP ${status}), vui lòng thử lại.`
}

// Gọi API, tự đính kèm Bearer token, và ném lỗi có message tiếng Việt từ server.
// Export để các lớp data khác (billing…) tái dùng cùng cơ chế token + xử lý lỗi.
export async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    // fetch chỉ reject khi lỗi mạng/không kết nối được (server sập, sai URL, CORS…).
    throw new Error('Không thể kết nối tới máy chủ. Kiểm tra kết nối mạng rồi thử lại.')
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    // phản hồi không phải JSON (vd. trang lỗi HTML) — để data = null.
  }

  if (!res.ok) {
    // Ưu tiên thông báo cụ thể từ server; nếu không có thì suy ra theo mã HTTP.
    // Gắn `status` để nơi gọi phân biệt được 401 (token sai/hết hạn) với lỗi tạm thời khác.
    const err = new Error(data?.error || fallbackMessage(res.status))
    err.status = res.status
    throw err
  }
  return data
}

export const login = (email, password) =>
  api('/auth/login', { method: 'POST', body: { email, password } })

export const register = (name, email, password) =>
  api('/auth/register', { method: 'POST', body: { name, email, password } })

export const fetchMe = () => api('/auth/me', { auth: true })

// Cập nhật tên hiển thị → trả { user }.
export const updateProfile = (name) => api('/auth/me', { method: 'PATCH', auth: true, body: { name } })

// Đổi mật khẩu (cần mật khẩu hiện tại) → trả { ok: true }.
export const changePassword = (currentPassword, newPassword) =>
  api('/auth/change-password', { method: 'POST', auth: true, body: { currentPassword, newPassword } })
