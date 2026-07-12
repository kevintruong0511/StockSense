// Bảng điện: lấy giá NHIỀU mã trong MỘT request (VNDIRECT stock_prices/latest batch).
// Dữ liệu THẬT trong ngày — snapshot có độ trễ ~15', KHÔNG phải tick từng lệnh.
// Giá VNDIRECT theo đơn vị nghìn đồng → ×1000 ra VND cho khớp phần còn lại của app.
const TIMEOUT_MS = 8000

// Rổ VN30 (xấp xỉ — cấu phần đổi theo quý; đủ dùng cho bảng điện demo).
export const VN30 = [
  'ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG',
  'LPB', 'MBB', 'MSN', 'MWG', 'PLX', 'SAB', 'SHB', 'SSB', 'SSI', 'STB',
  'TCB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE',
]

async function fetchJson(url) {
  // KHÔNG gửi Accept (dchart trả 406) — mặc định */* ổn.
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': 'Mozilla/5.0 StockSense/1.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Cache SIÊU NGẮN để không nện upstream khi nhiều client cùng poll ~20s/lần.
// Lưu ý: KHÁC với snapshot phân tích AI (bên đó cấm cache) — đây là bảng giá polled.
const CACHE_TTL_MS = 5000
const cache = new Map() // key(sorted codes) -> { at, data }

const toVnd = (x) => (x == null ? null : Math.round(x * 1000))

function emptyRow(code, name) {
  return {
    code, name: name || null, floor: null,
    ref: null, ceiling: null, floorPrice: null,
    price: null, change: null, pctChange: null, volume: null,
    date: null, time: null,
  }
}

// Trả { rows, asOf, asOfTime, source }. rows giữ ĐÚNG thứ tự codes truyền vào;
// mã thiếu dữ liệu vẫn có placeholder để bảng không nhảy layout.
export async function getPriceBoard(codes) {
  const list = [...new Set((codes || []).map((c) => String(c).toUpperCase().trim()).filter(Boolean))].slice(0, 50)
  if (list.length === 0) return { rows: [], asOf: null, asOfTime: null, source: 'unavailable' }

  const key = list.slice().sort().join(',')
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data

  const filter = list.join(',')
  // 2 request bất kể số mã: stock_prices (OHLCV) + change_prices (để có TÊN doanh nghiệp).
  const [prices, changes] = await Promise.all([
    fetchJson(
      `https://api-finfo.vndirect.com.vn/v4/stock_prices/latest?order=date&size=${list.length}&filter=code:${filter}`,
    ).catch(() => null),
    fetchJson(
      `https://api-finfo.vndirect.com.vn/v4/change_prices/latest?order=code&filter=code:${filter}`,
    ).catch(() => null),
  ])

  const nameByCode = new Map()
  for (const r of changes?.data || []) if (r?.code) nameByCode.set(r.code, r.name)

  const rowByCode = new Map()
  for (const q of prices?.data || []) {
    if (!q?.code) continue
    rowByCode.set(q.code, {
      code: q.code,
      name: nameByCode.get(q.code) || null,
      floor: q.floor || null,
      ref: toVnd(q.basicPrice),
      ceiling: toVnd(q.ceilingPrice),
      floorPrice: toVnd(q.floorPrice),
      price: toVnd(q.close),
      change: toVnd(q.change),
      pctChange: q.pctChange ?? null,
      volume: q.nmVolume != null ? Math.round(q.nmVolume) : null,
      date: q.date || null,
      time: q.time || null,
    })
  }

  const rows = list.map((code) => rowByCode.get(code) || emptyRow(code, nameByCode.get(code)))
  const data = {
    rows,
    asOf: rows.find((r) => r.date)?.date || null,
    asOfTime: rows.find((r) => r.time)?.time || null,
    source: rows.some((r) => r.price != null) ? 'vndirect' : 'unavailable',
  }
  cache.set(key, { at: Date.now(), data })
  return data
}
