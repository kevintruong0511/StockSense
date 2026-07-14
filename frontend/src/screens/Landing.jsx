import {
  Sparkle,
  Search,
  ArrowRight,
  LineChart,
  Wallet,
  Users,
  Flag,
  BookOpen,
  Check,
} from '../components/icons.jsx'
import Logo from '../components/Logo.jsx'

const CHIPS = ['FPT', 'HPG', 'VNM', 'VCB', 'MWG']

// Tính năng thật của app (khớp với sidebar: Trang chủ / Phân tích cổ phiếu / Danh mục / Cộng Đồng / Hướng dẫn).
const FEATURES = [
  {
    icon: Sparkle,
    iconColor: '#2563EB',
    bg: '#EFF6FF',
    title: 'Phân tích cổ phiếu bằng AI',
    desc: 'Nhập mã — AI nạp số liệu tài chính thật, tự research web rồi chốt khuyến nghị MUA/BÁN/GIỮ kèm link nguồn bấm được.',
  },
  {
    icon: LineChart,
    iconColor: '#16A34A',
    bg: '#F0FDF4',
    title: 'Bảng giá & thị trường realtime',
    desc: 'VN-Index, độ rộng thị trường và giá cổ phiếu HOSE/HNX/UPCoM cập nhật liên tục, kèm tin tức CafeF theo tâm lý.',
  },
  {
    icon: Wallet,
    iconColor: '#7C3AED',
    bg: '#F5F3FF',
    title: 'Quản lý danh mục',
    desc: 'Theo dõi danh mục đầu tư, lãi/lỗ theo thời gian thực và để AI đánh giá tổng thể danh mục của bạn.',
  },
  {
    icon: Users,
    iconColor: '#EA580C',
    bg: '#FFF7ED',
    title: 'Cộng đồng nhà đầu tư',
    desc: 'Chia sẻ nhận định, đăng bài kèm ảnh, bình luận và thảo luận cùng những nhà đầu tư khác.',
  },
  {
    icon: Flag,
    iconColor: '#DC2626',
    bg: '#FEF2F2',
    title: 'Tin tức & red flag',
    desc: 'Tổng hợp tin tức theo mã, đo tâm lý thị trường và cảnh báo sớm những dấu hiệu rủi ro cần lưu ý.',
  },
  {
    icon: BookOpen,
    iconColor: '#0891B2',
    bg: '#ECFEFF',
    title: 'Hướng dẫn sử dụng',
    desc: 'Tài liệu hướng dẫn từng bước giúp bạn khai thác tối đa các tính năng phân tích của StockSense VN.',
  },
]

export default function Landing({ onLogin, onRegister, onPricing, onStart, onSelectTicker }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-slate-100">
      {/* top bar */}
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-10 py-5 max-sm:px-5">
        <div className="flex items-center gap-2.5">
          <Logo className="h-[34px]" />
          <span className="text-[19px] font-extrabold tracking-[-0.02em]">
            StockSense<span className="text-blue-600"> VN</span>
          </span>
        </div>
        <nav className="flex items-center gap-2.5 sm:gap-4">
          <button
            onClick={onPricing}
            className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:inline"
          >
            Bảng giá
          </button>
          <button
            onClick={onLogin}
            className="rounded-[10px] border-[1.5px] border-slate-300 bg-white px-[18px] py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 max-sm:px-3.5"
          >
            Đăng nhập
          </button>
          <button
            onClick={onRegister}
            className="rounded-[10px] bg-blue-600 px-[18px] py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,.35)] transition-colors hover:bg-blue-700 max-sm:px-3.5"
          >
            Đăng ký
          </button>
        </nav>
      </header>

      {/* hero */}
      <section className="mx-auto w-full max-w-[1000px] px-10 pb-10 pt-14 text-center max-sm:px-5">
        <div className="mb-[26px] inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-[13px] font-semibold text-blue-600">
          <Sparkle size={15} />
          Phân tích cổ phiếu Việt bằng AI phân tích chuyên nghiệp
        </div>
        <h1 className="m-0 mb-5 text-[56px] font-extrabold leading-[1.05] tracking-[-0.03em] [text-wrap:balance] max-md:text-[40px]">
          Hiểu sâu cổ phiếu Việt
          <br />
          trước khi xuống tiền
        </h1>
        <p className="mx-auto mb-9 max-w-[640px] text-[19px] leading-[1.55] text-slate-600 [text-wrap:pretty]">
          Tích hợp <strong className="font-bold text-slate-800">AI chuyên sâu</strong> phân tích thị
          trường, phân tích từng mã cổ phiếu và đưa ra dự đoán với{' '}
          <strong className="font-bold text-slate-800">độ chính xác cao</strong>. Đăng ký để trải
          nghiệm đầy đủ các tính năng.
        </p>

        {/* CTA chính — làm nổi đăng ký & đăng nhập */}
        <div className="mb-9 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onRegister}
            className="flex items-center gap-2 rounded-[12px] bg-blue-600 px-7 py-[15px] text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,.35)] transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_12px_28px_rgba(37,99,235,.4)]"
          >
            Đăng ký miễn phí
            <ArrowRight size={18} />
          </button>
          <button
            onClick={onLogin}
            className="rounded-[12px] border-[1.5px] border-slate-300 bg-white px-7 py-[15px] text-[16px] font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            Đăng nhập
          </button>
        </div>

        {/* ticker search — bấm sẽ mời đăng ký để trải nghiệm */}
        <div className="relative mx-auto mb-[18px] max-w-[560px]">
          <div className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-slate-200 bg-white p-1.5 pl-4 shadow-[0_8px_24px_rgba(15,23,42,.06)]">
            <Search size={20} className="text-slate-400" />
            <input
              placeholder="Nhập mã cổ phiếu: FPT, HPG, VNM…"
              className="min-w-0 flex-1 border-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              onClick={onStart}
              className="flex items-center gap-[7px] rounded-[10px] bg-slate-900 px-[22px] py-3 text-[15px] font-semibold text-white transition-colors hover:bg-slate-800 max-sm:px-4"
            >
              Phân tích ngay
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <span className="mr-0.5 text-[13px] text-slate-400">Phổ biến:</span>
          {CHIPS.map((code) => (
            <button
              key={code}
              onClick={() => onSelectTicker(code)}
              className="tnum rounded-lg border border-slate-200 bg-white px-3 py-[5px] text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-300"
            >
              {code}
            </button>
          ))}
        </div>
      </section>

      {/* feature cards */}
      <section className="mx-auto w-full max-w-[1120px] px-10 pb-5 pt-6 max-sm:px-5">
        <div className="mb-6 text-center">
          <h2 className="m-0 text-[30px] font-extrabold tracking-[-0.02em] max-md:text-[24px]">
            Mọi thứ bạn cần để nghiên cứu cổ phiếu
          </h2>
          <p className="mx-auto mt-2 max-w-[560px] text-[15px] text-slate-500">
            Đăng ký tài khoản miễn phí để mở khóa và trải nghiệm toàn bộ các tính năng bên dưới.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-[26px] shadow-[0_1px_3px_rgba(15,23,42,.04)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,.08)]"
              >
                <div
                  className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-xl"
                  style={{ background: f.bg }}
                >
                  <Icon size={22} style={{ color: f.iconColor }} />
                </div>
                <h3 className="m-0 mb-2 text-[17px] font-bold tracking-[-0.01em]">{f.title}</h3>
                <p className="m-0 text-sm leading-[1.55] text-slate-500">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* trust strip */}
      <section className="mx-auto mt-8 w-full max-w-[1120px] px-10 max-sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-[18px] bg-slate-900 px-10 py-[34px] max-sm:px-6">
          <div>
            <div className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Dữ liệu minh bạch
            </div>
            <div className="max-w-[420px] text-[22px] font-bold leading-[1.35] text-white">
              Mọi phân tích đều ghi rõ nguồn và mốc thời gian dữ liệu
            </div>
          </div>
          <div className="flex gap-10 max-sm:gap-6">
            <div>
              <div className="tnum text-[30px] font-extrabold text-white">1.700+</div>
              <div className="text-[13px] text-slate-400">mã HOSE/HNX/UPCoM</div>
            </div>
            <div>
              <div className="tnum text-[30px] font-extrabold text-green-500">10 năm</div>
              <div className="text-[13px] text-slate-400">dữ liệu BCTC</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA cuối — mời đăng ký trải nghiệm */}
      <section className="mx-auto mt-6 w-full max-w-[1120px] px-10 max-sm:px-5">
        <div className="flex flex-col items-center gap-5 rounded-[18px] border border-blue-100 bg-blue-50 px-10 py-10 text-center max-sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[13.5px] font-semibold text-blue-700">
            <span className="inline-flex items-center gap-1.5">
              <Check size={15} /> Miễn phí để bắt đầu
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={15} /> Không cần thẻ tín dụng
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={15} /> Có ngay khuyến nghị Mua/Bán/Giữ
            </span>
          </div>
          <h2 className="m-0 text-[28px] font-extrabold tracking-[-0.02em] max-md:text-[22px]">
            Sẵn sàng phân tích cổ phiếu đầu tiên?
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onRegister}
              className="flex items-center gap-2 rounded-[12px] bg-blue-600 px-8 py-[15px] text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,.35)] transition-all hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Đăng ký miễn phí
              <ArrowRight size={18} />
            </button>
            <button
              onClick={onLogin}
              className="rounded-[12px] border-[1.5px] border-blue-200 bg-white px-8 py-[15px] text-[16px] font-semibold text-blue-700 transition-colors hover:border-blue-300"
            >
              Tôi đã có tài khoản
            </button>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="mx-auto mb-0 mt-auto w-full max-w-[1120px] p-10 max-sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
          <div className="flex items-center gap-[9px]">
            <Logo className="h-[26px]" />
            <span className="text-[15px] font-bold">StockSense VN</span>
          </div>
          <span className="text-[13px] text-slate-400">
            Công cụ phân tích cổ phiếu Việt Nam có sự hỗ trợ của AI.
          </span>
        </div>
      </footer>
    </div>
  )
}
