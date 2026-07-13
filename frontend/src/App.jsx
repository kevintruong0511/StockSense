import { useCallback, useEffect, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import Landing from './screens/Landing.jsx'
import Auth from './screens/Auth.jsx'
import Dashboard from './screens/Dashboard.jsx'
import AiAnalysis from './screens/AiAnalysis.jsx'
import Portfolio from './screens/Portfolio.jsx'
import Pricing from './screens/Pricing.jsx'
import Checkout from './screens/Checkout.jsx'
import { getToken, setToken, clearToken, fetchMe } from './data/auth.js'
import { fetchAiStatus } from './data/ai.js'
import { getBillingStatus } from './data/billing.js'

// Màn cần đăng nhập: Dashboard + Phân tích AI + Danh mục + Thanh toán. Landing công khai.
const PROTECTED = ['dashboard', 'ai', 'portfolio', 'checkout']

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [newsState, setNewsState] = useState('ready')
  const [aiEnabled, setAiEnabled] = useState(false)
  const [billing, setBilling] = useState(null) // { plan, planExpiresAt, usage:{...} }
  const [checkout, setCheckout] = useState({ plan: 'pro', cycle: 'monthly' })

  // Khôi phục phiên từ token đã lưu, rồi áp deep-link: ?screen=dashboard
  useEffect(() => {
    let cancelled = false
    async function boot() {
      let restored = null
      if (getToken()) {
        try {
          const { user: u } = await fetchMe()
          restored = u
        } catch {
          clearToken() // token hỏng/hết hạn
        }
      }
      if (cancelled) return
      if (restored) setUser(restored)

      const s = new URLSearchParams(window.location.search).get('screen')
      const valid = ['landing', 'dashboard', 'ai', 'portfolio', 'pricing', 'checkout']
      // Chỉ mở màn cần đăng nhập khi phiên hợp lệ; nếu không sẽ về màn đăng nhập.
      if (s && valid.includes(s) && (restored || !PROTECTED.includes(s))) {
        setScreen(s)
      }
      setAuthChecked(true)
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [])

  // Kiểm tra tính năng AI có bật ở backend không (để ẩn/hiện đúng trạng thái).
  useEffect(() => {
    if (!user) {
      setAiEnabled(false)
      return
    }
    let cancelled = false
    fetchAiStatus()
      .then((s) => !cancelled && setAiEnabled(Boolean(s?.enabled)))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user])

  // ---------- gói cước & hạn mức ----------
  const refreshBilling = useCallback(async () => {
    try {
      setBilling(await getBillingStatus())
    } catch {
      /* im lặng — badge lượt chỉ là phụ trợ */
    }
  }, [])

  // Đồng bộ lại user (để có plan mới sau khi nâng cấp) + hạn mức.
  const refreshUser = useCallback(async () => {
    try {
      const { user: u } = await fetchMe()
      setUser(u)
    } catch {
      /* giữ nguyên user hiện tại nếu lỗi */
    }
  }, [])

  const onUpgraded = useCallback(async () => {
    await Promise.all([refreshUser(), refreshBilling()])
  }, [refreshUser, refreshBilling])

  // Nạp hạn mức mỗi khi có phiên đăng nhập; xoá khi đăng xuất.
  useEffect(() => {
    if (!user) {
      setBilling(null)
      return
    }
    refreshBilling()
  }, [user, refreshBilling])

  // ---------- navigation ----------
  const go = useCallback((s) => setScreen(s), [])

  // Mở màn thanh toán cho 1 gói + chu kỳ.
  const goCheckout = useCallback((plan, cycle = 'monthly') => {
    setCheckout({ plan, cycle })
    setScreen('checkout')
  }, [])

  // Chặn vào màn cần đăng nhập khi chưa có phiên → chuyển sang màn đăng nhập.
  const guard = useCallback(
    (fn) =>
      (...args) => {
        if (user) fn(...args)
        else go('auth')
      },
    [user, go],
  )

  const onAuthSuccess = useCallback(({ token, user: u }) => {
    setToken(token)
    setUser(u)
    setScreen('dashboard')
  }, [])

  const onLogout = useCallback(() => {
    clearToken()
    setUser(null)
    setScreen('landing')
  }, [])

  const retryNews = useCallback(() => {
    setNewsState('loading')
    setTimeout(() => setNewsState('ready'), 1200)
  }, [])

  // ---------- splash trong lúc khôi phục phiên ----------
  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-2.5 text-slate-400">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-[15px] font-extrabold text-white">
            S
          </div>
          <span className="text-sm font-semibold">Đang tải…</span>
        </div>
      </div>
    )
  }

  // ---------- landing (công khai) ----------
  if (screen === 'landing') {
    return (
      <Landing
        onLogin={() => go('auth')}
        onPricing={() => go('pricing')}
        onStart={guard(() => go('dashboard'))}
        onSelectTicker={guard(() => go('dashboard'))}
      />
    )
  }

  // ---------- bảng giá (công khai cho khách; bản trong app ở app shell) ----------
  if (screen === 'pricing' && !user) {
    return (
      <Pricing variant="guest" currentPlan="free" onBack={() => go('landing')} onLogin={() => go('auth')} />
    )
  }

  // ---------- màn đăng nhập / đăng ký ----------
  // Yêu cầu đăng nhập cho màn trong app: chưa có user thì luôn hiện Auth.
  if (screen === 'auth' || (PROTECTED.includes(screen) && !user)) {
    return <Auth onSuccess={onAuthSuccess} onLogo={() => go('landing')} />
  }

  // ---------- app shell ----------
  return (
    <div className="flex min-h-screen">
      <Sidebar
        screen={screen}
        onNavigate={go}
        onLogo={() => go('landing')}
        user={user}
        billing={billing}
        onLogout={onLogout}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="flex-1 px-8 pb-12 pt-7">
          {screen === 'ai' ? (
            <AiAnalysis
              aiEnabled={aiEnabled}
              billing={billing}
              onRefreshBilling={refreshBilling}
              onNavigate={go}
            />
          ) : screen === 'portfolio' ? (
            <Portfolio billing={billing} onRefreshBilling={refreshBilling} onNavigate={go} />
          ) : screen === 'checkout' ? (
            <Checkout
              plan={checkout.plan}
              cycle={checkout.cycle}
              onBack={() => go('pricing')}
              onUpgraded={onUpgraded}
              onNavigate={go}
            />
          ) : screen === 'pricing' ? (
            <Pricing
              variant="app"
              user={user}
              currentPlan={user?.plan || 'free'}
              onCheckout={goCheckout}
              onUpgraded={onUpgraded}
            />
          ) : (
            <Dashboard newsState={newsState} onRetryNews={retryNews} />
          )}
        </div>
      </main>
    </div>
  )
}
