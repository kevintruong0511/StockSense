import { Upload as UploadIcon, FileDoc, Check, Sparkle, InfoCircle } from '../components/icons.jsx'
import { uploadSections } from '../data/appData.js'

export default function Upload({ uploadState, onStart, onReset }) {
  return (
    <div className="max-w-[820px]">
      <h1 className="m-0 mb-1 text-[26px] font-extrabold tracking-[-0.02em]">Phân tích báo cáo (PDF)</h1>
      <p className="m-0 mb-[22px] text-sm text-slate-500">
        Tải lên báo cáo phân tích, bản cáo bạch hoặc BCTC — AI sẽ tóm tắt luận điểm, giả định và rủi ro gốc.
      </p>

      {/* IDLE dropzone */}
      {uploadState === 'idle' && (
        <button
          onClick={onStart}
          className="group w-full rounded-[18px] border-2 border-dashed border-slate-300 bg-white px-[30px] py-14 text-center transition-colors hover:border-blue-600 hover:bg-[#F8FAFF]"
        >
          <div className="mx-auto mb-[18px] flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-blue-50">
            <UploadIcon size={28} className="text-blue-600" />
          </div>
          <div className="mb-1.5 text-base font-bold">Kéo &amp; thả file PDF vào đây</div>
          <div className="mb-4 text-[13.5px] text-slate-400">hoặc bấm để chọn file · tối đa 25MB · .pdf</div>
          <span className="inline-block rounded-[10px] bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
            Chọn báo cáo
          </span>
        </button>
      )}

      {/* UPLOADING */}
      {uploadState === 'loading' && (
        <div className="rounded-2xl border border-slate-200 bg-white px-[26px] py-7">
          <div className="mb-[18px] flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-red-50">
              <FileDoc size={22} className="text-red-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">BaoCao_FPT_Q2-2026.pdf</div>
              <div className="text-xs text-slate-400">3,4 MB · 24 trang</div>
            </div>
          </div>
          <div className="mb-3 flex items-center gap-[9px] text-[13px] font-semibold text-blue-600">
            <span className="ss-spin inline-block h-4 w-4 rounded-full border-2 border-blue-100 border-t-blue-600" />
            AI đang đọc và trích xuất nội dung…
          </div>
          <div className="ss-skel mb-[9px] h-3 w-full" />
          <div className="ss-skel mb-[9px] h-3 w-[85%]" />
          <div className="ss-skel h-3 w-[70%]" />
        </div>
      )}

      {/* DONE */}
      {uploadState === 'done' && (
        <div>
          <div className="mb-[18px] flex items-center justify-between rounded-[14px] border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-green-100">
                <Check size={20} className="text-green-600" />
              </div>
              <div>
                <div className="text-sm font-bold">BaoCao_FPT_Q2-2026.pdf</div>
                <div className="text-xs text-slate-400">Đã phân tích · 24 trang · nguồn: người dùng tải lên</div>
              </div>
            </div>
            <button
              onClick={onReset}
              className="rounded-[9px] border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Tải file khác
            </button>
          </div>

          <div className="rounded-2xl border-[1.5px] border-blue-100 bg-gradient-to-b from-[#F8FAFF] to-white px-6 py-[22px]">
            <div className="mb-[18px] flex items-center gap-2.5">
              <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-gradient-to-br from-blue-600 to-violet-600">
                <Sparkle size={17} className="text-white" />
              </div>
              <div>
                <div className="text-[15px] font-extrabold">Tóm tắt báo cáo</div>
                <div className="text-[11px] font-semibold text-blue-600">Phân tích bởi Claude AI</div>
              </div>
            </div>

            {uploadSections.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.title} className="mb-[18px]">
                  <div className="mb-[9px] flex items-center gap-2 text-[13px] font-extrabold" style={{ color: s.color }}>
                    <Icon size={16} />
                    {s.title}
                  </div>
                  {s.items.map((i, idx) => (
                    <div key={idx} className="flex gap-[9px] py-[5px] text-[13.5px] leading-[1.6] text-slate-700">
                      <span className="flex-none font-extrabold" style={{ color: s.color }}>•</span>
                      <span>{i}</span>
                    </div>
                  ))}
                </div>
              )
            })}

            <div className="flex gap-2 rounded-[10px] bg-slate-100 px-3 py-[11px]">
              <InfoCircle size={15} className="mt-px flex-none text-slate-400" />
              <span className="text-[11.5px] leading-[1.5] text-slate-400">
                Tóm tắt do AI trích từ tài liệu người dùng; có thể sai sót. <strong className="text-slate-500">Không phải lời khuyên đầu tư</strong>.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
