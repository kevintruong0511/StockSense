import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import Landing from './screens/Landing.jsx'
import Auth from './screens/Auth.jsx'
import Dashboard from './screens/Dashboard.jsx'
import AiAnalysis from './screens/AiAnalysis.jsx'
import Portfolio from './screens/Portfolio.jsx'
import Community from './screens/Community.jsx'
import Guide from './screens/Guide.jsx'
import Pricing from './screens/Pricing.jsx'
import Checkout from './screens/Checkout.jsx'
import { getToken, setToken, clearToken, fetchMe } from './data/auth.js'
import { fetchAiStatus } from './data/ai.js'
import { getBillingStatus } from './data/billing.js'
import { resetAllRuns } from './data/aiRunStore.js'

// Màn cần đăng nhập: Dashboard + Phân tích cổ phiếu + Danh mục + Cộng Đồng + Hướng dẫn + Thanh toán. Landing công khai.
const PROTECTED = ['dashboard', 'ai', 'portfolio', 'community', 'guide', 'checkout']

const VALID_SCREENS = ['landing', 'dashboard', 'ai', 'portfolio', 'community', 'guide', 'pricing', 'checkout']
// Nhớ màn hình cuối để mở lại tab không văng về landing. KHÔNG nhớ các màn tạm
// (auth: đang đăng nhập; checkout: đang thanh toán dở) — mở lại nên về app chính.
const SCREEN_KEY = 'stocksense.screen'
const REMEMBERED_SCREENS = ['dashboard', 'ai', 'portfolio', 'community', 'guide', 'pricing']

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [bootError, setBootError] = useState(false)
  const [newsState, setNewsState] = useState('ready')
  const [aiEnabled, setAiEnabled] = useState(false)
  const [billing, setBilling] = useState(null) // { plan, planExpiresAt, usage:{...} }
  const [checkout, setCheckout] = useState({ plan: 'pro', cycle: 'monthly' })
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register' cho màn Auth

  // Khôi phục phiên từ token đã lưu, rồi áp deep-link: ?screen=dashboard
  // requestId chặn race khi boot() được gọi lại (nút "Thử lại") trong lúc lần gọi trước chưa xong.
  const bootRequestRef = useRef(0)
  const boot = useCallback(async () => {
    const requestId = ++bootRequestRef.current
    setBootError(false)
    let restored = null
    if (getToken()) {
      try {
        const { user: u } = await fetchMe()
        restored = u
      } catch (err) {
        if (bootRequestRef.current !== requestId) return
        if (err.status === 401) {
          clearToken() // token thật sự sai/hết hạn — chỉ xoá trong trường hợp này
        } else {
          // Lỗi tạm thời (mất mạng, backend cold start, lỗi máy chủ...) — GIỮ token,
          // không đá người dùng ra ngoài; hiện màn "thử lại" thay vì Auth.
          setBootError(true)
          return
        }
      }
    }
    if (bootRequestRef.current !== requestId) return
    if (restored) setUser(restored)

    // Ưu tiên deep-link ?screen=…, sau đó là màn đã nhớ trong localStorage.
    const fromUrl = new URLSearchParams(window.location.search).get('screen')
    const saved = localStorage.getItem(SCREEN_KEY)
    const candidate =
      fromUrl && VALID_SCREENS.includes(fromUrl)
        ? fromUrl
        : saved && VALID_SCREENS.includes(saved)
          ? saved
          : null

    if (candidate && (restored || !PROTECTED.includes(candidate))) {
      setScreen(candidate)
    } else if (restored) {
      // Có phiên hợp lệ nhưng không rõ màn đích → vào thẳng app thay vì landing.
      setScreen('dashboard')
    }
    setAuthChecked(true)
  }, [])

  // Nhớ màn hình hiện tại (sau khi đã khôi phục xong) để mở lại tab quay về đúng chỗ.
  useEffect(() => {
    if (!authChecked) return
    if (REMEMBERED_SCREENS.includes(screen)) localStorage.setItem(SCREEN_KEY, screen)
  }, [screen, authChecked])

  useEffect(() => {
    boot()
  }, [boot])

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

  // Mở màn đăng nhập/đăng ký ở đúng chế độ (login mặc định, register khi khách bấm "Đăng ký").
  const goAuth = useCallback((mode = 'login') => {
    setAuthMode(mode)
    setScreen('auth')
  }, [])

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
    localStorage.removeItem(SCREEN_KEY)
    resetAllRuns() // xóa phân tích AI đang giữ trong store + hủy stream nền, tránh rò rỉ sang phiên khác
    setUser(null)
    setScreen('landing')
  }, [])

  const retryNews = useCallback(() => {
    setNewsState('loading')
    setTimeout(() => setNewsState('ready'), 1200)
  }, [])

  // ---------- lỗi tạm thời khi khôi phục phiên (mất mạng/backend cold start) ----------
  if (!authChecked && bootError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-base font-extrabold text-white">
            S
          </div>
          <p className="text-sm font-medium text-slate-600">
            Không thể kết nối tới máy chủ. Phiên đăng nhập của bạn vẫn còn hiệu lực — vui lòng thử lại.
          </p>
          <button
            type="button"
            onClick={boot}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

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
        onLogin={() => goAuth('login')}
        onRegister={() => goAuth('register')}
        onPricing={() => go('pricing')}
        onStart={() => (user ? go('dashboard') : goAuth('register'))}
        onSelectTicker={() => (user ? go('dashboard') : goAuth('register'))}
      />
    )
  }

  // ---------- bảng giá (công khai cho khách; bản trong app ở app shell) ----------
  if (screen === 'pricing' && !user) {
    return (
      <Pricing variant="guest" currentPlan="free" onBack={() => go('landing')} onLogin={() => goAuth('login')} />
    )
  }

  // ---------- màn đăng nhập / đăng ký ----------
  // Yêu cầu đăng nhập cho màn trong app: chưa có user thì luôn hiện Auth.
  if (screen === 'auth' || (PROTECTED.includes(screen) && !user)) {
    return <Auth mode={authMode} onSuccess={onAuthSuccess} onLogo={() => go('landing')} />
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
          ) : screen === 'community' ? (
            <Community user={user} />
          ) : screen === 'guide' ? (
            <Guide onNavigate={go} />
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
            <Dashboard
              user={user}
              newsState={newsState}
              onRetryNews={retryNews}
              billing={billing}
              onRefreshBilling={refreshBilling}
              onNavigate={go}
            />
          )}
        </div>
      </main>
    </div>
  )
}
