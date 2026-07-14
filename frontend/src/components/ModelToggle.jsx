// Nút chọn model AI (Flash / Pro). Free bị khóa ở Flash (nút Pro disabled + 🔒).
// Dùng ở màn Phân tích AI và Danh mục để luôn thấy/đổi được model.
export default function ModelToggle({ model, canPro, disabled, onPick, compact = false }) {
  const size = compact ? 'px-2 py-1 text-[11.5px]' : 'px-2.5 py-1.5 text-[12.5px]'
  const label = (m) => (compact ? '' : 'V4 ') + m
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
      <button
        type="button"
        onClick={() => onPick('flash')}
        disabled={disabled}
        title="DeepSeek V4 Flash — nhanh, tiết kiệm"
        className={
          `rounded-md ${size} font-semibold transition-colors disabled:cursor-not-allowed ` +
          (model === 'flash'
            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100')
        }
      >
        {label('Flash')}
      </button>
      <button
        type="button"
        onClick={() => canPro && onPick('pro')}
        disabled={disabled || !canPro}
        title={canPro ? 'DeepSeek V4 Pro — phân tích sâu nhất' : 'Chỉ dành cho gói Pro/Ultra — nâng cấp để dùng'}
        className={
          `flex items-center gap-1 rounded-md ${size} font-semibold transition-colors ` +
          (!canPro
            ? 'cursor-not-allowed text-slate-400 dark:text-slate-600'
            : model === 'pro'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100')
        }
      >
        {label('Pro')} {!canPro && <span aria-hidden>🔒</span>}
      </button>
    </div>
  )
}
