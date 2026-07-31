// Danh mục theo dõi của bảng điện, lưu ở localStorage (DB hoá sau).

// Danh mục mặc định = rổ VN30 (nhiều mã, thanh khoản cao) để bảng giá đầy đặn ngay từ đầu.
// Người dùng vẫn thêm/bớt tuỳ ý.
export const WATCH_DEFAULT = [
  'ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG',
  'LPB', 'MBB', 'MSN', 'MWG', 'PLX', 'SAB', 'SHB', 'SSB', 'SSI', 'STB',
  'TCB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE',
]
// v2: đổi khoá để áp danh mục mặc định mới (VN30) cho cả người đã lưu bản 6 mã cũ.
export const WATCH_KEY = 'ss.watchlist.v2'
export const MAX_WATCH = 50

export function loadWatch() {
  try {
    const arr = JSON.parse(localStorage.getItem(WATCH_KEY))
    if (Array.isArray(arr) && arr.length) return arr.map((c) => String(c).toUpperCase())
  } catch { /* dùng mặc định */ }
  return WATCH_DEFAULT
}

export function saveWatch(list) {
  try { localStorage.setItem(WATCH_KEY, JSON.stringify(list)) } catch { /* bỏ qua */ }
}
