import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import Landing from './screens/Landing.jsx'
import Auth from './screens/Auth.jsx'
import Dashboard from './screens/Dashboard.jsx'
import StockDetail from './screens/StockDetail.jsx'
import Compare from './screens/Compare.jsx'
import Upload from './screens/Upload.jsx'
import History from './screens/History.jsx'
import { STOCKS, aiSource } from './data/stocks.js'
import { getToken, setToken, clearToken, fetchMe } from './data/auth.js'

const ADD_POOL = ['MWG', 'VNM', 'VCB', 'HPG']
// Các màn yêu cầu đăng nhập.
const PROTECTED = ['dashboard', 'detail', 'compare', 'upload', 'history']

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [ticker, setTicker] = useState('FPT')
  const [tab, setTab] = useState('overview')
  const [tf, setTf] = useState('1M')
  const [query, setQuery] = useState('')
  const [aiText, setAiText] = useState('')
  const [aiStatus, setAiStatus] = useState('idle')
  const [compare, setCompare] = useState(['FPT', 'CMG', 'ELC'])
  const [upload, setUpload] = useState('idle')
  const [histFilter, setHistFilter] = useState('all')
  const [newsState, setNewsState] = useState('ready')

  // ---------- AI streaming simulation ----------
  const aiRef = useRef(null)
  const startAI = useCallback((tk) => {
    if (aiRef.current) clearInterval(aiRef.current)
    const full = aiSource(tk)
    setAiText('')
    setAiStatus('streaming')
    let i = 0
    aiRef.current = setInterval(() => {
      i += 4
      if (i >= full.length) {
        clearInterval(aiRef.current)
        aiRef.current = null
        setAiText(full)
        setAiStatus('done')
      } else {
        setAiText(full.slice(0, i))
      }
    }, 22)
  }, [])
  useEffect(() => () => aiRef.current && clearInterval(aiRef.current), [])

  // Khôi phục phiên từ token đã lưu, rồi áp deep-link: ?screen=detail&ticker=HPG
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

      const p = new URLSearchParams(window.location.search)
      const s = p.get('screen')
      const t = (p.get('ticker') || '').toUpperCase()
      const valid = ['landing', 'dashboard', 'detail', 'compare', 'upload', 'history']
      const tk = STOCKS[t] ? t : 'FPT'
      if (STOCKS[t]) setTicker(t)
      // Chỉ mở màn cần đăng nhập khi phiên hợp lệ; nếu không sẽ về màn đăng nhập.
      if (s && valid.includes(s) && (restored || !PROTECTED.includes(s))) {
        setScreen(s)
        if (s === 'detail') startAI(tk)
      }
      setAuthChecked(true)
    }
    boot()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- navigation ----------
  const go = useCallback((s) => {
    setScreen(s)
    setQuery('')
  }, [])

  const selectTicker = useCallback(
    (t) => {
      setTicker(t)
      setScreen('detail')
      setTab('overview')
      setQuery('')
      startAI(t)
    },
    [startAI],
  )

  const goDetail = useCallback(() => {
    setScreen('detail')
    setTab('overview')
    setQuery('')
    startAI(ticker)
  }, [ticker, startAI])

  const onNavigate = useCallback(
    (key) => (key === 'detail' ? goDetail() : go(key)),
    [goDetail, go],
  )

  // ---------- auth ----------
  // Chặn hành động vào app khi chưa đăng nhập: chuyển sang màn đăng nhập.
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

  // ---------- misc handlers ----------
  const retryNews = useCallback(() => {
    setNewsState('loading')
    setTimeout(() => setNewsState('ready'), 1200)
  }, [])

  const startUpload = useCallback(() => {
    setUpload('loading')
    setTimeout(() => setUpload('done'), 2400)
  }, [])

  const addCompare = useCallback(() => {
    setCompare((prev) => {
      const avail = ADD_POOL.find((t) => !prev.includes(t))
      return avail && prev.length < 4 ? [...prev, avail] : prev
    })
  }, [])

  const openHistory = useCallback(
    (item) => {
      if (item.cat === 'report') go('upload')
      else if (item.cat === 'compare') go('compare')
      else selectTicker(item.code)
    },
    [go, selectTicker],
  )

  // ---------- autocomplete ----------
  const q = query.trim().toUpperCase()
  const autoResults = q
    ? Object.keys(STOCKS)
        .filter((t) => t.includes(q) || STOCKS[t].name.toUpperCase().includes(q))
        .map((t) => ({ code: t, name: STOCKS[t].name, exch: STOCKS[t].exch }))
    : []

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
        onStart={guard(() => selectTicker('FPT'))}
        onSelectTicker={guard(selectTicker)}
      />
    )
  }

  // ---------- màn đăng nhập / đăng ký ----------
  // Yêu cầu đăng nhập cho mọi màn trong app: chưa có user thì luôn hiện Auth.
  if (screen === 'auth' || (PROTECTED.includes(screen) && !user)) {
    return <Auth onSuccess={onAuthSuccess} onLogo={() => go('landing')} />
  }

  // ---------- app shell ----------
  return (
    <div className="flex min-h-screen">
      <Sidebar
        screen={screen}
        onNavigate={onNavigate}
        onLogo={() => go('landing')}
        user={user}
        onLogout={onLogout}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar
          query={query}
          onQuery={setQuery}
          autoResults={autoResults}
          onSelectTicker={selectTicker}
        />

        <div className="flex-1 px-8 pb-12 pt-7">
          {screen === 'dashboard' && (
            <Dashboard onSelectTicker={selectTicker} newsState={newsState} onRetryNews={retryNews} />
          )}
          {screen === 'detail' && (
            <StockDetail
              ticker={ticker}
              tab={tab}
              onTab={setTab}
              tf={tf}
              onTf={setTf}
              aiText={aiText}
              aiStatus={aiStatus}
              onReanalyze={() => startAI(ticker)}
              onGoDashboard={() => go('dashboard')}
              onGoCompare={() => go('compare')}
            />
          )}
          {screen === 'compare' && (
            <Compare
              compare={compare}
              onRemove={(t) => setCompare((prev) => prev.filter((x) => x !== t))}
              onAdd={addCompare}
              canAdd={compare.length < 4}
            />
          )}
          {screen === 'upload' && (
            <Upload uploadState={upload} onStart={startUpload} onReset={() => setUpload('idle')} />
          )}
          {screen === 'history' && (
            <History histFilter={histFilter} onFilter={setHistFilter} onOpen={openHistory} />
          )}
        </div>
      </main>
    </div>
  )
}
