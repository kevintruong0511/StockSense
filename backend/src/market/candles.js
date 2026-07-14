// Nến OHLCV THẬT cho biểu đồ, lấy từ VNDIRECT dchart (chạy toàn cầu, không cần auth).
// dchart chỉ hỗ trợ resolution nội ngày (15/60) + Ngày (D); Tuần/Tháng KHÔNG có →
// ta lấy nến ngày rồi TỰ GỘP thành tuần/tháng. Giá dchart theo nghìn đồng → ×1000 ra VND.
const TIMEOUT_MS = 8000

// tf (khung người dùng chọn) → resolution dchart + số ngày lịch sử + kiểu gộp.
const TF = {
  '15': { resolution: '15', days: 20, agg: null },
  '60': { resolution: '60', days: 90, agg: null },
  D: { resolution: 'D', days: 600, agg: null },
  W: { resolution: 'D', days: 2200, agg: 'W' },
  M: { resolution: 'D', days: 4200, agg: 'M' },
}

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

const toVnd = (x) => (x == null ? null : Math.round(x * 1000))
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

// Trả { code, tf, candles:[{time(unix s), open, high, low, close, volume}] } (giá VND).
export async function getCandles(rawCode, rawTf = 'D') {
  const code = String(rawCode || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{2,10}$/.test(code)) return { code, tf: 'D', candles: [] }
  const tf = TF[rawTf] ? rawTf : 'D'
  const conf = TF[tf]

  const key = `${code}|${tf}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data

  const to = Math.floor(Date.now() / 1000)
  const from = to - conf.days * 86400
  const d = await fetchJson(
    `https://dchart-api.vndirect.com.vn/dchart/history?symbol=${code}&resolution=${conf.resolution}&from=${from}&to=${to}`,
  )
  if (d?.s !== 'ok' || !Array.isArray(d.t)) return { code, tf, candles: [] }

  let bars = d.t
    .map((t, i) => ({
      time: t,
      open: toVnd(d.o?.[i]),
      high: toVnd(d.h?.[i]),
      low: toVnd(d.l?.[i]),
      close: toVnd(d.c?.[i]),
      volume: d.v?.[i] != null ? Math.round(d.v[i]) : 0,
    }))
    .filter((b) => b.open != null && b.close != null)
  if (conf.agg) bars = aggregate(bars, conf.agg)

  const data = { code, tf, candles: bars }
  cache.set(key, { at: Date.now(), data })
  return data
}
