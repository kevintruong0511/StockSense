import { useEffect, useRef, useState } from 'react'
import { Plus, Refresh, AlertCircle, ArrowRight } from './icons.jsx'
import TickerPicker from './TickerPicker.jsx'
import TickerLogo from './TickerLogo.jsx'
import { fetchPriceBoard, fetchPriceBoardGroup, fetchMovers } from '../data/market.js'
import { fetchTickers } from '../data/ai.js'
import { isMarketHours } from '../lib/marketHours.js'
import { CEIL, FLOORC, REF, priceColor, vnd, pctStr, chgStr, volShort, ratioStr, ratioStyle } from '../lib/priceFormat.js'
import { MAX_WATCH, loadWatch, saveWatch } from '../lib/watchlist.js'

// Re-export cho thẻ "AI nhận định thị trường" gửi kèm danh mục khi phân tích.
export { loadWatch }

// Tab dạng xếp hạng (đánh số thứ tự ở đầu).
const RANK_TABS = new Set(['gainers', 'losers'])

// Bảng điện nhiều mục: VN30 / Phổ biến nhất / Tăng mạnh nhất / Giảm mạnh nhất / Danh mục (sửa được).
// Giá thật cập nhật trong ngày (VNDIRECT, poll ~20s). onOpenStock(code): mở chi tiết mã khi click.
export default function PriceBoard({ onOpenStock }) {
  const [tab, setTab] = useState('active') // 'active' | 'vn30' | 'gainers' | 'losers' | 'watch'
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
  const [lookup, setLookup] = useState('') // ô "Tra cứu mã" — độc lập với danh mục theo dõi

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
        let r
        if (tab === 'vn30') r = await fetchPriceBoardGroup('vn30')
        else if (tab === 'watch') r = await fetchPriceBoard(watch)
        else {
          // active (phổ biến) / gainers / losers — cùng lấy từ 1 endpoint xếp hạng.
          const m = await fetchMovers(10)
          const list = tab === 'gainers' ? m.gainers : tab === 'losers' ? m.losers : m.active
          r = { rows: list || [], asOf: m.asOf, asOfTime: m.asOfTime, source: m.source }
        }
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

  // Tra cứu mã: mở thẳng màn chi tiết (biểu đồ + số liệu thật), không đụng danh mục theo dõi.
  const openLookup = (code) => {
    const c = String(code ?? lookup).trim().toUpperCase()
    if (!c || !onOpenStock) return
    onOpenStock(c)
    setLookup('')
  }

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
  const ranked = RANK_TABS.has(tab) // tăng/giảm mạnh → đánh số thứ tự
  // Thống kê: số mã có KL khớp trong ngày ≥ bình quân 20 phiên gần nhất (volRatio ≥ 1).
  const spikeCount = rows.reduce((n, r) => n + (r.volRatio != null && r.volRatio >= 1 ? 1 : 0), 0)
  const tabBtn = (key, label, count) => (
    <button
      onClick={() => setTab(key)}
      className={
        'rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ' +
        (tab === key
          ? 'bg-blue-600 text-white'
          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700')
      }
    >
      {label}
      <span
        className={
          'ml-1.5 text-[11px] font-medium ' + (tab === key ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500')
        }
      >
        {count}
      </span>
    </button>
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <h2 className="m-0 mr-1 text-base font-bold dark:text-white">Bảng giá</h2>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
          {tabBtn('active', 'Phổ biến', 10)}
          {tabBtn('vn30', 'VN30', 30)}
          {tabBtn('gainers', 'Tăng mạnh', 10)}
          {tabBtn('losers', 'Giảm mạnh', 10)}
          {tabBtn('watch', 'Danh mục', watch.length)}
        </div>
        <div className="ml-auto flex items-center gap-2.5 text-[11.5px] text-slate-400 dark:text-slate-500">
          {spikeCount > 0 && (
            <span
              className="hidden items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 font-semibold text-green-700 sm:inline-flex dark:bg-green-500/10 dark:text-green-400"
              title="Số mã đang hiển thị có khối lượng khớp trong ngày ≥ bình quân 20 phiên gần nhất"
            >
              {spikeCount} mã KL≥TB20
            </span>
          )}
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

      {/* tra cứu mã: gõ/chọn 1 mã bất kỳ → mở thẳng chi tiết + biểu đồ, không phụ thuộc tab đang xem */}
      {onOpenStock && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/30">
          <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">Tra cứu mã:</span>
          <TickerPicker
            value={lookup}
            onChange={setLookup}
            universe={universe}
            onEnter={() => openLookup()}
            onSelect={(code) => openLookup(code)}
          />
          <button
            onClick={() => openLookup()}
            disabled={!lookup.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Xem chi tiết
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* thanh sửa danh mục */}
      {editable && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 dark:border-slate-800 dark:bg-slate-800/30">
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
                className="rounded-lg px-2 py-2 text-[13px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Hủy
              </button>
            </>
          ) : (
            <button
              onClick={() => setAdding(true)}
              disabled={watch.length >= MAX_WATCH}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Plus size={15} /> Thêm mã
            </button>
          )}
          <span className="text-[11.5px] text-slate-400 dark:text-slate-500">
            Danh mục lưu trên trình duyệt · tối đa {MAX_WATCH} mã
          </span>
        </div>
      )}

      {error ? (
        <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500 dark:text-slate-400">
          <AlertCircle size={18} className="text-red-500 dark:text-red-400" /> {error}
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Refresh size={13} /> Thử lại
          </button>
        </div>
      ) : loading && rows.length === 0 ? (
        <div className="px-5 py-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 border-t border-slate-100 py-3 first:border-t-0 dark:border-slate-800">
              <div className="ss-skel h-8 w-8 rounded-lg" />
              <div className="ss-skel h-4 w-24" />
              <div className="ss-skel ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          {editable ? (
            <>Chưa có mã nào. Bấm <b>Thêm mã</b> để theo dõi.</>
          ) : (
            'Không có dữ liệu.'
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="text-right text-[11px] uppercase tracking-[0.04em] text-slate-400 dark:text-slate-500">
                <th className="px-5 py-2.5 text-left font-semibold">Mã</th>
                <th className="px-2.5 py-2.5 font-semibold" style={{ color: REF }}>TC</th>
                <th className="px-2.5 py-2.5 font-semibold" style={{ color: CEIL }}>Trần</th>
                <th className="px-2.5 py-2.5 font-semibold" style={{ color: FLOORC }}>Sàn</th>
                <th className="px-2.5 py-2.5 font-semibold">Khớp</th>
                <th className="px-2.5 py-2.5 font-semibold">+/-</th>
                <th className="px-2.5 py-2.5 font-semibold">%</th>
                <th className="px-2.5 py-2.5 font-semibold" title="Khối lượng khớp trong ngày">KL</th>
                <th className="px-2.5 py-2.5 font-semibold" title="Khối lượng khớp bình quân 20 phiên gần nhất">
                  TB20
                </th>
                <th
                  className="px-5 py-2.5 font-semibold"
                  title="Khối lượng khớp hôm nay so với bình quân 20 phiên gần nhất — ≥ 1× là đột biến"
                >
                  KL/TB20
                </th>
                {editable && <th className="w-8 px-2 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const pc = priceColor(r)
                return (
                  <tr key={r.code} className="group border-t border-slate-100 text-right dark:border-slate-800">
                    <td className="px-5 py-3 text-left">
                      <button
                        type="button"
                        onClick={() => onOpenStock?.(r.code)}
                        disabled={!onOpenStock}
                        className="flex items-center gap-2.5 rounded-lg text-left transition-opacity enabled:hover:opacity-70 disabled:cursor-default"
                        title={onOpenStock ? `Xem chi tiết ${r.code}` : undefined}
                      >
                        {ranked && (
                          <span className="tnum w-4 flex-none text-center text-[13px] font-extrabold text-slate-300 dark:text-slate-600">
                            {i + 1}
                          </span>
                        )}
                        <TickerLogo code={r.code} size={32} />
                        <div className="min-w-0 leading-tight">
                          <div className="tnum text-sm font-bold text-slate-900 dark:text-slate-100">{r.code}</div>
                          <div className="max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-slate-400 dark:text-slate-500">
                            {r.name || (r.floor ? r.floor : '')}
                          </div>
                        </div>
                      </button>
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
                          background:
                            r.pctChange == null
                              ? 'transparent'
                              : r.pctChange > 0
                                ? 'rgba(22,163,74,.14)'
                                : r.pctChange < 0
                                  ? 'rgba(220,38,38,.14)'
                                  : 'rgba(202,138,4,.14)',
                        }}
                      >
                        {pctStr(r.pctChange)}
                      </span>
                    </td>
                    <td className="tnum px-2.5 py-3 text-[13px] font-semibold text-slate-600 dark:text-slate-300">{volShort(r.volume)}</td>
                    <td className="tnum px-2.5 py-3 text-[13px] text-slate-400 dark:text-slate-500">{volShort(r.avgVol20)}</td>
                    <td className="px-5 py-3">
                      {r.volRatio == null ? (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      ) : (
                        <span
                          className="tnum inline-block rounded-md px-2 py-[3px] text-[12.5px] font-bold"
                          style={ratioStyle(r.volRatio)}
                          title={
                            r.avgVol20 != null
                              ? `Bình quân 20 phiên: ${volShort(r.avgVol20)} · KL hôm nay ${
                                  r.volRatio >= 1 ? 'CAO hơn' : 'thấp hơn'
                                } bình quân`
                              : undefined
                          }
                        >
                          {ratioStr(r.volRatio)}
                        </span>
                      )}
                    </td>
                    {editable && (
                      <td className="px-2 py-3">
                        <button
                          onClick={() => removeCode(r.code)}
                          title="Bỏ khỏi danh mục"
                          className="rounded px-1 text-base leading-none text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-slate-600"
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
