// UI dùng chung cho các luồng phân tích AI: dải chip "Nguồn" + chỉ báo trạng thái
// (suy nghĩ / tìm web / soạn). Dùng ở màn Phân tích AI và Danh mục.
import { Search, Sparkle } from './icons.jsx'

// Tên miền gọn từ URL để hiển thị trên chip nguồn.
export function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

// Dải chip "Nguồn" AI đã tham chiếu (favicon + tên miền), bấm mở tab mới.
export function SourceChips({ items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
      <span className="mr-0.5 text-[11px] font-semibold text-slate-400">Nguồn</span>
      {items.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          title={s.title || s.url}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 no-underline transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <img
            src={`https://www.google.com/s2/favicons?domain=${hostOf(s.url)}&sz=32`}
            alt=""
            width={12}
            height={12}
            className="rounded-sm"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          {hostOf(s.url)}
        </a>
      ))}
    </div>
  )
}

// Chỉ báo trạng thái AI theo thời gian thực: suy nghĩ / tìm web (kèm từ khóa) / soạn.
// Ba chấm nảy + icon nhấp nháy để thấy AI đang làm việc thật, không chỉ "đang phân tích".
export function StatusIndicator({ status }) {
  const phase = status?.phase || 'thinking'
  const isSearch = phase === 'searching'
  const Icon = isSearch ? Search : Sparkle
  const label =
    phase === 'writing'
      ? 'Đang soạn phân tích…'
      : isSearch
        ? status?.query
          ? 'Đang tìm kiếm'
          : 'Đang tìm kiếm trên web…'
        : 'Đang suy nghĩ…'
  return (
    <div className="flex items-center gap-2 text-slate-500">
      <Icon size={15} className="shrink-0 animate-pulse text-blue-500" />
      <span className="text-sm">
        {label}
        {isSearch && status?.query && <span className="font-medium text-slate-700"> “{status.query}”</span>}
      </span>
      <span className="flex gap-1">
        {[0, 150, 300].map((d) => (
          <span
            key={d}
            className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </span>
    </div>
  )
}
