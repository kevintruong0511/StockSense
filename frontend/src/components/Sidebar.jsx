import { Grid, LineChart, Compare, Upload, HistoryIcon, Sparkle, LogOut } from './icons.jsx'

const NAV = [
  { key: 'dashboard', label: 'Trang chủ', Icon: Grid },
  { key: 'detail', label: 'Chi tiết mã', Icon: LineChart },
  { key: 'compare', label: 'So sánh ngành', Icon: Compare },
  { key: 'upload', label: 'Phân tích báo cáo', Icon: Upload },
  { key: 'history', label: 'Lịch sử phân tích', Icon: HistoryIcon },
]

// Lấy 2 ký tự viết tắt từ tên để làm avatar.
function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'NĐ'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Sidebar({ screen, onNavigate, onLogo, user, onLogout }) {
  return (
    <aside className="sticky top-0 flex h-screen w-[236px] flex-none flex-col bg-slate-900 text-slate-300">
      {/* logo */}
      <button onClick={onLogo} className="flex items-center gap-2.5 px-5 pb-[22px] pt-5 text-left">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-[15px] font-extrabold text-white">
          S
        </div>
        <span className="text-base font-extrabold tracking-[-0.02em] text-white">
          StockSense<span className="text-blue-400"> VN</span>
        </span>
      </button>

      {/* nav */}
      <nav className="flex flex-col gap-[3px] px-3 py-1">
        {NAV.map(({ key, label, Icon }) => {
          const active = screen === key
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={
                'flex items-center gap-[11px] rounded-[9px] px-3 py-2.5 text-left text-sm font-semibold transition-colors ' +
                (active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white')
              }
            >
              <Icon size={18} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* footer: Pro card + user */}
      <div className="mt-auto p-3.5">
        <div className="rounded-xl border border-blue-600/25 bg-blue-600/10 p-3.5">
          <div className="mb-1.5 flex items-center gap-2 text-[12.5px] font-bold text-blue-300">
            <Sparkle size={15} />
            Gói Pro
          </div>
          <p className="m-0 mb-2.5 text-xs leading-relaxed text-slate-400">
            Phân tích AI không giới hạn + xuất PDF
          </p>
          <button className="w-full rounded-lg bg-blue-600 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-blue-700">
            Nâng cấp
          </button>
        </div>
        <div className="flex items-center gap-2.5 px-1 pt-3">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-700 text-[13px] font-bold text-white">
            {initials(user?.name)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-semibold text-white">
              {user?.name || 'Nhà đầu tư'}
            </div>
            <div className="truncate text-[11.5px] text-slate-500">{user?.email || ''}</div>
          </div>
          <button
            onClick={onLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="flex-none rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  )
}
