import 'dotenv/config'

// Đọc & kiểm tra cấu hình môi trường một lần, dùng chung toàn app.
export const config = {
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/stocksense',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-doi-trong-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  port: Number(process.env.PORT) || 5174,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Phân tích AI qua gateway tương thích Anthropic (mặc định: api.nkq.vn).
  // Chỉ bật khi có ANTHROPIC_API_KEY; mọi giá trị đọc từ env để dễ deploy.
  ai: {
    baseUrl: (process.env.ANTHROPIC_BASE_URL || 'https://api.nkq.vn').replace(/\/+$/, ''),
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'nkq-4-6',
    get enabled() {
      return Boolean(this.apiKey)
    },
  },
}

if (config.jwtSecret === 'dev-secret-doi-trong-production') {
  console.warn('[config] Đang dùng JWT_SECRET mặc định — hãy đặt JWT_SECRET trong .env cho môi trường thật.')
}
