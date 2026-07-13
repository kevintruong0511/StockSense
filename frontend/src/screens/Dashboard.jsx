import { useEffect, useState } from 'react'
import { Clock, LineChart, AlertCircle } from '../components/icons.jsx'
import { tickerBadge } from '../data/stocks.js'
import { fetchMarketOverview, fetchMarketNews, fetchTopAnalyzed } from '../data/market.js'
import PriceBoard from '../components/PriceBoard.jsx'
import MarketAiCard from '../components/MarketAiCard.jsx'

const UP = '#16A34A'
const DOWN = '#DC2626'
const BLUE = '#2563EB'

// Màu theo chiều VN-Index.
const vniColor = (pct) => (pct >= 0 ? UP : DOWN)

// Giờ hiện tại theo múi giờ Việt Nam (0–23). Dùng formatToParts + en-GB (24 giờ)
// để KHÔNG phụ thuộc cách trình duyệt render chuỗi 'hour12: false' — vài trình duyệt
// vẫn trả kiểu 12 giờ khiến 20h bị đọc thành 8 (→ chào nhầm "buổi sáng"). % 24 đưa
// mốc nửa đêm ('24') về 0.
function vnHour() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  return Number(parts.find((p) => p.type === 'hour')?.value) % 24
}

// Lời chào + emoji + lời chúc theo buổi trong ngày (giờ Việt Nam).
function greeting() {
  const h = vnHour()
  if (h < 5) return { hi: 'Chào bạn', emoji: '🌙', wish: 'Khuya rồi, nhớ giữ gìn sức khỏe nhé!' }
  if (h < 11) return { hi: 'Chào buổi sáng', emoji: '👋', wish: 'Chúc bạn một ngày giao dịch thuận lợi!' }
  if (h < 13) return { hi: 'Chào buổi trưa', emoji: '☀️', wish: 'Chúc bạn buổi trưa nghỉ ngơi thật thoải mái!' }
  if (h < 18) return { hi: 'Chào buổi chiều', emoji: '🌤️', wish: 'Chúc bạn một buổi chiều hiệu quả!' }
  if (h < 22) return { hi: 'Chào buổi tối', emoji: '🌆', wish: 'Chúc bạn buổi tối an lành bên gia đình!' }
  return { hi: 'Chào buổi tối', emoji: '🌙', wish: 'Khuya rồi, nghỉ ngơi sớm để giữ sức khỏe nhé!' }
}

// % thay đổi giá (số thật từ bảng giá) → chuỗi hiển thị + màu.
const pctFmt = (p) => (p == null ? '—' : (p >= 0 ? '+' : '') + p.toFixed(2).replace('.', ',') + '%')

// Định dạng chỉ số VN-Index.
const idxFmt = (n) =>
  n == null ? '—' : n.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Tính stat cards từ dữ liệu thị trường thật.
function buildDashStats(vni, breadth) {
  const pct = vni?.pct
  const deltaColor = pct != null ? vniColor(pct) : BLUE
  const deltaLabel = pct != null
    ? (pct >= 0 ? '+' : '') + pct.toFixed(2).replace('.', ',') + '% hôm nay'
    : 'đang cập nhật'
  return [
    {
      label: 'VN-Index',
      value: idxFmt(vni?.index),
      delta: deltaLabel,
      color: deltaColor,
    },
    {
      label: 'Mã tăng',
      value: breadth?.gainers != null ? String(breadth.gainers) : '…',
      delta:
        breadth?.gainers != null
          ? `trên ${breadth.gainers + breadth.losers + breadth.unchanged} mã rổ VN30`
          : 'đang cập nhật',
      color: UP,
    },
    {
      label: 'Mã giảm',
      value: breadth?.losers != null ? String(breadth.losers) : '…',
      delta:
        breadth?.gainers != null
          ? `${breadth.gainers} tăng · ${breadth.unchanged} đứng giá`
          : 'đang cập nhật',
      color: DOWN,
    },
    {
      label: 'Khối lượng',
      value: vni?.vol != null ? (vni.vol / 1e6).toFixed(1).replace('.', ',') + 'M' : '…',
      delta: 'khớp lệnh phiên hôm nay',
      color: BLUE,
    },
  ]
}

export default function Dashboard({ user, newsState: newsStateProp, onRetryNews, billing, onRefreshBilling, onNavigate }) {
  // Dữ liệu thị trường thật.
  const [dashStats, setDashStats] = useState(null)
  const [dashLoading, setDashLoading] = useState(true)
  const [dashError, setDashError] = useState(null)
  const [newsData, setNewsData] = useState(null)
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsError, setNewsError] = useState(null)
  const [topItems, setTopItems] = useState(null) // mã được phân tích nhiều (thật)
  const [topLoading, setTopLoading] = useState(true)

  const greet = greeting()

  // Gộp trạng thái news (user-triggered retry vs initial load).
  const effectiveNewsLoading = newsStateProp === 'loading' || (newsLoading && newsData === null)
  const effectiveNewsError = newsStateProp === 'error' || newsError
  const effectiveNewsReady = newsData !== null && newsStateProp !== 'error' && newsStateProp !== 'loading'

  useEffect(() => {
    setDashLoading(true)
    setDashError(null)
    fetchMarketOverview()
      .then((r) => {
        if (r.vni?.source === 'unavailable' && r.breadth?.source === 'unavailable') {
          setDashError('Không tải được dữ liệu thị trường.')
        } else {
          setDashStats(buildDashStats(r.vni, r.breadth))
        }
      })
      .catch((e) => setDashError(e.message))
      .finally(() => setDashLoading(false))
  }, [])

  useEffect(() => {
    setNewsLoading(true)
    setNewsError(null)
    fetchMarketNews(8)
      .then((r) => {
        if (r.source === 'unavailable') setNewsError('Không tải được tin tức.')
        else setNewsData(r.items || [])
      })
      .catch((e) => setNewsError(e.message))
      .finally(() => setNewsLoading(false))
  }, [])

  // Mã được phân tích nhiều nhất (đếm phiên chat thật) trong 7 ngày qua.
  useEffect(() => {
    setTopLoading(true)
    fetchTopAnalyzed(7, 5)
      .then((r) => setTopItems(Array.isArray(r.items) ? r.items : []))
      .catch(() => setTopItems([]))
      .finally(() => setTopLoading(false))
  }, [])

  return (
    <div>
      {/* heading */}
      <div className="mb-[22px] flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="m-0 mb-1 text-[26px] font-extrabold tracking-[-0.02em]">
            {greet.hi}
            {user?.name ? `, ${user.name}` : ''} {greet.emoji}
          </h1>
          <p className="m-0 text-sm text-slate-500">
            {greet.wish} Cùng xem diễn biến thị trường hôm nay.
          </p>
        </div>
        <div className="flex items-center gap-[7px] text-[12.5px] text-slate-400">
          <Clock size={14} />
          VN-Index, bảng giá &amp; tin tức cập nhật thật trong ngày (nguồn VNDIRECT/CafeF)
        </div>
      </div>

      {/* stat cards */}
      <div className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {dashLoading && !dashStats ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-[14px] border border-slate-200 bg-white px-5 py-[18px]">
              <div className="ss-skel mb-2 h-3 w-1/3" />
              <div className="ss-skel mb-1 h-7 w-2/3" />
              <div className="ss-skel h-3 w-1/2" />
            </div>
          ))
        ) : dashError ? (
          <div className="col-span-4 rounded-[14px] border border-slate-200 bg-white px-5 py-[18px] text-sm text-slate-500">
            {dashError}
          </div>
        ) : (
          dashStats.map((s) => (
            <div key={s.label} className="rounded-[14px] border border-slate-200 bg-white px-5 py-[18px]">
              <div className="mb-2 text-[12.5px] font-semibold text-slate-500">{s.label}</div>
              <div className="tnum mb-1 text-2xl font-extrabold tracking-[-0.02em]">{s.value}</div>
              <div className="tnum text-[13px] font-semibold" style={{ color: s.color }}>
                {s.delta}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid gap-5">
        {/* AI nhận định toàn cảnh thị trường: phiên + biến động + vĩ mô, kèm nguồn */}
        <MarketAiCard billing={billing} onRefreshBilling={onRefreshBilling} onNavigate={onNavigate} />

        {/* bảng điện — giá thật trong ngày (VNDIRECT), tab Danh mục/VN30, tự làm mới trong giờ giao dịch */}
        <PriceBoard />

        {/* two widgets */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
          {/* market news */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="m-0 text-base font-bold">Tin tức nổi bật</h2>
              <span className="text-xs text-slate-400">Nguồn: CafeF</span>
            </div>

            {effectiveNewsError && (
              <div className="px-5 py-[34px] text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
                  <AlertCircle size={22} className="text-red-600" />
                </div>
                <p className="m-0 mb-3 text-[13.5px] text-slate-600">
                  Không tải được tin tức. Vui lòng thử lại.
                </p>
                <button
                  onClick={onRetryNews}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Thử lại
                </button>
              </div>
            )}

            {effectiveNewsLoading && (
              <div className="px-5 pb-4 pt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border-t border-slate-100 py-3">
                    <div className="ss-skel mb-2 h-[13px] w-[90%]" />
                    <div className="ss-skel h-[11px] w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {effectiveNewsReady && (
              <div className="px-5 pb-2 pt-1">
                {newsData.map((n, idx) => (
                  <a
                    key={idx}
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block cursor-pointer border-t border-slate-100 py-[13px] transition-opacity hover:opacity-75"
                  >
                    <div className="text-[13.5px] font-semibold leading-[1.4] text-slate-800">
                      {n.title}
                    </div>
                    <div className="mt-[3px] text-[11.5px] text-slate-400">
                      CafeF · {n.relative}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* top analyzed — đếm phiên phân tích thật, % giá thật */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="m-0 text-base font-bold">Được phân tích nhiều</h2>
              <span className="inline-flex items-center gap-[5px] text-[11.5px] font-semibold text-blue-600">
                <LineChart size={13} />
                7 ngày qua
              </span>
            </div>
            <div className="px-3 pb-3 pt-1.5">
              {topLoading && topItems === null ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-[11px]">
                    <div className="ss-skel h-8 w-8 rounded-lg" />
                    <div className="ss-skel h-4 w-24" />
                    <div className="ss-skel ml-auto h-4 w-12" />
                  </div>
                ))
              ) : !topItems || topItems.length === 0 ? (
                <p className="m-0 px-3 py-8 text-center text-[13px] text-slate-400">
                  Chưa có mã nào được phân tích trong 7 ngày qua.
                </p>
              ) : (
                topItems.map((t, i) => {
                  const b = tickerBadge(t.code)
                  const color = t.pctChange == null ? '#94A3B8' : t.pctChange >= 0 ? UP : DOWN
                  return (
                    <div
                      key={t.code}
                      className="flex w-full items-center gap-3 rounded-[9px] px-2 py-[11px] text-left"
                    >
                      <span className="tnum w-5 text-center text-[13px] font-extrabold text-slate-300">
                        {i + 1}
                      </span>
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold"
                        style={{ background: b.bg, color: b.fg }}
                      >
                        {t.code.slice(0, 3)}
                      </div>
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="tnum text-[13.5px] font-bold">{t.code}</div>
                        <div className="text-[11.5px] text-slate-400">
                          {t.count.toLocaleString('vi-VN')} lượt phân tích
                        </div>
                      </div>
                      <span className="tnum text-[12.5px] font-bold" style={{ color }}>
                        {pctFmt(t.pctChange)}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
