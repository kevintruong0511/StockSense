# StockSense VN — Frontend

Giao diện web StockSense VN dựng lại bằng **React + Vite + Tailwind CSS**, hiện chạy hoàn toàn với **mock data** (chưa nối backend/API).

## Chạy dự án

```bash
npm install     # cài dependencies (chạy 1 lần)
npm run dev     # server dev tại http://localhost:5173
npm run build   # build production vào dist/
npm run preview # xem thử bản build
```

## Các màn hình

| Màn hình         | Mô tả                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| Landing          | Hero, ô tìm mã, 4 thẻ tính năng, dải "dữ liệu minh bạch", footer.        |
| Trang chủ        | Thẻ chỉ số, danh mục theo dõi, tin tức (có state loading/lỗi), top phân tích. |
| Chi tiết mã      | Header giá, biểu đồ nến + khối lượng (hover crosshair), 5 tab, panel AI streaming. |
| So sánh ngành    | Bảng so sánh 2–4 mã (tô đậm giá trị tốt nhất) + nhận xét AI.             |
| Phân tích báo cáo| Dropzone PDF với 3 trạng thái: idle → đang đọc → tóm tắt.                |
| Lịch sử phân tích| Danh sách phân tích đã lưu, lọc theo loại.                               |

## Điều hướng nhanh khi dev

Có thể deep-link tới từng màn hình qua query param (đọc 1 lần lúc tải trang):

```
http://localhost:5173/?screen=dashboard
http://localhost:5173/?screen=detail&ticker=HPG
http://localhost:5173/?screen=compare
http://localhost:5173/?screen=upload
http://localhost:5173/?screen=history
```

Không có query → mặc định vào Landing.

## Cấu trúc

```
src/
  App.jsx              # state trung tâm + điều hướng + mô phỏng AI streaming
  components/
    icons.jsx          # bộ icon line (stroke=currentColor)
    Sidebar.jsx        # thanh điều hướng trái (app shell)
    TopBar.jsx         # ô tìm kiếm + autocomplete + VN-Index
    StockChart.jsx     # biểu đồ nến + khối lượng bằng SVG, có tooltip OHLC
  screens/             # 6 màn hình
  data/
    stocks.js          # STOCKS, sinh dữ liệu nến, text AI, helper định dạng
    appData.js         # nội dung tĩnh: tin tức, BCTC, red flags, lịch sử, feature cards…
```

## Ghi chú

- Toàn bộ số liệu là **mock** lấy từ bản thiết kế; phần "AI" chỉ mô phỏng hiệu ứng streaming, chưa gọi model thật.
- Bảng màu dùng đúng palette Tailwind mặc định (slate / blue / green / red / amber / violet), khớp với thiết kế gốc.
- Font **Inter** nạp từ Google Fonts trong `index.html`.
