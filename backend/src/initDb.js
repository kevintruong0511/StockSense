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

-- Gói của user (mặc định free); plan_expires_at NULL = vĩnh viễn (free hoặc ưu đãi lifetime).
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Đếm lượt gọi AI theo ngày (ngày tính theo giờ VN ở tầng app).
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  count      INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

-- Đơn thanh toán (1 đơn = 1 lần mua gói).
CREATE TABLE IF NOT EXISTS payment_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL,                     -- 'pro' | 'ultra'
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  amount        INT  NOT NULL,                     -- VND
  order_code    TEXT NOT NULL UNIQUE,              -- nội dung CK, vd 'SS7F3K9Q'
  provider      TEXT NOT NULL DEFAULT 'sepay',
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending | paid | expired | cancelled
  ref_code      TEXT,                              -- mã giao dịch SePay (chống xử lý trùng)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  paid_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS payment_orders_code_idx ON payment_orders (order_code);

-- Mã ưu đãi + số lượt đã dùng.
CREATE TABLE IF NOT EXISTS promo_codes (
  code          TEXT PRIMARY KEY,
  plan          TEXT NOT NULL,                     -- gói được cấp
  duration_days INT,                               -- NULL = vĩnh viễn
  max_uses      INT,                               -- NULL = không giới hạn
  used_count    INT NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mỗi user chỉ dùng 1 mã đúng 1 lần.
CREATE TABLE IF NOT EXISTS promo_redemptions (
  code        TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (code, user_id)
);

-- Seed mã sẵn: BACUAKHANG -> Ultra vĩnh viễn.
INSERT INTO promo_codes (code, plan, duration_days, max_uses)
VALUES ('BACUAKHANG', 'ultra', NULL, NULL)
ON CONFLICT (code) DO NOTHING;

-- Phiên trò chuyện AI (mỗi phiên = 1 cuộc phân tích/hội thoại), lưu để xem lại sau khi đăng nhập lại.
CREATE TABLE IF NOT EXISTS chat_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'Cuộc trò chuyện mới',
  ticker     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Liệt kê phiên của user, mới nhất trước.
CREATE INDEX IF NOT EXISTS chat_sessions_user_idx ON chat_sessions (user_id, updated_at DESC);

-- Từng tin nhắn trong phiên. content lưu NGUYÊN văn (đã gồm marker chip nguồn ⟦host|url⟧).
CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,                     -- 'user' | 'assistant'
  content    TEXT NOT NULL,
  sources    JSONB,                             -- [{url,title}] cho lượt assistant
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages (session_id, created_at);
`

async function main() {
  try {
    await pool.query(SQL)
    console.log('[initDb] Đã tạo/kiểm tra schema (users, ai_usage, payment_orders, promo_codes, chat_sessions, chat_messages) thành công.')
  } catch (err) {
    console.error('[initDb] Khởi tạo schema thất bại:', err.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

main()
