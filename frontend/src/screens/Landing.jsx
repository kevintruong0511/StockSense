import { Sparkle, Search, ArrowRight } from '../components/icons.jsx'
import { features } from '../data/appData.js'

const CHIPS = ['FPT', 'HPG', 'VNM', 'VCB', 'MWG']

export default function Landing({ onLogin, onPricing, onStart, onSelectTicker }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-slate-100">
      {/* top bar */}
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-10 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-gradient-to-br from-blue-600 to-blue-700 text-base font-extrabold text-white">
            S
          </div>
          <span className="text-[19px] font-extrabold tracking-[-0.02em]">
            StockSense<span className="text-blue-600"> VN</span>
          </span>
        </div>
        <nav className="flex items-center gap-7">
          <span className="text-sm font-medium text-slate-600">Tính năng</span>
          <button
            onClick={onPricing}
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Bảng giá
          </button>
          <button
            onClick={onPricing}
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Giá gói
          </button>
          <button
            onClick={onLogin}
            className="rounded-[9px] bg-slate-900 px-[18px] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Đăng nhập
          </button>
        </nav>
      </header>

      {/* hero */}
      <section className="mx-auto w-full max-w-[1000px] px-10 pb-10 pt-14 text-center">
        <div className="mb-[26px] inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-[13px] font-semibold text-blue-600">
          <Sparkle size={15} />
          Phân tích định tính bằng Claude AI
        </div>
        <h1 className="m-0 mb-5 text-[56px] font-extrabold leading-[1.05] tracking-[-0.03em] [text-wrap:balance] max-md:text-[40px]">
          Hiểu sâu cổ phiếu Việt
          <br />
          trước khi xuống tiền
        </h1>
        <p className="mx-auto mb-[34px] max-w-[620px] text-[19px] leading-[1.55] text-slate-600 [text-wrap:pretty]">
          Đọc báo cáo tài chính, tin tức và tâm lý thị trường HOSE/HNX — để AI bóc tách luận điểm,
          chỉ ra red flag và rủi ro. Tập trung vào chất lượng doanh nghiệp, không phải bot giao dịch.
        </p>

        {/* ticker search */}
        <div className="relative mx-auto mb-[18px] max-w-[560px]">
          <div className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-slate-200 bg-white p-1.5 pl-4 shadow-[0_8px_24px_rgba(15,23,42,.06)]">
            <Search size={20} className="text-slate-400" />
            <input
              placeholder="Nhập mã cổ phiếu: FPT, HPG, VNM…"
              className="min-w-0 flex-1 border-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              onClick={onStart}
              className="flex items-center gap-[7px] rounded-[10px] bg-blue-600 px-[22px] py-3 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700 max-sm:px-4"
            >
              Bắt đầu phân tích
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
      <section className="mx-auto w-full max-w-[1120px] px-10 pb-5 pt-6">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-[26px] shadow-[0_1px_3px_rgba(15,23,42,.04)]"
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
      <section className="mx-auto mt-8 w-full max-w-[1120px] px-10">
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-[18px] bg-slate-900 px-10 py-[34px]">
          <div>
            <div className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Dữ liệu minh bạch
            </div>
            <div className="max-w-[420px] text-[22px] font-bold leading-[1.35] text-white">
              Mọi phân tích đều ghi rõ nguồn và mốc thời gian dữ liệu
            </div>
          </div>
          <div className="flex gap-10">
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

      {/* footer + disclaimer */}
      <footer className="mx-auto mb-0 mt-auto w-full max-w-[1120px] p-10">
        <div className="flex flex-wrap items-start justify-between gap-4 border-t border-slate-200 pt-6">
          <div className="flex items-center gap-[9px]">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-slate-900 text-[13px] font-extrabold text-white">
              S
            </div>
            <span className="text-[15px] font-bold">StockSense VN</span>
          </div>
          <p className="m-0 max-w-[640px] text-right text-[12.5px] leading-[1.6] text-slate-400">
            <strong className="text-slate-500">Miễn trừ trách nhiệm:</strong> StockSense VN là công cụ
            hỗ trợ nghiên cứu. Toàn bộ nội dung, bao gồm phần do AI tạo ra, chỉ mang tính tham khảo và{' '}
            <strong className="text-slate-500">không phải là lời khuyên đầu tư</strong>. Nhà đầu tư tự
            chịu trách nhiệm với quyết định của mình. Dữ liệu có thể có độ trễ.
          </p>
        </div>
      </footer>
    </div>
  )
}
