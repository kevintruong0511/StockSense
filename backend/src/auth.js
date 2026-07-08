import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from './config.js'

const SALT_ROUNDS = 10

export const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS)
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash)

export const signToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  })

// Trả payload nếu token hợp lệ, ném lỗi nếu không. Dùng cho cả HTTP và WebSocket.
export const verifyToken = (token) => jwt.verify(token, config.jwtSecret)

// Chỉ trả những trường an toàn cho client — không bao giờ lộ password_hash.
export const publicUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: row.created_at,
})

// Middleware: yêu cầu Bearer token hợp lệ, gắn req.userId.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập.' })
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' })
  }
}
