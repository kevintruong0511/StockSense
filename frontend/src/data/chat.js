// Client cho lịch sử trò chuyện AI (phiên chat). Dùng chung api() + Bearer token.
import { api } from './auth.js'

// Danh sách phiên của user (mới nhất trước): [{id,title,ticker,updated_at}].
export const listSessions = () => api('/ai/sessions', { auth: true }).then((d) => d?.sessions || [])

// Tạo phiên trống (hiếm dùng — phiên thường tạo tự động khi phân tích).
export const createSession = ({ title, ticker } = {}) =>
  api('/ai/sessions', { method: 'POST', auth: true, body: { title, ticker } }).then((d) => d?.session)

// Xem lại 1 phiên: { session, messages:[{role,content,sources}] }.
export const getSessionMessages = (id) => api(`/ai/sessions/${id}`, { auth: true })

// Đổi tên phiên.
export const renameSession = (id, title) =>
  api(`/ai/sessions/${id}`, { method: 'PATCH', auth: true, body: { title } }).then((d) => d?.session)

// Xóa phiên.
export const deleteSession = (id) => api(`/ai/sessions/${id}`, { method: 'DELETE', auth: true })
