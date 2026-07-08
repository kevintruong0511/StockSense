import { useState } from 'react'
import { Mail, Lock, User, Eye, EyeOff, Sparkle, Check } from '../components/icons.jsx'
import { login, register } from '../data/auth.js'

const BULLETS = [
  'Bóc tách luận điểm & giả định trong báo cáo phân tích',
  'Chỉ ra red flag và rủi ro cần lưu ý',
  'So sánh doanh nghiệp cùng ngành theo chỉ số định giá',
]

export default function Auth({ mode: initialMode = 'login', onSuccess, onLogo }) {
  const [mode, setMode] = useState(initialMode) // 'login' | 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isRegister = mode === 'register'

  const switchMode = (m) => {
    setMode(m)
    setError('')
    setPassword('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const res = isRegister
        ? await register(name.trim(), email.trim(), password)
        : await login(email.trim(), password)
      onSuccess(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Panel thương hiệu (ẩn trên mobile) */}
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-slate-900 p-12 text-white lg:flex">
        <button onClick={onLogo} className="flex items-center gap-2.5 text-left">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-600 to-blue-700 text-base font-extrabold text-white">
            S
          </div>
          <span className="text-lg font-extrabold tracking-[-0.02em]">
            StockSense<span className="text-blue-400"> VN</span>
          </span>
        </button>

        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[13px] font-semibold text-blue-300">
            <Sparkle size={15} />
            Phân tích định tính bằng Claude AI
          </div>
          <h2 className="m-0 mb-6 max-w-[420px] text-[34px] font-extrabold leading-[1.2] tracking-[-0.02em]">
            Hiểu sâu doanh nghiệp trước khi xuống tiền
          </h2>
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-start gap-3 text-[15px] leading-snug text-slate-300">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
                  <Check size={13} />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <p className="m-0 max-w-[440px] text-[12.5px] leading-relaxed text-slate-500">
          Toàn bộ nội dung, gồm phần do AI tạo, chỉ mang tính tham khảo và{' '}
          <span className="text-slate-400">không phải là lời khuyên đầu tư</span>.
        </p>
      </aside>

      {/* Cột form */}
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[400px]">
          {/* logo cho mobile */}
          <button onClick={onLogo} className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-blue-600 to-blue-700 text-[15px] font-extrabold text-white">
              S
            </div>
            <span className="text-base font-extrabold tracking-[-0.02em]">
              StockSense<span className="text-blue-600"> VN</span>
            </span>
          </button>

          <h1 className="m-0 mb-1.5 text-[26px] font-extrabold tracking-[-0.02em] text-slate-900">
            {isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
          </h1>
          <p className="m-0 mb-7 text-sm text-slate-500">
            {isRegister
              ? 'Đăng ký để lưu lịch sử phân tích của bạn.'
              : 'Chào mừng trở lại — đăng nhập để tiếp tục.'}
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {isRegister && (
              <Field label="Họ tên" icon={User}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Nguyễn Văn A"
                  className="w-full border-0 bg-transparent py-3 pl-11 pr-4 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
                />
              </Field>
            )}

            <Field label="Email" icon={Mail}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="ban@email.vn"
                className="w-full border-0 bg-transparent py-3 pl-11 pr-4 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
              />
            </Field>

            <Field label="Mật khẩu" icon={Lock}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder={isRegister ? 'Tối thiểu 6 ký tự' : '••••••••'}
                className="w-full border-0 bg-transparent py-3 pl-11 pr-11 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </Field>

            {error && (
              <div className="rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-[11px] bg-blue-600 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Đang xử lý…' : isRegister ? 'Đăng ký' : 'Đăng nhập'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
            <button
              onClick={() => switchMode(isRegister ? 'login' : 'register')}
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              {isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">{label}</span>
      <div className="relative rounded-[11px] border-[1.5px] border-slate-200 bg-white transition-colors focus-within:border-blue-500">
        <Icon
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        {children}
      </div>
    </label>
  )
}
