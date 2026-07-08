# StockSense VN — Backend (API xác thực)

API đăng nhập/đăng ký cho StockSense VN. **Express + PostgreSQL**, mật khẩu hash bằng
bcrypt, phiên đăng nhập dùng JWT.

## Yêu cầu

- Node.js 18+
- Một PostgreSQL đang chạy (local hoặc Docker)

## Cài đặt

```bash
cd backend
npm install
cp .env.example .env      # rồi sửa DATABASE_URL và JWT_SECRET
npm run db:init           # tạo bảng users
npm run dev               # chạy API tại http://localhost:5174
```

### Chạy nhanh PostgreSQL bằng Docker (nếu chưa có)

```bash
docker run --name stocksense-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=stocksense -p 5432:5432 -d postgres:16
```

Với lệnh trên, `DATABASE_URL` mặc định trong `.env.example` dùng được ngay.

## API

| Method | Đường dẫn            | Mô tả                                    | Auth |
| ------ | -------------------- | ---------------------------------------- | ---- |
| GET    | `/api/health`        | Kiểm tra server sống                     | —    |
| POST   | `/api/auth/register` | Đăng ký `{ name, email, password }`      | —    |
| POST   | `/api/auth/login`    | Đăng nhập `{ email, password }`          | —    |
| GET    | `/api/auth/me`       | Lấy thông tin user từ token (khôi phục phiên) | Bearer |

`register`/`login` trả về `{ token, user }`. Client lưu `token` và gửi kèm header
`Authorization: Bearer <token>` cho các request cần đăng nhập.

## Dữ liệu thị trường

| Method | Đường dẫn                     | Nguồn                | Mô tả                                   |
| ------ | ----------------------------- | -------------------- | --------------------------------------- |
| WS     | `/ws?token=<JWT>`             | provider realtime    | Subscribe theo mã, nhận `{type:'quote'}`|
| GET    | `/api/stocks/:t/quote`        | provider realtime    | Snapshot giá gần nhất                    |
| GET    | `/api/stocks/:t/candles`      | VNDIRECT             | Nến OHLC thật (`?resolution=D&days=300`) |
| GET    | `/api/stocks/:t/overview`     | VNDIRECT             | Hồ sơ doanh nghiệp                       |
| GET    | `/api/stocks/:t/ratios`       | VNDIRECT             | P/E, P/B, tỷ suất cổ tức…                |

Tất cả route `/api/stocks/*` yêu cầu Bearer token.

### Giá realtime & provider

- WebSocket client gửi `{ "type": "subscribe", "tickers": ["FPT","VCB"] }` và nhận
  `{ "type": "quote", "quote": { ticker, price, ref, change, pct, volume, side, time } }`.
- Provider chọn qua `MARKET_PROVIDER`:
  - `simulated` (mặc định): sinh tick mô phỏng, **giá tham chiếu lấy từ giá đóng cửa
    thật của VNDIRECT** nên dao động quanh giá thật và khớp biểu đồ nến.
  - `dnse`: dữ liệu thật từ DNSE LightSpeed. Cần hoàn thiện
    `src/market/providers/dnse.js` (có hướng dẫn trong file) và đặt `DNSE_TOKEN`.
    Nếu chưa hoàn thiện, hệ thống tự fallback về `simulated`.
