import { useCallback, useEffect, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import Landing from './screens/Landing.jsx'
import Auth from './screens/Auth.jsx'
import Dashboard from './screens/Dashboard.jsx'
import { getToken, setToken, clearToken, fetchMe } from './data/auth.js'

// Ứng dụng đã rút gọn còn 2 màn: Landing (công khai) + Dashboard (cần đăng nhập).
const PROTECTED = ['dashboard']

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [newsState, setNewsState] = useState('ready')

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
      const valid = ['landing', 'dashboard']
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

  // ---------- navigation ----------
  const go = useCallback((s) => setScreen(s), [])

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
        onStart={guard(() => go('dashboard'))}
        onSelectTicker={guard(() => go('dashboard'))}
      />
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
        onLogout={onLogout}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="flex-1 px-8 pb-12 pt-7">
          <Dashboard newsState={newsState} onRetryNews={retryNews} />
        </div>
      </main>
    </div>
  )
}
