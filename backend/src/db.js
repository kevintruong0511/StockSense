import pg from 'pg'
import { config } from './config.js'

// Một pool kết nối dùng chung. Các route gọi query() qua đây.
export const pool = new pg.Pool({ connectionString: config.databaseUrl })

pool.on('error', (err) => {
  console.error('[db] Lỗi client PostgreSQL không mong đợi:', err)
})

export const query = (text, params) => pool.query(text, params)
