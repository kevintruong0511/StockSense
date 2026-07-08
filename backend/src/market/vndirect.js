// Dữ liệu lịch sử + cơ bản từ VNDIRECT public API (truy cập được toàn cầu).
// Dùng cho: nến OHLC thật, hồ sơ doanh nghiệp, chỉ số định giá.
// Realtime tick KHÔNG lấy ở đây (cần broker) — xem provider trong ws/market.
// Mọi hàm best-effort: lỗi/timeout → source:'unavailable' để frontend fallback.
const FINFO = 'https://api-finfo.vndirect.com.vn/v4'
const DCHART = 'https://dchart-api.vndirect.com.vn/dchart'
const TIMEOUT_MS = 7000

async function fetchJson(url) {
  // Không set Accept: application/json — host dchart của VNDIRECT trả 406 với
  // header đó. Để mặc định (*/*) cho tương thích cả hai host.
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const isoDate = (sec) => new Date(sec * 1000).toISOString().slice(0, 10)

// Nến OHLC lịch sử. resolution: 'D' (ngày) | '1','15','60' (phút, nếu hỗ trợ).
export async function getCandles(sym, { resolution = 'D', days = 300 } = {}) {
  try {
    const to = Math.floor(Date.now() / 1000)
    // nới thêm cho ngày nghỉ để đủ số phiên mong muốn
    const from = to - Math.round(days * 1.5) * 86400
    const d = await fetchJson(
      `${DCHART}/history?symbol=${sym}&resolution=${resolution}&from=${from}&to=${to}`,
    )
    if (d.s !== 'ok' || !Array.isArray(d.t) || d.t.length === 0) throw new Error('no data')
    const candles = d.t.map((ts, i) => ({
      time: isoDate(ts),
      open: d.o[i],
      high: d.h[i],
      low: d.l[i],
      close: d.c[i],
    }))
    const vols = d.t.map((ts, i) => ({ time: isoDate(ts), value: d.v[i] }))
    return { source: 'vndirect', candles, vols }
  } catch (err) {
    return { source: 'unavailable', error: err.message }
  }
}

// Giá "mồi" cho feed mô phỏng: lấy 2 phiên gần nhất → giá & tham chiếu (VND).
// Nhờ vậy giá realtime mô phỏng dao động quanh giá đóng cửa THẬT, khớp biểu đồ.
export async function getSeed(sym) {
  const c = await getCandles(sym, { days: 8 })
  if (c.source !== 'vndirect' || c.candles.length < 2) return null
  const last = c.candles.at(-1).close
  const prev = c.candles.at(-2).close
  return { price: Math.round((last * 1000) / 10) * 10, ref: Math.round(prev * 1000) }
}

// Hồ sơ doanh nghiệp.
export async function getOverview(sym) {
  try {
    const d = await fetchJson(`${FINFO}/company_profiles?q=code:${sym}`)
    const p = d?.data?.[0]
    if (!p) throw new Error('no data')
    return {
      source: 'vndirect',
      ticker: sym,
      exchange: p.floor ?? null,
      companyName: p.vnName ?? null,
      website: p.website ?? null,
      employees: p.employees != null ? Math.round(p.employees) : null,
      foundedDate: p.foundDate ?? null,
      address: p.vnAddress ?? null,
    }
  } catch (err) {
    return { source: 'unavailable', error: err.message }
  }
}

// Chỉ số định giá mới nhất (P/E, P/B, tỷ suất cổ tức...).
export async function getRatios(sym) {
  try {
    const codes = 'PRICE_TO_EARNINGS,PRICE_TO_BOOK,DIVIDEND_YIELD,ROE,ROA,MARKET_CAP,EPS'
    const d = await fetchJson(
      `${FINFO}/ratios/latest?order=reportDate&where=code:${sym}&filter=ratioCode:${codes}`,
    )
    const rows = Array.isArray(d?.data) ? d.data : []
    const by = {}
    for (const r of rows) by[r.ratioCode] = r.value
    if (Object.keys(by).length === 0) throw new Error('no data')
    return {
      source: 'vndirect',
      reportDate: rows[0]?.reportDate ?? null,
      pe: by.PRICE_TO_EARNINGS ?? null,
      pb: by.PRICE_TO_BOOK ?? null,
      dividendYield: by.DIVIDEND_YIELD ?? null,
      roe: by.ROE ?? null,
      roa: by.ROA ?? null,
      marketCap: by.MARKET_CAP ?? null,
      eps: by.EPS ?? null,
    }
  } catch (err) {
    return { source: 'unavailable', error: err.message }
  }
}
