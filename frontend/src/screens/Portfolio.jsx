import { useEffect, useRef, useState } from 'react'
import { Sparkle, Plus, AlertCircle, Wallet, Trash } from '../components/icons.jsx'
import Markdown from '../components/Markdown.jsx'
import TickerPicker from '../components/TickerPicker.jsx'
import ModelToggle from '../components/ModelToggle.jsx'
import { SourceChips, StatusIndicator } from '../components/AiSources.jsx'
import {
  fetchPortfolio,
  addTrade,
  updateTrade,
  deleteTrade,
  deleteTradesByTicker,
  streamPortfolioAnalyze,
} from '../data/portfolio.js'
import { fetchTickers } from '../data/ai.js'
import { useAiRun, patchRun, getRun } from '../data/aiRunStore.js'
import { upDown } from '../data/stocks.js'

// Store bền cho luồng phân tích danh mục — sống qua chuyển màn (AI chạy tiếp ở nền).
const AI_KEY = 'portfolio'
const AI_INITIAL = { analyzing: false, text: '', sources: [], status: null, error: '', quotaHit: false, done: false }

// Định dạng số HIỂN THỊ theo chuẩn quốc tế (en-US: nghìn = phẩy, thập phân = chấm).
const vnd = (n) => (n == null ? '—' : Math.round(n).toLocaleString('en-US'))
const pct = (p) => (p == null ? '—' : (p >= 0 ? '+' : '') + p.toFixed(2) + '%')
const todayVN = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })

// Số tiền lãi/lỗ có dấu (đồng, làm tròn — không hiển thị lẻ cho gọn).
const signed = (n) => (n == null ? '—' : (n >= 0 ? '+' : '') + Math.round(n).toLocaleString('en-US'))

// Chỉ cho gõ chữ số + phân cách kiểu Việt ('.' nghìn, ',' thập phân) vào ô số.
const sanitizeNumInput = (s) => String(s ?? '').replace(/[^\d.,]/g, '')

// Số lượng cổ phiếu kiểu Việt: '.' phân cách nghìn, ',' thập phân (hiếm dùng).
// "1.000" → 1000 ; "1500" → 1500. NaN nếu sai.
function parseShares(s) {
  const t = String(s ?? '').trim().replace(/\s/g, '')
  if (!t) return NaN
  const normalized = t.replace(/\./g, '').replace(',', '.')
  if (!/^\d*\.?\d+$/.test(normalized)) return NaN
  return Number(normalized)
}

// Giá cổ phiếu nhập theo NGHÌN đồng — đúng cách niêm yết quen thuộc (71,25 = 71.250đ).
// Dấu chấm HOẶC phẩy đều là dấu THẬP PHÂN. Trả về ĐỒNG (đã ×1000). NaN nếu sai.
function parsePriceToVnd(s) {
  const t = String(s ?? '').trim().replace(/\s/g, '').replace(',', '.')
  if (!t || !/^\d*\.?\d+$/.test(t)) return NaN
  return Math.round(Number(t) * 1000)
}

// Giờ giao dịch VN (T2–T6, 9:00–15:15) — chỉ khi này mới poll giá cho đỡ tốn (mẫu PriceBoard).
function isMarketHours() {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const wd = p.find((x) => x.type === 'weekday')?.value
  if (wd === 'Sat' || wd === 'Sun') return false
  const t = Number(p.find((x) => x.type === 'hour')?.value) * 60 + Number(p.find((x) => x.type === 'minute')?.value)
  return t >= 540 && t <= 915
}

const emptyForm = () => ({ ticker: '', side: 'buy', quantity: '', price: '', tradeDate: todayVN(), note: '' })

export default function Portfolio({ billing, onRefreshBilling, onNavigate }) {
  const [trades, setTrades] = useState([])
  const [holdings, setHoldings] = useState([])
  const [asOf, setAsOf] = useState(null)
  const [asOfTime, setAsOfTime] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [universe, setUniverse] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingTicker, setDeletingTicker] = useState('')
  const [formError, setFormError] = useState('')

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

  // AI phân tích danh mục — state giữ trong store bền để không mất khi chuyển màn.
  const [aiRun] = useAiRun(AI_KEY, AI_INITIAL)
  const {
    analyzing,
    text: planText,
    sources: planSources,
    status: planStatus,
    error: planError,
    quotaHit,
    done: planDone,
  } = aiRun

  useEffect(() => {
    fetchTickers().then((l) => Array.isArray(l) && setUniverse(l)).catch(() => {})
  }, [])

  // Mặc định model theo gói: Free luôn Flash (khóa); Pro/Ultra mặc định Pro tới khi tự đổi.
  useEffect(() => {
    if (!canProModel) setModel('flash')
    else if (!userPickedModel.current) setModel('pro')
  }, [canProModel])
  const pickModel = (m) => {
    userPickedModel.current = true
    setModel(m)
  }

  // Nạp + poll danh mục (giá cập nhật trong giờ giao dịch).
  const refresh = async (initial) => {
    if (initial) setLoading(true)
    try {
      const d = await fetchPortfolio()
      setTrades(d?.trades || [])
      setHoldings(d?.holdings || [])
      setAsOf(d?.asOf || null)
      setAsOfTime(d?.asOfTime || null)
      setLoadError('')
    } catch (e) {
      setLoadError(e.message || 'Không tải được sổ lệnh.')
    } finally {
      if (initial) setLoading(false)
    }
  }
  useEffect(() => {
    let timer = null
    refresh(true)
    if (isMarketHours()) timer = setInterval(() => refresh(false), 20000)
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [])

  // KHÔNG hủy stream khi unmount — để AI chạy tiếp ở nền; state giữ trong store.

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const resetForm = () => {
    setForm(emptyForm())
    setEditingId(null)
    setFormError('')
  }

  async function submitTrade() {
    if (saving) return
    const ticker = form.ticker.trim().toUpperCase()
    const quantity = parseShares(form.quantity)
    const price = parsePriceToVnd(form.price)
    if (!/^[A-Z0-9]{2,10}$/.test(ticker)) return setFormError('Nhập mã cổ phiếu hợp lệ.')
    if (!Number.isFinite(quantity) || quantity <= 0) return setFormError('Số lượng phải lớn hơn 0.')
    if (!Number.isFinite(price) || price <= 0) return setFormError('Giá phải lớn hơn 0 (VD: 58.50 = 58.500đ).')
    if (!form.tradeDate) return setFormError('Chọn ngày giao dịch.')
    setSaving(true)
    setFormError('')
    const payload = {
      ticker,
      side: form.side,
      quantity,
      price,
      tradeDate: form.tradeDate,
      note: form.note.trim() || undefined,
    }
    try {
      if (editingId) await updateTrade(editingId, payload)
      else await addTrade(payload)
      resetForm()
      await refresh(false)
    } catch (e) {
      setFormError(e.message || 'Không lưu được lệnh.')
    } finally {
      setSaving(false)
    }
  }

  function editTrade(t) {
    // Ô NHẬP giữ quy ước gõ kiểu Việt (parseShares/parsePriceToVnd đọc '.'=nghìn, ','=thập phân):
    // giá nhập theo nghìn đồng, vd 58,50 = 58.500đ. (Khác phần HIỂN THỊ đã theo chuẩn quốc tế.)
    const toSharesInput = (n) => Number(n).toLocaleString('vi-VN')
    const toPriceInput = (n) => (Number(n) / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 3 })
    setEditingId(t.id)
    setForm({
      ticker: t.ticker,
      side: t.side,
      quantity: toSharesInput(t.quantity),
      price: toPriceInput(t.price),
      tradeDate: t.tradeDate,
      note: t.note || '',
    })
    setFormError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function removeTrade(id) {
    if (!window.confirm('Xóa lệnh này khỏi sổ lệnh?')) return
    try {
      await deleteTrade(id)
      if (editingId === id) resetForm()
      await refresh(false)
    } catch (e) {
      setLoadError(e.message || 'Không xóa được lệnh.')
    }
  }

  async function removeHolding(ticker) {
    const code = String(ticker || '').toUpperCase()
    if (!code) return
    if (!window.confirm(`Xóa ${code} khỏi danh mục? Toàn bộ lịch sử lệnh của mã này sẽ bị xóa.`)) return
    setDeletingTicker(code)
    setLoadError('')
    try {
      await deleteTradesByTicker(code)
      if (form.ticker.trim().toUpperCase() === code) resetForm()
      await refresh(false)
    } catch (e) {
      setLoadError(e.message || 'Không xóa được mã khỏi danh mục.')
    } finally {
      setDeletingTicker('')
    }
  }

  function runAnalyze() {
    if (getRun(AI_KEY)?.analyzing) return
    if (!holdings.length) {
      patchRun(AI_KEY, { error: 'Chưa có vị thế nào để phân tích. Hãy thêm lệnh mua trước.' })
      return
    }
    patchRun(AI_KEY, { analyzing: true, text: '', sources: [], status: { phase: 'thinking' }, error: '', quotaHit: false, done: false, abort: null })
    const abort = streamPortfolioAnalyze({
      model,
      onToken: (t) => patchRun(AI_KEY, (s) => ({ ...s, text: s.text + t })),
      onSources: (items) =>
        patchRun(AI_KEY, (s) => {
          const merged = [...s.sources]
          for (const it of items)
            if (it?.url && !merged.some((x) => x.url === it.url)) merged.push({ url: it.url, title: it.title || it.url })
          return { ...s, sources: merged }
        }),
      onStatus: (st) => st?.phase && patchRun(AI_KEY, { status: st }),
      onReset: () => patchRun(AI_KEY, { text: '' }),
      onDone: () => {
        patchRun(AI_KEY, { analyzing: false, status: null, done: true })
        onRefreshBilling?.()
      },
      onError: (msg, meta) => {
        if (meta?.code === 'quota_exceeded' || meta?.status === 429)
          patchRun(AI_KEY, { analyzing: false, status: null, quotaHit: true })
        else patchRun(AI_KEY, { analyzing: false, status: null, error: msg })
        onRefreshBilling?.()
      },
    })
    patchRun(AI_KEY, { abort })
  }

  // Tổng danh mục (lãi/lỗ chỉ tính trên vị thế có giá hiện tại).
  const totInvested = holdings.reduce((s, h) => s + (h.invested || 0), 0)
  const investedPriced = holdings.reduce((s, h) => s + (h.price != null ? h.invested || 0 : 0), 0)
  const totValue = holdings.reduce((s, h) => s + (h.marketValue != null ? h.marketValue : 0), 0)
  const totPnl = totValue - investedPriced
  const totPnlPct = investedPriced > 0 ? (totPnl / investedPriced) * 100 : null
  const totRealized = holdings.reduce((s, h) => s + (h.realizedPnl || 0), 0)

  const showPlanCard = analyzing || planText || planError || quotaHit || planDone

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      {/* header */}
      <div>
        <h1 className="m-0 flex items-center gap-2 text-2xl font-extrabold tracking-[-0.02em] text-slate-900">
          <Wallet size={22} className="text-blue-600" />
          Danh mục đầu tư
        </h1>
        <p className="m-0 mt-1 text-sm text-slate-500">
          Ghi lại lệnh <b>Mua/Bán đã khớp</b> → xem <b>giá vốn, lãi/lỗ</b> theo giá cập nhật trong ngày, rồi để{' '}
          <b>AI lập kế hoạch hành động</b> (Giữ / Mua thêm / Chốt lời / Cắt lỗ) cho từng mã.
        </p>
      </div>

      {/* form thêm/sửa lệnh */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
          {editingId ? 'Sửa lệnh' : 'Thêm lệnh'}
          {editingId && (
            <button onClick={resetForm} className="text-xs font-medium text-slate-400 hover:text-slate-700">
              (hủy sửa)
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Mã cổ phiếu</span>
            <TickerPicker
              value={form.ticker}
              onChange={(v) => setField('ticker', v)}
              universe={universe}
              onEnter={submitTrade}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Loại lệnh</span>
            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setField('side', 'buy')}
                className={
                  'rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ' +
                  (form.side === 'buy' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800')
                }
              >
                Mua
              </button>
              <button
                type="button"
                onClick={() => setField('side', 'sell')}
                className={
                  'rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ' +
                  (form.side === 'sell' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800')
                }
              >
                Bán
              </button>
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Số lượng (cp)</span>
            <input
              type="text"
              inputMode="decimal"
              value={form.quantity}
              onChange={(e) => setField('quantity', sanitizeNumInput(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && submitTrade()}
              placeholder="VD: 1.000"
              className="tnum w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Giá khớp (nghìn đ/cp)</span>
            <input
              type="text"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setField('price', sanitizeNumInput(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && submitTrade()}
              placeholder="VD: 58.50"
              className="tnum w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Ngày</span>
            <input
              type="date"
              value={form.tradeDate}
              max={todayVN()}
              onChange={(e) => setField('tradeDate', e.target.value)}
              className="tnum rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          </label>

          <label className="flex min-w-[160px] flex-1 flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Ghi chú (tùy chọn)</span>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setField('note', e.target.value)}
              placeholder="Lý do vào/ra lệnh…"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          </label>

          <button
            onClick={submitTrade}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={16} />
            {editingId ? 'Lưu' : 'Thêm lệnh'}
          </button>
        </div>
        {formError && (
          <div className="mt-2.5 flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle size={15} /> {formError}
          </div>
        )}
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{loadError}</span>
        </div>
      )}

      {/* vị thế đang nắm + nút AI */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <h2 className="m-0 mr-1 text-base font-bold">Vị thế đang nắm</h2>
          {asOf && (
            <span className="tnum text-[11.5px] text-slate-400">
              Giá tới {asOf}
              {asOfTime ? ` ${asOfTime}` : ''}
            </span>
          )}
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
              disabled={analyzing || holdings.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkle size={16} />
              AI phân tích danh mục
            </button>
          </div>
        </div>

        {loading && holdings.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Đang tải…</div>
        ) : holdings.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            Chưa có vị thế nào. Thêm lệnh <b>Mua</b> ở trên để bắt đầu theo dõi danh mục.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="text-right text-[11px] uppercase tracking-[0.04em] text-slate-400">
                  <th className="px-5 py-2.5 text-left font-semibold">Mã</th>
                  <th className="px-2.5 py-2.5 font-semibold">KL</th>
                  <th className="px-2.5 py-2.5 font-semibold">Giá vốn TB</th>
                  <th className="px-2.5 py-2.5 font-semibold">Giá hiện tại</th>
                  <th className="px-2.5 py-2.5 font-semibold">% hôm nay</th>
                  <th className="px-2.5 py-2.5 font-semibold">Giá trị</th>
                  <th className="px-2.5 py-2.5 font-semibold">Lãi/lỗ</th>
                  <th className="px-5 py-2.5 font-semibold">Đã hiện thực</th>
                  <th className="w-12 px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.ticker} className="group border-t border-slate-100 text-right">
                    <td className="px-5 py-3 text-left">
                      <div className="tnum text-sm font-bold text-slate-900">{h.ticker}</div>
                      {h.name && (
                        <div className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-slate-400">
                          {h.name}
                        </div>
                      )}
                    </td>
                    <td className="tnum px-2.5 py-3 text-[13px] text-slate-700">{vnd(h.qty)}</td>
                    <td className="tnum px-2.5 py-3 text-[13px] text-slate-700">{vnd(h.avgCost)}</td>
                    <td className="tnum px-2.5 py-3 text-[13px] font-semibold text-slate-900">{vnd(h.price)}</td>
                    <td className="tnum px-2.5 py-3 text-[13px]" style={{ color: h.pctChange == null ? '#94A3B8' : upDown(h.pctChange) }}>
                      {pct(h.pctChange)}
                    </td>
                    <td className="tnum px-2.5 py-3 text-[13px] text-slate-700">{vnd(h.marketValue)}</td>
                    <td className="tnum px-2.5 py-3 text-[13px] font-semibold" style={{ color: h.unrealizedPnl == null ? '#94A3B8' : upDown(h.unrealizedPnl) }}>
                      {signed(h.unrealizedPnl)}
                      {h.unrealizedPct != null && (
                        <span className="ml-1 text-[11px] font-medium">({pct(h.unrealizedPct)})</span>
                      )}
                    </td>
                    <td className="tnum px-5 py-3 text-[13px]" style={{ color: h.realizedPnl ? upDown(h.realizedPnl) : '#94A3B8' }}>
                      {h.realizedPnl ? signed(h.realizedPnl) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => removeHolding(h.ticker)}
                        disabled={deletingTicker === h.ticker}
                        title={`Xóa ${h.ticker} khỏi danh mục`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 text-right text-[13px] font-bold">
                  <td className="px-5 py-3 text-left text-slate-500">Tổng</td>
                  <td />
                  <td />
                  <td />
                  <td />
                  <td className="tnum px-2.5 py-3 text-slate-900">{vnd(totValue)}</td>
                  <td className="tnum px-2.5 py-3" style={{ color: upDown(totPnl) }}>
                    {signed(totPnl)}
                    {totPnlPct != null && <span className="ml-1 text-[11px] font-medium">({pct(totPnlPct)})</span>}
                  </td>
                  <td className="tnum px-5 py-3" style={{ color: totRealized ? upDown(totRealized) : '#94A3B8' }}>
                    {totRealized ? signed(totRealized) : '—'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* kế hoạch AI */}
      {showPlanCard && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
            <Sparkle size={18} className="text-blue-600" />
            Kế hoạch AI cho danh mục
          </div>

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
          ) : planError ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={18} />
              <span>{planError}</span>
            </div>
          ) : planText ? (
            <div className="text-sm leading-relaxed text-slate-800">
              <Markdown text={planText} />
              {analyzing && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-blue-500 align-middle" />}
              <SourceChips items={planSources} />
            </div>
          ) : (
            <StatusIndicator status={planStatus} />
          )}
        </div>
      )}

      {/* lịch sử lệnh */}
      {trades.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="m-0 text-base font-bold">Lịch sử lệnh</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="text-right text-[11px] uppercase tracking-[0.04em] text-slate-400">
                  <th className="px-5 py-2.5 text-left font-semibold">Ngày</th>
                  <th className="px-2.5 py-2.5 text-left font-semibold">Loại</th>
                  <th className="px-2.5 py-2.5 text-left font-semibold">Mã</th>
                  <th className="px-2.5 py-2.5 font-semibold">KL</th>
                  <th className="px-2.5 py-2.5 font-semibold">Giá</th>
                  <th className="px-2.5 py-2.5 font-semibold">Giá trị</th>
                  <th className="px-2.5 py-2.5 text-left font-semibold">Ghi chú</th>
                  <th className="w-16 px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {trades
                  .slice()
                  .reverse()
                  .map((t) => (
                    <tr key={t.id} className="group border-t border-slate-100 text-right">
                      <td className="tnum px-5 py-3 text-left text-[13px] text-slate-600">{t.tradeDate}</td>
                      <td className="px-2.5 py-3 text-left">
                        <span
                          className="rounded-md px-2 py-0.5 text-[12px] font-bold"
                          style={
                            t.side === 'buy'
                              ? { color: '#16A34A', background: '#DCFCE7' }
                              : { color: '#DC2626', background: '#FEF2F2' }
                          }
                        >
                          {t.side === 'buy' ? 'Mua' : 'Bán'}
                        </span>
                      </td>
                      <td className="tnum px-2.5 py-3 text-left text-[13px] font-bold text-slate-900">{t.ticker}</td>
                      <td className="tnum px-2.5 py-3 text-[13px] text-slate-700">{vnd(t.quantity)}</td>
                      <td className="tnum px-2.5 py-3 text-[13px] text-slate-700">{vnd(t.price)}</td>
                      <td className="tnum px-2.5 py-3 text-[13px] text-slate-500">{vnd(t.quantity * t.price)}</td>
                      <td className="max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap px-2.5 py-3 text-left text-[12.5px] text-slate-500">
                        {t.note || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => editTrade(t)}
                            title="Sửa lệnh"
                            className="rounded px-1.5 text-[12px] font-semibold text-slate-400 hover:text-blue-600"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => removeTrade(t.id)}
                            title="Xóa lệnh"
                            className="rounded px-1 text-base leading-none text-slate-300 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
