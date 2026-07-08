// Static, screen-level content (not tied to the selected ticker's live numbers).
// Ported from the design export. Icon fields hold component references from icons.jsx.
import { LineChart, Flag, Compare, FileDoc, BarChart3, ClockSmall, AlertTriangle, CheckSquare } from '../components/icons.jsx'

const UP = '#16A34A'
const DOWN = '#DC2626'
const BLUE = '#2563EB'

// ---------- Dashboard ----------
export const dashStats = [
  { label: 'Giá trị danh mục', value: '1,84 tỷ', delta: '+2,7% hôm nay', color: UP },
  { label: 'Lãi/lỗ chưa thực hiện', value: '+186,4tr', delta: '+11,3% tổng', color: UP },
  { label: 'Mã đang theo dõi', value: '6', delta: '2 mã có tin mới', color: BLUE },
  { label: 'Phân tích AI tháng này', value: '23', delta: 'còn 27 lượt (Free)', color: '#64748B' },
]

export const news = [
  { sent: 'Tích cực', sentFg: UP, sentBg: '#DCFCE7', title: 'FPT ký hợp đồng chuyển đổi số 225 triệu USD với đối tác Nhật Bản', meta: 'CafeF · 2 giờ trước' },
  { sent: 'Trung tính', sentFg: '#64748B', sentBg: '#F1F5F9', title: 'VN-Index giằng co quanh mốc 1.285 điểm, thanh khoản cải thiện nhẹ', meta: 'vietstock · 3 giờ trước' },
  { sent: 'Tiêu cực', sentFg: DOWN, sentBg: '#FEF2F2', title: 'Giá thép xây dựng giảm phiên thứ ba liên tiếp, áp lực lên nhóm thép', meta: 'CafeF · 5 giờ trước' },
  { sent: 'Tích cực', sentFg: UP, sentBg: '#DCFCE7', title: 'Khối ngoại mua ròng hơn 480 tỷ đồng, tập trung nhóm ngân hàng', meta: 'vietstock · 6 giờ trước' },
]

// ---------- Detail: financials ----------
export const finYears = ['2021', '2022', '2023', '2024', '2025']
export const finRows = [
  { label: 'Doanh thu', cells: ['35.657', '44.010', '52.618', '62.849', '73.200'] },
  { label: 'Lợi nhuận sau thuế', cells: ['4.337', '5.301', '6.470', '7.680', '9.150'] },
  { label: 'Biên LN gộp', cells: ['38,1%', '38,6%', '39,2%', '39,8%', '40,5%'] },
  { label: 'ROE', cells: ['23,4%', '24,8%', '26,1%', '27,2%', '28,3%'] },
  { label: 'Nợ/Vốn CSH', cells: ['0,74', '0,68', '0,61', '0,55', '0,49'] },
  { label: 'Dòng tiền HĐKD', cells: ['5.120', '6.010', '7.240', '8.150', '9.870'] },
]

// ---------- Detail: technical ----------
export const techRows = [
  { label: 'RSI (14)', value: '61,2', signal: 'Trung tính', sigFg: '#64748B' },
  { label: 'MACD', value: '+1,84', signal: 'Tín hiệu mua', sigFg: UP },
  { label: 'MA20', value: '132.400', signal: 'Giá trên MA', sigFg: UP },
  { label: 'MA50', value: '126.800', signal: 'Giá trên MA', sigFg: UP },
  { label: 'Bollinger', value: 'Dải giữa', signal: 'Chưa quá mua', sigFg: '#64748B' },
  { label: 'Khối lượng', value: '+18% TB', signal: 'Dòng tiền vào', sigFg: UP },
]

// ---------- Detail: AI panel ----------
export const aiMetrics = [
  { label: 'Biên lợi nhuận gộp', value: '40,5%', delta: '0,7đ', arrow: '▲', trendColor: UP },
  { label: 'Tăng trưởng doanh thu', value: '+16,5%', delta: 'YoY', arrow: '▲', trendColor: UP },
  { label: 'Tăng trưởng LNST', value: '+19,1%', delta: 'YoY', arrow: '▲', trendColor: UP },
  { label: 'Dòng tiền HĐKD/LNST', value: '1,08x', delta: '0,05x', arrow: '▲', trendColor: UP },
  { label: 'Nợ vay/Vốn CSH', value: '0,49', delta: '0,06', arrow: '▼', trendColor: UP },
]
export const aiRedFlags = [
  'Khoản phải thu tăng nhanh hơn doanh thu trong 2 quý gần nhất — cần theo dõi chất lượng ghi nhận.',
  'Một phần tăng trưởng LN đến từ chênh lệch tỷ giá, không phản ánh hoạt động cốt lõi.',
]
export const aiRisks = [
  'Rủi ro tỷ giá JPY/USD ảnh hưởng biên lợi nhuận mảng xuất khẩu phần mềm.',
  'Định giá P/E cao khiến cổ phiếu nhạy với điều chỉnh kỳ vọng tăng trưởng.',
  'Cạnh tranh nhân sự công nghệ đẩy chi phí lương tăng.',
]

// ---------- Compare ----------
export const compareVerdict =
  'Trong nhóm công nghệ, FPT nổi bật về quy mô, ROE (28,3%) và biên lợi nhuận cao nhất, phản ánh vị thế đầu ngành và chất lượng lợi nhuận vượt trội — đổi lại định giá P/E cũng cao nhất. CMG tăng trưởng nhanh nhưng biên lợi nhuận và ROE thấp hơn đáng kể, phù hợp khẩu vị chấp nhận rủi ro cao hơn. ELC quy mô nhỏ, định giá rẻ hơn nhưng kết quả kinh doanh kém ổn định do phụ thuộc tiến độ dự án đầu tư công. Về tổng thể, FPT cân bằng tốt nhất giữa chất lượng và tăng trưởng, trong khi CMG/ELC là lựa chọn thiên về câu chuyện tăng trưởng với biến động lớn hơn.'

// metric definitions for the compare table (best-value highlighting)
export const compareMetricDefs = [
  { label: 'Giá hiện tại', get: (s) => s.price.toLocaleString('vi-VN') },
  { label: 'Vốn hóa', get: (s) => s.cap },
  { label: 'P/E', get: (s) => s.pe, best: 'min' },
  { label: 'P/B', get: (s) => s.pb, best: 'min' },
  { label: 'ROE', get: (s) => s.roe, roe: true, best: 'max' },
  { label: 'EPS (đồng)', get: (s) => s.eps },
  { label: '+/- hôm nay', get: (s) => s.pct, pctColor: true },
]

// ---------- Upload: AI summary sections ----------
export const uploadSections = [
  {
    icon: BarChart3, color: BLUE, title: 'Luận điểm chính',
    items: [
      'Khuyến nghị MUA với giá mục tiêu 165.000đ (+20% so với giá hiện tại).',
      'Động lực chính: tăng trưởng mảng CNTT toàn cầu và biên lợi nhuận cải thiện.',
      'Kỳ vọng LNST 2026 tăng 18–20% so với cùng kỳ.',
    ],
  },
  {
    icon: ClockSmall, color: '#64748B', title: 'Giả định của báo cáo',
    items: [
      'Tăng trưởng doanh thu CNTT nước ngoài duy trì ~28%/năm.',
      'Tỷ giá JPY/VND ổn định trong biên độ hẹp.',
      'Không có suy thoái lớn ở thị trường Mỹ/EU trong 12 tháng tới.',
    ],
  },
  {
    icon: AlertTriangle, color: '#B45309', title: 'Rủi ro nêu trong báo cáo',
    items: [
      'Biến động tỷ giá làm giảm biên lợi nhuận xuất khẩu.',
      'Định giá đã ở vùng cao so với lịch sử.',
      'Rủi ro cạnh tranh và chi phí nhân sự công nghệ.',
    ],
  },
  {
    icon: CheckSquare, color: UP, title: 'Khuyến nghị gốc',
    items: [
      'Xếp hạng: MUA · Giá mục tiêu 165.000đ · Khung 12 tháng.',
      'Người viết: Khối phân tích CTCK (tài liệu do người dùng cung cấp).',
    ],
  },
]

// ---------- History ----------
export const allHistory = [
  { code: 'FPT', type: 'Phân tích cổ phiếu', typeFg: BLUE, typeBg: '#EFF6FF', cat: 'stock', summary: 'Tăng trưởng chất lượng cao, định giá không rẻ nhưng hợp lý.', date: '08/07 09:12' },
  { code: 'HPG', type: 'Phân tích cổ phiếu', typeFg: BLUE, typeBg: '#EFF6FF', cat: 'stock', summary: 'Đầu chu kỳ hồi phục, nhạy với giá thép và Dung Quất 2.', date: '07/07 15:40' },
  { code: 'FPT', type: 'Tóm tắt báo cáo', typeFg: '#7C3AED', typeBg: '#F5F3FF', cat: 'report', summary: 'BaoCao_FPT_Q2-2026.pdf — khuyến nghị MUA, mục tiêu 165.000đ.', date: '06/07 11:05' },
  { code: 'VCB', type: 'Phân tích cổ phiếu', typeFg: BLUE, typeBg: '#EFF6FF', cat: 'stock', summary: 'Chất lượng tài sản tốt nhất nhóm quốc doanh, định giá premium.', date: '05/07 10:22' },
  { code: 'FPT vs CMG vs ELC', type: 'So sánh ngành', typeFg: '#0891B2', typeBg: '#ECFEFF', cat: 'compare', summary: 'FPT cân bằng tốt nhất chất lượng và tăng trưởng trong nhóm CNTT.', date: '04/07 16:48' },
  { code: 'MWG', type: 'Phân tích cổ phiếu', typeFg: BLUE, typeBg: '#EFF6FF', cat: 'stock', summary: 'Phục hồi lợi nhuận nhờ Bách Hóa Xanh hòa vốn.', date: '03/07 09:30' },
]
export const histFilterDefs = [
  ['all', 'Tất cả'],
  ['stock', 'Cổ phiếu'],
  ['report', 'Báo cáo PDF'],
  ['compare', 'So sánh'],
]

// ---------- Landing feature cards ----------
export const features = [
  { icon: LineChart, iconColor: BLUE, bg: '#EFF6FF', title: 'Phân tích BCTC bằng AI', desc: 'AI đọc báo cáo tài chính 10 năm, bóc tách biên lợi nhuận, dòng tiền và chất lượng lợi nhuận.' },
  { icon: Flag, iconColor: UP, bg: '#F0FDF4', title: 'Sentiment tin tức', desc: 'Tổng hợp tin tức và đo tâm lý thị trường theo mã, cảnh báo red flag sớm.' },
  { icon: Compare, iconColor: '#7C3AED', bg: '#F5F3FF', title: 'So sánh cùng ngành', desc: 'Đặt 2–4 doanh nghiệp cạnh nhau, so định giá và nhận xét tổng hợp từ AI.' },
  { icon: FileDoc, iconColor: '#EA580C', bg: '#FFF7ED', title: 'Tóm tắt báo cáo PDF', desc: 'Tải lên báo cáo phân tích, AI rút gọn luận điểm, giả định và rủi ro gốc.' },
]

// ---------- Detail tabs / timeframes ----------
export const tabDef = [
  ['overview', 'Tổng quan'],
  ['fin', 'Phân tích tài chính'],
  ['news', 'Tin tức & Sentiment'],
  ['peers', 'So sánh ngành'],
  ['tech', 'Chỉ báo kỹ thuật'],
]
export const tfDef = ['1D', '1W', '1M', '1Y']
