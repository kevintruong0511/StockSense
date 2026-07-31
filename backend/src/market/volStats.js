// Thống kê KHỐI LƯỢNG bình quân 20 phiên gần nhất cho bảng điện.
// Mục tiêu: so KL khớp trong ngày với KL bình quân 20 phiên TRƯỚC ĐÓ → phát hiện "đột biến"
// (KL hôm nay ≥ TB20 phiên). Dữ liệu THẬT lấy từ nến ngày VNDIRECT dchart (getDailyHistory).
//
// TB20 chỉ đổi theo NGÀY (không phải theo tick) nên:
//   - cache dài (1 giờ) để không nện dchart mỗi lần poll ~20s,
//   - nạp NỀN (không chặn): khi bảng giá cần mà cache chưa có → trả tạm null + kích một request
//     nền, lần poll sau đã có số. Bảng giá không bao giờ đợi phần này.
import { getDailyHistory } from './candles.js'

const TTL_MS = 60 * 60 * 1000 // TB20 đổi theo ngày → cache 1 giờ là an toàn
const AVG_WINDOW = 20 // số phiên tính bình quân
const MAX_CONCURRENT = 6 // giới hạn số request dchart chạy song song (nhẹ tay với upstream)

const cache = new Map() // code -> { at, avg20 }  (avg20 có thể null nếu thiếu dữ liệu hợp lệ)
const inflight = new Set() // code đang nạp nền (tránh trùng request)
let active = 0
const queue = []

function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    const job = queue.shift()
    active++
    job().finally(() => { active--; pump() })
  }
}

// TB20 = bình quân KL của 20 phiên NGAY TRƯỚC phiên gần nhất (bỏ phiên hiện tại đang chạy dở),
// để "KL hôm nay ≥ TB20" là tín hiệu đột biến sạch, không tự so với chính nó.
async function computeAvg20(code) {
  const bars = await getDailyHistory(code, 1, 1000) // nến ngày ~1 năm (tăng dần); volume = KL thật
  if (!Array.isArray(bars) || bars.length < 2) return null
  const prior = bars.slice(0, -1).slice(-AVG_WINDOW) // 20 phiên trước phiên mới nhất
  const vols = prior.map((b) => b.volume).filter((v) => v != null && v > 0)
  if (!vols.length) return null
  return Math.round(vols.reduce((s, v) => s + v, 0) / vols.length)
}

function refresh(code) {
  if (inflight.has(code)) return
  inflight.add(code)
  queue.push(async () => {
    try {
      const avg20 = await computeAvg20(code)
      cache.set(code, { at: Date.now(), avg20 }) // gồm cả null hợp lệ (mã mới/ít lịch sử) để khỏi lặp
    } catch {
      // lỗi mạng → KHÔNG ghi cache, để lần poll sau thử lại (giữ giá trị cũ nếu đã có)
    } finally {
      inflight.delete(code)
    }
  })
  pump()
}

// Lấy TB20 từ cache; nếu thiếu/hết hạn → kích nạp nền và trả giá trị cũ (nếu có) trong lúc chờ.
function getAvg20(code) {
  const hit = cache.get(code)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.avg20
  refresh(code)
  return hit?.avg20 ?? null
}

// Gắn avgVol20 + volRatio (KL hôm nay / TB20) vào từng row (KHÔNG chặn — chỉ đọc cache, nạp nền nếu thiếu).
// volRatio ≥ 1 nghĩa là KL hôm nay ≥ bình quân 20 phiên. Mutate + trả lại chính mảng rows.
export function attachAvgVolume20(rows) {
  for (const r of rows || []) {
    if (!r?.code) continue
    const avg20 = getAvg20(r.code)
    r.avgVol20 = avg20
    r.volRatio = avg20 && avg20 > 0 && r.volume != null ? r.volume / avg20 : null
  }
  return rows
}
