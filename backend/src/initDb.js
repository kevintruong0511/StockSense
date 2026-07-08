// Khởi tạo schema — chạy: npm run db:init
// An toàn khi chạy lại nhiều lần (IF NOT EXISTS).
import { pool } from './db.js'

const SQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tra cứu theo email (đăng nhập) không phân biệt hoa/thường.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));
`

async function main() {
  try {
    await pool.query(SQL)
    console.log('[initDb] Đã tạo/kiểm tra bảng users thành công.')
  } catch (err) {
    console.error('[initDb] Khởi tạo schema thất bại:', err.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

main()
