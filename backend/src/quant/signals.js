// Bộ SINH TÍN HIỆU cho backtest — ý tưởng từ HKUDS/Vibe-Trading (tách signal khỏi
// execution). Mỗi chiến lược nhận mảng nến ngày (tăng dần) + tham số → trả mảng VỊ THẾ
// pos[i] ∈ {0,1} (thị trường tiền mặt VN LONG-ONLY: 0 = cầm tiền, 1 = cầm cổ full).
// Chỉ báo tính THUẦN từ giá đóng cửa/đỉnh/đáy — không phụ thuộc nguồn dữ liệu.
//
// candles: [{ time, open, high, low, close, volume }] — giá VND (đã ×1000 từ dchart).

// SMA(n) tại từng chỉ số: null cho tới khi đủ n phiên.
function smaSeries(values, n) {
  const out = new Array(values.length).fill(null)
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= n) sum -= values[i - n]
    if (i >= n - 1) out[i] = sum / n
  }
  return out
}

// RSI(period) Wilder tại TỪNG chỉ số (null cho tới khi đủ period+1 phiên). Cùng công
// thức với providers/vndirect.js rsi() nhưng trả cả CHUỖI để máy trạng thái dùng.
function rsiSeries(closes, period = 14) {
  const out = new Array(closes.length).fill(null)
  if (closes.length <= period) return out
  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const ch = closes[i] - closes[i - 1]
    if (ch >= 0) avgGain += ch
    else avgLoss -= ch
  }
  avgGain /= period
  avgLoss /= period
  const rsiAt = () => (avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
  out[period] = rsiAt()
  for (let i = period + 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + (ch > 0 ? ch : 0)) / period
    avgLoss = (avgLoss * (period - 1) + (ch < 0 ? -ch : 0)) / period
    out[i] = rsiAt()
  }
  return out
}

// Cắt tham số về khoảng cho phép + số nguyên.
const clampInt = (x, lo, hi, def) => {
  const v = Math.round(Number(x))
  if (!Number.isFinite(v)) return def
  return Math.min(hi, Math.max(lo, v))
}

// ── Chiến lược 1: Giao cắt trung bình động (MA cross) ────────────────────────
// MA nhanh > MA chậm → giữ cổ (xu hướng tăng); ngược lại → cầm tiền.
function maCross(candles, params = {}) {
  const fast = clampInt(params.fast, 2, 100, 20)
  const slow = Math.max(fast + 1, clampInt(params.slow, 5, 250, 50))
  const closes = candles.map((c) => c.close)
  const maF = smaSeries(closes, fast)
  const maS = smaSeries(closes, slow)
  return closes.map((_, i) => (maF[i] != null && maS[i] != null && maF[i] > maS[i] ? 1 : 0))
}

// ── Chiến lược 2: RSI đảo chiều (quá bán/quá mua) ────────────────────────────
// Vào khi RSI < ngưỡng "buy" (quá bán), giữ tới khi RSI > ngưỡng "sell" (quá mua).
function rsiReversion(candles, params = {}) {
  const period = clampInt(params.period, 2, 50, 14)
  const buy = clampInt(params.buy, 5, 50, 30)
  const sell = Math.max(buy + 1, clampInt(params.sell, 50, 95, 70))
  const closes = candles.map((c) => c.close)
  const rsi = rsiSeries(closes, period)
  const pos = new Array(closes.length).fill(0)
  let holding = false
  for (let i = 0; i < closes.length; i++) {
    const r = rsi[i]
    if (r != null) {
      if (!holding && r < buy) holding = true
      else if (holding && r > sell) holding = false
    }
    pos[i] = holding ? 1 : 0
  }
  return pos
}

// ── Chiến lược 3: Breakout kênh giá (Donchian) ──────────────────────────────
// Vào khi close vượt ĐỈNH window phiên trước; ra khi close thủng ĐÁY window phiên trước.
function breakout(candles, params = {}) {
  const window = clampInt(params.window, 5, 120, 20)
  const pos = new Array(candles.length).fill(0)
  let holding = false
  for (let i = 0; i < candles.length; i++) {
    if (i >= window) {
      let hi = -Infinity
      let lo = Infinity
      for (let j = i - window; j < i; j++) {
        if (candles[j].high > hi) hi = candles[j].high
        if (candles[j].low < lo) lo = candles[j].low
      }
      const c = candles[i].close
      if (!holding && c > hi) holding = true
      else if (holding && c < lo) holding = false
    }
    pos[i] = holding ? 1 : 0
  }
  return pos
}

// ── Chiến lược 4: Mua & giữ (benchmark chiến lược) ──────────────────────────
function buyHold(candles) {
  return candles.map(() => 1)
}

export const STRATEGIES = { maCross, rsiReversion, breakout, buyHold }

// Metadata để route validate + frontend render form (nhãn tiếng Việt, tham số + biên).
export const STRATEGY_META = {
  maCross: {
    label: 'Giao cắt MA (nhanh/chậm)',
    desc: 'Mua khi MA nhanh cắt lên trên MA chậm; bán khi cắt xuống.',
    params: [
      { key: 'fast', label: 'MA nhanh', default: 20, min: 2, max: 100, step: 1 },
      { key: 'slow', label: 'MA chậm', default: 50, min: 5, max: 250, step: 1 },
    ],
  },
  rsiReversion: {
    label: 'RSI đảo chiều',
    desc: 'Mua khi RSI xuống vùng quá bán; bán khi RSI lên vùng quá mua.',
    params: [
      { key: 'period', label: 'Chu kỳ RSI', default: 14, min: 2, max: 50, step: 1 },
      { key: 'buy', label: 'Ngưỡng mua (quá bán)', default: 30, min: 5, max: 50, step: 1 },
      { key: 'sell', label: 'Ngưỡng bán (quá mua)', default: 70, min: 50, max: 95, step: 1 },
    ],
  },
  breakout: {
    label: 'Breakout kênh giá',
    desc: 'Mua khi giá vượt đỉnh N phiên; bán khi thủng đáy N phiên.',
    params: [{ key: 'window', label: 'Số phiên kênh giá', default: 20, min: 5, max: 120, step: 1 }],
  },
  buyHold: {
    label: 'Mua & giữ',
    desc: 'Mua đầu kỳ, giữ tới cuối kỳ — làm chuẩn đối chiếu.',
    params: [],
  },
}
