import { config } from '../config.js'
import { SimulatedProvider } from './providers/simulated.js'
import { DnseProvider } from './providers/dnse.js'
import { UNIVERSE } from './universe.js'
import { getSeed } from './vndirect.js'

// Chọn provider theo cấu hình. Nếu provider thật chưa sẵn sàng thì tự động
// fallback về mô phỏng để app luôn có dữ liệu chạy.
function createProvider() {
  if (config.marketProvider === 'dnse') {
    const dnse = new DnseProvider({ token: config.dnseToken })
    try {
      dnse.start()
      console.log('[market] Dùng provider DNSE (thật).')
      return dnse
    } catch (err) {
      console.warn(`[market] Không khởi động được DNSE (${err.message}) → fallback simulated.`)
    }
  }
  const sim = new SimulatedProvider()
  console.log('[market] Dùng provider mô phỏng (simulated).')
  return sim
}

// Provider dùng chung toàn app (singleton).
export const marketProvider = createProvider()

// Với feed mô phỏng: nạp giá tham chiếu THẬT (VNDIRECT) để dao động quanh giá
// đóng cửa thật, khớp với biểu đồ nến. Chạy nền, lỗi thì giữ giá mock.
if (marketProvider.name === 'simulated') {
  ;(async () => {
    let ok = 0
    for (const t of Object.keys(UNIVERSE)) {
      try {
        const s = await getSeed(t)
        if (s) {
          UNIVERSE[t].price = s.price
          UNIVERSE[t].ref = s.ref
          ok++
        }
      } catch {
        /* giữ giá mock */
      }
    }
    console.log(`[market] Nạp giá tham chiếu thật cho ${ok}/${Object.keys(UNIVERSE).length} mã.`)
  })()
}
