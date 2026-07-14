import { Router } from 'express'
import { z } from 'zod'
import { query } from '../db.js'
import {
  hashPassword,
  verifyPassword,
  signToken,
  publicUser,
  requireAuth,
} from '../auth.js'

const router = Router()

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Tên phải có ít nhất 2 ký tự.').max(80),
  email: z.string().trim().toLowerCase().email('Email không hợp lệ.'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự.').max(200),
})

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ.'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
})

// Gom lỗi zod đầu tiên thành một chuỗi thân thiện.
const firstError = (result) => result.error.issues[0]?.message || 'Dữ liệu không hợp lệ.'

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstError(parsed) })
  const { name, email, password } = parsed.data

  try {
    const exists = await query('SELECT 1 FROM users WHERE lower(email) = $1', [email])
    if (exists.rowCount > 0) {
      return res.status(409).json({ error: 'Email này đã được đăng ký.' })
    }
    const passwordHash = await hashPassword(password)
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at, plan, plan_expires_at`,
      [name, email, passwordHash],
    )
    const user = rows[0]
    const token = signToken(user)
    res.status(201).json({ token, user: publicUser(user) })
  } catch (err) {
    console.error('[register]', err)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstError(parsed) })
  const { email, password } = parsed.data

  try {
    const { rows } = await query('SELECT * FROM users WHERE lower(email) = $1', [email])
    const user = rows[0]
    // Thông báo chung để không lộ email nào đã tồn tại.
    const invalid = () => res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' })
    if (!user) return invalid()
    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) return invalid()

    const token = signToken(user)
    res.json({ token, user: publicUser(user) })
  } catch (err) {
    console.error('[login]', err)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Tên phải có ít nhất 2 ký tự.').max(80),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự.').max(200),
})

// PATCH /api/auth/me — cập nhật thông tin tài khoản (hiện: tên hiển thị).
router.patch('/me', requireAuth, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstError(parsed) })
  try {
    const { rows } = await query(
      `UPDATE users SET name = $1 WHERE id = $2
       RETURNING id, name, email, created_at, plan, plan_expires_at`,
      [parsed.data.name, req.userId],
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
    res.json({ user: publicUser(rows[0]) })
  } catch (err) {
    console.error('[update-profile]', err)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// POST /api/auth/change-password — đổi mật khẩu (xác thực mật khẩu hiện tại).
router.post('/change-password', requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstError(parsed) })
  const { currentPassword, newPassword } = parsed.data
  try {
    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.userId])
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
    const ok = await verifyPassword(currentPassword, rows[0].password_hash)
    if (!ok) return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' })
    const passwordHash = await hashPassword(newPassword)
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.userId])
    res.json({ ok: true })
  } catch (err) {
    console.error('[change-password]', err)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

// GET /api/auth/me — khôi phục phiên từ token đã lưu ở client.
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, name, email, created_at, plan, plan_expires_at FROM users WHERE id = $1',
      [req.userId],
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
    res.json({ user: publicUser(rows[0]) })
  } catch (err) {
    console.error('[me]', err)
    res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
  }
})

export default router
