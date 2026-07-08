import { useEffect, useRef, useState } from 'react'
import { Sparkle, ArrowRight, AlertCircle, InfoCircle } from '../components/icons.jsx'
import Markdown from '../components/Markdown.jsx'
import TickerPicker from '../components/TickerPicker.jsx'
import { STOCKS } from '../data/stocks.js'
import { streamAnalyze, fetchTickers } from '../data/ai.js'

// Bong bóng hội thoại. Assistant render markdown; user giữ văn bản thô.
// `children` (nếu có) dùng cho trạng thái đang stream/placeholder.
function Bubble({ role, text, children }) {
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
      </div>
    </div>
  )
}

export default function AiAnalysis({ aiEnabled }) {
  const [ticker, setTicker] = useState('FPT')
  const [userContext, setUserContext] = useState('')
  const [showContext, setShowContext] = useState(false)
  const [chat, setChat] = useState([]) // {role, content}
  const [live, setLive] = useState('') // đoạn assistant đang stream
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [question, setQuestion] = useState('')
  const [universe, setUniverse] = useState([]) // toàn bộ mã niêm yết (gợi ý)

  // Nạp danh sách mã thật từ VNDIRECT để autocomplete phủ mọi mã.
  useEffect(() => {
    fetchTickers().then((list) => Array.isArray(list) && setUniverse(list))
  }, [])

  const liveRef = useRef('')
  const abortRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chat, live])

  useEffect(() => () => abortRef.current?.(), []) // hủy stream khi rời màn

  function runSend(text, baseChat) {
    if (streaming || !text.trim()) return
    setError('')
    const msgs = [...baseChat, { role: 'user', content: text }]
    setChat(msgs)
    setLive('')
    liveRef.current = ''
    setStreaming(true)

    const t = ticker.trim().toUpperCase()
    abortRef.current = streamAnalyze({
      ticker: t || undefined,
      stock: STOCKS[t] || undefined,
      userContext: userContext.trim() || undefined,
      messages: msgs,
      onToken: (chunk) => {
        liveRef.current += chunk
        setLive(liveRef.current)
      },
      onDone: () => {
        const done = liveRef.current
        if (done) setChat((c) => [...c, { role: 'assistant', content: done }])
        liveRef.current = ''
        setLive('')
        setStreaming(false)
      },
      onError: (msg) => {
        const partial = liveRef.current
        if (partial) setChat((c) => [...c, { role: 'assistant', content: partial }])
        liveRef.current = ''
        setLive('')
        setStreaming(false)
        setError(msg)
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
              Máy chủ chưa cấu hình khóa API (<code>ANTHROPIC_API_KEY</code>). Thêm khóa vào file{' '}
              <code>backend/.env</code> (hoặc biến môi trường trên Render) rồi khởi động lại.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const hasConversation = chat.length > 0 || streaming

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      {/* header */}
      <div>
        <h1 className="m-0 flex items-center gap-2 text-2xl font-extrabold tracking-[-0.02em] text-slate-900">
          <Sparkle size={22} className="text-blue-600" />
          Phân tích AI
        </h1>
        <p className="m-0 mt-1 text-sm text-slate-500">
          Nhập mã bất kỳ trên HOSE — AI tự lấy số liệu <b>thời gian thực</b> (giá, P/E, P/B, ROE,
          vùng 52 tuần… từ VNDIRECT) và tin tức thật để phân tích. Hỏi thêm để đào sâu.
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
            <Bubble key={i} role={m.role} text={m.content} />
          ))}
          {streaming && (
            <Bubble role="assistant">
              {live ? (
                <>
                  <Markdown text={live} />
                  <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-blue-500 align-middle" />
                </>
              ) : (
                <span className="text-slate-400">Đang phân tích…</span>
              )}
            </Bubble>
          )}
          <div ref={bottomRef} />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Nhập mã (VD: FPT, HPG, VHM, DGC…) và bấm{' '}
          <span className="font-semibold text-slate-700">Phân tích</span> — AI tự nạp số liệu thời gian
          thực rồi bóc tách định giá, red flag và rủi ro. Không cần dán dữ liệu tay.
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

      {/* disclaimer bắt buộc ở mọi màn có nội dung AI */}
      <div className="flex items-start gap-2 rounded-lg bg-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-500">
        <InfoCircle size={16} className="mt-px flex-none" />
        <span>
          Nội dung do AI tạo, chỉ nhằm mục đích tham khảo và <b>không phải lời khuyên đầu tư</b>. Số
          liệu trong ứng dụng có thể là dữ liệu minh họa. Nhà đầu tư tự chịu trách nhiệm với quyết
          định của mình.
        </span>
      </div>
    </div>
  )
}
