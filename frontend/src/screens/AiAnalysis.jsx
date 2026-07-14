import { useEffect, useRef, useState } from 'react'
import { Sparkle, ArrowRight, AlertCircle, Plus, ImageIcon } from '../components/icons.jsx'
import Markdown from '../components/Markdown.jsx'
import { SourceChips, StatusIndicator, hostOf } from '../components/AiSources.jsx'
import ModelToggle from '../components/ModelToggle.jsx'
import TickerPicker from '../components/TickerPicker.jsx'
import { STOCKS } from '../data/stocks.js'
import { streamAnalyze, fetchTickers } from '../data/ai.js'
import { listSessions, getSessionMessages, deleteSession } from '../data/chat.js'
import { useAiRun, patchRun, getRun } from '../data/aiRunStore.js'

// Store bền cho hội thoại + lượt đang stream — sống qua chuyển màn nên AI chạy tiếp ở
// nền và quay lại thấy đúng chỗ. Chỉ giữ state hội thoại/stream ở đây; input nháp
// (câu hỏi, ảnh, ghi chú), danh sách phiên, model… vẫn là state cục bộ (tự nạp lại).
export const AI_KEY = 'ai:analysis'
export const AI_INITIAL = {
  chat: [], // {role, content, sources?, hadInline?, images?}
  activeSessionId: null,
  ticker: 'FPT',
  live: '', // đoạn assistant đang stream
  liveSources: [],
  liveStatus: null, // {phase, query}
  streaming: false,
  error: '',
  quotaHit: false,
}

// Thời gian tương đối kiểu Việt cho danh sách phiên.
function timeAgo(iso) {
  if (!iso) return ''
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  if (s < 604800) return `${Math.floor(s / 86400)} ngày trước`
  return new Date(iso).toLocaleDateString('vi-VN')
}

// ── Ảnh đính kèm chat ────────────────────────────────────────────────────────
// Định dạng ảnh Anthropic/DeepSeek chấp nhận.
const OK_IMG_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_IMAGES = 4 // tối đa mỗi tin nhắn

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// File ảnh → { dataUrl, media_type, data(base64), name }. Ảnh nhỏ đúng định dạng giữ
// nguyên (chữ trong ảnh chụp màn hình sắc nét); ảnh lớn thu về ≤1600px cạnh dài + nén
// để payload gọn. `data` (base64 không header) là phần gửi cho AI; `dataUrl` để preview.
async function fileToAttachment(file) {
  if (!file || !file.type?.startsWith('image/')) return null
  const dataUrl = await readAsDataURL(file)
  if (OK_IMG_TYPES.includes(file.type) && file.size <= 1.5 * 1024 * 1024) {
    return { dataUrl, media_type: file.type, data: dataUrl.split(',')[1], name: file.name }
  }
  try {
    const img = await loadImage(dataUrl)
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(img, 0, 0, w, h)
    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const out = canvas.toDataURL(outType, 0.85)
    return { dataUrl: out, media_type: outType, data: out.split(',')[1], name: file.name }
  } catch {
    // Không vẽ được (vd GIF động) → dùng nguyên nếu đúng định dạng.
    if (OK_IMG_TYPES.includes(file.type)) {
      return { dataUrl, media_type: file.type, data: dataUrl.split(',')[1], name: file.name }
    }
    return null
  }
}

// Bong bóng hội thoại. Assistant render markdown + danh sách nguồn; user giữ văn bản thô.
// `children` (nếu có) dùng cho trạng thái đang stream/placeholder.
function Bubble({ role, text, sources, images, children }) {
  const isUser = role === 'user'
  const body = children != null ? children : isUser ? text : <Markdown text={text || ''} />
  const imgs = Array.isArray(images) ? images : []
  return (
    <div className={'flex ' + (isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={
          'max-w-[760px] rounded-2xl px-4 py-3 text-sm leading-relaxed ' +
          (isUser
            ? 'whitespace-pre-wrap bg-blue-600 text-white'
            : 'border border-slate-200 bg-white text-slate-800 shadow-sm')
        }
      >
        {imgs.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {imgs.map((im, i) => (
              <img
                key={i}
                src={im.dataUrl || `data:${im.media_type};base64,${im.data}`}
                alt={im.name || 'ảnh đính kèm'}
                className="max-h-48 max-w-[240px] rounded-lg border border-white/30 object-cover"
              />
            ))}
          </div>
        )}
        {body}
        {/* DeepSeek không trả citation inline → hiện danh sách "Nguồn" AI đã research ở cuối. */}
        {!isUser && <SourceChips items={sources} />}
      </div>
    </div>
  )
}

// Dải preview ảnh đã đính kèm (dùng chung cho thanh Phân tích + ô hỏi tiếp).
function AttachedImages({ images, onRemove }) {
  if (!images.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {images.map((im, i) => (
        <div key={i} className="relative">
          <img
            src={im.dataUrl}
            alt={im.name || 'ảnh đính kèm'}
            className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            title="Bỏ ảnh"
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs leading-none text-white shadow transition-colors hover:bg-red-500"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

// Popup báo HẾT LƯỢT — hiện NGAY khi chạm hạn mức (HTTP 429) để người dùng biết liền,
// thay vì chỉ một banner inline dễ bị bỏ sót. Đóng bằng nút ×, phím Esc hoặc bấm nền.
function QuotaModal({ plan, limit, onUpgrade, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const planLabel = plan === 'pro' ? 'Pro' : plan === 'ultra' ? 'Ultra' : 'Free'
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          title="Đóng"
          className="absolute right-3 top-3 rounded-lg px-2 py-0.5 text-xl leading-none text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          ×
        </button>
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertCircle size={26} />
          </div>
        </div>
        <h2 className="m-0 mt-4 text-center text-lg font-extrabold text-slate-900">
          Đã hết lượt phân tích AI hôm nay
        </h2>
        <p className="m-0 mt-2 text-center text-sm leading-relaxed text-slate-600">
          Bạn đã dùng hết {limit ? `${limit} ` : ''}lượt phân tích của gói <b>{planLabel}</b> hôm nay.
          Nâng cấp để tăng hạn mức (<b>Pro</b> 15 lượt/ngày, <b>Ultra</b> không giới hạn) hoặc quay lại vào ngày mai.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={onUpgrade}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Sparkle size={16} />
            Nâng cấp gói
          </button>
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AiAnalysis({ aiEnabled, billing, onRefreshBilling, onNavigate }) {
  // Hội thoại + lượt stream lấy từ store bền (giữ khi chuyển màn). setTicker/setChat…
  // là helper ghi vào store để phần render bên dưới không phải đổi.
  const [aiRun, patchAi] = useAiRun(AI_KEY, AI_INITIAL)
  const { chat, live, liveSources, liveStatus, streaming, error, quotaHit, ticker, activeSessionId } = aiRun
  const setTicker = (v) => patchAi({ ticker: typeof v === 'function' ? v(getRun(AI_KEY).ticker) : v })
  const setChat = (v) => patchAi((s) => ({ ...s, chat: typeof v === 'function' ? v(s.chat) : v }))
  const setLive = (v) => patchAi((s) => ({ ...s, live: typeof v === 'function' ? v(s.live) : v }))
  const setError = (v) => patchAi({ error: v })
  const setQuotaHit = (v) => patchAi({ quotaHit: v })
  const setActiveSessionId = (v) => patchAi({ activeSessionId: v })

  const [userContext, setUserContext] = useState('')
  const [showContext, setShowContext] = useState(false)
  const [question, setQuestion] = useState('')
  const [images, setImages] = useState([]) // ảnh đính kèm cho lượt hỏi sắp gửi
  const fileInputRef = useRef(null)
  const [universe, setUniverse] = useState([]) // toàn bộ mã niêm yết (gợi ý)
  const [sessions, setSessions] = useState([]) // danh sách phiên chat (panel trái)
  const [model, setModel] = useState('flash') // bậc model AI cho lượt phân tích: 'flash' | 'pro'
  const userPickedModelRef = useRef(false) // user đã tự chọn model chưa (để không tự đổi đè)

  const plan = billing?.plan || 'free'
  const canProModel = plan === 'pro' || plan === 'ultra' // chỉ Pro/Ultra được dùng model Pro
  const usage = billing?.usage
  // Nhãn hạn mức: unlimited = Ultra (không giới hạn); còn lại hiện "còn X/N lượt".
  const quotaLabel = usage
    ? usage.unlimited
      ? 'Không giới hạn lượt phân tích'
      : `Còn ${usage.remaining}/${usage.limit} lượt hôm nay`
    : ''

  // Nạp danh sách mã thật từ VNDIRECT để autocomplete phủ mọi mã.
  useEffect(() => {
    fetchTickers().then((list) => Array.isArray(list) && setUniverse(list))
  }, [])

  // Nạp danh sách phiên chat đã lưu để xem lại (sống qua đăng nhập lại).
  const refreshSessions = () => listSessions().then(setSessions).catch(() => {})
  useEffect(() => {
    refreshSessions()
  }, [])

  // Mặc định model theo gói: Free luôn Flash (bị khóa); Pro/Ultra mặc định Pro cho tới khi tự đổi.
  useEffect(() => {
    if (!canProModel) setModel('flash')
    else if (!userPickedModelRef.current) setModel('pro')
  }, [canProModel])

  const pickModel = (m) => {
    userPickedModelRef.current = true
    setModel(m)
  }

  // Mở lại một phiên cũ: nạp toàn bộ tin nhắn từ server.
  async function openSession(id) {
    if (streaming || id === activeSessionId) return
    try {
      const { session, messages } = await getSessionMessages(id)
      setChat(
        (messages || []).map((m) => ({
          role: m.role,
          content: m.content,
          sources: m.sources,
          hadInline: (m.content || '').includes('⟦'),
        })),
      )
      setActiveSessionId(id)
      if (session?.ticker) setTicker(session.ticker)
      setLive('')
      setError('')
      setQuotaHit(false)
      setImages([])
    } catch {
      setError('Không mở được cuộc trò chuyện.')
    }
  }

  // Bắt đầu phiên mới trống.
  function newSession() {
    if (streaming) return
    setChat([])
    setActiveSessionId(null)
    setLive('')
    setError('')
    setQuotaHit(false)
    setImages([])
  }

  // Xóa 1 phiên; nếu đang mở phiên đó thì về phiên mới trống.
  async function removeSession(id, e) {
    e.stopPropagation()
    if (streaming) return
    try {
      await deleteSession(id)
      setSessions((list) => list.filter((s) => s.id !== id))
      if (id === activeSessionId) newSession()
    } catch {
      setError('Không xóa được cuộc trò chuyện.')
    }
  }

  const bottomRef = useRef(null)
  const stickBottomRef = useRef(true) // chỉ tự cuộn khi user đang ở gần đáy

  // Theo dõi vị trí cuộn của trang: user cuộn lên → tắt auto-scroll để họ đọc phần trên;
  // cuộn về gần đáy → bật lại. Nhờ vậy AI đang viết không kéo trang xuống ngang người dùng.
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const distance = el.scrollHeight - (window.scrollY + window.innerHeight)
      stickBottomRef.current = distance < 120
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!stickBottomRef.current) return
    // cuộn tức thời (không 'smooth') để bám đáy khi token tới nhanh, tránh giật/nhảy sai
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [chat, live])

  // KHÔNG hủy stream khi unmount — để AI chạy tiếp ở nền; hội thoại + lượt live giữ
  // trong store bền, quay lại màn sẽ hydrate lại đúng chỗ đang stream/đã xong.

  // Thêm ảnh vào ô soạn (từ nút chọn, dán, hoặc kéo-thả). Bỏ file không phải ảnh, giới
  // hạn tổng MAX_IMAGES; ảnh lớn được thu nhỏ/nén trong fileToAttachment.
  async function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type?.startsWith('image/'))
    if (!files.length) return
    const atts = (await Promise.all(files.map(fileToAttachment))).filter(Boolean)
    if (atts.length) setImages((cur) => [...cur, ...atts].slice(0, MAX_IMAGES))
  }
  const removeImage = (i) => setImages((cur) => cur.filter((_, idx) => idx !== i))
  const onPasteImages = (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    const files = []
    for (const it of items) if (it.type?.startsWith('image/')) { const f = it.getAsFile(); if (f) files.push(f) }
    if (files.length) { e.preventDefault(); addFiles(files) }
  }

  // Rút gọn tin nhắn cho payload gửi backend: bỏ preview dataUrl/name (chỉ giữ media_type
  // + data base64 cho ảnh), bỏ sources/hadInline của assistant → nhẹ hơn nhiều.
  const toWireMsg = (m) => {
    const base = { role: m.role, content: m.content }
    if (m.role === 'user' && Array.isArray(m.images) && m.images.length)
      return { ...base, images: m.images.map((im) => ({ media_type: im.media_type, data: im.data })) }
    return base
  }

  function runSend(text, baseChat, imgs = []) {
    if (getRun(AI_KEY).streaming || (!text.trim() && imgs.length === 0)) return
    stickBottomRef.current = true // gửi câu mới → bám đáy trở lại để thấy câu hỏi + trả lời
    const userMsg = { role: 'user', content: text, ...(imgs.length ? { images: imgs } : {}) }
    const msgs = [...baseChat, userMsg]
    // Mở lượt mới: ghi hội thoại + reset live vào store (một lần, đồng bộ).
    patchRun(AI_KEY, (s) => ({
      ...s,
      chat: msgs,
      live: '',
      liveSources: [],
      liveStatus: { phase: 'thinking' },
      streaming: true,
      error: '',
      quotaHit: false,
    }))

    // State per-lượt giữ trong CLOSURE (không phải ref/state component) → cập nhật được
    // cả khi component đã unmount vì rời màn; mọi thay đổi ghi thẳng vào store bền.
    let liveText = ''
    let liveSrc = []
    let lastCite = null // URL vừa trích (chống chèn chip trùng liền nhau)
    let citedCount = 0 // số chip inline đã chèn

    const resetLive = () =>
      patchRun(AI_KEY, { live: '', liveSources: [], liveStatus: null, streaming: false })
    const appendAssistant = () => {
      if (!liveText) return
      const hadInline = citedCount > 0
      patchRun(AI_KEY, (s) => ({
        ...s,
        chat: [...s.chat, { role: 'assistant', content: liveText, sources: liveSrc, hadInline }],
      }))
    }

    const t = ticker.trim().toUpperCase()
    const abort = streamAnalyze({
      ticker: t || undefined,
      stock: STOCKS[t] || undefined,
      userContext: userContext.trim() || undefined,
      messages: msgs.map(toWireMsg),
      sessionId: getRun(AI_KEY).activeSessionId || undefined,
      model, // backend vẫn kẹp lại theo gói — đây chỉ là lựa chọn của user
      onSession: ({ id }) => {
        // Backend trả về id phiên (nhất là phiên mới vừa tạo) → gắn active + cập nhật panel.
        if (id) patchRun(AI_KEY, { activeSessionId: id })
        refreshSessions()
      },
      onToken: (chunk) => {
        liveText += chunk
        lastCite = null // có text mới → cho phép trích lại cùng nguồn cho luận điểm sau
        patchRun(AI_KEY, { live: liveText })
      },
      onCitation: (c) => {
        // Chèn chip nguồn INLINE ngay tại vị trí AI trích; bỏ qua nếu trùng URL liền trước.
        if (c?.url && c.url !== lastCite) {
          lastCite = c.url
          citedCount += 1
          liveText += `⟦${hostOf(c.url)}|${c.url}⟧`
          patchRun(AI_KEY, { live: liveText })
        }
      },
      onSources: (items) => {
        for (const it of items) {
          if (it?.url && !liveSrc.some((s) => s.url === it.url)) liveSrc.push({ url: it.url, title: it.title || it.url })
        }
        patchRun(AI_KEY, { liveSources: [...liveSrc] })
      },
      onStatus: (st) => {
        if (st?.phase) patchRun(AI_KEY, { liveStatus: st })
      },
      onReset: () => {
        // Pha research rò rỉ/cụt → backend viết lại. Xóa text đã stream, GIỮ nguồn đã gom.
        liveText = ''
        patchRun(AI_KEY, { live: '', liveStatus: { phase: 'writing' } })
      },
      onDone: () => {
        appendAssistant()
        resetLive()
        onRefreshBilling?.() // cập nhật "còn X lượt" sau khi trừ 1 lượt
        refreshSessions() // cập nhật lại thứ tự/tiêu đề phiên sau khi lưu
      },
      onError: (msg, meta) => {
        appendAssistant()
        resetLive()
        // Hết lượt (429): bỏ dòng lỗi kỹ thuật, hiện hộp nâng cấp riêng bên dưới.
        if (meta?.code === 'quota_exceeded' || meta?.status === 429) patchRun(AI_KEY, { quotaHit: true })
        else patchRun(AI_KEY, { error: msg })
        onRefreshBilling?.()
      },
    })
    patchRun(AI_KEY, { abort })
  }

  const startAnalyze = () => {
    const t = ticker.trim().toUpperCase()
    if (!t) {
      setError('Hãy nhập mã cổ phiếu trước khi phân tích.')
      return
    }
    const imgs = images
    setImages([])
    let prompt = `Hãy phân tích cổ phiếu ${t} theo khung đã hướng dẫn.`
    if (imgs.length) prompt += ' Đọc kỹ (các) ảnh tôi đính kèm và kết hợp vào phân tích.'
    runSend(prompt, [], imgs)
  }

  const sendQuestion = () => {
    const q = question.trim()
    if (!q && images.length === 0) return
    const imgs = images
    // Cho phép gửi chỉ ảnh (không kèm chữ) — thêm câu nhắc gọn để AI biết cần đọc ảnh.
    const text = q || 'Xem và phân tích giúp tôi ảnh tôi vừa gửi.'
    setQuestion('')
    setImages([])
    runSend(text, chat, imgs)
  }

  if (!aiEnabled) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
          <AlertCircle size={20} />
          <div className="text-sm leading-relaxed">
            <div className="font-semibold">Tính năng Phân tích cổ phiếu chưa được bật</div>
            <p className="m-0 mt-1">
              Máy chủ chưa cấu hình khóa API (<code>DEEPSEEK_API_KEY</code>). Thêm khóa vào file{' '}
              <code>backend/.env</code> (hoặc biến môi trường trên Render) rồi khởi động lại.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const hasConversation = chat.length > 0 || streaming

  return (
    <div className="mx-auto flex max-w-6xl gap-5">
      {/* panel danh sách phiên chat (ẩn trên mobile để đỡ chật) */}
      <aside className="hidden w-60 shrink-0 flex-col gap-3 md:flex">
        <button
          onClick={newSession}
          disabled={streaming}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={16} />
          Phiên mới
        </button>
        <div className="flex flex-col gap-0.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {sessions.length === 0 ? (
            <p className="m-0 px-2 py-4 text-center text-xs text-slate-400">Chưa có cuộc trò chuyện nào</p>
          ) : (
            sessions.map((s) => {
              const active = s.id === activeSessionId
              return (
                <div
                  key={s.id}
                  onClick={() => openSession(s.id)}
                  className={
                    'group flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 transition-colors ' +
                    (active ? 'bg-blue-50' : 'hover:bg-slate-50')
                  }
                >
                  <div className="min-w-0 flex-1">
                    <div className={'truncate text-[13px] font-medium ' + (active ? 'text-blue-700' : 'text-slate-700')}>
                      {s.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                      {s.ticker && <span className="font-semibold text-slate-500">{s.ticker}</span>}
                      <span>{timeAgo(s.updated_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => removeSession(s.id, e)}
                    title="Xóa cuộc trò chuyện"
                    className="shrink-0 rounded px-1 text-base leading-none text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* cột phải: nội dung phân tích + hội thoại */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
      {/* input file ẩn dùng chung cho nút đính kèm ở thanh Phân tích lẫn ô hỏi tiếp */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = '' // reset để chọn lại cùng file vẫn kích hoạt onChange
        }}
      />
      {/* header */}
      <div>
        <h1 className="m-0 flex items-center gap-2 text-2xl font-extrabold tracking-[-0.02em] text-slate-900">
          <Sparkle size={22} className="text-blue-600" />
          Phân tích cổ phiếu
        </h1>
        <p className="m-0 mt-1 text-sm text-slate-500">
          Nhập mã bất kỳ — AI tự lấy số liệu <b>thời gian thực</b> (SSI/Vietstock, VNDIRECT dự phòng),
          <b> tự research web</b> để bổ sung tin mới nhất và <b>trích nguồn bấm được</b>, rồi đưa ra
          <b> khuyến nghị Mua/Bán/Giữ</b>. Hỏi thêm để đào sâu.
        </p>
      </div>

      {/* thanh nhập mã */}
      <div
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          if (e.dataTransfer?.files?.length) {
            e.preventDefault()
            addFiles(e.dataTransfer.files)
          }
        }}
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-500">
              Mã cổ phiếu
              {universe.length > 0 && (
                <span className="font-normal text-slate-400"> · chọn/gõ trong {universe.length.toLocaleString('vi-VN')} mã niêm yết</span>
              )}
            </span>
            <TickerPicker value={ticker} onChange={setTicker} universe={universe} onEnter={startAnalyze} />
          </label>

          {/* chọn model AI — Free bị khóa ở Flash */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Model AI</span>
            <ModelToggle model={model} canPro={canProModel} disabled={streaming} onPick={pickModel} />
          </label>

          <button
            onClick={startAnalyze}
            disabled={streaming}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkle size={16} />
            {chat.length ? 'Phân tích lại' : 'Phân tích'}
          </button>

          <button
            onClick={() => setShowContext((v) => !v)}
            className="rounded-lg px-2 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            {showContext ? 'Ẩn dữ liệu bổ sung' : '+ Thêm dữ liệu của bạn'}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={streaming || images.length >= MAX_IMAGES}
            title={images.length >= MAX_IMAGES ? `Tối đa ${MAX_IMAGES} ảnh` : 'Đính kèm ảnh để AI đọc cùng phân tích'}
            className="flex items-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ImageIcon size={16} />
            {images.length ? `Ảnh (${images.length})` : 'Đính kèm ảnh'}
          </button>

          {quotaLabel && (
            <span
              className={
                'ml-auto self-center rounded-full px-3 py-1 text-[12.5px] font-semibold ' +
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
        </div>

        {images.length > 0 && (
          <div className="mt-3">
            <AttachedImages images={images} onRemove={removeImage} />
            <p className="m-0 mt-1.5 text-xs text-slate-400">
              {images.length} ảnh sẽ được gửi kèm cho AI đọc cùng phân tích mã {ticker.trim().toUpperCase() || '—'}.
            </p>
          </div>
        )}

        {showContext && (
          <textarea
            value={userContext}
            onChange={(e) => setUserContext(e.target.value)}
            rows={4}
            placeholder="Dán thêm số liệu/BCTC/ghi chú của bạn để AI phân tích dựa trên đó…"
            className="mt-3 w-full resize-y rounded-lg border border-slate-300 p-3 text-sm text-slate-800 outline-none focus:border-blue-500"
          />
        )}
      </div>

      {/* hết lượt hôm nay → popup mời nâng cấp, hiện ngay khi chạm hạn mức */}
      {quotaHit && (
        <QuotaModal
          plan={plan}
          limit={usage?.limit}
          onUpgrade={() => {
            setQuotaHit(false)
            onNavigate?.('pricing')
          }}
          onClose={() => setQuotaHit(false)}
        />
      )}

      {/* lỗi */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* hội thoại */}
      {hasConversation ? (
        <div className="flex flex-col gap-3">
          {chat.map((m, i) => (
            <Bubble key={i} role={m.role} text={m.content} sources={m.sources} images={m.images} />
          ))}
          {streaming && (
            <Bubble role="assistant" sources={liveSources}>
              {live ? (
                <>
                  <Markdown text={live} />
                  <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-blue-500 align-middle" />
                </>
              ) : (
                <StatusIndicator status={liveStatus} />
              )}
            </Bubble>
          )}
          <div ref={bottomRef} />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Nhập mã (VD: FPT, HPG, VHM, DGC…) và bấm{' '}
          <span className="font-semibold text-slate-700">Phân tích</span> — AI tự nạp số liệu thời gian
          thực, research web (kèm nguồn bấm được) rồi bóc tách định giá, red flag, rủi ro và{' '}
          <span className="font-semibold text-slate-700">chốt Mua/Bán/Giữ</span>. Muốn AI đọc thêm biểu đồ/tài liệu, bấm{' '}
          <span className="font-semibold text-slate-700">Đính kèm ảnh</span> hoặc{' '}
          <span className="font-semibold text-slate-700">Thêm dữ liệu của bạn</span> trước khi phân tích.
        </div>
      )}

      {/* ô hỏi tiếp */}
      {hasConversation && (
        <div
          className="sticky bottom-4 rounded-xl border border-slate-200 bg-white p-2 shadow-md"
          onDragOver={(e) => {
            e.preventDefault()
          }}
          onDrop={(e) => {
            if (e.dataTransfer?.files?.length) {
              e.preventDefault()
              addFiles(e.dataTransfer.files)
            }
          }}
        >
          {/* ảnh đã đính kèm (preview + bỏ) */}
          {images.length > 0 && (
            <div className="mb-2 px-1">
              <AttachedImages images={images} onRemove={removeImage} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ModelToggle model={model} canPro={canProModel} disabled={streaming} onPick={pickModel} compact />
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming || images.length >= MAX_IMAGES}
              title={images.length >= MAX_IMAGES ? `Tối đa ${MAX_IMAGES} ảnh` : 'Đính kèm ảnh (hoặc dán ảnh vào ô)'}
              className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImageIcon size={18} />
            </button>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendQuestion()}
              onPaste={onPasteImages}
              disabled={streaming}
              placeholder="Hỏi thêm hoặc dán/đính kèm ảnh… (VD: đọc giúp biểu đồ này)"
              className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none disabled:opacity-60"
            />
            <button
              onClick={sendQuestion}
              disabled={streaming || (!question.trim() && images.length === 0)}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Gửi <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      </div>
    </div>
  )
}
