import 'dotenv/config'

// Đọc & kiểm tra cấu hình môi trường một lần, dùng chung toàn app.
export const config = {
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/stocksense',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-doi-trong-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  port: Number(process.env.PORT) || 5174,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Phân tích AI qua DeepSeek (endpoint TƯƠNG THÍCH ANTHROPIC:
  // https://api.deepseek.com/anthropic) — dùng lại @anthropic-ai/sdk + tool
  // web_search server-side. Chỉ bật khi có DEEPSEEK_API_KEY.
  // LƯU Ý: DeepSeek BỎ QUA trường citations gốc → không có chip nguồn inline;
  // ta bóc URL từ block web_search_tool_result để hiện danh sách "Nguồn tham khảo".
  ai: {
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/anthropic',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    // deepseek-v4-pro (map từ opus) = bản mạnh nhất, hợp phân tích sâu. .env/Render env đè lên.
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
    // Trần token OUTPUT/lượt. Để rộng, tránh cắt giữa chừng. Đang STREAM nên max_tokens
    // lớn không gây timeout; chỉ TRẢ TIỀN token thực sinh ra, không phải cả trần.
    maxTokens: Number(process.env.AI_MAX_TOKENS) || 16000,
    webSearch: process.env.AI_WEB_SEARCH !== 'false', // bật mặc định; đặt 'false' để tắt
    // Số lần web_search tối đa MỖI lượt phân tích (chặn chi phí, KHÔNG liên quan credits).
    // Cao hơn = research phủ rộng/sâu hơn nhưng tốn token & chi phí hơn mỗi lượt.
    maxUses: Number(process.env.AI_WEB_SEARCH_MAX_USES) || 12,
    // web_fetch = cho AI đọc TRỌN bài (phân tích sâu hơn). TẮT mặc định vì cấu hình
    // tool này CHƯA test — bật bằng AI_WEB_FETCH=true rồi chạy 1 lượt kiểm tra.
    webFetch: process.env.AI_WEB_FETCH === 'true',
    fetchMaxUses: Number(process.env.AI_WEB_FETCH_MAX_USES) || 5,
    fetchMaxTokens: Number(process.env.AI_WEB_FETCH_MAX_TOKENS) || 6000,
    get enabled() {
      return Boolean(this.apiKey)
    },
  },

  // Nguồn dữ liệu thị trường. Ưu tiên SSI (giá) + Vietstock (chỉ số cơ bản);
  // VNDIRECT luôn dùng làm FALLBACK (chạy toàn cầu, không cần auth).
  data: {
    ssi: {
      consumerId: process.env.SSI_CONSUMER_ID || '',
      secret: process.env.SSI_CONSUMER_SECRET || '',
    },
    vietstock: {
      // Vietstock không có API chính thức — chỉ bật khi đã xác nhận endpoint/mapping.
      enabled: process.env.VIETSTOCK_ENABLED === 'true',
    },
  },

  // Thanh toán QR tự động qua MB Bank + SePay. Mọi giá trị đọc từ env để dễ deploy.
  billing: {
    bankCode: process.env.SEPAY_BANK || 'MB', // mã ngân hàng cho QR SePay
    bankAccount: process.env.SEPAY_ACCOUNT || '', // số TK nhận tiền
    accountName: process.env.SEPAY_ACCOUNT_NAME || 'STOCKSENSE VN',
    webhookApiKey: process.env.SEPAY_WEBHOOK_API_KEY || '', // verify webhook SePay
    prices: { pro: 99000, ultra: 299000 }, // VND/tháng, khớp Pricing.jsx
    orderTtlMinutes: Number(process.env.ORDER_TTL_MINUTES) || 15,
    planDurationDays: Number(process.env.PLAN_DURATION_DAYS) || 30,
    // Bật endpoint giả lập thanh toán để test khi chưa cấu hình SePay (tắt ở production).
    allowMockPay: process.env.NODE_ENV !== 'production',
  },
}

if (config.jwtSecret === 'dev-secret-doi-trong-production') {
  console.warn('[config] Đang dùng JWT_SECRET mặc định — hãy đặt JWT_SECRET trong .env cho môi trường thật.')
}
if (!config.ai.apiKey) {
  console.warn('[config] Chưa có DEEPSEEK_API_KEY — tính năng Phân tích AI đang TẮT. Thêm khóa vào backend/.env.')
}
