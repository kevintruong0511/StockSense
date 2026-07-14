import { useEffect, useRef } from 'react'
import { createChart, CandlestickSeries, HistogramSeries, CrosshairMode } from 'lightweight-charts'

// Biểu đồ nến + khối lượng bằng lightweight-charts (thư viện mã nguồn mở của TradingView).
// Nến THẬT lấy từ VNDIRECT (backend /stocks/candles) — không phụ thuộc feed TradingView,
// nên chạy tốt cho cổ phiếu Việt (HOSE/HNX/UPCoM). Giá theo VND.
//
// candles: [{ time(unix giây), open, high, low, close, volume }] tăng dần theo time.
const UP = '#16A34A'
const DOWN = '#DC2626'

export default function PriceChart({ candles, height = '72vh', precision = 0 }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const candleRef = useRef(null)
  const volRef = useRef(null)

  // Tạo chart 1 lần.
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
      timeScale: { borderColor: '#E2E8F0', timeVisible: true, secondsVisible: false },
      localization: {
        locale: 'vi-VN',
        priceFormatter: (p) =>
          p.toLocaleString('en-US', { minimumFractionDigits: precision, maximumFractionDigits: precision }),
      },
    })
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderVisible: false,
      wickUpColor: UP,
      wickDownColor: DOWN,
      priceFormat: { type: 'price', precision, minMove: precision > 0 ? 1 / 10 ** precision : 1 },
    })
    candle.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.28 } })
    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay ở đáy, thang riêng
    })
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })

    chartRef.current = chart
    candleRef.current = candle
    volRef.current = vol
    return () => {
      chart.remove()
      chartRef.current = null
      candleRef.current = null
      volRef.current = null
    }
  }, [])

  // Cập nhật dữ liệu khi candles đổi.
  useEffect(() => {
    if (!candleRef.current || !volRef.current) return
    const list = Array.isArray(candles) ? candles : []
    candleRef.current.setData(
      list.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })),
    )
    volRef.current.setData(
      list.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(22,163,74,.4)' : 'rgba(220,38,38,.4)',
      })),
    )
    // Backend đã cắt nến về đúng cửa sổ của preset → chỉ cần fit toàn bộ vào khung nhìn.
    chartRef.current?.timeScale().fitContent()
  }, [candles])

  return <div ref={containerRef} style={{ height, minHeight: 240, width: '100%' }} />
}
