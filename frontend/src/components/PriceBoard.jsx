import { useEffect, useRef, useState } from 'react'
import { Plus, Refresh, AlertCircle } from './icons.jsx'
import TickerPicker from './TickerPicker.jsx'
import { fetchPriceBoard, fetchPriceBoardGroup } from '../data/market.js'
import { fetchTickers } from '../data/ai.js'
import { tickerBadge } from '../data/stocks.js'

// Màu bảng điện chuẩn VN: trần = tím, sàn = lơ (cyan), tham chiếu = vàng, tăng = lá, giảm = đỏ.
const CEIL = '#8B5CF6'
const FLOORC = '#06B6D4'
const REF = '#CA8A04'
const UP = '#16A34A'
const DOWN = '#DC2626'

const WATCH_DEFAULT = ['FPT', 'HPG', 'VNM', 'VCB', 'MWG', 'CMG']
const WATCH_KEY = 'ss.watchlist'
const MAX_WATCH = 30

// Đọc/ghi danh mục theo dõi ở localStorage (DB hoá sau).
// Export cho thẻ "AI nhận định thị trường" gửi kèm danh mục khi phân tích.
export function loadWatch() {
  try {
    const arr = JSON.parse(localStorage.getItem(WATCH_KEY))
    if (Array.isArray(arr) && arr.length) return arr.map((c) => String(c).toUpperCase())
  } catch { /* dùng mặc định */ }
  return WATCH_DEFAULT
}
function saveWatch(list) {
  try { localStorage.setItem(WATCH_KEY, JSON.stringify(list)) } catch { /* bỏ qua */ }
}

// Giờ giao dịch VN (T2–T6, 9:00–15:15) — chỉ khi này mới poll cho đỡ tốn.
function isMarketHours() {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const wd = p.find((x) => x.type === 'weekday')?.value
  if (wd === 'Sat' || wd === 'Sun') return false
  const t = Number(p.find((x) => x.type === 'hour')?.value) * 60 + Number(p.find((x) => x.type === 'minute')?.value)
  return t >= 540 && t <= 915
}

// Màu ô giá khớp theo tương quan trần/sàn/tham chiếu.
function priceColor(r) {
  if (r.price == null) return '#94A3B8'
  if (r.ceiling != null && r.price >= r.ceiling) return CEIL
  if (r.floorPrice != null && r.price <= r.floorPrice) return FLOORC
  if (r.ref != null && r.price > r.ref) return UP
  if (r.ref != null && r.price < r.ref) return DOWN
  return REF
}

const vnd = (n) => (n == null ? '—' : n.toLocaleString('vi-VN'))
const pctStr = (p) => (p == null ? '—' : (p >= 0 ? '+' : '') + p.toFixed(2).replace('.', ',') + '%')
const chgStr = (c) => (c == null ? '—' : (c >= 0 ? '+' : '') + c.toLocaleString('vi-VN'))
function volShort(v) {
  if (v == null) return '—'
  if (v >= 1e6) return (v / 1e6).toFixed(2).replace('.', ',') + 'tr'
  if (v >= 1e3) return Math.round(v / 1e3).toLocaleString('vi-VN') + 'K'
  return v.toLocaleString('vi-VN')
}

// Bảng điện: tab Danh mục (sửa được) / VN30, giá thật cập nhật trong ngày (VNDIRECT, poll ~20s).
export default function PriceBoard() {
  const [tab, setTab] = useState('watch') // 'watch' | 'vn30'
  const [watch, setWatch] = useState(loadWatch)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [asOf, setAsOf] = useState(null)
  const [live, setLive] = useState(false) // đang trong giờ giao dịch (poll)
  const [adding, setAdding] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [universe, setUniverse] = useState([])
  const [reloadKey, setReloadKey] = useState(0) // tăng để nạp lại khi lỗi thoáng qua (nút "Thử lại")

  const watchKey = watch.join(',')

  useEffect(() => {
    fetchTickers().then((list) => Array.isArray(list) && setUniverse(list)).catch(() => {})
  }, [])

  // Nạp + poll khi đổi tab/danh mục.
  useEffect(() => {
    let cancelled = false
    let timer = null
    const load = async (initial) => {
      if (initial) setLoading(true)
      try {
        const r = tab === 'vn30' ? await fetchPriceBoardGroup('vn30') : await fetchPriceBoard(watch)
        if (cancelled) return
        if (r.source === 'unavailable') setError('Không tải được bảng giá.')
        else {
          setError(null)
          setRows(r.rows || [])
          setAsOf(r.asOfTime ? `${r.asOf} ${r.asOfTime}` : r.asOf)
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Không tải được bảng giá.')
      } finally {
        if (!cancelled && initial) setLoading(false)
      }
    }
    const open = isMarketHours()
    setLive(open)
    load(true)
    if (open) timer = setInterval(() => load(false), 20000)
    return () => { cancelled = true; if (timer) clearInterval(timer) }
  }, [tab, watchKey, reloadKey])

  const addCode = (code) => {
    const c = String(code || '').trim().toUpperCase()
    if (!c) return
    setWatch((list) => {
      if (list.includes(c) || list.length >= MAX_WATCH) return list
      const next = [...list, c]
      saveWatch(next)
      return next
    })
    setAddValue('')
    setAdding(false)
  }
  const removeCode = (code) => {
    setWatch((list) => {
      const next = list.filter((c) => c !== code)
      saveWatch(next)
      return next
    })
  }

  const editable = tab === 'watch'
  const tabBtn = (key, label, count) => (
    <button
      onClick={() => setTab(key)}
      className={
        'rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ' +
        (tab === key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100')
      }
    >
      {label}
      <span className={'ml-1.5 text-[11px] font-medium ' + (tab === key ? 'text-blue-100' : 'text-slate-400')}>
        {count}
      </span>
    </button>
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <h2 className="m-0 mr-1 text-base font-bold">Bảng giá</h2>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {tabBtn('watch', 'Danh mục', watch.length)}
          {tabBtn('vn30', 'VN30', 30)}
        </div>
        <div className="ml-auto flex items-center gap-2.5 text-[11.5px] text-slate-400">
          {live ? (
            <span className="inline-flex items-center gap-1 font-semibold text-green-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              Trực tiếp
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Refresh size={12} />
              Ngoài giờ
            </span>
          )}
          {asOf && <span className="tnum hidden sm:inline">Cập nhật {asOf}</span>}
        </div>
      </div>

      {/* thanh sửa danh mục */}
      {editable && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5">
          {adding ? (
            <>
              <TickerPicker
                value={addValue}
                onChange={setAddValue}
                universe={universe}
                onEnter={() => addCode(addValue)}
              />
              <button
                onClick={() => addCode(addValue)}
                className="rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-blue-700"
              >
                Thêm
              </button>
              <button
                onClick={() => { setAdding(false); setAddValue('') }}
                className="rounded-lg px-2 py-2 text-[13px] font-medium text-slate-500 hover:text-slate-800"
              >
                Hủy
              </button>
            </>
          ) : (
            <button
              onClick={() => setAdding(true)}
              disabled={watch.length >= MAX_WATCH}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={15} /> Thêm mã
            </button>
          )}
          <span className="text-[11.5px] text-slate-400">Danh mục lưu trên trình duyệt · tối đa {MAX_WATCH} mã</span>
        </div>
      )}

      {error ? (
        <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500">
          <AlertCircle size={18} className="text-red-500" /> {error}
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Refresh size={13} /> Thử lại
          </button>
        </div>
      ) : loading && rows.length === 0 ? (
        <div className="px-5 py-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 border-t border-slate-100 py-3 first:border-t-0">
              <div className="ss-skel h-8 w-8 rounded-lg" />
              <div className="ss-skel h-4 w-24" />
              <div className="ss-skel ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">
          Chưa có mã nào. Bấm <b>Thêm mã</b> để theo dõi.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="text-right text-[11px] uppercase tracking-[0.04em] text-slate-400">
                <th className="px-5 py-2.5 text-left font-semibold">Mã</th>
                <th className="px-2.5 py-2.5 font-semibold" style={{ color: REF }}>TC</th>
                <th className="px-2.5 py-2.5 font-semibold" style={{ color: CEIL }}>Trần</th>
                <th className="px-2.5 py-2.5 font-semibold" style={{ color: FLOORC }}>Sàn</th>
                <th className="px-2.5 py-2.5 font-semibold">Khớp</th>
                <th className="px-2.5 py-2.5 font-semibold">+/-</th>
                <th className="px-2.5 py-2.5 font-semibold">%</th>
                <th className="px-5 py-2.5 font-semibold">KL</th>
                {editable && <th className="w-8 px-2 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const b = tickerBadge(r.code)
                const pc = priceColor(r)
                return (
                  <tr key={r.code} className="group border-t border-slate-100 text-right">
                    <td className="px-5 py-3 text-left">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-[11px] font-bold"
                          style={{ background: b.bg, color: b.fg }}
                        >
                          {r.code.slice(0, 3)}
                        </div>
                        <div className="min-w-0 leading-tight">
                          <div className="tnum text-sm font-bold text-slate-900">{r.code}</div>
                          <div className="max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-slate-400">
                            {r.name || (r.floor ? r.floor : '')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="tnum px-2.5 py-3 text-[13px] font-semibold" style={{ color: REF }}>{vnd(r.ref)}</td>
                    <td className="tnum px-2.5 py-3 text-[13px]" style={{ color: CEIL }}>{vnd(r.ceiling)}</td>
                    <td className="tnum px-2.5 py-3 text-[13px]" style={{ color: FLOORC }}>{vnd(r.floorPrice)}</td>
                    <td className="tnum px-2.5 py-3 text-sm font-bold" style={{ color: pc }}>{vnd(r.price)}</td>
                    <td className="tnum px-2.5 py-3 text-[13px] font-semibold" style={{ color: pc }}>{chgStr(r.change)}</td>
                    <td className="px-2.5 py-3">
                      <span
                        className="tnum inline-block rounded-md px-2 py-[3px] text-[12.5px] font-bold"
                        style={{
                          color: pc,
                          background: r.pctChange == null ? 'transparent' : r.pctChange > 0 ? '#DCFCE7' : r.pctChange < 0 ? '#FEF2F2' : '#FEF9C3',
                        }}
                      >
                        {pctStr(r.pctChange)}
                      </span>
                    </td>
                    <td className="tnum px-5 py-3 text-[13px] text-slate-500">{volShort(r.volume)}</td>
                    {editable && (
                      <td className="px-2 py-3">
                        <button
                          onClick={() => removeCode(r.code)}
                          title="Bỏ khỏi danh mục"
                          className="rounded px-1 text-base leading-none text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
