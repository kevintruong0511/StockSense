import { useEffect, useRef, useState } from 'react'
import { Sparkle, Check, ArrowRight, InfoCircle, AlertCircle } from '../components/icons.jsx'
import { createOrder, getOrder, mockPay } from '../data/billing.js'

// Định dạng số tiền chuẩn quốc tế (en-US).
const fmt = (n) => Number(n || 0).toLocaleString('en-US')
const PLAN_NAME = { pro: 'Pro', ultra: 'Ultra' }

// Đếm ngược mm:ss từ số ms còn lại.
function fmtCountdown(ms) {
  if (ms <= 0) return '00:00'
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function Checkout({ plan = 'pro', cycle = 'monthly', onBack, onUpgraded, onNavigate }) {
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('creating') // creating | pending | paid | expired | error
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [nowTs, setNowTs] = useState(Date.now())
  const [reloadKey, setReloadKey] = useState(0)
  const pollRef = useRef(null)

  // Tạo đơn khi mở màn (hoặc khi bấm tạo lại sau khi hết hạn).
  useEffect(() => {
    let cancelled = false
    setStatus('creating')
    setErrorMsg('')
    setOrder(null)
    createOrder(plan, cycle)
      .then((o) => {
        if (cancelled) return
        setOrder(o)
        setNowTs(Date.now())
        setStatus('pending')
      })
      .catch((e) => {
        if (cancelled) return
        setErrorMsg(e?.message || 'Không tạo được đơn thanh toán.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [plan, cycle, reloadKey])

  // Đồng hồ đếm ngược (nhịp 1s) khi đang chờ thanh toán.
  useEffect(() => {
    if (status !== 'pending') return
    const id = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [status])

  // Poll trạng thái đơn mỗi 3s — khi tiền vào, SePay bắn webhook, backend đánh dấu 'paid'.
  useEffect(() => {
    if (status !== 'pending' || !order?.orderCode) return
    let stopped = false
    const check = async () => {
      try {
        const r = await getOrder(order.orderCode)
        if (stopped) return
        if (r.status === 'paid') {
          setStatus('paid')
          await onUpgraded?.()
        } else if (r.status === 'expired') {
          setStatus('expired')
        }
      } catch {
        /* bỏ qua, thử lại nhịp sau */
      }
    }
    pollRef.current = setInterval(check, 3000)
    return () => {
      stopped = true
      clearInterval(pollRef.current)
    }
  }, [status, order, onUpgraded])

  // Hết hạn theo đồng hồ đếm ngược.
  useEffect(() => {
    if (status === 'pending' && order?.expiresAt && new Date(order.expiresAt).getTime() <= nowTs) {
      setStatus('expired')
    }
  }, [nowTs, status, order])

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(order.orderCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* trình duyệt chặn clipboard — người dùng tự copy */
    }
  }

  const recheck = async () => {
    if (!order?.orderCode) return
    try {
      const r = await getOrder(order.orderCode)
      if (r.status === 'paid') {
        setStatus('paid')
        await onUpgraded?.()
      } else if (r.status === 'expired') {
        setStatus('expired')
      }
    } catch {
      /* im lặng */
    }
  }

  const doMockPay = async () => {
    if (!order?.orderCode) return
    try {
      await mockPay(order.orderCode)
      setStatus('paid')
      await onUpgraded?.()
    } catch (e) {
      setErrorMsg(e?.message || 'Giả lập thanh toán thất bại.')
    }
  }

  const planName = PLAN_NAME[plan] || plan
  const remainingMs = order?.expiresAt ? new Date(order.expiresAt).getTime() - nowTs : 0

  return (
    <div className="mx-auto w-full max-w-[860px]">
      <button
        onClick={onBack}
        className="mb-4 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        ← Quay lại bảng giá
      </button>

      <h1 className="m-0 mb-1 flex items-center gap-2 text-2xl font-extrabold tracking-[-0.02em] text-slate-900 dark:text-white">
        <Sparkle size={22} className="text-blue-600 dark:text-blue-400" />
        Thanh toán gói {planName}
      </h1>
      <p className="m-0 mb-6 text-sm text-slate-500 dark:text-slate-400">
        Quét mã QR bằng app ngân hàng để chuyển khoản — hệ thống tự nhận diện và nâng gói cho bạn.
      </p>

      {/* ĐANG TẠO ĐƠN */}
      {status === 'creating' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Đang tạo đơn thanh toán…
        </div>
      )}

      {/* LỖI TẠO ĐƠN */}
      {status === 'error' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/30 dark:bg-red-500/10">
          <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* THÀNH CÔNG */}
      {status === 'paid' && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-500/30 dark:bg-green-500/10">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/15">
            <Check size={28} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="m-0 mb-1.5 text-xl font-extrabold text-green-800 dark:text-green-300">Thanh toán thành công</h2>
          <p className="m-0 mb-5 text-sm text-green-700 dark:text-green-400">
            Tài khoản của bạn đã được nâng lên <b>gói {planName}</b>. Cảm ơn bạn đã ủng hộ!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={() => onNavigate?.('ai')}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Sparkle size={16} />
              Bắt đầu phân tích AI
            </button>
            <button
              onClick={() => onNavigate?.('dashboard')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      )}

      {/* HẾT HẠN */}
      {status === 'expired' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
            <AlertCircle size={18} />
            <span>Đơn thanh toán đã hết hạn. Vui lòng tạo đơn mới để lấy mã QR còn hiệu lực.</span>
          </div>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Tạo đơn mới
          </button>
        </div>
      )}

      {/* ĐANG CHỜ THANH TOÁN */}
      {status === 'pending' && order && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[280px_1fr]">
          {/* QR */}
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex h-[240px] w-[240px] items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white dark:border-slate-700">
              {order.qrImageUrl && order.bankAccount ? (
                <img
                  src={order.qrImageUrl}
                  alt="Mã QR thanh toán"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="px-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  Chưa cấu hình tài khoản nhận tiền (SePay). Dùng nút giả lập bên dưới để test.
                </span>
              )}
            </div>
            <div className="tnum text-[13px] text-slate-500 dark:text-slate-400">
              Hết hạn sau <b className="text-slate-800 dark:text-slate-200">{fmtCountdown(remainingMs)}</b>
            </div>
          </div>

          {/* thông tin chuyển khoản */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-end justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <div className="text-[12.5px] text-slate-500 dark:text-slate-400">Số tiền cần chuyển</div>
                <div className="tnum text-[28px] font-extrabold leading-tight text-slate-900 dark:text-white">
                  {fmt(order.amount)}₫
                </div>
              </div>
              <div className="rounded-full bg-blue-50 px-3 py-1 text-[12.5px] font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                Gói {planName} · 1 tháng
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm">
              <Row label="Ngân hàng" value={order.bankName || '—'} />
              <Row label="Chủ tài khoản" value={order.accountName || '—'} />
              <Row label="Số tài khoản" value={order.bankAccount || 'Chưa cấu hình'} />
              <div>
                <dt className="text-[12.5px] text-slate-500 dark:text-slate-400">Nội dung chuyển khoản</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <code className="rounded-md bg-slate-100 px-2.5 py-1.5 text-[15px] font-bold tracking-wide text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                    {order.orderCode}
                  </code>
                  <button
                    onClick={copyContent}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {copied ? 'Đã chép' : 'Chép'}
                  </button>
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              <InfoCircle size={15} className="mt-px flex-none" />
              <span>
                Chuyển <b>đúng số tiền</b> và giữ <b>đúng nội dung</b> ở trên để hệ thống tự khớp giao
                dịch. Trang này sẽ tự cập nhật khi nhận được thanh toán.
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button
                onClick={recheck}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Tôi đã chuyển khoản <ArrowRight size={15} />
              </button>
              {order.mockPay && (
                <button
                  onClick={doMockPay}
                  className="rounded-lg border border-dashed border-violet-400 px-3.5 py-2.5 text-[13px] font-semibold text-violet-600 hover:bg-violet-50 dark:border-violet-500/50 dark:text-violet-400 dark:hover:bg-violet-500/10"
                  title="Chỉ hiện ở môi trường dev để test"
                >
                  Giả lập thanh toán (dev)
                </button>
              )}
            </div>
            {errorMsg && <div className="mt-2 text-[13px] font-medium text-red-600 dark:text-red-400">{errorMsg}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[12.5px] text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right text-[13.5px] font-semibold text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  )
}
