// Vòng lặp KHỚP LỆNH backtest cho MỘT mã, thị trường tiền mặt VN (LONG-ONLY) — port
// ý tưởng từ HKUDS/Vibe-Trading engines/base.py + china_a.py nhưng viết lại cho luật VN:
// lot 100 cp, phí mua + (phí + thuế) bán, ràng buộc T+2.5 (giữ đủ N phiên mới bán được).
//
// CHỐNG LOOK-AHEAD: tín hiệu pos[i] tính trên giá ĐÓNG CỬA phiên i → khớp lệnh tại giá
// MỞ CỬA phiên i+1 (không thể giao dịch bằng thông tin của chính phiên đó).
//
// Trả: { equity:[{time,value}], trades:[...], markers:[{time,type,price}] }.

// Làm tròn khối lượng theo lô (VN: bội số của lotSize).
const roundLot = (shares, lot) => Math.floor(shares / lot) * lot

export function runEngine(candles, pos, opts = {}) {
  const initialCash = opts.initialCash ?? 100_000_000 // 100 triệu đồng
  const feeRate = opts.feeRate ?? 0.0015 // phí giao dịch mỗi chiều (~0,15%)
  const sellTaxRate = opts.sellTaxRate ?? 0.001 // thuế TNCN khi bán (0,1% giá trị bán)
  const lot = opts.lotSize ?? 100
  const minHold = opts.minHoldingBars ?? 3 // T+2.5 → giữ tối thiểu 3 phiên mới bán

  let cash = initialCash
  let shares = 0
  let entryPrice = 0
  let entryCost = 0 // tiền đã chi khi mua (gồm phí) — để tính lãi/lỗ ròng
  let entryTime = null
  let entryIndex = -1

  const equity = []
  const trades = []
  const markers = []

  const buyAt = (bar, i) => {
    const price = bar.open
    if (!(price > 0)) return
    const affordable = roundLot(cash / (price * (1 + feeRate)), lot)
    if (affordable <= 0) return
    const gross = affordable * price
    const fee = gross * feeRate
    cash -= gross + fee
    shares = affordable
    entryPrice = price
    entryCost = gross + fee
    entryTime = bar.time
    entryIndex = i
    markers.push({ time: bar.time, type: 'buy', price })
  }

  const sellAt = (bar, i, reason) => {
    const price = bar.close != null && reason === 'end' ? bar.close : bar.open
    const gross = shares * price
    const fee = gross * (feeRate + sellTaxRate)
    cash += gross - fee
    trades.push({
      entryTime,
      exitTime: bar.time,
      entryPrice,
      exitPrice: price,
      shares,
      pnl: gross - fee - entryCost, // lãi/lỗ RÒNG sau mọi phí + thuế
      holdingBars: i - entryIndex,
      exitReason: reason,
    })
    markers.push({ time: bar.time, type: 'sell', price })
    shares = 0
    entryPrice = 0
    entryCost = 0
    entryTime = null
    entryIndex = -1
  }

  for (let i = 0; i < candles.length; i++) {
    const bar = candles[i]

    // Khớp quyết định của phiên TRƯỚC (pos[i-1]) tại giá mở cửa phiên NÀY.
    if (i > 0) {
      const want = pos[i - 1]
      const holding = shares > 0
      if (want === 1 && !holding) buyAt(bar, i)
      else if (want === 0 && holding && i - entryIndex >= minHold) sellAt(bar, i, 'signal')
    }

    // Định giá vốn theo giá đóng cửa cuối phiên.
    equity.push({ time: bar.time, value: cash + shares * bar.close })
  }

  // Ép đóng vị thế còn mở ở phiên cuối (theo giá đóng cửa) để metrics phản ánh đủ.
  if (shares > 0 && candles.length) {
    const last = candles[candles.length - 1]
    sellAt(last, candles.length - 1, 'end')
    equity[equity.length - 1] = { time: last.time, value: cash }
  }

  return { equity, trades, markers, initialCash }
}
