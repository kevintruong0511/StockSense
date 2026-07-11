// Đếm lượt gọi AI theo ngày. "Ngày" tính theo giờ Việt Nam (Asia/Ho_Chi_Minh)
// để mốc reset khớp trải nghiệm người dùng trong nước, không phụ thuộc timezone server.
import { query } from '../db.js'

const VN_DAY = "(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date"

// Số lượt đã dùng hôm nay của user (0 nếu chưa có bản ghi).
export async function getUsage(userId) {
  const { rows } = await query(
    `SELECT count FROM ai_usage WHERE user_id = $1 AND usage_date = ${VN_DAY}`,
    [userId],
  )
  return rows[0]?.count ?? 0
}

// Tăng 1 lượt cho hôm nay (UPSERT). Trả về số lượt mới sau khi tăng.
export async function consume(userId) {
  const { rows } = await query(
    `INSERT INTO ai_usage (user_id, usage_date, count)
     VALUES ($1, ${VN_DAY}, 1)
     ON CONFLICT (user_id, usage_date) DO UPDATE SET count = ai_usage.count + 1
     RETURNING count`,
    [userId],
  )
  return rows[0]?.count ?? 1
}
