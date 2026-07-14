// Bộ render Markdown gọn nhẹ (không dùng thư viện) cho phần trả lời của AI.
// Hỗ trợ: tiêu đề #, in đậm **, in nghiêng *, code `, gạch đầu dòng - / *,
// danh sách số 1. , đường kẻ ---, và bảng | ... | (kể cả bảng không có dòng ngăn).

// Chip nguồn inline (favicon + tên miền), chèn ngay sau câu AI trích dẫn.
// Được sinh từ marker ⟦tên-miền|url⟧ mà data/ai.js chèn vào text theo citation.
function CiteChip({ domain, url }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={url}
      className="mx-0.5 inline-flex translate-y-px items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1.5 align-baseline text-[10.5px] font-medium text-slate-500 no-underline hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
    >
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
        alt=""
        width={11}
        height={11}
        className="rounded-[2px]"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
      {domain}
    </a>
  )
}

// ---- inline: **đậm**, *nghiêng*, `code`, [text](url), ⟦domain|url⟧ (chip nguồn),
//      [^n] (footnote → số mũ) ----
function parseInline(text) {
  const nodes = []
  const re = /(\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|⟦([^|⟧]+)\|(https?:\/\/[^⟧]+)⟧|\[\^([^\]]+)\])/
  let rest = text
  let k = 0
  while (rest) {
    const m = re.exec(rest)
    if (!m) {
      nodes.push(rest)
      break
    }
    if (m.index > 0) nodes.push(rest.slice(0, m.index))
    if (m[2] !== undefined) nodes.push(<strong key={k++} className="font-semibold text-slate-900 dark:text-white">{m[2]}</strong>)
    else if (m[3] !== undefined) nodes.push(<em key={k++}>{m[3]}</em>)
    else if (m[4] !== undefined) nodes.push(<code key={k++} className="rounded bg-slate-100 px-1 py-0.5 text-[12px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">{m[4]}</code>)
    else if (m[5] !== undefined) nodes.push(<a key={k++} href={m[6]} target="_blank" rel="noreferrer" className="text-blue-600 underline decoration-blue-300 underline-offset-2 hover:decoration-blue-600 dark:text-blue-400 dark:decoration-blue-500/50">{m[5]}</a>)
    else if (m[7] !== undefined) nodes.push(<CiteChip key={k++} domain={m[7]} url={m[8]} />)
    else if (m[9] !== undefined) nodes.push(<sup key={k++} className="ml-px text-[10px] font-semibold text-blue-500 dark:text-blue-400">{m[9]}</sup>)
    rest = rest.slice(m.index + m[0].length)
  }
  return nodes
}

const splitRow = (r) =>
  r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())

const isSeparator = (r) => /^\|?[\s:|-]+\|?$/.test(r) && r.includes('-')

function Table({ rows, k }) {
  const nonSep = rows.filter((r) => !isSeparator(r))
  if (nonSep.length === 0) return null
  const hasHeader = rows.length >= 2 && isSeparator(rows[1])
  const header = hasHeader ? splitRow(rows[0]) : null
  const body = (hasHeader ? nonSep.slice(1) : nonSep).map(splitRow)
  return (
    <div key={k} className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        {header && (
          <thead>
            <tr>
              {header.map((h, i) => (
                <th key={i} className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {parseInline(h)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((c, ci) => (
                <td
                  key={ci}
                  className={
                    'border border-slate-200 px-2.5 py-1.5 align-top dark:border-slate-700 ' +
                    (ci === 0 ? 'font-medium text-slate-700 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400')
                  }
                >
                  {parseInline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Markdown({ text = '' }) {
  // Tách định nghĩa footnote "[^n]: …" ra khỏi luồng chính, gom lại để render
  // thành mục "Ghi chú nguồn" gọn ở cuối (thay vì in nguyên văn giữa bài).
  const footnotes = []
  const lines = []
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const fn = /^\s*\[\^([^\]]+)\]:\s*(.*)$/.exec(raw)
    if (fn) footnotes.push({ label: fn[1], text: fn[2] })
    else lines.push(raw)
  }
  const blocks = []
  let i = 0
  let k = 0

  const isBreak = (t) =>
    t === '' ||
    /^(#{1,6})\s/.test(t) ||
    t.startsWith('|') ||
    /^[-*]\s+/.test(t) ||
    /^\d+\.\s+/.test(t) ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(t)

  while (i < lines.length) {
    const t = lines[i].trim()

    if (t === '') { i++; continue }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
      blocks.push(<hr key={k++} className="my-3 border-slate-200 dark:border-slate-700" />)
      i++
      continue
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(t)
    if (h) {
      const big = h[1].length <= 2
      blocks.push(
        <p key={k++} className={(big ? 'mt-3 mb-1 text-[15px] font-bold' : 'mt-2 mb-0.5 text-sm font-semibold') + ' text-slate-900 dark:text-white'}>
          {parseInline(h[2])}
        </p>,
      )
      i++
      continue
    }

    if (t.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim())
        i++
      }
      blocks.push(<Table key={k++} k={k} rows={rows} />)
      continue
    }

    if (/^[-*]\s+/.test(t)) {
      const items = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push(
        <ul key={k++} className="my-1 list-disc space-y-1 pl-5">
          {items.map((it, idx) => <li key={idx}>{parseInline(it)}</li>)}
        </ul>,
      )
      continue
    }

    if (/^\d+\.\s+/.test(t)) {
      const items = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push(
        <ol key={k++} className="my-1 list-decimal space-y-1 pl-5">
          {items.map((it, idx) => <li key={idx}>{parseInline(it)}</li>)}
        </ol>,
      )
      continue
    }

    const para = []
    while (i < lines.length && !isBreak(lines[i].trim())) {
      para.push(lines[i].trim())
      i++
    }
    blocks.push(<p key={k++} className="my-1 leading-relaxed">{parseInline(para.join(' '))}</p>)
  }

  return (
    <div>
      {blocks}
      {footnotes.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 dark:border-slate-800">
          {footnotes.map((f, idx) => (
            <p key={idx} className="text-[11.5px] leading-snug text-slate-400 dark:text-slate-500">
              <sup className="mr-1 font-semibold text-blue-500 dark:text-blue-400">{f.label}</sup>
              {parseInline(f.text)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
