// Lưu/đọc lịch sử trò chuyện AI trong Postgres. Mọi hàm đọc/sửa phiên đều kiểm
// ownership theo userId để user không đụng được phiên của người khác.
import { query } from '../db.js'

// Mã được phân tích nhiều nhất (toàn hệ thống) trong N ngày qua — cho widget Dashboard.
// Đếm số phiên chat theo mã; trả [{ code, count }] giảm dần.
export async function topTickers({ days = 7, limit = 5 } = {}) {
  const { rows } = await query(
    `SELECT upper(ticker) AS code, count(*)::int AS count
       FROM chat_sessions
      WHERE ticker IS NOT NULL AND ticker <> ''
        AND created_at > now() - ($1 || ' days')::interval
      GROUP BY upper(ticker)
      ORDER BY count DESC, code ASC
      LIMIT $2`,
    [String(days), limit],
  )
  return rows
}

// Danh sách phiên của user (mới nhất trước) — dùng cho panel bên trái màn Phân tích AI.
export async function listSessions(userId) {
  const { rows } = await query(
    `SELECT id, title, ticker, updated_at
       FROM chat_sessions
      WHERE user_id = $1
      ORDER BY updated_at DESC`,
    [userId],
  )
  return rows
}

// Tạo phiên mới, trả về bản ghi vừa tạo.
export async function createSession(userId, { title, ticker } = {}) {
  const { rows } = await query(
    `INSERT INTO chat_sessions (user_id, title, ticker)
     VALUES ($1, COALESCE($2, 'Cuộc trò chuyện mới'), $3)
     RETURNING id, title, ticker, updated_at`,
    [userId, title || null, ticker || null],
  )
  return rows[0]
}

// Lấy 1 phiên (kèm kiểm ownership). Trả null nếu không thuộc user.
export async function getSession(userId, sessionId) {
  const { rows } = await query(
    `SELECT id, title, ticker, updated_at
       FROM chat_sessions
      WHERE id = $1 AND user_id = $2`,
    [sessionId, userId],
  )
  return rows[0] || null
}

// Toàn bộ tin nhắn của 1 phiên (theo thứ tự thời gian). JOIN đảm bảo phiên thuộc user.
export async function getMessages(userId, sessionId) {
  const { rows } = await query(
    `SELECT m.role, m.content, m.sources
       FROM chat_messages m
       JOIN chat_sessions s ON s.id = m.session_id
      WHERE m.session_id = $1 AND s.user_id = $2
      ORDER BY m.created_at`,
    [sessionId, userId],
  )
  return rows.map((r) => ({ role: r.role, content: r.content, sources: r.sources || undefined }))
}

// Thêm 1 tin nhắn vào phiên. sources là mảng [{url,title}] (chỉ với assistant) hoặc undefined.
export async function addMessage(sessionId, { role, content, sources }) {
  await query(
    `INSERT INTO chat_messages (session_id, role, content, sources)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, role, content, sources ? JSON.stringify(sources) : null],
  )
}

// Đụng vào updated_at để phiên nổi lên đầu; cập nhật title/ticker nếu truyền vào.
export async function touchSession(sessionId, { title, ticker } = {}) {
  await query(
    `UPDATE chat_sessions
        SET updated_at = now(),
            title  = COALESCE($2, title),
            ticker = COALESCE($3, ticker)
      WHERE id = $1`,
    [sessionId, title || null, ticker || null],
  )
}

// Đổi tên phiên (kiểm ownership). Trả về bản ghi mới hoặc null nếu không thuộc user.
export async function renameSession(userId, sessionId, title) {
  const { rows } = await query(
    `UPDATE chat_sessions
        SET title = $3, updated_at = updated_at
      WHERE id = $1 AND user_id = $2
      RETURNING id, title, ticker, updated_at`,
    [sessionId, userId, title],
  )
  return rows[0] || null
}

// Xóa phiên (CASCADE xóa messages). Trả về true nếu có xóa.
export async function deleteSession(userId, sessionId) {
  const { rowCount } = await query(
    `DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, userId],
  )
  return rowCount > 0
}
