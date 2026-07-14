// Line-style icons ported 1:1 from the StockSense design export.
// Every icon uses stroke="currentColor" so callers control color via
// Tailwind text-* classes or an inline `color` style.

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const Icon = ({ children, size = 18, ...rest }) => (
  <svg width={size} height={size} {...base} {...rest}>
    {children}
  </svg>
)

export const Sparkle = (p) => (
  <Icon {...p}>
    <path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" />
  </Icon>
)

export const Search = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </Icon>
)

export const ArrowRight = (p) => (
  <Icon strokeWidth={2.2} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
)

export const Grid = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </Icon>
)

export const LineChart = (p) => (
  <Icon {...p}>
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </Icon>
)

export const Compare = (p) => (
  <Icon {...p}>
    <path d="M16 3h5v5M8 21H3v-5M21 3l-7 7M3 21l7-7" />
  </Icon>
)

export const Upload = (p) => (
  <Icon {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </Icon>
)

export const Wallet = (p) => (
  <Icon {...p}>
    <path d="M19 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2" />
    <path d="M21 12a2 2 0 0 0-2-2h-3a2 2 0 0 0 0 4h3a2 2 0 0 0 2-2z" />
    <path d="M4 7h13" />
  </Icon>
)

export const ImageIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </Icon>
)

export const HistoryIcon = (p) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l3 2" />
  </Icon>
)

export const Bell = (p) => (
  <Icon {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Icon>
)

export const Clock = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
)

export const AlertCircle = (p) => (
  <Icon {...p}>
    <path d="M12 9v4M12 17h.01" />
    <circle cx="12" cy="12" r="9" />
  </Icon>
)

export const Flag = (p) => (
  <Icon strokeWidth={2.2} {...p}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <path d="M4 22v-7" />
  </Icon>
)

export const AlertTriangle = (p) => (
  <Icon strokeWidth={2.2} {...p}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Icon>
)

export const Refresh = (p) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </Icon>
)

export const DownloadFile = (p) => (
  <Icon {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </Icon>
)

export const InfoCircle = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4M12 8h.01" />
  </Icon>
)

export const FileDoc = (p) => (
  <Icon {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </Icon>
)

export const Check = (p) => (
  <Icon strokeWidth={2.4} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
)

export const Plus = (p) => (
  <Icon strokeWidth={2.2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const Trash = (p) => (
  <Icon {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </Icon>
)

export const BarChart3 = (p) => (
  <Icon strokeWidth={2.2} {...p}>
    <path d="M12 20V10M18 20V4M6 20v-4" />
  </Icon>
)

export const ClockSmall = (p) => (
  <Icon strokeWidth={2.2} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4l3 2" />
  </Icon>
)

export const CheckSquare = (p) => (
  <Icon strokeWidth={2.2} {...p}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </Icon>
)

export const Mail = (p) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Icon>
)

export const Lock = (p) => (
  <Icon {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icon>
)

export const User = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icon>
)

export const Eye = (p) => (
  <Icon {...p}>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
)

export const EyeOff = (p) => (
  <Icon {...p}>
    <path d="M9.9 5.2A10.6 10.6 0 0 1 12 5c7 0 11 7 11 7a18 18 0 0 1-3.2 3.9M6.1 6.1A18 18 0 0 0 1 12s4 7 11 7a10.6 10.6 0 0 0 4.1-.8" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M1 1l22 22" />
  </Icon>
)

export const LogOut = (p) => (
  <Icon {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </Icon>
)

export const Users = (p) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 5a3.5 3.5 0 0 1 0 7M21 20a6 6 0 0 0-4-5.7" />
  </Icon>
)

// fill điều khiển bằng prop `fill` (mặc định 'none'); khi đã like ta truyền fill="currentColor".
export const Heart = (p) => (
  <Icon {...p}>
    <path d="M12 20.7 4.5 13.2a4.6 4.6 0 0 1 6.5-6.5l1 1 1-1a4.6 4.6 0 0 1 6.5 6.5z" />
  </Icon>
)

export const Comment = (p) => (
  <Icon {...p}>
    <path d="M21 11.5a8 8 0 0 1-11.5 7.2L3 21l2.3-6.5A8 8 0 1 1 21 11.5z" />
  </Icon>
)

export const Send = (p) => (
  <Icon {...p}>
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
  </Icon>
)

export const Reply = (p) => (
  <Icon {...p}>
    <path d="M9 17l-5-5 5-5" />
    <path d="M4 12h11a5 5 0 0 1 5 5v2" />
  </Icon>
)

export const Close = (p) => (
  <Icon {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
)

export const BookOpen = (p) => (
  <Icon {...p}>
    <path d="M12 6.5C10.5 5.5 8.5 5 6 5H3v13h3c2.5 0 4.5.5 6 1.5" />
    <path d="M12 6.5C13.5 5.5 15.5 5 18 5h3v13h-3c-2.5 0-4.5.5-6 1.5" />
    <path d="M12 6.5v13" />
  </Icon>
)

export const Settings = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Icon>
)

export const Palette = (p) => (
  <Icon {...p}>
    <circle cx="13.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="17.5" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="6.5" cy="12.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="8.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    <path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.2 0-.8.7-1.5 1.5-1.5H16a6 6 0 0 0 6-6c0-4.4-4.5-8-10-8z" />
  </Icon>
)

export const Globe = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
  </Icon>
)

export const ChevronDown = (p) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
)
