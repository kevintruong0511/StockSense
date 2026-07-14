// Xếp hạng cổ phiếu cho bảng giá trang chủ: TĂNG mạnh nhất, GIẢM mạnh nhất, PHỔ BIẾN
// nhất (theo giá trị khớp lệnh). VNDIRECT không cho sort toàn thị trường nên ta lấy một
// RỔ RỘNG mã thanh khoản cao rồi tự sắp xếp. Giá VNDIRECT theo nghìn đồng → ×1000 ra VND.
const TIMEOUT_MS = 8000
const CACHE_TTL_MS = 20_000 // xếp hạng đổi chậm hơn 1 mã → cache 20s
let cache = null

// Rổ xếp hạng: ~90 mã vốn hóa lớn/vừa thanh khoản cao (HOSE/HNX). Loại penny để tránh
// nhiễu (mã giá thấp hay có %biến động ảo). Có thể mở rộng khi cần.
const RANKING_UNIVERSE = [
  // VN30
  'ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG',
  'LPB', 'MBB', 'MSN', 'MWG', 'PLX', 'SAB', 'SHB', 'SSB', 'SSI', 'STB',
  'TCB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE',
  // Ngân hàng mở rộng
  'EIB', 'OCB', 'MSB', 'NAB', 'SSB',
  // Chứng khoán
  'VND', 'VCI', 'HCM', 'VIX', 'FTS', 'CTS', 'BSI', 'SHS', 'MBS',
  // Bất động sản
  'DXG', 'DIG', 'PDR', 'NLG', 'KBC', 'HDG', 'KDH', 'CEO', 'NTL', 'TCH', 'HDC',
  // Thép & vật liệu
  'HSG', 'NKG', 'DGC', 'DCM', 'DPM', 'BMP',
  // Năng lượng & tiện ích
  'POW', 'REE', 'GEX', 'PC1', 'NT2', 'BWE', 'GEG', 'PGV',
  // Công nghiệp & logistics
  'GMD', 'HAH', 'VTP', 'VGC', 'CTD', 'HHV', 'CII', 'FCN', 'VCG',
  // Bán lẻ & tiêu dùng
  'PNJ', 'FRT', 'DGW', 'PET', 'DBC', 'PAN', 'SBT', 'KDC', 'VHC', 'ANV', 'ASM',
  // Dầu khí & khác
  'DPG', 'VPI', 'IDC', 'PVD', 'PVS', 'TNG',
]

async function fetchJson(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': 'Mozilla/5.0 StockSense/1.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const toVnd = (x) => (x == null ? null : Math.round(x * 1000))
const chunk = (arr, n) => {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

// Lấy giá + tên cho toàn rổ (nhiều request theo lô ≤50), trả map code -> row đầy đủ.
async function fetchUniverseRows() {
  const codes = [...new Set(RANKING_UNIVERSE)]
  const nameByCode = new Map()
  const rowByCode = new Map()

  await Promise.all(
    chunk(codes, 50).map(async (cs) => {
      const filter = cs.join(',')
      const [prices, changes] = await Promise.all([
        fetchJson(
          `https://api-finfo.vndirect.com.vn/v4/stock_prices/latest?order=date&size=${cs.length}&filter=code:${filter}`,
        ).catch(() => null),
        fetchJson(
          `https://api-finfo.vndirect.com.vn/v4/change_prices/latest?order=code&filter=code:${filter}`,
        ).catch(() => null),
      ])
      for (const r of changes?.data || []) if (r?.code) nameByCode.set(r.code, r.name)
      for (const q of prices?.data || []) {
        if (!q?.code || rowByCode.has(q.code)) continue // giữ dòng phiên mới nhất (đầu tiên)
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
          value: q.nmValue ?? null, // giá trị khớp lệnh (đồng) — để xếp "phổ biến"
          date: q.date || null,
          time: q.time || null,
        })
      }
    }),
  )
  // gán tên còn thiếu
  for (const row of rowByCode.values()) if (!row.name) row.name = nameByCode.get(row.code) || null
  return [...rowByCode.values()]
}

// Trả { gainers, losers, active, asOf, asOfTime, source }. Mỗi danh sách tối đa `limit` mã.
export async function getMovers(limit = 10) {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data

  let rows = []
  try {
    rows = await fetchUniverseRows()
  } catch {
    return { gainers: [], losers: [], active: [], asOf: null, asOfTime: null, source: 'unavailable' }
  }

  const priced = rows.filter((r) => r.price != null && r.pctChange != null)
  const gainers = [...priced].sort((a, b) => b.pctChange - a.pctChange).slice(0, limit)
  const losers = [...priced].sort((a, b) => a.pctChange - b.pctChange).slice(0, limit)
  const active = rows
    .filter((r) => r.price != null && r.value != null)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)

  const anyRow = rows.find((r) => r.date)
  const data = {
    gainers,
    losers,
    active,
    asOf: anyRow?.date || null,
    asOfTime: anyRow?.time || null,
    source: priced.length ? 'vndirect' : 'unavailable',
  }
  cache = { at: Date.now(), data }
  return data
}
