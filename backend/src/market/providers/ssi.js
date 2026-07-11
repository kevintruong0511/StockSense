// SSI FastConnect Data — nguồn giá/nến CHÍNH THỨC.
// Cần SSI_CONSUMER_ID + SSI_CONSUMER_SECRET (đăng ký iBoard/FastConnect).
// Nếu thiếu cấu hình hoặc gọi lỗi → trả null để orchestrator fallback VNDIRECT.
//
// Lưu ý: FastConnect Data mạnh về giá/nến/thông tin mã, KHÔNG có chỉ số cơ bản
// (P/E, P/B, ROE) — phần đó để Vietstock/VNDIRECT lo.
import { config } from '../../config.js'

const BASE = 'https://fc-data.ssi.com.vn/api/v2'
const TIMEOUT_MS = 8000
let tokenCache = null // { token, at }

function enabled() {
  return Boolean(config.data?.ssi?.consumerId && config.data?.ssi?.secret)
}

async function getToken() {
  if (tokenCache && Date.now() - tokenCache.at < 25 * 60_000) return tokenCache.token
  const res = await fetch(`${BASE}/Market/AccessToken`, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      consumerID: config.data.ssi.consumerId,
      consumerSecret: config.data.ssi.secret,
    }),
  })
  if (!res.ok) throw new Error(`SSI token HTTP ${res.status}`)
  const d = await res.json()
  const token = d?.data?.accessToken
  if (!token) throw new Error('SSI trả token rỗng')
  tokenCache = { token, at: Date.now() }
  return token
}

async function get(path, params) {
  const token = await getToken()
  const url = new URL(`${BASE}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`SSI ${path} HTTP ${res.status}`)
  return res.json()
}

// SSI dùng định dạng ngày dd/mm/yyyy.
const ddmmyyyy = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

function chg(closes, back) {
  if (!closes || closes.length <= back) return null
  const now = closes.at(-1)
  const then = closes[closes.length - 1 - back]
  if (!then) return null
  return (now - then) / then
}

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Giá phiên gần nhất + xu hướng, tính từ DailyOhlc (nến ngày).
// Trả { price, trend }; mỗi cái null nếu không lấy được.
export async function ssiPriceAndTrend(code) {
  if (!enabled()) return { price: null, trend: null }
  try {
    const to = new Date()
    const from = new Date(Date.now() - 400 * 86400_000)
    const d = await get('/Market/DailyOhlc', {
      Symbol: code,
      FromDate: ddmmyyyy(from),
      ToDate: ddmmyyyy(to),
      PageIndex: 1,
      PageSize: 400,
      ascending: true,
    })
    const rows = Array.isArray(d?.data) ? d.data : []
    if (rows.length === 0) return { price: null, trend: null }

    const closes = rows.map((r) => num(r.Close)).filter((x) => x != null)
    const last = rows.at(-1)
    const prevClose = num(rows.at(-2)?.Close)
    const closeVnd = num(last.Close)

    const recent = closes.slice(-252)
    const price = {
      closeVnd,
      pctChange: closeVnd != null && prevClose != null ? ((closeVnd - prevClose) / prevClose) * 100 : null,
      openVnd: num(last.Open),
      highVnd: num(last.High),
      lowVnd: num(last.Low),
      nmVolume: num(last.Volume),
      date: last.TradingDate || null,
      high52: recent.length ? Math.max(...recent) : null,
      low52: recent.length ? Math.min(...recent) : null,
      source: 'SSI',
    }
    const trend = {
      m1: chg(closes, 21),
      m3: chg(closes, 63),
      m6: chg(closes, 126),
      y1: chg(closes, 252),
      source: 'SSI',
    }
    return { price, trend }
  } catch (err) {
    console.warn('[ssi]', err.message)
    return { price: null, trend: null }
  }
}
