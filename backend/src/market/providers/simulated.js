import { EventEmitter } from 'node:events'
import { UNIVERSE, BAND, isKnownTicker } from '../universe.js'

// Provider mô phỏng: sinh tick giá theo bước đi ngẫu nhiên nhỏ quanh giá tham
// chiếu, phát sự kiện 'quote'. Dùng khi chưa cắm nguồn broker thật.
// Cùng interface với provider thật: on('quote'), subscribe, unsubscribe, getLatest.
export class SimulatedProvider extends EventEmitter {
  constructor({ intervalMs = 1000 } = {}) {
    super()
    this.name = 'simulated'
    this.intervalMs = intervalMs
    this.subs = new Map() // ticker -> số client đang theo dõi (refcount)
    this.latest = new Map() // ticker -> quote gần nhất
    this.timer = null
  }

  start() {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), this.intervalMs)
    if (this.timer.unref) this.timer.unref()
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  // Khởi tạo quote đầu tiên cho một mã từ dữ liệu cơ sở.
  seed(ticker) {
    const base = UNIVERSE[ticker]
    const price = base.price
    const change = price - base.ref
    const q = {
      ticker,
      price,
      ref: base.ref,
      change,
      pct: (change / base.ref) * 100,
      volume: base.baseVol,
      side: change >= 0 ? 'up' : 'down',
      time: Date.now(),
    }
    this.latest.set(ticker, q)
    return q
  }

  getLatest(ticker) {
    if (!isKnownTicker(ticker)) return null
    return this.latest.get(ticker) || this.seed(ticker)
  }

  subscribe(ticker) {
    if (!isKnownTicker(ticker)) return false
    this.subs.set(ticker, (this.subs.get(ticker) || 0) + 1)
    if (!this.latest.has(ticker)) this.seed(ticker)
    this.start()
    return true
  }

  unsubscribe(ticker) {
    const n = this.subs.get(ticker)
    if (!n) return
    if (n <= 1) this.subs.delete(ticker)
    else this.subs.set(ticker, n - 1)
  }

  // Mỗi nhịp: cập nhật một phần các mã đang được theo dõi.
  tick() {
    for (const ticker of this.subs.keys()) {
      // ~55% số nhịp có thay đổi giá, cho cảm giác nhấp nháy tự nhiên.
      if (Math.random() > 0.55) continue
      const prev = this.getLatest(ticker)
      const base = UNIVERSE[ticker]
      const step = (Math.random() - 0.48) * 0.0025 // ±~0,25%
      let price = prev.price * (1 + step)
      // làm tròn theo bước giá HOSE (10đ) cho hợp lý
      price = Math.round(price / 10) * 10
      const min = base.ref * (1 - BAND)
      const max = base.ref * (1 + BAND)
      price = Math.min(max, Math.max(min, price))
      const change = price - base.ref
      const q = {
        ticker,
        price,
        ref: base.ref,
        change,
        pct: (change / base.ref) * 100,
        volume: prev.volume + Math.round(Math.random() * 20000),
        side: price > prev.price ? 'up' : price < prev.price ? 'down' : prev.side,
        time: Date.now(),
      }
      this.latest.set(ticker, q)
      this.emit('quote', q)
    }
  }
}
