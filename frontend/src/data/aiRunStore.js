// Store BỀN cho các luồng phân tích AI (thị trường / danh mục / phân tích mã).
// Sống ở cấp module (ngoài vòng đời React) nên state + kết nối stream KHÔNG mất khi
// người dùng chuyển màn (component unmount). Nhờ vậy AI vẫn chạy tiếp ở nền và khi
// quay lại màn ta hydrate lại đúng trạng thái đang stream / đã xong.
//
// Cách dùng: useAiRun(key, initial) → [state, patch]. patch nhận object (merge nông)
// hoặc hàm updater (state => nextState). Các callback stream nên gọi patchRun(key, …)
// TRỰC TIẾP (không qua closure component) để cập nhật được cả khi màn đã unmount.
import { useCallback, useSyncExternalStore } from 'react'

const store = new Map() // key -> state object (được THAY THẾ mỗi lần patch để giữ tham chiếu ổn định)
const listeners = new Map() // key -> Set<callback>

function notify(key) {
  const set = listeners.get(key)
  if (set) for (const fn of set) fn()
}

function ensure(key, initial) {
  if (!store.has(key)) store.set(key, typeof initial === 'function' ? initial() : { ...initial })
}

// Cập nhật state của 1 run rồi báo cho mọi subscriber. patch = object (merge) hoặc updater.
export function patchRun(key, patch) {
  const cur = store.get(key) || {}
  const next = typeof patch === 'function' ? patch(cur) : { ...cur, ...patch }
  store.set(key, next)
  notify(key)
}

// Đọc snapshot hiện tại (dùng trong callback stream, ngoài render).
export function getRun(key) {
  return store.get(key)
}

function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set())
  listeners.get(key).add(fn)
  return () => listeners.get(key)?.delete(fn)
}

// Xoá TOÀN BỘ run + hủy stream đang chạy nền. GỌI KHI ĐĂNG XUẤT để không rò rỉ
// phân tích của người dùng trước sang người dùng sau (store sống ở cấp module).
// Hủy stream trước khi clear để callback không kịp ghi lại vào store sau khi xóa.
export function resetAllRuns() {
  for (const state of store.values()) {
    try {
      state?.abort?.()
    } catch {
      /* bỏ qua */
    }
  }
  store.clear()
}

// Hook: đăng ký state của 1 run. initial chỉ dùng lần đầu (khi key chưa tồn tại).
export function useAiRun(key, initial) {
  ensure(key, initial)
  const state = useSyncExternalStore(
    (fn) => subscribe(key, fn),
    () => store.get(key),
  )
  const patch = useCallback((p) => patchRun(key, p), [key])
  return [state, patch]
}
