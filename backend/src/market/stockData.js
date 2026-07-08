// Lấy dữ liệu THỜI GIAN THỰC cho một mã (VNDIRECT) để nhồi vào prompt AI.
// Gộp 4 nguồn: giá phiên, chỉ số định giá, hồ sơ DN, xu hướng giá.
// Có cache ngắn để chat nhiều lượt không phải fetch lại.
const TIMEOUT_MS = 8000
const CACHE_TTL_MS = 60_000
const cache = new Map() // code -> { at, snapshot }

async function fetchJson(url) {
  // KHÔNG gửi header Accept: dchart-api trả 406 khi có Accept (xem ghi chú nguồn dữ liệu).
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': 'Mozilla/5.0 StockSense/1.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// itemCode -> ý nghĩa (ratios/latest của VNDIRECT).
const RATIO_ITEMS = '51001,51002,51003,51004,51006,51007,51011,51012,52001,52002,52005,52007'

// Toàn bộ mã niêm yết (HOSE/HNX/UPCoM) để làm gợi ý autocomplete. Cache 6 giờ.
let universeCache = null
export async function getTickerUniverse() {
  if (universeCache && Date.now() - universeCache.at < 6 * 3600_000) return universeCache.list
  try {
    const d = await fetchJson(
      'https://api-finfo.vndirect.com.vn/v4/stocks?q=type:STOCK~status:LISTED&size=3000&fields=code,shortName,companyName,floor',
    )
    const list = (Array.isArray(d?.data) ? d.data : [])
      .map((r) => ({ code: r.code, name: r.shortName || r.companyName || r.code, floor: r.floor }))
      .filter((r) => r.code)
      .sort((a, b) => a.code.localeCompare(b.code))
    if (list.length) universeCache = { at: Date.now(), list }
    return list
  } catch {
    return universeCache?.list || []
  }
}

const fmtInt = (n) => Math.round(n).toLocaleString('vi-VN')
const fmtNum = (n, d = 1) => (n == null ? '—' : Number(n).toFixed(d).replace('.', ','))
const fmtPctFrac = (x) => (x == null ? '—' : (x >= 0 ? '+' : '') + (x * 100).toFixed(1).replace('.', ',') + '%')
const fmtPctRaw = (x) => (x == null ? '—' : (x >= 0 ? '+' : '') + Number(x).toFixed(2).replace('.', ',') + '%')

function changeOverSessions(closes, back) {
  if (!closes || closes.length <= back) return null
  const now = closes.at(-1)
  const then = closes[closes.length - 1 - back]
  if (!then) return null
  return (now - then) / then
}

// Trả về { code, asOf, text } hoặc null nếu mã không có dữ liệu.
export async function getStockSnapshot(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{2,10}$/.test(code)) return null

  const hit = cache.get(code)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.snapshot

  const to = Math.floor(Date.now() / 1000)
  const from = to - 400 * 86400

  const [quote, ratios, profile, chart] = await Promise.all([
    fetchJson(`https://api-finfo.vndirect.com.vn/v4/stock_prices/latest?order=date&filter=code:${code}`)
      .then((d) => d?.data?.[0] || null).catch(() => null),
    fetchJson(`https://api-finfo.vndirect.com.vn/v4/ratios/latest?where=code:${code}&filter=itemCode:${RATIO_ITEMS}&order=reportDate&size=40`)
      .then((d) => Array.isArray(d?.data) ? d.data : []).catch(() => []),
    fetchJson(`https://api-finfo.vndirect.com.vn/v4/company_profiles?q=code:${code}`)
      .then((d) => d?.data?.[0] || null).catch(() => null),
    fetchJson(`https://dchart-api.vndirect.com.vn/dchart/history?symbol=${code}&resolution=D&from=${from}&to=${to}`)
      .then((d) => (d?.s === 'ok' && Array.isArray(d.c) ? d.c : null)).catch(() => null),
  ])

  // Không có bất kỳ dữ liệu nào -> coi như mã không hợp lệ.
  if (!quote && ratios.length === 0 && !profile) {
    cache.set(code, { at: Date.now(), snapshot: null })
    return null
  }

  const R = {}
  let mktDate = null // ngày của nhóm chỉ số thị trường (51xxx: P/E, P/B, vốn hóa…)
  let fundDate = null // ngày của nhóm hiệu quả theo quý (52xxx: ROE, ROAA, tăng trưởng)
  for (const r of ratios) {
    if (r?.ratioCode) R[r.ratioCode] = r.value
    const ic = String(r?.itemCode || '')
    if (r?.reportDate) {
      if (ic.startsWith('51') && (!mktDate || r.reportDate > mktDate)) mktDate = r.reportDate
      if (ic.startsWith('52') && (!fundDate || r.reportDate > fundDate)) fundDate = r.reportDate
    }
  }

  // VNDIRECT trả giá theo đơn vị nghìn đồng -> ×1000 ra VND.
  const closeVnd = quote?.close != null ? quote.close * 1000 : null
  const high52 = R.PRICE_HIGHEST_CR_52W ?? null
  const low52 = R.PRICE_LOWEST_CR_52W ?? null

  const lines = []
  lines.push(`# Số liệu THỜI GIAN THỰC — ${code} (VNDIRECT${quote?.date ? `, phiên ${quote.date}` : ''})`)

  if (quote) {
    lines.push('\n## Giá & thanh khoản')
    if (closeVnd != null) lines.push(`- Giá đóng cửa: ${fmtInt(closeVnd)} đ (${fmtPctRaw(quote.pctChange)} phiên gần nhất)`)
    if (quote.open != null) lines.push(`- Trong phiên: mở ${fmtInt(quote.open * 1000)} / cao ${fmtInt(quote.high * 1000)} / thấp ${fmtInt(quote.low * 1000)} đ`)
    if (quote.nmVolume != null) lines.push(`- KL khớp lệnh: ${fmtInt(quote.nmVolume)} cp`)
    if (R.NMVALUE_AVG_CR_20D != null) lines.push(`- GTGD khớp lệnh TB 20 phiên: ${fmtInt(R.NMVALUE_AVG_CR_20D / 1e9)} tỷ đ`)
  }
  if (high52 != null && low52 != null) {
    const distHigh = closeVnd != null ? (1 - closeVnd / high52) : null
    const distLow = closeVnd != null ? (closeVnd / low52 - 1) : null
    lines.push(`- Vùng 52 tuần: ${fmtInt(low52)} – ${fmtInt(high52)} đ` +
      (distHigh != null ? ` (đang thấp hơn đỉnh ${fmtNum(distHigh * 100)}%, cao hơn đáy ${fmtNum(distLow * 100)}%)` : ''))
  }

  lines.push(`\n## Định giá & hiệu quả (nguồn VNDIRECT${mktDate ? `, cập nhật ${mktDate}` : ''})`)
  if (R.MARKETCAP != null) lines.push(`- Vốn hóa: ${fmtInt(R.MARKETCAP / 1e9)} tỷ đ` + (R.OUTSTANDING_SHARES != null ? ` | KLCP lưu hành: ${fmtInt(R.OUTSTANDING_SHARES)}` : ''))
  lines.push(`- P/E: ${fmtNum(R.PRICE_TO_EARNINGS, 2)} | P/B: ${fmtNum(R.PRICE_TO_BOOK, 2)} | P/S: ${fmtNum(R.PRICE_TO_SALES, 2)} | Beta: ${fmtNum(R.BETA, 2)}`)
  const fundTag = fundDate ? ` (số liệu quý gần nhất tới ${fundDate})` : ''
  lines.push(`- ROE (TB 4 quý): ${fmtPctFrac(R.ROAE_TR_AVG5Q)} | ROAA: ${fmtPctFrac(R.ROAA_TR_AVG5Q)}${fundTag}`)
  if (R.NET_PROFIT_TR_GRYOY != null) lines.push(`- Tăng trưởng LN ròng 4 quý gần nhất (YoY): ${fmtPctFrac(R.NET_PROFIT_TR_GRYOY)}`)

  if (chart && chart.length > 5) {
    lines.push('\n## Xu hướng giá (dchart)')
    lines.push(`- 1 tháng: ${fmtPctFrac(changeOverSessions(chart, 21))} | 3 tháng: ${fmtPctFrac(changeOverSessions(chart, 63))} | 6 tháng: ${fmtPctFrac(changeOverSessions(chart, 126))} | 1 năm: ${fmtPctFrac(changeOverSessions(chart, 252))}`)
  }

  if (profile) {
    const name = profile.vnName || profile.enName || code
    const meta = [profile.floor && `sàn ${profile.floor}`, profile.foundDate && `thành lập ${profile.foundDate}`, profile.employees && `${fmtInt(profile.employees)} nhân viên`].filter(Boolean).join(', ')
    lines.push('\n## Hồ sơ doanh nghiệp')
    lines.push(`- ${name}${meta ? ` (${meta})` : ''}`)
    if (profile.vnSummary) lines.push(`- ${String(profile.vnSummary).replace(/\s+/g, ' ').trim().slice(0, 700)}`)
  }

  const snapshot = { code, asOf: quote?.date || new Date().toISOString().slice(0, 10), text: lines.join('\n') }
  cache.set(code, { at: Date.now(), snapshot })
  return snapshot
}
