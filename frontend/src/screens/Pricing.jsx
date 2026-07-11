import { useState } from 'react'
import { Sparkle, Check, ArrowRight, InfoCircle, Search, BarChart3 } from '../components/icons.jsx'
import { redeemCode } from '../data/billing.js'

// Định dạng số tiền kiểu Việt Nam (ngăn cách nghìn bằng dấu chấm).
const fmt = (n) => n.toLocaleString('vi-VN')

// 3 gói: Free / Pro (99k) / Ultra (299k). Giá trả năm giảm 20% (giá/tháng khi trả năm).
// Triết lý sản phẩm: tập trung chiều sâu phân tích định tính, KHÔNG có tín hiệu mua/bán.
const PLANS = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'Bắt đầu nghiên cứu cổ phiếu',
    monthly: 0,
    annualPerMonth: 0,
    Icon: Search,
    accent: {
      icon: 'text-slate-600',
      iconBg: 'bg-slate-100',
      card: 'border-slate-200',
      price: 'text-slate-900',
      btn: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    },
    features: [
      'Giá & biểu đồ nến thời gian thực',
      'Tổng quan thị trường & tin tức',
      '2 lượt phân tích AI mỗi ngày',
      'Chỉ số định giá cơ bản (P/E, P/B, ROE)',
      'So sánh tối đa 2 mã cùng ngành',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    tagline: 'Cho nhà đầu tư nghiêm túc',
    monthly: 99000,
    annualPerMonth: 79000,
    popular: true,
    Icon: Sparkle,
    accent: {
      icon: 'text-blue-600',
      iconBg: 'bg-blue-50',
      card: 'border-blue-600 ring-2 ring-blue-600/50',
      price: 'text-slate-900',
      btn: 'bg-blue-600 text-white hover:bg-blue-700',
    },
    features: [
      'Mọi thứ trong gói Free',
      '15 lượt phân tích AI mỗi ngày',
      'Model AI cao cấp, phân tích nâng cao',
      'Xuất báo cáo phân tích ra PDF',
      'Tải lên & tóm tắt BCTC (PDF)',
      'So sánh mã cùng ngành không giới hạn',
      'Cảnh báo giá & red flag',
      'Lưu lịch sử phân tích không giới hạn',
    ],
  },
  {
    key: 'ultra',
    name: 'Ultra',
    tagline: 'Chiều sâu cấp chuyên nghiệp',
    monthly: 299000,
    annualPerMonth: 239000,
    Icon: BarChart3,
    accent: {
      icon: 'text-violet-600',
      iconBg: 'bg-violet-50',
      card: 'border-violet-200',
      price: 'text-slate-900',
      btn: 'bg-violet-600 text-white hover:bg-violet-700',
    },
    features: [
      'Mọi thứ trong gói Pro',
      'Phân tích AI không giới hạn',
      'Model AI mạnh nhất (deep research)',
      'Phân tích chuyên sâu ngành + vĩ mô',
      'Truy cập API dữ liệu',
      'Ưu tiên xử lý (hàng đợi nhanh)',
      'Nhiều danh mục theo dõi',
      'Hỗ trợ ưu tiên 1-1',
    ],
  },
]

// Bảng so sánh chi tiết. Giá trị true/false render dấu tích / gạch ngang.
const COMPARE = [
  { label: 'Giá & biểu đồ nến thời gian thực', free: true, pro: true, ultra: true },
  { label: 'Tổng quan thị trường & tin tức', free: true, pro: true, ultra: true },
  { label: 'Lượt phân tích AI', free: '2 / ngày', pro: '15 / ngày', ultra: 'Không giới hạn' },
  { label: 'Chiều sâu phân tích', free: 'Cơ bản', pro: 'Nâng cao', ultra: 'Chuyên sâu + vĩ mô' },
  { label: 'Model AI', free: 'Tiêu chuẩn', pro: 'Cao cấp', ultra: 'Mạnh nhất (deep research)' },
  { label: 'Xuất báo cáo PDF', free: false, pro: true, ultra: true },
  { label: 'Tải lên & tóm tắt BCTC', free: false, pro: true, ultra: true },
  { label: 'So sánh mã cùng ngành', free: '2 mã', pro: 'Không giới hạn', ultra: 'Không giới hạn' },
  { label: 'Cảnh báo giá & red flag', free: false, pro: true, ultra: 'Nâng cao' },
  { label: 'Lịch sử phân tích', free: '7 ngày', pro: 'Không giới hạn', ultra: 'Không giới hạn' },
  { label: 'Truy cập API dữ liệu', free: false, pro: false, ultra: true },
  { label: 'Hỗ trợ', free: 'Cộng đồng', pro: 'Email', ultra: 'Ưu tiên 1-1' },
]

const FAQ = [
  {
    q: 'Tôi có thể đổi hoặc huỷ gói bất cứ lúc nào không?',
    a: 'Có. Bạn có thể nâng, hạ hoặc huỷ gói bất cứ lúc nào; thay đổi áp dụng từ kỳ thanh toán kế tiếp, không ràng buộc dài hạn.',
  },
  {
    q: 'StockSense có đưa ra khuyến nghị mua/bán không?',
    a: 'Không. Công cụ tập trung phân tích định tính chất lượng doanh nghiệp và minh bạch nguồn dữ liệu. Mọi nội dung, kể cả do AI tạo, chỉ để tham khảo — không phải lời khuyên đầu tư.',
  },
  {
    q: 'Thanh toán bằng cách nào?',
    a: 'Quét mã QR (VietQR) bằng app ngân hàng bất kỳ để chuyển khoản. Hệ thống tự nhận diện giao dịch và nâng gói cho bạn trong vài giây, không cần thao tác thủ công. Có mã ưu đãi thì nhập ở ô "Mã ưu đãi".',
  },
]

// Ô giá trị trong bảng so sánh: boolean → tích/gạch, chuỗi → text.
function CompareCell({ value }) {
  if (value === true)
    return (
      <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
        <Check size={12} className="text-green-600" />
      </span>
    )
  if (value === false) return <span className="text-slate-300">—</span>
  return <span className="text-[13px] font-semibold text-slate-700">{value}</span>
}

// Ô nhập mã ưu đãi → gọi redeem, nâng gói ngay (vd BACUAKHANG → Ultra).
function PromoBox({ onUpgraded }) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | ok | err
  const [msg, setMsg] = useState('')

  const apply = async () => {
    const c = code.trim()
    if (!c || status === 'loading') return
    setStatus('loading')
    setMsg('')
    try {
      const r = await redeemCode(c)
      setStatus('ok')
      setMsg(r?.message || 'Đã kích hoạt gói mới.')
      await onUpgraded?.()
    } catch (e) {
      setStatus('err')
      setMsg(e?.message || 'Không áp dụng được mã ưu đãi.')
    }
  }

  return (
    <div className="mx-auto mb-6 max-w-[720px] rounded-xl border border-slate-200 bg-white px-4 py-3.5">
      <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-slate-700">
        <Sparkle size={15} className="text-violet-600" />
        Có mã ưu đãi?
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          placeholder="Nhập mã ưu đãi"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase tracking-wide text-slate-900 outline-none focus:border-violet-500"
        />
        <button
          onClick={apply}
          disabled={status === 'loading' || !code.trim()}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'loading' ? 'Đang áp dụng…' : 'Áp dụng'}
        </button>
      </div>
      {msg && (
        <div
          className={
            'mt-2 text-[13px] font-medium ' + (status === 'ok' ? 'text-green-600' : 'text-red-600')
          }
        >
          {msg}
        </div>
      )}
    </div>
  )
}

function PlanCard({ plan, annual, currentPlan, onChoose }) {
  const { Icon, accent } = plan
  const isCurrent = currentPlan === plan.key
  const price = annual ? plan.annualPerMonth : plan.monthly
  const isFree = plan.monthly === 0

  return (
    <div
      className={
        'relative flex flex-col rounded-2xl border bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,.04)] ' +
        accent.card +
        (plan.popular ? ' shadow-[0_16px_40px_rgba(37,99,235,.16)]' : '')
      }
    >
      {plan.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.06em] text-white shadow-sm">
          Phổ biến nhất
        </span>
      )}

      {/* header gói */}
      <div className="mb-4 flex items-center gap-3">
        <div className={'flex h-10 w-10 items-center justify-center rounded-xl ' + accent.iconBg}>
          <Icon size={20} className={accent.icon} />
        </div>
        <div>
          <div className="text-lg font-extrabold tracking-[-0.01em]">{plan.name}</div>
          <div className="text-[12.5px] text-slate-500">{plan.tagline}</div>
        </div>
      </div>

      {/* giá */}
      <div className="mb-5">
        <div className="flex items-end gap-1.5">
          <span className={'tnum text-[38px] font-extrabold leading-none tracking-[-0.03em] ' + accent.price}>
            {fmt(price)}
            <span className="text-2xl">₫</span>
          </span>
          {!isFree && <span className="pb-1 text-sm font-medium text-slate-400">/tháng</span>}
        </div>
        <div className="tnum mt-1.5 text-[12.5px] text-slate-500">
          {isFree
            ? 'Miễn phí mãi mãi'
            : annual
              ? `${fmt(plan.annualPerMonth * 12)}₫ mỗi năm · tiết kiệm 20%`
              : 'Thanh toán hàng tháng'}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => !isCurrent && onChoose(plan)}
        disabled={isCurrent}
        className={
          'mb-5 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors ' +
          (isCurrent
            ? 'cursor-default border border-slate-200 bg-slate-100 text-slate-500'
            : accent.btn)
        }
      >
        {isCurrent ? 'Gói hiện tại' : isFree ? 'Bắt đầu miễn phí' : `Nâng cấp lên ${plan.name}`}
      </button>

      {/* tính năng */}
      <ul className="flex flex-1 flex-col gap-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-slate-700">
            <span className="mt-px flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-green-100">
              <Check size={11} className="text-green-600" />
            </span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Pricing({
  variant = 'app',
  currentPlan = 'free',
  user,
  onBack,
  onLogin,
  onCheckout,
  onUpgraded,
}) {
  const [annual, setAnnual] = useState(false)

  // Chọn gói: Free không cần thanh toán; gói trả phí → mở checkout (nếu đã đăng nhập)
  // hoặc yêu cầu đăng nhập trước (trang công khai cho khách).
  const handleChoose = (plan) => {
    if (plan.key === 'free') {
      if (!onCheckout) onLogin?.()
      return
    }
    if (onCheckout) onCheckout(plan.key, 'monthly')
    else onLogin?.()
  }

  const content = (
    <div className="mx-auto w-full max-w-[1080px]">
      {/* tiêu đề */}
      <div className="mb-7 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-[13px] font-semibold text-blue-600">
          <Sparkle size={15} />
          Nâng cấp gói
        </div>
        <h1 className="m-0 mb-2.5 text-[34px] font-extrabold tracking-[-0.02em] max-sm:text-[26px]">
          Chọn gói phù hợp với cách bạn đầu tư
        </h1>
        <p className="mx-auto m-0 max-w-[560px] text-[15px] leading-relaxed text-slate-500">
          Từ nghiên cứu cơ bản đến phân tích chuyên sâu — tất cả đều tập trung vào chất lượng doanh
          nghiệp và minh bạch nguồn dữ liệu.
        </p>

        {/* chuyển đổi tháng / năm */}
        <div className="mt-5 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
          <button
            onClick={() => setAnnual(false)}
            className={
              'rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ' +
              (!annual ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900')
            }
          >
            Hàng tháng
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={
              'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ' +
              (annual ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900')
            }
          >
            Hàng năm
            <span
              className={
                'rounded-full px-1.5 py-px text-[10.5px] font-bold ' +
                (annual ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700')
              }
            >
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* mã ưu đãi — chỉ hiện khi đã đăng nhập (redeem cần phiên) */}
      {onUpgraded && <PromoBox onUpgraded={onUpgraded} />}

      {/* 3 thẻ gói */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            annual={annual}
            currentPlan={currentPlan}
            onChoose={handleChoose}
          />
        ))}
      </div>

      {/* bảng so sánh */}
      <div className="mt-12">
        <h2 className="mb-4 text-center text-xl font-extrabold tracking-[-0.01em]">So sánh chi tiết</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3.5 text-left text-[12.5px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Tính năng
                </th>
                <th className="px-4 py-3.5 text-center text-[13px] font-bold text-slate-700">Free</th>
                <th className="px-4 py-3.5 text-center text-[13px] font-bold text-blue-600">Pro</th>
                <th className="px-4 py-3.5 text-center text-[13px] font-bold text-violet-600">Ultra</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row.label} className="border-t border-slate-100">
                  <td className="px-5 py-3 text-left text-[13.5px] font-medium text-slate-700">
                    {row.label}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CompareCell value={row.free} />
                  </td>
                  <td className="bg-blue-50/40 px-4 py-3 text-center">
                    <CompareCell value={row.pro} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CompareCell value={row.ultra} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="mb-4 text-center text-xl font-extrabold tracking-[-0.01em]">Câu hỏi thường gặp</h2>
        <div className="mx-auto grid max-w-[820px] gap-3">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-1.5 text-[14.5px] font-bold text-slate-900">{item.q}</div>
              <p className="m-0 text-[13.5px] leading-relaxed text-slate-600">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* disclaimer bắt buộc: có nhắc tới nội dung AI */}
      <div className="mx-auto mt-8 flex max-w-[820px] items-start gap-2 rounded-lg bg-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-500">
        <InfoCircle size={16} className="mt-px flex-none" />
        <span>
          Giá đã bao gồm thuế GTGT. Nội dung do AI tạo chỉ nhằm mục đích tham khảo và{' '}
          <b>không phải lời khuyên đầu tư</b>. Nhà đầu tư tự chịu trách nhiệm với quyết định của mình.
        </span>
      </div>
    </div>
  )

  // Trong app shell (đã đăng nhập): chỉ trả nội dung, sidebar/topbar do App bọc ngoài.
  if (variant === 'app') return content

  // Trang công khai (khách chưa đăng nhập): tự bọc header + nền như Landing.
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-slate-100">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-10 py-5 max-sm:px-6">
        <button onClick={onBack} className="flex items-center gap-2.5">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-gradient-to-br from-blue-600 to-blue-700 text-base font-extrabold text-white">
            S
          </div>
          <span className="text-[19px] font-extrabold tracking-[-0.02em]">
            StockSense<span className="text-blue-600"> VN</span>
          </span>
        </button>
        <button
          onClick={onLogin}
          className="rounded-[9px] bg-slate-900 px-[18px] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Đăng nhập
        </button>
      </header>
      <main className="w-full px-10 pb-16 pt-6 max-sm:px-6">{content}</main>
    </div>
  )
}
