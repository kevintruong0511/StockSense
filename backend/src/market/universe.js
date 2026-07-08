// Vũ trụ mã cơ sở cho feed mô phỏng. Giá tính bằng VND.
// `ref` = giá tham chiếu (giá tham chiếu đầu phiên) để tính +/- và %.
// Khi cắm nguồn thật (DNSE/SSI), các số này chỉ còn dùng làm fallback ban đầu.
export const UNIVERSE = {
  FPT: { ref: 134400, price: 137500, baseVol: 4_120_000 },
  HPG: { ref: 28500, price: 28150, baseVol: 32_400_000 },
  VNM: { ref: 64000, price: 64300, baseVol: 2_860_000 },
  VCB: { ref: 90800, price: 91800, baseVol: 3_540_000 },
  MWG: { ref: 59300, price: 58900, baseVol: 6_710_000 },
  CMG: { ref: 51600, price: 52400, baseVol: 740_000 },
  ELC: { ref: 24800, price: 24600, baseVol: 1_220_000 },
}

export const isKnownTicker = (t) => Object.prototype.hasOwnProperty.call(UNIVERSE, t)

// Biên dao động trong ngày của HOSE ~ ±7% quanh giá tham chiếu.
export const BAND = 0.07
