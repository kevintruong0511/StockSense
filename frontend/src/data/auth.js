// Lớp gọi API xác thực + lưu token phía client.
// Token lưu ở localStorage để giữ phiên qua các lần tải lại trang.

const TOKEN_KEY = 'stocksense.token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// Gọi API, tự đính kèm Bearer token, và ném lỗi có message tiếng Việt từ server.
async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    // trả về không phải JSON
  }
  if (!res.ok) {
    throw new Error(data?.error || 'Có lỗi xảy ra, vui lòng thử lại.')
  }
  return data
}

export const login = (email, password) =>
  api('/auth/login', { method: 'POST', body: { email, password } })

export const register = (name, email, password) =>
  api('/auth/register', { method: 'POST', body: { name, email, password } })

export const fetchMe = () => api('/auth/me', { auth: true })
