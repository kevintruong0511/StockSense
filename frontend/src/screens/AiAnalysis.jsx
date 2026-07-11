import { useEffect, useRef, useState } from 'react'
import { Sparkle, ArrowRight, AlertCircle, Plus, Search } from '../components/icons.jsx'
import Markdown from '../components/Markdown.jsx'
import TickerPicker from '../components/TickerPicker.jsx'
import { STOCKS } from '../data/stocks.js'
import { streamAnalyze, fetchTickers } from '../data/ai.js'
import { listSessions, getSessionMessages, deleteSession } from '../data/chat.js'

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

// Tên miền gọn từ URL để hiển thị trên chip nguồn.
function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

// Dải chip "Nguồn" AI đã tham chiếu (favicon + tên miền), bấm mở tab mới.
function SourceChips({ items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
      <span className="mr-0.5 text-[11px] font-semibold text-slate-400">Nguồn</span>
      {items.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          title={s.title || s.url}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 no-underline transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <img
            src={`https://www.google.com/s2/favicons?domain=${hostOf(s.url)}&sz=32`}
            alt=""
            width={12}
            height={12}
            className="rounded-sm"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          {hostOf(s.url)}
        </a>
      ))}
    </div>
  )
}

// Chỉ báo trạng thái AI theo thời gian thực: suy nghĩ / tìm web (kèm từ khóa) / soạn.
// Ba chấm nảy + icon nhấp nháy để thấy AI đang làm việc thật, không chỉ "đang phân tích".
function StatusIndicator({ status }) {
  const phase = status?.phase || 'thinking'
  const isSearch = phase === 'searching'
  const Icon = isSearch ? Search : Sparkle
  const label =
    phase === 'writing'
      ? 'Đang soạn phân tích…'
      : isSearch
        ? status?.query
          ? 'Đang tìm kiếm'
          : 'Đang tìm kiếm trên web…'
        : 'Đang suy nghĩ…'
  return (
    <div className="flex items-center gap-2 text-slate-500">
      <Icon size={15} className="shrink-0 animate-pulse text-blue-500" />
      <span className="text-sm">
        {label}
        {isSearch && status?.query && <span className="font-medium text-slate-700"> “{status.query}”</span>}
      </span>
      <span className="flex gap-1">
        {[0, 150, 300].map((d) => (
          <span
            key={d}
            className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </span>
    </div>
  )
}

// Bong bóng hội thoại. Assistant render markdown + danh sách nguồn; user giữ văn bản thô.
// `children` (nếu có) dùng cho trạng thái đang stream/placeholder.
function Bubble({ role, text, sources, children }) {
  const isUser = role === 'user'
  const body = children != null ? children : isUser ? text : <Markdown text={text || ''} />
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
        {body}
        {/* DeepSeek không trả citation inline → hiện danh sách "Nguồn" AI đã research ở cuối. */}
        {!isUser && <SourceChips items={sources} />}
      </div>
    </div>
  )
}

export default function AiAnalysis({ aiEnabled, billing, onRefreshBilling, onNavigate }) {
  const [ticker, setTicker] = useState('FPT')
  const [userContext, setUserContext] = useState('')
  const [showContext, setShowContext] = useState(false)
  const [chat, setChat] = useState([]) // {role, content}
  const [live, setLive] = useState('') // đoạn assistant đang stream
  const [liveSources, setLiveSources] = useState([]) // nguồn AI trích trong lượt đang stream
  const [liveStatus, setLiveStatus] = useState(null) // {phase,query} trạng thái AI đang làm
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [quotaHit, setQuotaHit] = useState(false) // đã hết lượt hôm nay (HTTP 429)
  const [question, setQuestion] = useState('')
  const [universe, setUniverse] = useState([]) // toàn bộ mã niêm yết (gợi ý)
  const [sessions, setSessions] = useState([]) // danh sách phiên chat (panel trái)
  const [activeSessionId, setActiveSessionId] = useState(null) // phiên đang mở (null = phiên mới)

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

  // Mở lại một phiên cũ: nạp toàn bộ tin nhắn từ server.
  async function openSession(id) {
    if (streaming || id === activeSessionId) return
    abortRef.current?.()
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

  const liveRef = useRef('')
  const liveSourcesRef = useRef([])
  const lastCiteRef = useRef(null) // URL vừa trích (chống chèn chip trùng liền nhau)
  const citedCountRef = useRef(0) // số chip inline đã chèn (để quyết định có hiện list fallback)
  const abortRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chat, live])

  useEffect(() => () => abortRef.current?.(), []) // hủy stream khi rời màn

  function runSend(text, baseChat) {
    if (streaming || !text.trim()) return
    setError('')
    setQuotaHit(false)
    const msgs = [...baseChat, { role: 'user', content: text }]
    setChat(msgs)
    setLive('')
    liveRef.current = ''
    liveSourcesRef.current = []
    lastCiteRef.current = null
    citedCountRef.current = 0
    setLiveSources([])
    setLiveStatus({ phase: 'thinking' })
    setStreaming(true)

    const resetLive = () => {
      liveRef.current = ''
      setLive('')
      liveSourcesRef.current = []
      lastCiteRef.current = null
      citedCountRef.current = 0
      setLiveSources([])
      setLiveStatus(null)
      setStreaming(false)
    }

    const t = ticker.trim().toUpperCase()
    abortRef.current = streamAnalyze({
      ticker: t || undefined,
      stock: STOCKS[t] || undefined,
      userContext: userContext.trim() || undefined,
      messages: msgs,
      sessionId: activeSessionId || undefined,
      onSession: ({ id }) => {
        // Backend trả về id phiên (nhất là phiên mới vừa tạo) → gắn active + cập nhật panel.
        if (id) setActiveSessionId(id)
        refreshSessions()
      },
      onToken: (chunk) => {
        liveRef.current += chunk
        lastCiteRef.current = null // có text mới → cho phép trích lại cùng nguồn cho luận điểm sau
        setLive(liveRef.current)
      },
      onCitation: (c) => {
        // Chèn chip nguồn INLINE ngay tại vị trí AI trích; bỏ qua nếu trùng URL liền trước.
        if (c?.url && c.url !== lastCiteRef.current) {
          lastCiteRef.current = c.url
          citedCountRef.current += 1
          liveRef.current += `⟦${hostOf(c.url)}|${c.url}⟧`
          setLive(liveRef.current)
        }
      },
      onSources: (items) => {
        const merged = [...liveSourcesRef.current]
        for (const it of items) {
          if (it?.url && !merged.some((s) => s.url === it.url)) merged.push({ url: it.url, title: it.title || it.url })
        }
        liveSourcesRef.current = merged
        setLiveSources(merged)
      },
      onStatus: (st) => {
        if (st?.phase) setLiveStatus(st)
      },
      onReset: () => {
        // Pha research rò rỉ/cụt → backend viết lại. Xóa text đã stream, GIỮ nguồn đã gom.
        liveRef.current = ''
        setLive('')
        setLiveStatus({ phase: 'writing' })
      },
      onDone: () => {
        const done = liveRef.current
        const src = liveSourcesRef.current
        const hadInline = citedCountRef.current > 0
        if (done) setChat((c) => [...c, { role: 'assistant', content: done, sources: src, hadInline }])
        resetLive()
        onRefreshBilling?.() // cập nhật "còn X lượt" sau khi trừ 1 lượt
        refreshSessions() // cập nhật lại thứ tự/tiêu đề phiên sau khi lưu
      },
      onError: (msg, meta) => {
        const partial = liveRef.current
        const src = liveSourcesRef.current
        const hadInline = citedCountRef.current > 0
        if (partial) setChat((c) => [...c, { role: 'assistant', content: partial, sources: src, hadInline }])
        resetLive()
        // Hết lượt (429): bỏ dòng lỗi kỹ thuật, hiện hộp nâng cấp riêng bên dưới.
        if (meta?.code === 'quota_exceeded' || meta?.status === 429) {
          setQuotaHit(true)
        } else {
          setError(msg)
        }
        onRefreshBilling?.()
      },
    })
  }

  const startAnalyze = () => {
    const t = ticker.trim().toUpperCase()
    if (!t) {
      setError('Hãy nhập mã cổ phiếu trước khi phân tích.')
      return
    }
    runSend(`Hãy phân tích cổ phiếu ${t} theo khung đã hướng dẫn.`, [])
  }

  const sendQuestion = () => {
    const q = question.trim()
    if (!q) return
    setQuestion('')
    runSend(q, chat)
  }

  if (!aiEnabled) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
          <AlertCircle size={20} />
          <div className="text-sm leading-relaxed">
            <div className="font-semibold">Tính năng Phân tích AI chưa được bật</div>
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
      {/* header */}
      <div>
        <h1 className="m-0 flex items-center gap-2 text-2xl font-extrabold tracking-[-0.02em] text-slate-900">
          <Sparkle size={22} className="text-blue-600" />
          Phân tích AI
        </h1>
        <p className="m-0 mt-1 text-sm text-slate-500">
          Nhập mã bất kỳ — AI tự lấy số liệu <b>thời gian thực</b> (SSI/Vietstock, VNDIRECT dự phòng),
          <b> tự research web</b> để bổ sung tin mới nhất và <b>trích nguồn bấm được</b>, rồi đưa ra
          <b> khuyến nghị Mua/Bán/Giữ</b>. Hỏi thêm để đào sâu.
        </p>
      </div>

      {/* thanh nhập mã */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

      {/* hết lượt hôm nay → mời nâng cấp */}
      {quotaHit && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <AlertCircle size={20} className="text-amber-600" />
          <div className="min-w-[200px] flex-1 text-sm text-amber-800">
            <b>Bạn đã dùng hết lượt phân tích AI hôm nay.</b> Nâng cấp gói để tăng hạn mức
            (Pro 15 lượt/ngày, Ultra không giới hạn) hoặc quay lại vào ngày mai.
          </div>
          <button
            onClick={() => onNavigate?.('pricing')}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Sparkle size={15} />
            Nâng cấp gói
          </button>
        </div>
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
            <Bubble key={i} role={m.role} text={m.content} sources={m.sources} />
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
          <span className="font-semibold text-slate-700">chốt Mua/Bán/Giữ</span>. Không cần dán dữ liệu tay.
        </div>
      )}

      {/* ô hỏi tiếp */}
      {hasConversation && (
        <div className="sticky bottom-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-md">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendQuestion()}
            disabled={streaming}
            placeholder="Hỏi thêm về mã này… (VD: vì sao biên lợi nhuận giảm?)"
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none disabled:opacity-60"
          />
          <button
            onClick={sendQuestion}
            disabled={streaming || !question.trim()}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Gửi <ArrowRight size={15} />
          </button>
        </div>
      )}

      </div>
    </div>
  )
}
