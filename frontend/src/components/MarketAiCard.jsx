// Thẻ "AI nhận định thị trường" trên Dashboard: một nút → AI đọc VN-Index + độ rộng
// + bảng giá VN30 + danh mục theo dõi + tin CafeF, research vĩ mô qua web_search rồi
// stream nhận định & chiến lược. Trừ 1 lượt theo gói (backend enforcement) như các
// phân tích khác; khuôn UI giống "Kế hoạch AI cho danh mục" (Portfolio).
import { useEffect, useRef, useState } from 'react'
import { Sparkle, AlertCircle } from './icons.jsx'
import Markdown from './Markdown.jsx'
import ModelToggle from './ModelToggle.jsx'
import { SourceChips, StatusIndicator } from './AiSources.jsx'
import { streamMarketAnalyze } from '../data/ai.js'
import { loadWatch } from './PriceBoard.jsx'
import { useAiRun, patchRun, getRun } from '../data/aiRunStore.js'

// Store bền cho luồng phân tích thị trường — sống qua chuyển màn nên AI chạy tiếp ở nền.
const KEY = 'market'
const INITIAL = { analyzing: false, text: '', sources: [], status: null, error: '', quotaHit: false, done: false }

export default function MarketAiCard({ billing, onRefreshBilling, onNavigate }) {
  const plan = billing?.plan || 'free'
  const canProModel = plan === 'pro' || plan === 'ultra'
  const usage = billing?.usage
  const quotaLabel = usage
    ? usage.unlimited
      ? 'Không giới hạn lượt phân tích'
      : `Còn ${usage.remaining}/${usage.limit} lượt hôm nay`
    : ''
  const [model, setModel] = useState('flash')
  const userPickedModel = useRef(false)

  const [run] = useAiRun(KEY, INITIAL)
  const { analyzing, text, sources, status, error, quotaHit, done } = run

  // Mặc định model theo gói: Free khóa Flash; Pro/Ultra mặc định Pro tới khi tự đổi.
  useEffect(() => {
    if (!canProModel) setModel('flash')
    else if (!userPickedModel.current) setModel('pro')
  }, [canProModel])
  const pickModel = (m) => {
    userPickedModel.current = true
    setModel(m)
  }

  // KHÔNG hủy stream khi unmount — để AI chạy tiếp ở nền; state giữ trong store.

  function runAnalyze() {
    if (getRun(KEY)?.analyzing) return
    patchRun(KEY, { analyzing: true, text: '', sources: [], status: { phase: 'thinking' }, error: '', quotaHit: false, done: false, abort: null })
    const abort = streamMarketAnalyze({
      codes: loadWatch(), // gửi kèm danh mục theo dõi để AI nhận xét thêm
      model,
      onToken: (t) => patchRun(KEY, (s) => ({ ...s, text: s.text + t })),
      onSources: (items) =>
        patchRun(KEY, (s) => {
          const merged = [...s.sources]
          for (const it of items)
            if (it?.url && !merged.some((x) => x.url === it.url)) merged.push({ url: it.url, title: it.title || it.url })
          return { ...s, sources: merged }
        }),
      onStatus: (st) => st?.phase && patchRun(KEY, { status: st }),
      onReset: () => patchRun(KEY, { text: '' }),
      onDone: () => {
        patchRun(KEY, { analyzing: false, status: null, done: true })
        onRefreshBilling?.()
      },
      onError: (msg, meta) => {
        if (meta?.code === 'quota_exceeded' || meta?.status === 429)
          patchRun(KEY, { analyzing: false, status: null, quotaHit: true })
        else patchRun(KEY, { analyzing: false, status: null, error: msg })
        onRefreshBilling?.()
      },
    })
    patchRun(KEY, { abort })
  }

  const showBody = analyzing || text || error || quotaHit || done

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <h2 className="m-0 mr-1 flex items-center gap-2 text-base font-bold">
          <Sparkle size={17} className="text-blue-600" />
          AI nhận định thị trường
        </h2>
        <div className="ml-auto flex items-center gap-2">
          {quotaLabel && (
            <span
              className={
                'hidden rounded-full px-3 py-1 text-[12px] font-semibold sm:inline ' +
                (usage?.unlimited
                  ? 'bg-violet-50 text-violet-600'
                  : usage?.remaining > 0
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-red-50 text-red-600')
              }
            >
              {quotaLabel}
            </span>
          )}
          <ModelToggle model={model} canPro={canProModel} disabled={analyzing} onPick={pickModel} compact />
          <button
            onClick={runAnalyze}
            disabled={analyzing}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkle size={16} />
            {done || text ? 'Phân tích lại' : 'Phân tích hôm nay'}
          </button>
        </div>
      </div>

      {showBody ? (
        <div className="px-5 py-4">
          {quotaHit ? (
            <div className="flex flex-col items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span>Bạn đã dùng hết lượt phân tích AI hôm nay. Nâng cấp để tăng hạn mức.</span>
              <button
                onClick={() => onNavigate?.('pricing')}
                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Nâng cấp gói
              </button>
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          ) : text ? (
            <div className="text-sm leading-relaxed text-slate-800">
              <Markdown text={text} />
              {analyzing && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-blue-500 align-middle" />}
              <SourceChips items={sources} />
            </div>
          ) : (
            <StatusIndicator status={status} />
          )}
        </div>
      ) : (
        <div className="px-5 py-4 text-[13.5px] text-slate-500">
          AI đọc <b>VN-Index, bảng giá VN30 + danh mục theo dõi của bạn, tin tức trong ngày</b> và tự research{' '}
          <b>vĩ mô trong nước &amp; thế giới</b>, rồi đưa <b>nhận định xu hướng + chiến lược hành động</b> kèm nguồn
          trích dẫn.
        </div>
      )}
    </div>
  )
}
