// Bộ render Markdown gọn nhẹ (không dùng thư viện) cho phần trả lời của AI.
// Hỗ trợ: tiêu đề #, in đậm **, in nghiêng *, code `, gạch đầu dòng - / *,
// danh sách số 1. , đường kẻ ---, và bảng | ... | (kể cả bảng không có dòng ngăn).

// ---- inline: **đậm**, *nghiêng*, `code` ----
function parseInline(text) {
  const nodes = []
  const re = /(\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`]+)`)/
  let rest = text
  let k = 0
  while (rest) {
    const m = re.exec(rest)
    if (!m) {
      nodes.push(rest)
      break
    }
    if (m.index > 0) nodes.push(rest.slice(0, m.index))
    if (m[2] !== undefined) nodes.push(<strong key={k++} className="font-semibold text-slate-900">{m[2]}</strong>)
    else if (m[3] !== undefined) nodes.push(<em key={k++}>{m[3]}</em>)
    else if (m[4] !== undefined) nodes.push(<code key={k++} className="rounded bg-slate-100 px-1 py-0.5 text-[12px] text-slate-700">{m[4]}</code>)
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
                <th key={i} className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left font-semibold text-slate-700">
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
                <td key={ci} className={'border border-slate-200 px-2.5 py-1.5 align-top ' + (ci === 0 ? 'font-medium text-slate-700' : 'text-slate-600')}>
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
  const lines = text.replace(/\r\n/g, '\n').split('\n')
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
      blocks.push(<hr key={k++} className="my-3 border-slate-200" />)
      i++
      continue
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(t)
    if (h) {
      const big = h[1].length <= 2
      blocks.push(
        <p key={k++} className={(big ? 'mt-3 mb-1 text-[15px] font-bold' : 'mt-2 mb-0.5 text-sm font-semibold') + ' text-slate-900'}>
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

  return <div>{blocks}</div>
}
