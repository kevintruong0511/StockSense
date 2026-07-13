// Sổ lệnh / danh mục đầu tư: CRUD lệnh đã khớp + tính vị thế (giá vốn bình quân).
// Mọi hàm đọc/sửa đều kiểm ownership theo userId (mẫu như chat/history.js).
import { query } from '../db.js'

// pg trả NUMERIC dưới dạng chuỗi → ép về số để tính toán.
const num = (x) => (x == null ? 0 : Number(x))

// Chuẩn hóa 1 dòng lệnh trả cho client.
function mapTrade(r) {
  return {
    id: r.id,
    ticker: r.ticker,
    side: r.side,
    quantity: num(r.quantity),
    price: num(r.price),
    tradeDate: r.trade_date, // DATE trả về dạng chuỗi 'YYYY-MM-DD' (xem type parser ở db.js)
    note: r.note || null,
    createdAt: r.created_at,
  }
}

// Danh sách lệnh của user (cũ→mới để tính giá vốn theo thứ tự khớp).
export async function listTrades(userId, { ticker } = {}) {
  const params = [userId]
  let where = 'user_id = $1'
  if (ticker) {
    params.push(String(ticker).toUpperCase())
    where += ` AND ticker = $${params.length}`
  }
  const { rows } = await query(
    `SELECT id, ticker, side, quantity, price, trade_date, note, created_at
       FROM trades WHERE ${where}
      ORDER BY trade_date ASC, created_at ASC`,
    params,
  )
  return rows.map(mapTrade)
}

// Thêm lệnh. Trả về lệnh vừa tạo.
export async function addTrade(userId, { ticker, side, quantity, price, tradeDate, note }) {
  const { rows } = await query(
    `INSERT INTO trades (user_id, ticker, side, quantity, price, trade_date, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, ticker, side, quantity, price, trade_date, note, created_at`,
    [userId, String(ticker).toUpperCase(), side, quantity, price, tradeDate, note || null],
  )
  return mapTrade(rows[0])
}

// Sửa lệnh (kiểm ownership). Trả null nếu không thuộc user.
export async function updateTrade(userId, id, { ticker, side, quantity, price, tradeDate, note }) {
  const { rows } = await query(
    `UPDATE trades
        SET ticker = $3, side = $4, quantity = $5, price = $6, trade_date = $7, note = $8
      WHERE id = $1 AND user_id = $2
      RETURNING id, ticker, side, quantity, price, trade_date, note, created_at`,
    [id, userId, String(ticker).toUpperCase(), side, quantity, price, tradeDate, note || null],
  )
  return rows[0] ? mapTrade(rows[0]) : null
}

// Xóa lệnh. Trả true nếu có xóa.
export async function deleteTrade(userId, id) {
  const { rowCount } = await query(`DELETE FROM trades WHERE id = $1 AND user_id = $2`, [id, userId])
  return rowCount > 0
}

// Xóa toàn bộ lệnh của một mã trong sổ lệnh user.
export async function deleteTradesByTicker(userId, ticker) {
  const { rowCount } = await query(`DELETE FROM trades WHERE user_id = $1 AND ticker = $2`, [
    userId,
    String(ticker).toUpperCase(),
  ])
  return rowCount
}

// Tính vị thế từ danh sách lệnh (đã sắp cũ→mới) theo GIÁ VỐN BÌNH QUÂN.
// Trả { holdings: [{ticker, qty, avgCost, invested, lastBuyDate}], realized: {ticker: pnl} }.
// - holdings chỉ gồm vị thế ĐANG MỞ (qty > 0).
// - realized: lãi/lỗ đã hiện thực (cộng dồn qua các lần bán), theo TỪNG mã.
export function computeHoldings(trades) {
  const pos = new Map() // ticker -> { qty, cost, realized, lastBuyDate }
  for (const t of trades) {
    const p = pos.get(t.ticker) || { qty: 0, cost: 0, realized: 0, lastBuyDate: null }
    const q = num(t.quantity)
    const price = num(t.price)
    if (t.side === 'buy') {
      p.cost += q * price
      p.qty += q
      p.lastBuyDate = t.tradeDate
    } else {
      const avg = p.qty > 0 ? p.cost / p.qty : 0
      const sellQty = Math.min(q, Math.max(p.qty, 0)) // chỉ giảm phần đang nắm
      p.realized += (price - avg) * sellQty
      p.cost -= avg * sellQty
      p.qty -= q
    }
    pos.set(t.ticker, p)
  }

  const holdings = []
  const realized = {}
  for (const [ticker, p] of pos) {
    if (p.realized) realized[ticker] = p.realized
    if (p.qty > 1e-9) {
      holdings.push({
        ticker,
        qty: p.qty,
        avgCost: p.cost / p.qty,
        invested: p.cost,
        lastBuyDate: p.lastBuyDate,
      })
    }
  }
  holdings.sort((a, b) => b.invested - a.invested)
  return { holdings, realized }
}
