// Nguồn VNDIRECT (finfo + dchart). Chạy toàn cầu, không cần auth → dùng làm
// FALLBACK cho mọi field mà SSI/Vietstock không lấy được.
// Trả về từng nhóm đã chuẩn hoá; lỗi thì throw để orchestrator .catch(() => null).
const TIMEOUT_MS = 8000

// itemCode -> ý nghĩa (ratios/latest của VNDIRECT). PHẢI lọc bằng itemCode (số),
// không phải ratioCode (trả rỗng).
const RATIO_ITEMS = '51001,51002,51003,51004,51006,51007,51011,51012,52001,52002,52005,52007'

async function fetchJson(url) {
  // KHÔNG gửi header Accept: dchart-api trả 406 khi có Accept. Mặc định (*/*) ổn.
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': 'Mozilla/5.0 StockSense/1.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function changeOver(closes, back) {
  if (!closes || closes.length <= back) return null
  const now = closes.at(-1)
  const then = closes[closes.length - 1 - back]
  if (!then) return null
  return (now - then) / then
}

// Giá phiên gần nhất + KL. Giá VNDIRECT theo đơn vị nghìn đồng → ×1000 ra VND.
export async function vndPrice(code) {
  const d = await fetchJson(
    `https://api-finfo.vndirect.com.vn/v4/stock_prices/latest?order=date&filter=code:${code}`,
  )
  const q = d?.data?.[0]
  if (!q) return null
  return {
    closeVnd: q.close != null ? q.close * 1000 : null,
    pctChange: q.pctChange ?? null,
    openVnd: q.open != null ? q.open * 1000 : null,
    highVnd: q.high != null ? q.high * 1000 : null,
    lowVnd: q.low != null ? q.low * 1000 : null,
    nmVolume: q.nmVolume ?? null,
    date: q.date ?? null,
    high52: null,
    low52: null,
    source: 'VNDIRECT',
  }
}

// Chỉ số định giá + hiệu quả. Trả cả valuation lẫn fundamentals trong một object.
export async function vndRatios(code) {
  const d = await fetchJson(
    `https://api-finfo.vndirect.com.vn/v4/ratios/latest?where=code:${code}&filter=itemCode:${RATIO_ITEMS}&order=reportDate&size=40`,
  )
  const rows = Array.isArray(d?.data) ? d.data : []
  if (rows.length === 0) return null
  const R = {}
  let mktDate = null
  let fundDate = null
  for (const r of rows) {
    if (r?.ratioCode) R[r.ratioCode] = r.value
    const ic = String(r?.itemCode || '')
    if (r?.reportDate) {
      if (ic.startsWith('51') && (!mktDate || r.reportDate > mktDate)) mktDate = r.reportDate
      if (ic.startsWith('52') && (!fundDate || r.reportDate > fundDate)) fundDate = r.reportDate
    }
  }
  return {
    marketcap: R.MARKETCAP ?? null,
    outstandingShares: R.OUTSTANDING_SHARES ?? null,
    pe: R.PRICE_TO_EARNINGS ?? null,
    pb: R.PRICE_TO_BOOK ?? null,
    ps: R.PRICE_TO_SALES ?? null,
    beta: R.BETA ?? null,
    high52: R.PRICE_HIGHEST_CR_52W ?? null,
    low52: R.PRICE_LOWEST_CR_52W ?? null,
    nmValueAvg20d: R.NMVALUE_AVG_CR_20D ?? null,
    roe: R.ROAE_TR_AVG5Q ?? null, // dạng phân số (×100 ra %)
    roaa: R.ROAA_TR_AVG5Q ?? null,
    netProfitGrowthYoY: R.NET_PROFIT_TR_GRYOY ?? null,
    mktDate,
    fundDate,
    source: 'VNDIRECT',
  }
}

// Hồ sơ doanh nghiệp.
export async function vndProfile(code) {
  const d = await fetchJson(`https://api-finfo.vndirect.com.vn/v4/company_profiles?q=code:${code}`)
  const p = d?.data?.[0]
  if (!p) return null
  return {
    name: p.vnName || p.enName || code,
    floor: p.floor ?? null,
    foundDate: p.foundDate ?? null,
    employees: p.employees ?? null,
    summary: p.vnSummary ? String(p.vnSummary).replace(/\s+/g, ' ').trim() : null,
    source: 'VNDIRECT',
  }
}

// Xu hướng giá 1T/3T/6T/1N tính từ nến ngày (dchart).
export async function vndTrend(code) {
  const to = Math.floor(Date.now() / 1000)
  const from = to - 400 * 86400
  const d = await fetchJson(
    `https://dchart-api.vndirect.com.vn/dchart/history?symbol=${code}&resolution=D&from=${from}&to=${to}`,
  )
  const closes = d?.s === 'ok' && Array.isArray(d.c) ? d.c : null
  if (!closes || closes.length <= 5) return null
  return {
    m1: changeOver(closes, 21),
    m3: changeOver(closes, 63),
    m6: changeOver(closes, 126),
    y1: changeOver(closes, 252),
    source: 'VNDIRECT',
  }
}

const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length

// RSI(14) theo công thức Wilder (làm mượt qua toàn chuỗi).
function rsi(closes, period = 14) {
  if (!closes || closes.length <= period) return null
  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const ch = closes[i] - closes[i - 1]
    if (ch >= 0) avgGain += ch
    else avgLoss -= ch
  }
  avgGain /= period
  avgLoss /= period
  for (let i = period + 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + (ch > 0 ? ch : 0)) / period
    avgLoss = (avgLoss * (period - 1) + (ch < 0 ? -ch : 0)) / period
  }
  if (avgLoss === 0) return 100
  return Math.round(100 - 100 / (1 + avgGain / avgLoss))
}

// Chỉ báo kỹ thuật tính từ nến ngày (dchart): MA20/50/200, RSI(14), hỗ trợ/kháng cự.
// Giá dchart theo nghìn đồng → ×1000 ra VND cho khớp phần giá.
export async function vndTechnical(code) {
  const to = Math.floor(Date.now() / 1000)
  const from = to - 400 * 86400
  const d = await fetchJson(
    `https://dchart-api.vndirect.com.vn/dchart/history?symbol=${code}&resolution=D&from=${from}&to=${to}`,
  )
  const closes = d?.s === 'ok' && Array.isArray(d.c) ? d.c : null
  if (!closes || closes.length < 25) return null
  const highs = Array.isArray(d.h) ? d.h : closes
  const lows = Array.isArray(d.l) ? d.l : closes
  const toVnd = (x) => (x == null ? null : Math.round(x * 1000))
  const maN = (n) => (closes.length >= n ? avg(closes.slice(-n)) : null)
  const minL = (n) => Math.min(...lows.slice(-n))
  const maxH = (n) => Math.max(...highs.slice(-n))
  return {
    ma20: toVnd(maN(20)),
    ma50: toVnd(maN(50)),
    ma200: toVnd(maN(200)),
    rsi14: rsi(closes, 14),
    support20: toVnd(minL(20)),
    resistance20: toVnd(maxH(20)),
    support60: toVnd(minL(60)),
    resistance60: toVnd(maxH(60)),
    source: 'VNDIRECT dchart',
  }
}
