import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from './icons.jsx'

// Mã phổ biến (rổ vốn hóa lớn ~VN30) hiển thị khi chưa gõ gì.
const POPULAR_CODES = [
  'FPT', 'HPG', 'VCB', 'VHM', 'VNM', 'MWG', 'TCB', 'MBB', 'ACB', 'SSI',
  'VIC', 'GAS', 'MSN', 'VPB', 'CTG', 'BID', 'HDB', 'VRE', 'VJC', 'GVR',
  'PLX', 'SAB', 'POW', 'STB', 'TPB', 'SHB', 'BCM', 'VIB', 'DGC', 'HSG',
]

const floorStyle = (f) => {
  if (f === 'HOSE') return 'bg-blue-50 text-blue-600'
  if (f === 'HNX') return 'bg-green-50 text-green-600'
  return 'bg-amber-50 text-amber-600' // UPCoM / khác
}

// Combobox chọn mã: gõ để lọc trong toàn bộ danh sách, hoặc duyệt danh sách phổ biến.
export default function TickerPicker({ value, onChange, universe = [], onEnter }) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const boxRef = useRef(null)
  const listRef = useRef(null)

  const byCode = useMemo(() => {
    const m = new Map()
    for (const t of universe) m.set(t.code, t)
    return m
  }, [universe])

  const results = useMemo(() => {
    const q = (value || '').trim().toUpperCase()
    if (!q) {
      const items = POPULAR_CODES.map((c) => byCode.get(c) || { code: c, name: '', floor: 'HOSE' })
      return { label: 'Phổ biến', items }
    }
    if (universe.length === 0) return { label: '', items: [] }
    const starts = []
    const includes = []
    const nameHits = []
    for (const t of universe) {
      if (t.code === q) continue
      if (t.code.startsWith(q)) starts.push(t)
      else if (t.code.includes(q)) includes.push(t)
      else if (t.name && t.name.toUpperCase().includes(q)) nameHits.push(t)
    }
    const exact = byCode.get(q)
    const items = [...(exact ? [exact] : []), ...starts, ...includes, ...nameHits].slice(0, 40)
    return { label: items.length ? `${items.length} kết quả` : 'Không tìm thấy mã phù hợp', items }
  }, [value, universe, byCode])

  useEffect(() => setHi(0), [value, open])

  // Đóng khi click ra ngoài.
  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (code) => {
    onChange(code)
    setOpen(false)
  }

  const onKey = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHi((h) => Math.min(h + 1, results.items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHi((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && results.items[hi]) pick(results.items[hi].code)
      else {
        setOpen(false)
        onEnter?.()
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 focus-within:border-blue-500">
        <Search size={16} className="text-slate-400" />
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase())
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Gõ mã hoặc tên DN… (VD: FPT, VHM, Hòa Phát)"
          className="w-64 bg-transparent text-sm font-semibold uppercase text-slate-900 outline-none placeholder:font-normal placeholder:normal-case placeholder:text-slate-400"
        />
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 max-h-80 w-[380px] max-w-[86vw] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {results.label && (
            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {results.label}
            </div>
          )}
          {results.items.map((t, idx) => (
            <button
              key={t.code}
              type="button"
              onMouseEnter={() => setHi(idx)}
              onClick={() => pick(t.code)}
              className={
                'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ' +
                (idx === hi ? 'bg-blue-50' : 'hover:bg-slate-50')
              }
            >
              <span className="w-14 flex-none text-sm font-bold text-slate-900">{t.code}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{t.name}</span>
              {t.floor && (
                <span className={'flex-none rounded px-1.5 py-0.5 text-[10px] font-semibold ' + floorStyle(t.floor)}>
                  {t.floor}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
