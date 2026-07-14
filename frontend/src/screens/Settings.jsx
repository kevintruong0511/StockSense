import { useState } from 'react'
import { User, Mail, Lock, Users, Check, Eye, EyeOff } from '../components/icons.jsx'
import { updateProfile, changePassword } from '../data/auth.js'

// Viết tắt tên → avatar.
function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'NĐ'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Email hỗ trợ — CHỦ SẢN PHẨM đổi lại cho đúng địa chỉ thật.
const SUPPORT_EMAIL = 'support@stocksense.vn'

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">{label}</span>
      <div className="relative rounded-[11px] border-[1.5px] border-slate-200 bg-white transition-colors focus-within:border-blue-500">
        {Icon && (
          <Icon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        )}
        {children}
      </div>
    </label>
  )
}

const inputCls = (hasIcon) =>
  `w-full border-0 bg-transparent py-3 ${hasIcon ? 'pl-11' : 'pl-4'} pr-4 text-[15px] text-slate-900 outline-none placeholder:text-slate-400`

// Banner thông báo (thành công / lỗi).
function Notice({ type, children }) {
  if (!children) return null
  const ok = type === 'ok'
  return (
    <div
      className={
        'rounded-[10px] border px-3.5 py-2.5 text-[13px] font-medium ' +
        (ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-600')
      }
    >
      {children}
    </div>
  )
}

function PanelHeader({ title, desc }) {
  return (
    <div className="mb-5">
      <h2 className="m-0 text-[19px] font-bold tracking-[-0.01em]">{title}</h2>
      {desc && <p className="m-0 mt-1 text-[13px] text-slate-500">{desc}</p>}
    </div>
  )
}

// ── Panel: Tài khoản ─────────────────────────────────────────────────────────
function AccountPanel({ user, onUserUpdate }) {
  const [name, setName] = useState(user?.name || '')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState(null)

  const saveName = async (e) => {
    e.preventDefault()
    if (savingName) return
    setNameMsg(null)
    const trimmed = name.trim()
    if (trimmed.length < 2) return setNameMsg({ type: 'err', text: 'Tên phải có ít nhất 2 ký tự.' })
    if (trimmed === user?.name) return setNameMsg({ type: 'ok', text: 'Không có thay đổi nào.' })
    setSavingName(true)
    try {
      const res = await updateProfile(trimmed)
      onUserUpdate?.(res.user)
      setNameMsg({ type: 'ok', text: 'Đã cập nhật tên hiển thị.' })
    } catch (err) {
      setNameMsg({ type: 'err', text: err.message })
    } finally {
      setSavingName(false)
    }
  }

  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)

  const savePw = async (e) => {
    e.preventDefault()
    if (savingPw) return
    setPwMsg(null)
    if (newPw.length < 6) return setPwMsg({ type: 'err', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' })
    if (newPw !== confirmPw) return setPwMsg({ type: 'err', text: 'Xác nhận mật khẩu không khớp.' })
    setSavingPw(true)
    try {
      await changePassword(curPw, newPw)
      setCurPw('')
      setNewPw('')
      setConfirmPw('')
      setPwMsg({ type: 'ok', text: 'Đã đổi mật khẩu thành công.' })
    } catch (err) {
      setPwMsg({ type: 'err', text: err.message })
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <PanelHeader title="Thông tin tài khoản" desc="Cập nhật tên hiển thị của bạn." />
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
            {initials(user?.name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900">{user?.name || 'Nhà đầu tư'}</div>
            <div className="truncate text-[12.5px] text-slate-500">{user?.email}</div>
          </div>
        </div>

        <form onSubmit={saveName} className="flex flex-col gap-3">
          <Field label="Tên hiển thị" icon={User}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              className={inputCls(true)}
            />
          </Field>
          <Field label="Email (không thể đổi)" icon={Mail}>
            <input type="email" value={user?.email || ''} disabled className={inputCls(true) + ' text-slate-400'} />
          </Field>
          <Notice type={nameMsg?.type}>{nameMsg?.text}</Notice>
          <div>
            <button
              type="submit"
              disabled={savingName}
              className="rounded-[11px] bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingName ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <PanelHeader title="Đổi mật khẩu" desc="Nên dùng mật khẩu đủ mạnh và không trùng nơi khác." />
        <form onSubmit={savePw} className="flex flex-col gap-3">
          <Field label="Mật khẩu hiện tại" icon={Lock}>
            <input
              type={showPw ? 'text' : 'password'}
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputCls(true) + ' pr-11'}
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mật khẩu mới" icon={Lock}>
              <input
                type={showPw ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                placeholder="Tối thiểu 6 ký tự"
                className={inputCls(true)}
              />
            </Field>
            <Field label="Xác nhận mật khẩu mới" icon={Lock}>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu mới"
                className={inputCls(true)}
              />
            </Field>
          </div>
          <Notice type={pwMsg?.type}>{pwMsg?.text}</Notice>
          <div>
            <button
              type="submit"
              disabled={savingPw}
              className="rounded-[11px] bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingPw ? 'Đang đổi…' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

// ── Panel: Liên hệ ───────────────────────────────────────────────────────────
function ContactPanel({ onNavigate }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <PanelHeader title="Liên hệ & hỗ trợ" desc="Cần trợ giúp hoặc muốn góp ý? Liên hệ với chúng tôi." />
      <div className="flex flex-wrap gap-3">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="inline-flex items-center gap-2 rounded-[11px] border-[1.5px] border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <Mail size={17} className="text-blue-600" />
          {SUPPORT_EMAIL}
        </a>
        <button
          onClick={() => onNavigate?.('community')}
          className="inline-flex items-center gap-2 rounded-[11px] border-[1.5px] border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <Users size={17} className="text-blue-600" />
          Hỏi trong Cộng Đồng
        </button>
      </div>
    </section>
  )
}

// ── Panel: Giao diện ─────────────────────────────────────────────────────────
function AppearancePanel() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <PanelHeader title="Giao diện" desc="Chọn chế độ hiển thị của ứng dụng." />
      <div className="grid gap-3 sm:grid-cols-3">
        <ChoiceCard label="Sáng" hint="Mặc định" active />
        <ChoiceCard label="Tối" hint="Sắp ra mắt" soon />
        <ChoiceCard label="Theo hệ thống" hint="Sắp ra mắt" soon />
      </div>
    </section>
  )
}

// ── Panel: Ngôn ngữ ──────────────────────────────────────────────────────────
function LanguagePanel() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <PanelHeader title="Ngôn ngữ" desc="Ngôn ngữ hiển thị của giao diện." />
      <div className="grid gap-3 sm:grid-cols-2">
        <ChoiceCard label="Tiếng Việt" hint="Đang dùng" active />
        <ChoiceCard label="English" hint="Sắp ra mắt" soon />
      </div>
    </section>
  )
}

// Mục con (Tài khoản/Liên hệ/Giao diện/Ngôn ngữ) được chọn qua menu xổ xuống "Cài đặt"
// ở Sidebar — `tab`/`onTabChange` được App.jsx nâng state lên để đồng bộ với đó.
export default function Settings({ user, onUserUpdate, onNavigate, tab = 'account' }) {
  return (
    <div className="mx-auto max-w-[720px]">
      {tab === 'account' && <AccountPanel user={user} onUserUpdate={onUserUpdate} />}
      {tab === 'contact' && <ContactPanel onNavigate={onNavigate} />}
      {tab === 'appearance' && <AppearancePanel />}
      {tab === 'language' && <LanguagePanel />}
    </div>
  )
}

// Thẻ lựa chọn (giao diện / ngôn ngữ). active = đang chọn; soon = chưa mở (khoá).
function ChoiceCard({ label, hint, active, soon }) {
  return (
    <div
      className={
        'flex items-center justify-between rounded-xl border-[1.5px] px-4 py-3 ' +
        (active
          ? 'border-blue-500 bg-blue-50'
          : soon
            ? 'border-slate-200 bg-slate-50 opacity-70'
            : 'border-slate-200 bg-white')
      }
    >
      <div>
        <div className="text-sm font-bold text-slate-900">{label}</div>
        <div className="text-[12px] text-slate-500">{hint}</div>
      </div>
      {active ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
          <Check size={13} />
        </span>
      ) : soon ? (
        <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
          Sắp có
        </span>
      ) : null}
    </div>
  )
}
