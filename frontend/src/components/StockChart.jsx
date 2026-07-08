import { useLayoutEffect, useRef, useState } from 'react'

// Self-contained SVG candlestick + volume chart with a hover crosshair and
// OHLC tooltip. Ported from the design export's inline chart.
const H = 340
const PAD_T = 10
const PAD_R = 56
const PLOT_H = 232
const VOL_TOP = PAD_T + PLOT_H + 16
const VOL_H = 44

const fmt = (x) => Math.round(x).toLocaleString('vi-VN')

export default function StockChart({ candles = [], vols = [] }) {
  const ref = useRef(null)
  const [w, setW] = useState(760)
  const [hov, setHov] = useState(-1)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const ro = new ResizeObserver((es) => {
      const cw = es[0].contentRect.width
      if (cw) setW(Math.floor(cw))
    })
    ro.observe(node)
    if (node.clientWidth) setW(Math.floor(node.clientWidth))
    return () => ro.disconnect()
  }, [])

  const data = candles
  const plotW = Math.max(60, w - PAD_R)
  const n = data.length || 1

  let maxP = -Infinity
  let minP = Infinity
  data.forEach((c) => {
    if (c.high > maxP) maxP = c.high
    if (c.low < minP) minP = c.low
  })
  if (!isFinite(maxP)) {
    maxP = 1
    minP = 0
  }
  const padP = (maxP - minP) * 0.06 || 1
  maxP += padP
  minP -= padP
  const range = maxP - minP || 1
  const yP = (p) => PAD_T + ((maxP - p) / range) * PLOT_H
  const step = plotW / n
  const cw = Math.max(1, Math.min(13, step * 0.62))

  let maxV = 1
  vols.forEach((v) => {
    if (v.value > maxV) maxV = v.value
  })

  const els = []

  // grid lines + axis labels
  for (let g = 0; g <= 4; g++) {
    const t = g / 4
    const val = maxP - t * range
    const yy = PAD_T + t * PLOT_H
    els.push(<line key={'g' + g} x1={0} x2={plotW} y1={yy} y2={yy} stroke="#F1F5F9" strokeWidth={1} />)
    els.push(
      <text key={'gl' + g} x={plotW + 6} y={yy + 4} fill="#94A3B8" fontSize={11} fontFamily="Inter">
        {fmt(val)}
      </text>,
    )
  }

  // candles + volume bars
  data.forEach((c, i) => {
    const cx = i * step + step / 2
    const up = c.close >= c.open
    const color = up ? '#16A34A' : '#DC2626'
    els.push(<line key={'w' + i} x1={cx} x2={cx} y1={yP(c.high)} y2={yP(c.low)} stroke={color} strokeWidth={1} />)
    const oy = yP(c.open)
    const cyy = yP(c.close)
    const top = Math.min(oy, cyy)
    const bh = Math.max(1, Math.abs(cyy - oy))
    els.push(<rect key={'b' + i} x={cx - cw / 2} y={top} width={cw} height={bh} fill={color} />)
    const vv = vols[i] ? vols[i].value : 0
    const vh = (vv / maxV) * VOL_H
    els.push(
      <rect
        key={'v' + i}
        x={cx - cw / 2}
        y={VOL_TOP + VOL_H - vh}
        width={cw}
        height={vh}
        fill={up ? 'rgba(22,163,74,.35)' : 'rgba(220,38,38,.35)'}
      />,
    )
  })

  // date ticks
  const ticks = Math.min(6, n)
  for (let d = 0; d < ticks; d++) {
    const idx = Math.floor((d * (n - 1)) / (ticks - 1 || 1))
    const c = data[idx]
    if (!c) continue
    const dt = c.time.slice(5).split('-').reverse().join('/')
    els.push(
      <text key={'d' + d} x={idx * step + step / 2} y={H - 4} fill="#94A3B8" fontSize={11} fontFamily="Inter" textAnchor="middle">
        {dt}
      </text>,
    )
  }

  // last-price dashed line + label chip
  if (data.length) {
    const last = data[data.length - 1]
    const prev = data[data.length - 2] || { close: last.open }
    const ly = yP(last.close)
    const lup = last.close >= prev.close
    els.push(
      <line key="ll" x1={0} x2={plotW} y1={ly} y2={ly} stroke={lup ? '#16A34A' : '#DC2626'} strokeWidth={1} strokeDasharray="3 3" opacity={0.55} />,
    )
    els.push(<rect key="lt" x={plotW} y={ly - 9} width={PAD_R} height={18} rx={3} fill={lup ? '#16A34A' : '#DC2626'} />)
    els.push(
      <text key="ltx" x={plotW + PAD_R / 2} y={ly + 4} fill="#fff" fontSize={11} fontWeight={700} fontFamily="Inter" textAnchor="middle">
        {fmt(last.close)}
      </text>,
    )
  }

  // hover crosshair + OHLC tooltip
  const hoverEls = []
  if (hov >= 0 && data[hov]) {
    const hc = data[hov]
    const hx = hov * step + step / 2
    hoverEls.push(<line key="hx" x1={hx} x2={hx} y1={PAD_T} y2={VOL_TOP + VOL_H} stroke="#94A3B8" strokeWidth={1} strokeDasharray="3 3" />)
    const boxW = 138
    const boxH = 66
    const boxX = hx + 10 + boxW > plotW ? hx - 10 - boxW : hx + 10
    hoverEls.push(<rect key="hb" x={boxX} y={PAD_T} width={boxW} height={boxH} rx={8} fill="#0F172A" opacity={0.95} />)
    ;[
      ['Mở', hc.open],
      ['Cao', hc.high],
      ['Thấp', hc.low],
      ['Đóng', hc.close],
    ].forEach((r, ri) => {
      hoverEls.push(
        <text key={'hla' + ri} x={boxX + 11} y={PAD_T + 17 + ri * 13} fill="#94A3B8" fontSize={10.5} fontFamily="Inter">
          {r[0]}
        </text>,
      )
      hoverEls.push(
        <text key={'hva' + ri} x={boxX + boxW - 11} y={PAD_T + 17 + ri * 13} fill="#fff" fontSize={10.5} fontWeight={600} fontFamily="Inter" textAnchor="end">
          {fmt(r[1])}
        </text>,
      )
    })
  }

  const overlay = (
    <rect
      key="ov"
      x={0}
      y={0}
      width={plotW}
      height={H}
      fill="transparent"
      onMouseMove={(e) => {
        const rc = e.currentTarget.getBoundingClientRect()
        const mx = ((e.clientX - rc.left) / rc.width) * w
        const i = Math.floor(mx / step)
        if (i >= 0 && i < n) setHov(i)
      }}
      onMouseLeave={() => setHov(-1)}
    />
  )

  return (
    <div ref={ref} style={{ width: '100%', height: H + 'px' }}>
      <svg width={w} height={H} style={{ display: 'block' }}>
        {els}
        {hoverEls}
        {overlay}
      </svg>
    </div>
  )
}
