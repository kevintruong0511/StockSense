import pg from 'pg'
import { config } from './config.js'

// Cột DATE (OID 1082) → GIỮ NGUYÊN chuỗi 'YYYY-MM-DD'. Mặc định node-pg parse DATE
// thành Date lúc nửa đêm giờ máy chủ; đổi qua UTC (toISOString) sẽ LỆCH 1 ngày ở múi
// giờ dương như VN. Trả chuỗi thô để ngày giao dịch không bị xê dịch.
pg.types.setTypeParser(1082, (v) => v)

// Một pool kết nối dùng chung. Các route gọi query() qua đây.
export const pool = new pg.Pool({ connectionString: config.databaseUrl })

pool.on('error', (err) => {
  console.error('[db] Lỗi client PostgreSQL không mong đợi:', err)
})

export const query = (text, params) => pool.query(text, params)
