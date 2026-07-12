// Static ticker universe + deterministic chart generation + AI summary text.
// Ported verbatim from the StockSense VN design export so the numbers match.

export const STOCKS = {
  FPT: {
    name: 'CTCP FPT', exch: 'HOSE', sector: 'Công nghệ', short: 'FPT',
    price: 137500, pct: 2.31, chg: 3100, cap: '201.400 tỷ', pe: 22.4, pb: 5.8,
    roe: '28,3%', vol: '4,12tr', eps: '6.140', high52: '142.000', low52: '88.500',
    logoBg: '#EFF6FF', logoFg: '#2563EB',
    profile:
      'FPT là tập đoàn công nghệ lớn nhất Việt Nam, hoạt động ở ba mảng: Công nghệ (xuất khẩu phần mềm & dịch vụ CNTT), Viễn thông và Giáo dục. Doanh thu khối công nghệ toàn cầu tăng trưởng hai chữ số nhiều năm liền, biên lợi nhuận cải thiện đều nhờ dịch chuyển sang các hợp đồng chuyển đổi số giá trị cao.',
  },
  HPG: {
    name: 'CTCP Tập đoàn Hòa Phát', exch: 'HOSE', sector: 'Thép', short: 'HPG',
    price: 28150, pct: -1.24, chg: -350, cap: '179.800 tỷ', pe: 13.1, pb: 1.6,
    roe: '12,7%', vol: '32,4tr', eps: '2.150', high52: '31.200', low52: '21.400',
    logoBg: '#FEF2F2', logoFg: '#DC2626',
    profile:
      'Hòa Phát là nhà sản xuất thép lớn nhất Việt Nam và Đông Nam Á, sở hữu chuỗi giá trị khép kín từ quặng đến thành phẩm. Kết quả kinh doanh có tính chu kỳ cao, nhạy với giá thép và bất động sản xây dựng; dự án Dung Quất 2 kỳ vọng nâng công suất đáng kể.',
  },
  VNM: {
    name: 'CTCP Sữa Việt Nam', exch: 'HOSE', sector: 'Hàng tiêu dùng', short: 'VNM',
    price: 64300, pct: 0.47, chg: 300, cap: '134.500 tỷ', pe: 16.8, pb: 4.1,
    roe: '24,1%', vol: '2,86tr', eps: '3.830', high52: '72.100', low52: '58.900',
    logoBg: '#F0FDF4', logoFg: '#16A34A',
    profile:
      'Vinamilk dẫn đầu ngành sữa Việt Nam với thị phần lớn và thương hiệu mạnh. Dòng tiền ổn định, cổ tức tiền mặt đều đặn; thách thức nằm ở tăng trưởng nội địa chậm và cạnh tranh, bù lại bằng mở rộng xuất khẩu và cao cấp hóa sản phẩm.',
  },
  VCB: {
    name: 'Ngân hàng TMCP Ngoại thương VN', exch: 'HOSE', sector: 'Ngân hàng', short: 'VCB',
    price: 91800, pct: 1.1, chg: 1000, cap: '513.200 tỷ', pe: 15.2, pb: 2.9,
    roe: '20,4%', vol: '3,54tr', eps: '6.040', high52: '98.700', low52: '80.100',
    logoBg: '#F0FDF4', logoFg: '#16A34A',
    profile:
      'Vietcombank là ngân hàng có chất lượng tài sản tốt nhất nhóm quốc doanh, tỷ lệ nợ xấu thấp và bộ đệm dự phòng dày. Định giá luôn ở mức cao so với ngành nhờ vị thế và khả năng sinh lời bền vững.',
  },
  MWG: {
    name: 'CTCP Đầu tư Thế Giới Di Động', exch: 'HOSE', sector: 'Bán lẻ', short: 'MWG',
    price: 58900, pct: -0.68, chg: -400, cap: '86.100 tỷ', pe: 19.7, pb: 3.2,
    roe: '16,8%', vol: '6,71tr', eps: '2.990', high52: '64.500', low52: '42.300',
    logoBg: '#FFF7ED', logoFg: '#EA580C',
    profile:
      'MWG vận hành chuỗi Thế Giới Di Động, Điện Máy Xanh và Bách Hóa Xanh. Sau giai đoạn tái cấu trúc, Bách Hóa Xanh đã đạt điểm hòa vốn và bắt đầu đóng góp lợi nhuận, mở ra dư địa tăng trưởng bán lẻ thực phẩm.',
  },
  CMG: {
    name: 'CTCP Tập đoàn Công nghệ CMC', exch: 'HOSE', sector: 'Công nghệ', short: 'CMG',
    price: 52400, pct: 1.55, chg: 800, cap: '8.900 tỷ', pe: 24.9, pb: 2.7,
    roe: '11,9%', vol: '0,74tr', eps: '2.100', high52: '58.000', low52: '38.200',
    logoBg: '#EEF2FF', logoFg: '#4F46E5',
    profile:
      'CMC là tập đoàn công nghệ lớn thứ hai Việt Nam sau FPT, mạnh về hạ tầng, an ninh mạng và dịch vụ CNTT. Quy mô nhỏ hơn nhiều nhưng tăng trưởng nhanh ở mảng chuyển đổi số và trung tâm dữ liệu.',
  },
  ELC: {
    name: 'CTCP Công nghệ Elcom', exch: 'HOSE', sector: 'Công nghệ', short: 'ELC',
    price: 24600, pct: -0.81, chg: -200, cap: '2.100 tỷ', pe: 18.3, pb: 1.9,
    roe: '10,4%', vol: '1,22tr', eps: '1.340', high52: '29.400', low52: '17.800',
    logoBg: '#F5F3FF', logoFg: '#7C3AED',
    profile:
      'Elcom cung cấp giải pháp CNTT và hạ tầng giao thông thông minh (ITS). Backlog dự án ITS từ đầu tư công là động lực chính, song doanh thu biến động mạnh theo tiến độ giải ngân.',
  },
}

const AI_SOURCE = {
  FPT: 'FPT duy trì đà tăng trưởng chất lượng cao, dẫn dắt bởi mảng xuất khẩu phần mềm và dịch vụ chuyển đổi số. Biên lợi nhuận gộp cải thiện đều đặn nhờ dịch chuyển lên các hợp đồng giá trị cao tại Nhật Bản và Mỹ. Dòng tiền hoạt động khỏe, nợ vay ở mức an toàn. Định giá hiện không rẻ (P/E ~22) nhưng phản ánh kỳ vọng tăng trưởng bền vững và vị thế đầu ngành công nghệ.',
  HPG: 'Hòa Phát đang ở đầu chu kỳ hồi phục khi giá thép ổn định và nhu cầu xây dựng cải thiện. Dự án Dung Quất 2 sẽ nâng công suất mạnh nhưng cũng làm tăng chi phí khấu hao và nợ vay ngắn hạn. Kết quả kinh doanh có độ nhạy cao với giá nguyên liệu; nhà đầu tư cần theo dõi biên lợi nhuận và tồn kho theo quý.',
  VNM: 'Vinamilk là doanh nghiệp phòng thủ điển hình: dòng tiền ổn định, cổ tức tiền mặt đều và bảng cân đối lành mạnh. Tăng trưởng nội địa chậm là điểm yếu chính, được bù đắp một phần bằng xuất khẩu và cao cấp hóa sản phẩm. Định giá hợp lý cho một cổ phiếu thu nhập.',
  VCB: 'Vietcombank sở hữu chất lượng tài sản tốt nhất nhóm ngân hàng quốc doanh với nợ xấu thấp và bộ đệm dự phòng dày. ROE bền vững trên 20%. Định giá luôn ở mức premium so với ngành — hợp lý với vị thế nhưng hạn chế biên an toàn khi mua ở vùng giá cao.',
  MWG: 'MWG bước vào giai đoạn phục hồi lợi nhuận sau khi Bách Hóa Xanh đạt điểm hòa vốn và bắt đầu đóng góp dương. Mảng ICT-điện máy bão hòa, nên câu chuyện tăng trưởng dồn vào bán lẻ thực phẩm và mở rộng chuỗi mới. Cần theo dõi tốc độ cải thiện biên lợi nhuận Bách Hóa Xanh.',
  CMG: 'CMC tăng trưởng nhanh ở mảng chuyển đổi số, an ninh mạng và trung tâm dữ liệu, nhưng quy mô còn nhỏ so với FPT. Định giá P/E cao phản ánh kỳ vọng; biên lợi nhuận và ROE thấp hơn mặt bằng đầu ngành.',
  ELC: 'Elcom hưởng lợi từ đầu tư công vào hạ tầng giao thông thông minh, backlog dự án ITS là động lực chính. Tuy nhiên doanh thu biến động mạnh theo tiến độ giải ngân và quy mô nhỏ khiến kết quả kém ổn định giữa các quý.',
}

export function aiSource(ticker) {
  return AI_SOURCE[ticker] || AI_SOURCE.FPT
}

// ---------- badge màu logo cho mã ----------
// Lấy từ STOCKS nếu có; nếu không sinh màu ổn định theo mã (dùng cho mọi mã VN30/khác).
const BADGE_PALETTE = [
  ['#EFF6FF', '#2563EB'], ['#F0FDF4', '#16A34A'], ['#FEF2F2', '#DC2626'], ['#FFF7ED', '#EA580C'],
  ['#F5F3FF', '#7C3AED'], ['#EEF2FF', '#4F46E5'], ['#ECFEFF', '#0891B2'], ['#FDF4FF', '#C026D3'],
]
export function tickerBadge(code) {
  const s = STOCKS[code]
  if (s) return { bg: s.logoBg, fg: s.logoFg }
  let h = 0
  for (const c of String(code || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const [bg, fg] = BADGE_PALETTE[h % BADGE_PALETTE.length]
  return { bg, fg }
}

// ---------- formatting helpers ----------
export const formatVND = (n) => n.toLocaleString('vi-VN')
export const upDown = (p) => (p >= 0 ? '#16A34A' : '#DC2626')
export const pctStr = (p) => (p >= 0 ? '+' : '') + p.toFixed(2).replace('.', ',') + '%'
export const chgStr = (c) => (c >= 0 ? '+' : '') + formatVND(c)
export const decimal = (n) => n.toFixed(1).replace('.', ',')

// ---------- deterministic candle generation per ticker ----------
export function candles(ticker) {
  const s = STOCKS[ticker] || STOCKS.FPT
  let seed = 0
  for (const c of ticker) seed += c.charCodeAt(0)
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  const n = 260
  const out = []
  const vols = []
  let price = (s.price / 1000) * 0.72
  const start = new Date(2025, 6, 1)
  for (let i = 0; i < n; i++) {
    const d = new Date(start.getTime() + i * 86400000)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const drift = 0.0012 + (rnd() - 0.5) * 0.006
    const o = price
    const c = Math.max(1, o * (1 + drift + (rnd() - 0.5) * 0.03))
    const hi = Math.max(o, c) * (1 + rnd() * 0.018)
    const lo = Math.min(o, c) * (1 - rnd() * 0.018)
    const t = d.toISOString().slice(0, 10)
    out.push({ time: t, open: +o.toFixed(2), high: +hi.toFixed(2), low: +lo.toFixed(2), close: +c.toFixed(2) })
    vols.push({ time: t, value: Math.round(500000 + rnd() * 4000000) })
    price = c
  }
  // scale the whole series so it ends near the listed price (no final spike)
  const target = s.price / 1000
  if (out.length) {
    const k = target / out[out.length - 1].close
    out.forEach((c) => {
      c.open = +(c.open * k).toFixed(2)
      c.high = +(c.high * k).toFixed(2)
      c.low = +(c.low * k).toFixed(2)
      c.close = +(c.close * k).toFixed(2)
    })
  }
  return { candles: out, vols }
}

export function sliceByTf(arr, tf) {
  const map = { '1D': 6, '1W': 12, '1M': 26, '1Y': 400 }
  const k = map[tf] || 22
  return arr.slice(Math.max(0, arr.length - k))
}
