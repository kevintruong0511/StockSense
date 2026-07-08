import 'dotenv/config'

// Đọc & kiểm tra cấu hình môi trường một lần, dùng chung toàn app.
export const config = {
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/stocksense',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-doi-trong-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  port: Number(process.env.PORT) || 5174,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Nguồn dữ liệu thị trường: 'simulated' (mặc định) | 'dnse'
  marketProvider: process.env.MARKET_PROVIDER || 'simulated',
  dnseToken: process.env.DNSE_TOKEN || '',
}

if (config.jwtSecret === 'dev-secret-doi-trong-production') {
  console.warn('[config] Đang dùng JWT_SECRET mặc định — hãy đặt JWT_SECRET trong .env cho môi trường thật.')
}
