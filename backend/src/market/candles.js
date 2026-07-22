// Nến OHLCV THẬT cho biểu đồ, lấy từ VNDIRECT dchart (chạy toàn cầu, không cần auth).
// dchart chỉ hỗ trợ resolution nội ngày (15/60) + Ngày (D); Tuần/Tháng KHÔNG có →
// ta lấy nến ngày rồi TỰ GỘP thành tuần/tháng. Giá dchart theo nghìn đồng → ×1000 ra VND.
const TIMEOUT_MS = 8000

// tf = PRESET KHOẢNG THỜI GIAN kiểu TradingView (không phải kích thước nến).
// Mỗi preset: resolution nến phù hợp + số ngày lịch sử tải (days) + cắt (trim) về đúng
// cửa sổ để biểu đồ KHỚP nhãn nút. days lấy dư để chắc chắn có phiên gần nhất qua cuối
// tuần/nghỉ lễ; trim cắt lại: 'day' = 1 phiên cuối, 'ytd' = từ đầu năm, số = số ngày lịch.
const TF = {
  '1D': { resolution: '15', days: 6, agg: null, trim: 'day' }, // 1 ngày (nến 15')
  '5D': { resolution: '60', days: 12, agg: null, trim: 7 }, // 5 ngày (nến 1h)
  '1M': { resolution: 'D', days: 50, agg: null, trim: 31 }, // 1 tháng (nến ngày)
  '3M': { resolution: 'D', days: 110, agg: null, trim: 93 }, // 3 tháng (nến ngày)
  '6M': { resolution: 'D', days: 200, agg: null, trim: 186 }, // 6 tháng (nến ngày)
  YTD: { resolution: 'D', days: 420, agg: null, trim: 'ytd' }, // từ đầu năm (nến ngày)
  '1Y': { resolution: 'D', days: 380, agg: null, trim: 366 }, // 1 năm (nến ngày)
  '5Y': { resolution: 'D', days: 1850, agg: 'W', trim: 1830 }, // 5 năm (nến tuần)
  ALL: { resolution: 'D', days: 8000, agg: 'W', trim: null }, // tất cả (nến tuần)
}
const DEFAULT_TF = '6M'

// Cache ngắn: đổi qua lại các khung / mở lại mã không nện dchart liên tục.
const CACHE_TTL_MS = 30_000
const cache = new Map() // key(code|tf) -> { at, data }

async function fetchJson(url) {
  // KHÔNG gửi Accept (dchart trả 406) — mặc định */* ổn.
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': 'Mozilla/5.0 StockSense/1.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Số tuần (căn theo thứ Hai) và khoá tháng để gộp nến ngày.
const weekKey = (ts) => Math.floor((Math.floor(ts / 86400) + 3) / 7)
const monthKey = (ts) => {
  const d = new Date(ts * 1000)
  return d.getUTCFullYear() * 12 + d.getUTCMonth()
}

// Gộp nến ngày (đã tăng dần) thành tuần/tháng. time = phiên đầu tiên của nhóm.
function aggregate(bars, mode) {
  const groups = new Map()
  for (const b of bars) {
    const key = mode === 'M' ? monthKey(b.time) : weekKey(b.time)
    const g = groups.get(key)
    if (!g) groups.set(key, { ...b })
    else {
      g.high = Math.max(g.high, b.high)
      g.low = Math.min(g.low, b.low)
      g.close = b.close
      g.volume += b.volume
    }
  }
  return [...groups.values()]
}

// Nạp nến cho MỘT symbol dchart. scale: nhân giá (cổ phiếu ×1000 ra VND; chỉ số ×1).
// Trả { symbol, tf, candles:[{time(unix s), open, high, low, close, volume}] }.
async function loadCandles(symbol, rawTf, scale) {
  const tf = TF[rawTf] ? rawTf : DEFAULT_TF
  const conf = TF[tf]

  const key = `${symbol}|${tf}|${scale}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data

  const to = Math.floor(Date.now() / 1000)
  const from = to - conf.days * 86400
  const d = await fetchJson(
    `https://dchart-api.vndirect.com.vn/dchart/history?symbol=${symbol}&resolution=${conf.resolution}&from=${from}&to=${to}`,
  )
  if (d?.s !== 'ok' || !Array.isArray(d.t)) return { symbol, tf, candles: [] }

  // Cổ phiếu (scale 1000) làm tròn số nguyên; chỉ số (scale 1) giữ 2 số lẻ.
  const px = (x) => (x == null ? null : Math.round(x * scale * 100) / 100)
  let bars = d.t
    .map((t, i) => ({
      time: t,
      open: px(d.o?.[i]),
      high: px(d.h?.[i]),
      low: px(d.l?.[i]),
      close: px(d.c?.[i]),
      volume: d.v?.[i] != null ? Math.round(d.v[i]) : 0,
    }))
    .filter((b) => b.open != null && b.close != null)
  if (conf.agg) bars = aggregate(bars, conf.agg)

  // Cắt về đúng cửa sổ của preset (dựa trên phiên gần nhất thực tế có dữ liệu).
  if (conf.trim != null && bars.length) {
    const lastTime = bars[bars.length - 1].time
    if (conf.trim === 'day') {
      const lastDay = new Date(lastTime * 1000).toISOString().slice(0, 10)
      bars = bars.filter((b) => new Date(b.time * 1000).toISOString().slice(0, 10) === lastDay)
    } else if (conf.trim === 'ytd') {
      const startYtd = Date.UTC(new Date(lastTime * 1000).getUTCFullYear(), 0, 1) / 1000
      bars = bars.filter((b) => b.time >= startYtd)
    } else {
      // số ngày lịch
      bars = bars.filter((b) => b.time >= lastTime - conf.trim * 86400)
    }
  }

  const data = { symbol, tf, candles: bars }
  cache.set(key, { at: Date.now(), data })
  return data
}

// Nến cổ phiếu (giá VND). Trả { code, tf, candles }.
export async function getCandles(rawCode, rawTf = DEFAULT_TF) {
  const code = String(rawCode || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{2,10}$/.test(code)) return { code, tf: DEFAULT_TF, candles: [] }
  const { tf, candles } = await loadCandles(code, rawTf, 1000)
  return { code, tf, candles }
}

// Nến chỉ số (mặc định VN-Index) — giá KHÔNG ×1000. Trả { symbol, tf, candles }.
export async function getIndexCandles(rawTf = DEFAULT_TF, symbol = 'VNINDEX') {
  const sym = String(symbol || 'VNINDEX').trim().toUpperCase()
  if (!/^[A-Z0-9]{2,12}$/.test(sym)) return { symbol: 'VNINDEX', tf: DEFAULT_TF, candles: [] }
  return loadCandles(sym, rawTf, 1)
}

// Nến NGÀY dài (nhiều năm) cho BACKTEST — KHÔNG trim theo preset, KHÔNG gộp tuần/tháng.
// scale: cổ phiếu 1000 (ra VND), chỉ số 1. Trả mảng nến tăng dần [{time,open,high,low,close,volume}].
// Cache ngắn theo key(symbol|years|scale) tái dùng bộ nhớ đệm sẵn có.
export async function getDailyHistory(rawSymbol, years = 3, scale = 1000) {
  const sym = String(rawSymbol || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{2,12}$/.test(sym)) return []
  const y = Math.min(10, Math.max(1, Number(years) || 3))

  const key = `daily|${sym}|${y}|${scale}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data

  const to = Math.floor(Date.now() / 1000)
  const from = to - Math.round(y * 366) * 86400 // dư ngày lịch để phủ đủ số năm giao dịch
  const d = await fetchJson(
    `https://dchart-api.vndirect.com.vn/dchart/history?symbol=${sym}&resolution=D&from=${from}&to=${to}`,
  )
  if (d?.s !== 'ok' || !Array.isArray(d.t)) return []

  const px = (x) => (x == null ? null : Math.round(x * scale * 100) / 100)
  const bars = d.t
    .map((t, i) => ({
      time: t,
      open: px(d.o?.[i]),
      high: px(d.h?.[i]),
      low: px(d.l?.[i]),
      close: px(d.c?.[i]),
      volume: d.v?.[i] != null ? Math.round(d.v[i]) : 0,
    }))
    .filter((b) => b.open != null && b.close != null && b.high != null && b.low != null)

  cache.set(key, { at: Date.now(), data: bars })
  return bars
}
