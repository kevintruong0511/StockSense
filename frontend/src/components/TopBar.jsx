import { Bell } from './icons.jsx'

// Thanh trên cùng của khu vực app. Ô tìm kiếm cũ chỉ để mở màn Chi tiết mã
// (đã bỏ) nên đã lược đi — chỉ còn chỉ số VN-Index và chuông thông báo.
export default function TopBar() {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-slate-100/85 px-8 py-3.5 backdrop-blur">
      <div className="ml-auto flex items-center gap-2">
        <div className="tnum flex items-center gap-1.5 rounded-[9px] border border-slate-200 bg-white px-3 py-[7px] text-[13px] font-semibold">
          <span className="text-slate-500">VN-Index</span>
          <span>1.284,7</span>
          <span className="text-green-600">+0,84%</span>
        </div>
        <button className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50">
          <Bell size={18} />
        </button>
      </div>
    </div>
  )
}
