import { useEffect, useRef } from 'react'
import { createChart, LineSeries, CrosshairMode } from 'lightweight-charts'

// Biểu đồ ĐƯỜNG VỐN cho kiểm chứng chiến lược: 2 đường so sánh — chiến lược vs VN-Index
// (mua & giữ) — cùng chuẩn hoá về 100 ở phiên đầu để nhìn tương quan hiệu quả. Dùng
// lightweight-charts (đã cài, giống PriceChart). Canvas → set màu trực tiếp qua applyOptions.
//
// equity / benchmark: [{ time(unix giây), value }] tăng dần theo time.
const STRAT = '#2563EB' // xanh primary — chiến lược
const BENCH = '#94A3B8' // xám — VN-Index (benchmark)

const PALETTE = {
  light: { bg: '#ffffff', text: '#334155', grid: '#F1F5F9', border: '#E2E8F0' },
  dark: { bg: '#0f172a', text: '#CBD5E1', grid: '#1E293B', border: '#334155' },
}

// Chuẩn hoá đường vốn về gốc 100 (theo giá trị phiên đầu) để 2 đường cùng thang.
function toBase100(series) {
  const list = Array.isArray(series) ? series.filter((p) => p && p.value != null) : []
  const base = list.length ? list[0].value : 0
  if (!base) return []
  return list.map((p) => ({ time: p.time, value: (p.value / base) * 100 }))
}

export default function EquityChart({ equity, benchmark, height = 320, theme = 'light' }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const stratRef = useRef(null)
  const benchRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#334155',
        fontFamily: 'Inter, system-ui, sans-serif',
        attributionLogo: false,
      },
      grid: { vertLines: { color: '#F1F5F9' }, horzLines: { color: '#F1F5F9' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#E2E8F0' },
      timeScale: { borderColor: '#E2E8F0', timeVisible: false, secondsVisible: false },
      localization: {
        locale: 'vi-VN',
        priceFormatter: (p) => p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      },
    })
    const bench = chart.addSeries(LineSeries, { color: BENCH, lineWidth: 2, priceLineVisible: false, lastValueVisible: true })
    const strat = chart.addSeries(LineSeries, { color: STRAT, lineWidth: 2, priceLineVisible: false, lastValueVisible: true })

    chartRef.current = chart
    stratRef.current = strat
    benchRef.current = bench
    return () => {
      chart.remove()
      chartRef.current = null
      stratRef.current = null
      benchRef.current = null
    }
  }, [])

  // Cập nhật dữ liệu khi đường vốn đổi.
  useEffect(() => {
    if (!stratRef.current || !benchRef.current) return
    stratRef.current.setData(toBase100(equity))
    benchRef.current.setData(toBase100(benchmark))
    chartRef.current?.timeScale().fitContent()
  }, [equity, benchmark])

  // Đổi màu theo Sáng/Tối.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const p = PALETTE[theme] || PALETTE.light
    chart.applyOptions({
      layout: { background: { color: p.bg }, textColor: p.text },
      grid: { vertLines: { color: p.grid }, horzLines: { color: p.grid } },
      rightPriceScale: { borderColor: p.border },
      timeScale: { borderColor: p.border },
    })
  }, [theme])

  return <div ref={containerRef} style={{ height, minHeight: 220, width: '100%' }} />
}
