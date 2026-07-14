// Lấy dữ liệu THỜI GIAN THỰC cho một mã để nhồi vào prompt AI.
// Ưu tiên SSI (giá/nến) + Vietstock (chỉ số cơ bản); field nào thiếu/lỗi thì
// FALLBACK sang VNDIRECT. MỖI request fetch mới hoàn toàn — KHÔNG cache.
import { ssiPriceAndTrend } from './providers/ssi.js'
import { vietstockFundamentals } from './providers/vietstock.js'
import { vndPrice, vndRatios, vndProfile, vndTrend, vndTechnical } from './providers/vndirect.js'

const fmtInt = (n) => (n == null ? '—' : Math.round(n).toLocaleString('vi-VN'))
const fmtNum = (n, d = 1) => (n == null ? '—' : Number(n).toFixed(d).replace('.', ','))
const fmtPctFrac = (x) => (x == null ? '—' : (x >= 0 ? '+' : '') + (x * 100).toFixed(1).replace('.', ',') + '%')
const fmtPctRaw = (x) => (x == null ? '—' : (x >= 0 ? '+' : '') + Number(x).toFixed(2).replace('.', ',') + '%')

// Toàn bộ mã niêm yết (HOSE/HNX/UPCoM) để gợi ý autocomplete. Cache 6 giờ
// (đây là danh sách mã, KHÔNG phải dữ liệu phân tích — không thuộc yêu cầu "fetch mới").
let universeCache = null
export async function getTickerUniverse() {
  if (universeCache && Date.now() - universeCache.at < 6 * 3600_000) return universeCache.list
  try {
    const res = await fetch(
      'https://api-finfo.vndirect.com.vn/v4/stocks?q=type:STOCK~status:LISTED&size=3000&fields=code,shortName,companyName,floor',
      { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0 StockSense/1.0' } },
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const d = await res.json()
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

// Ghép khối markdown "Số liệu THỜI GIAN THỰC" từ dữ liệu đã merge.
function formatSnapshot({ code, price, valuation, fundamentals, trend, profile, high52, low52, technical }) {
  const src = (s) => (s ? ` _(${s})_` : '')
  const lines = []
  lines.push(`# Số liệu THỜI GIAN THỰC — ${code}${price?.date ? ` (phiên ${price.date})` : ''}`)

  if (price) {
    lines.push('\n## Giá & thanh khoản')
    if (price.closeVnd != null)
      lines.push(`- Giá đóng cửa: ${fmtInt(price.closeVnd)} đ (${fmtPctRaw(price.pctChange)} phiên gần nhất)${src(price.source)}`)
    if (price.openVnd != null)
      lines.push(`- Trong phiên: mở ${fmtInt(price.openVnd)} / cao ${fmtInt(price.highVnd)} / thấp ${fmtInt(price.lowVnd)} đ`)
    if (price.nmVolume != null) lines.push(`- KL khớp lệnh: ${fmtInt(price.nmVolume)} cp`)
  }
  if (valuation?.nmValueAvg20d != null)
    lines.push(`- GTGD khớp lệnh TB 20 phiên: ${fmtInt(valuation.nmValueAvg20d / 1e9)} tỷ đ${src(valuation.source)}`)
  if (high52 != null && low52 != null) {
    const distHigh = price?.closeVnd != null ? 1 - price.closeVnd / high52 : null
    const distLow = price?.closeVnd != null ? price.closeVnd / low52 - 1 : null
    lines.push(
      `- Vùng 52 tuần: ${fmtInt(low52)} – ${fmtInt(high52)} đ` +
        (distHigh != null ? ` (thấp hơn đỉnh ${fmtNum(distHigh * 100)}%, cao hơn đáy ${fmtNum(distLow * 100)}%)` : ''),
    )
  }

  if (valuation) {
    lines.push(`\n## Định giá & hiệu quả${valuation.mktDate ? ` (cập nhật ${valuation.mktDate})` : ''}`)
    if (valuation.marketcap != null)
      lines.push(
        `- Vốn hóa: ${fmtInt(valuation.marketcap / 1e9)} tỷ đ` +
          (valuation.outstandingShares != null ? ` | KLCP lưu hành: ${fmtInt(valuation.outstandingShares)}` : '') +
          src(valuation.source),
      )
    lines.push(
      `- P/E: ${fmtNum(valuation.pe, 2)} | P/B: ${fmtNum(valuation.pb, 2)} | P/S: ${fmtNum(valuation.ps, 2)} | Beta: ${fmtNum(valuation.beta, 2)}${src(valuation.source)}`,
    )
  }
  if (fundamentals) {
    const tag = fundamentals.fundDate ? ` (quý gần nhất tới ${fundamentals.fundDate})` : ''
    lines.push(`- ROE (TB 4 quý): ${fmtPctFrac(fundamentals.roe)} | ROAA: ${fmtPctFrac(fundamentals.roaa)}${tag}${src(fundamentals.source)}`)
    if (fundamentals.netProfitGrowthYoY != null)
      lines.push(`- Tăng trưởng LN ròng 4 quý (YoY): ${fmtPctFrac(fundamentals.netProfitGrowthYoY)}${src(fundamentals.source)}`)
  }

  if (trend) {
    lines.push('\n## Xu hướng giá')
    lines.push(
      `- 1 tháng: ${fmtPctFrac(trend.m1)} | 3 tháng: ${fmtPctFrac(trend.m3)} | 6 tháng: ${fmtPctFrac(trend.m6)} | 1 năm: ${fmtPctFrac(trend.y1)}${src(trend.source)}`,
    )
  }

  if (technical) {
    lines.push('\n## Chỉ báo kỹ thuật (tính từ nến ngày)')
    lines.push(`- MA20: ${fmtInt(technical.ma20)} | MA50: ${fmtInt(technical.ma50)} | MA200: ${fmtInt(technical.ma200)} đ${src(technical.source)}`)
    lines.push(`- RSI(14): ${technical.rsi14 ?? '—'}`)
    lines.push(`- Hỗ trợ / Kháng cự 20 phiên: ${fmtInt(technical.support20)} / ${fmtInt(technical.resistance20)} đ`)
    lines.push(`- Hỗ trợ / Kháng cự ~60 phiên: ${fmtInt(technical.support60)} / ${fmtInt(technical.resistance60)} đ`)
  }

  if (profile) {
    const meta = [
      profile.floor && `sàn ${profile.floor}`,
      profile.foundDate && `thành lập ${profile.foundDate}`,
      profile.employees && `${fmtInt(profile.employees)} nhân viên`,
    ]
      .filter(Boolean)
      .join(', ')
    lines.push('\n## Hồ sơ doanh nghiệp')
    lines.push(`- ${profile.name || code}${meta ? ` (${meta})` : ''}${src(profile.source)}`)
    if (profile.summary) lines.push(`- ${profile.summary.slice(0, 700)}`)
  }

  return lines.join('\n')
}

// Sàn niêm yết chuẩn hoá về mã sàn TradingView (HOSE/HNX/UPCOM).
function normalizeExchange(floor) {
  const f = String(floor || '').toUpperCase()
  if (f.includes('HOSE') || f.includes('HSX')) return 'HOSE'
  if (f.includes('HNX')) return 'HNX'
  if (f.includes('UPCOM') || f.includes('UPCROM')) return 'UPCOM'
  return null
}

// Gộp dữ liệu THẬT của một mã từ mọi nguồn → object CÓ CẤU TRÚC.
// Dùng chung cho cả snapshot AI (format text) lẫn màn chi tiết cổ phiếu (JSON).
// MỖI request fetch mới hoàn toàn — KHÔNG cache (theo yêu cầu sản phẩm).
// Trả về object hoặc null nếu mã không có dữ liệu.
export async function getStockData(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{2,10}$/.test(code)) return null

  // Gọi tất cả nguồn SONG SONG, mỗi lần đều fetch mới (không cache).
  const [ssi, vs, vP, vR, vProf, vT, vTech] = await Promise.all([
    ssiPriceAndTrend(code),
    vietstockFundamentals(code),
    vndPrice(code).catch(() => null),
    vndRatios(code).catch(() => null),
    vndProfile(code).catch(() => null),
    vndTrend(code).catch(() => null),
    vndTechnical(code).catch(() => null),
  ])

  // Merge từng nhóm: ưu tiên nguồn mới, fallback VNDIRECT.
  const price = ssi.price || vP
  const valuation = vs.valuation || vR // vR chứa cả nhóm định giá
  const fundamentals = vs.fundamentals || vR // vR chứa cả ROE/ROAA
  const trend = ssi.trend || vT
  const profile = vs.profile || vProf
  const technical = vTech // chỉ báo kỹ thuật (chỉ VNDIRECT tính)

  if (!price && !valuation && !profile) return null

  // 52 tuần: ưu tiên SSI (price.high52) rồi tới VNDIRECT ratios.
  const high52 = price?.high52 ?? vR?.high52 ?? null
  const low52 = price?.low52 ?? vR?.low52 ?? null
  const asOf = price?.date || new Date().toISOString().slice(0, 10)
  const exchange = normalizeExchange(profile?.floor)

  return { code, asOf, exchange, price, valuation, fundamentals, trend, profile, technical, high52, low52 }
}

// Trả về { code, asOf, text } hoặc null nếu mã không có dữ liệu (dùng cho prompt AI).
export async function getStockSnapshot(rawCode) {
  const data = await getStockData(rawCode)
  if (!data) return null
  const { code, asOf, price, valuation, fundamentals, trend, profile, technical, high52, low52 } = data

  const text = formatSnapshot({ code, price, valuation, fundamentals, trend, profile, high52, low52, technical })

  const sources = [
    ...new Set([price?.source, valuation?.source, fundamentals?.source, trend?.source, profile?.source].filter(Boolean)),
  ]
  console.log(`[snapshot] ${code} — nguồn: ${sources.join(', ') || 'không có'} (fetch mới, không cache)`)

  return { code, asOf, text }
}
