// Dữ liệu tổng quan thị trường: VN-Index + số mã tăng/giảm/đứng giá.
import { VN30 } from './priceBoard.js'

const TIMEOUT_MS = 7000

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Strip HTML tags khỏi mô tả tin.
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Số mã tăng/giảm/đứng giá tính trên rổ VN30 (breadth toàn sàn không có nguồn no-auth
// tin cậy; VN30 là chỉ báo chuẩn cho nhóm vốn hóa lớn). FE ghi rõ nhãn "trong VN30".
const BREADTH_BASKET = VN30

export async function getMarketOverview() {
  const [vniResult, pricesResult] = await Promise.all([
    // VN-Index: lấy 5 phiên gần nhất từ dchart để tính %thay đổi.
    (async () => {
      const to = Math.floor(Date.now() / 1000)
      const from = to - 8 * 86400 // 8 ngày ≈ 5 phiên
      try {
        const d = await fetchJson(
          `https://dchart-api.vndirect.com.vn/dchart/history?symbol=VNINDEX&resolution=D&from=${from}&to=${to}`,
        )
        if (d.s !== 'ok' || !d.c?.length) throw new Error('no data')
        const closes = d.c
        const prev = closes[closes.length - 2] ?? closes[closes.length - 1]
        const last = closes.at(-1)
        const chg = last - prev
        const pct = (chg / prev) * 100
        return {
          source: 'vndirect',
          index: last,
          change: chg,
          pct,
          high: Math.max(...d.h),
          low: Math.min(...d.l),
          vol: d.v.at(-1),
        }
      } catch (err) {
        return { source: 'unavailable', error: err.message }
      }
    })(),

    // Batch prices: đếm tăng/giảm/đứng giá trong danh sách mã.
    (async () => {
      try {
        const codes = BREADTH_BASKET.join(',')
        const d = await fetchJson(
          `https://api-finfo.vndirect.com.vn/v4/change_prices/latest?order=code&filter=code:${codes}`,
        )
        const rows = Array.isArray(d?.data) ? d.data : []
        let gainers = 0, losers = 0, unchanged = 0
        for (const r of rows) {
          if (r.changePct > 0.05) gainers++
          else if (r.changePct < -0.05) losers++
          else unchanged++
        }
        return {
          source: 'vndirect',
          basket: 'vn30',
          gainers,
          losers,
          unchanged,
          totalStocks: rows.length,
        }
      } catch (err) {
        return { source: 'unavailable', error: err.message }
      }
    })(),
  ])

  return {
    vni: vniResult,
    breadth: pricesResult,
  }
}

// Tin tức CafeF RSS.
export async function getMarketNews({ size = 10 } = {}) {
  try {
    const res = await fetch('https://cafef.vn/thi-truong-chung-khoan.rss', {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 StockSense/1.0' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const xml = await res.text()
    const items = []
    const itemRe = /<item>([\s\S]*?)<\/item>/gi
    let m
    let count = 0
    while ((m = itemRe.exec(xml)) !== null && count < size) {
      const block = m[1]
      const titleMatch = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i.exec(block)
      const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(block)
      const descMatch = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i.exec(block)
      const dateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block)
      if (!titleMatch) continue
      const title = titleMatch[1].trim()
      const link = linkMatch?.[1]?.trim() || ''
      const rawDesc = descMatch?.[1] || ''
      const desc = stripHtml(rawDesc).slice(0, 200)
      const pubDate = dateMatch?.[1]?.trim() || ''
      // Parse CaféF date: "Wed, 08 Jul 26 21:07:00 +0700"
      let relative = ''
      try {
        const d = new Date(pubDate)
        if (!isNaN(d)) {
          const diffMs = Date.now() - d.getTime()
          const h = Math.floor(diffMs / 3600000)
          const min = Math.floor(diffMs / 60000) % 60
          relative = h >= 1 ? `${h}h trước` : `${min} phút trước`
        }
      } catch { /* ignore */ }
      items.push({ title, link, desc, pubDate, relative, source: 'cafef' })
      count++
    }
    if (items.length === 0) throw new Error('no items')
    return { source: 'cafef', items }
  } catch (err) {
    return { source: 'unavailable', error: err.message }
  }
}
