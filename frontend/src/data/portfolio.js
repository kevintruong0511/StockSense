// Client cho Sổ lệnh / Danh mục đầu tư. CRUD qua api() (Bearer token); phân tích AI
// qua streamSSE (SSE stream, dùng chung với phân tích mã).
import { api } from './auth.js'
import { streamSSE } from './sse.js'

// { trades:[…], holdings:[{ticker,qty,avgCost,invested,price,pctChange,marketValue,unrealizedPnl,unrealizedPct,realizedPnl,name,lastBuyDate}], asOf, asOfTime }
export const fetchPortfolio = () => api('/portfolio/trades', { auth: true })

// t = { ticker, side:'buy'|'sell', quantity, price, tradeDate, note }
export const addTrade = (t) =>
  api('/portfolio/trades', { method: 'POST', auth: true, body: t }).then((d) => d?.trade)

export const updateTrade = (id, t) =>
  api(`/portfolio/trades/${id}`, { method: 'PATCH', auth: true, body: t }).then((d) => d?.trade)

export const deleteTrade = (id) => api(`/portfolio/trades/${id}`, { method: 'DELETE', auth: true })

export const deleteTradesByTicker = (ticker) =>
  api(`/portfolio/trades/ticker/${encodeURIComponent(ticker)}`, { method: 'DELETE', auth: true })

// Stream AI phân tích danh mục. Trả về hàm abort().
export function streamPortfolioAnalyze({ model, onToken, onSources, onStatus, onReset, onDone, onError }) {
  return streamSSE({
    path: '/portfolio/analyze',
    body: { model },
    onEvent: (evt) => {
      if (evt.type === 'token') onToken?.(evt.text || '')
      else if (evt.type === 'sources') onSources?.(Array.isArray(evt.items) ? evt.items : [])
      else if (evt.type === 'status') onStatus?.({ phase: evt.phase, query: evt.query || '' })
      else if (evt.type === 'reset') onReset?.()
      else if (evt.type === 'done') {
        onDone?.()
        return true
      } else if (evt.type === 'error') {
        onError?.(evt.error || 'Lỗi không xác định từ AI.')
        return true
      }
    },
    onEnd: () => onDone?.(),
    onError,
  })
}
