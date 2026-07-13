import { Grid, Sparkle, Wallet, Users, LogOut } from './icons.jsx'

const NAV = [
  { key: 'dashboard', label: 'Trang chủ', Icon: Grid },
  { key: 'ai', label: 'Phân tích cổ phiếu', Icon: Sparkle },
  { key: 'portfolio', label: 'Danh mục', Icon: Wallet },
  { key: 'community', label: 'Cộng Đồng', Icon: Users },
]

// Lấy 2 ký tự viết tắt từ tên để làm avatar.
function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'NĐ'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const PLAN_LABEL = { free: 'Free', pro: 'Pro', ultra: 'Ultra' }

export default function Sidebar({ screen, onNavigate, onLogo, user, billing, onLogout }) {
  const plan = billing?.plan || user?.plan || 'free'
  const usage = billing?.usage
  const isUltra = plan === 'ultra'
  const quotaText = usage
    ? usage.unlimited
      ? 'Không giới hạn lượt AI'
      : `Còn ${usage.remaining}/${usage.limit} lượt AI hôm nay`
    : ''
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

      {/* footer: thẻ gói + user */}
      <div className="mt-auto p-3.5">
        <div
          className={
            'rounded-xl border p-3.5 ' +
            (isUltra ? 'border-violet-500/30 bg-violet-500/10' : 'border-blue-600/25 bg-blue-600/10')
          }
        >
          <div
            className={
              'mb-1.5 flex items-center gap-2 text-[12.5px] font-bold ' +
              (isUltra ? 'text-violet-300' : 'text-blue-300')
            }
          >
            <Sparkle size={15} />
            Gói {PLAN_LABEL[plan] || 'Free'}
          </div>
          <p className="m-0 mb-2.5 text-xs leading-relaxed text-slate-400">
            {quotaText || 'Phân tích cổ phiếu có AI hỗ trợ'}
          </p>
          {isUltra ? (
            <div className="rounded-lg bg-violet-500/15 py-2 text-center text-[12.5px] font-semibold text-violet-200">
              Đang dùng gói cao nhất ✦
            </div>
          ) : (
            <button
              onClick={() => onNavigate('pricing')}
              className="w-full rounded-lg bg-blue-600 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Nâng cấp
            </button>
          )}
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
