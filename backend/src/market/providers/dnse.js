import { EventEmitter } from 'node:events'

// ============================================================================
// Provider DNSE LightSpeed (Entrade X) — CHỖ CẮM DỮ LIỆU THẬT.
// ----------------------------------------------------------------------------
// Hiện là scaffold: cùng interface với SimulatedProvider (on('quote'),
// subscribe, unsubscribe, getLatest) nhưng chưa nối luồng thật. Khi bạn có
// tài khoản DNSE, hoàn thiện phần TODO bên dưới rồi đặt MARKET_PROVIDER=dnse.
//
// Cách nối (theo tài liệu DNSE LightSpeed / ENTRADE X):
//   1) Lấy JWT "investor token" từ tài khoản DNSE (đăng nhập API DNSE).
//      Một số topic market-data là public, không cần token.
//   2) Kết nối MQTT-over-WSS tới:  wss://datafeed-lts.dnse.com.vn/wss
//      (dùng gói `mqtt`:  npm i mqtt). Xác thực bằng username/password =
//      investorId / token nếu topic yêu cầu.
//   3) Subscribe topic theo mã, ví dụ (kiểm tra lại tên topic trong docs
//      https://hdsd.dnse.com.vn/san-pham-dich-vu/lightspeed-api ):
//        plaintext/quotes/krx/mdds/tick/v1/roundlot/symbol/<SYMBOL>
//        plaintext/quotes/krx/mdds/topprice/v1/roundlot/symbol/<SYMBOL>
//   4) Trong message handler, map payload DNSE về shape quote chuẩn của app:
//        { ticker, price, ref, change, pct, volume, side, time }
//      rồi this.emit('quote', quote) + lưu this.latest.set(ticker, quote).
// ============================================================================
export class DnseProvider extends EventEmitter {
  constructor({ token = '', wsUrl = 'wss://datafeed-lts.dnse.com.vn/wss' } = {}) {
    super()
    this.name = 'dnse'
    this.token = token
    this.wsUrl = wsUrl
    this.latest = new Map()
    this.client = null
  }

  start() {
    // TODO: kết nối MQTT thật ở đây. Ném lỗi để factory tự fallback sang
    // simulated khi chưa hoàn thiện, tránh chạy im lặng mà không có dữ liệu.
    throw new Error(
      'DnseProvider chưa được nối luồng thật — xem hướng dẫn trong file này. ' +
        'Tạm dùng MARKET_PROVIDER=simulated.',
    )
  }

  stop() {
    if (this.client) this.client.end()
    this.client = null
  }

  getLatest(ticker) {
    return this.latest.get(ticker) || null
  }

  subscribe(/* ticker */) {
    // TODO: client.subscribe(topicFor(ticker))
  }

  unsubscribe(/* ticker */) {
    // TODO: client.unsubscribe(topicFor(ticker))
  }
}
