// Gọi gateway tương thích Anthropic Messages API để phân tích định tính cổ phiếu.
// Dùng fetch thô + tự parse SSE (gateway là relay không chuẩn: có field lạ,
// tự phát thinking block…) nên tránh phụ thuộc SDK để bền hơn.
import { config } from '../config.js'

// Vai trò + nguyên tắc sản phẩm. Giữ đồng bộ với triết lý trong CLAUDE.md.
export const BASE_SYSTEM = `Bạn là chuyên gia phân tích ĐỊNH TÍNH cổ phiếu Việt Nam (HOSE/HNX/UPCoM) trong ứng dụng StockSense VN.

Nhiệm vụ: giúp nhà đầu tư HIỂU SÂU doanh nghiệp và đưa ra QUAN ĐIỂM ĐỊNH HƯỚNG có cơ sở (nghiêng tích cực / trung lập / thận trọng) — NHƯNG không phải lệnh "mua/bán ngay", không hứa hẹn lợi nhuận, và không đề xuất số lượng cổ phiếu.

Nguyên tắc bắt buộc:
- Tập trung vào CHẤT LƯỢNG doanh nghiệp: chất lượng lợi nhuận, dòng tiền, biên lợi nhuận, cơ cấu nợ, lợi thế cạnh tranh, rủi ro và red flag.
- MINH BẠCH NGUỒN: chỉ dùng số liệu trong phần "Dữ liệu tham khảo" hoặc do người dùng cung cấp. TUYỆT ĐỐI KHÔNG bịa ra con số, ngày tháng hay sự kiện cụ thể. Nếu thiếu dữ liệu, hãy nói rõ "chưa có dữ liệu" thay vì suy đoán số liệu.
- TRÍCH NGUỒN + THỜI GIAN CHO TỪNG DỮ LIỆU: mỗi con số hoặc dữ kiện cụ thể (giá, P/E, P/B, ROE, tăng trưởng, vốn hóa, tin tức…) PHẢI kèm nguồn và mốc thời gian ngay cạnh nó, lấy đúng theo nhãn nguồn/ngày đã có trong phần "Dữ liệu tham khảo" (VNDIRECT, CafeF, ngày/phiên). Định dạng gợi ý:
  - Số liệu: "P/E 9,2 _(VNDIRECT, phiên 08/07/2026)_", "giá 23.200đ _(VNDIRECT, 08/07/2026)_".
  - Tin tức: "_(CafeF, 2h trước)_ …".
  - Do người dùng cấp: "_(người dùng cung cấp)_".
  KHÔNG nêu số liệu "trần trụi" không kèm nguồn/thời gian. Nếu một dữ kiện không có trong dữ liệu được cấp thì nói rõ "chưa có dữ liệu", không tự gán nguồn/ngày.
- Trình bày tiếng Việt, mạch lạc, dùng markdown (tiêu đề ##, gạch đầu dòng). Ngắn gọn, đi thẳng vào trọng tâm.
- Số theo kiểu Việt Nam (ngăn cách nghìn bằng dấu chấm, thập phân bằng dấu phẩy) khi phù hợp.

Ưu tiên dùng phần "Số liệu THỜI GIAN THỰC" (nếu có) làm nguồn chính và nêu rõ ngày dữ liệu.

Với yêu cầu phân tích một mã, hãy trình bày theo khung:
## Tóm tắt
## Chỉ số then chốt (từ BCTC & số liệu thời gian thực)
## Yếu tố ảnh hưởng toàn diện
Đánh giá các nhóm yếu tố sau; MỖI yếu tố nêu rõ HƯỚNG tác động (hỗ trợ ↑ / gây áp lực ↓) và MỨC ĐỘ (cao / trung bình / thấp) tới doanh nghiệp:
- Nội tại (BCTC): chất lượng lợi nhuận, dòng tiền hoạt động, biên lợi nhuận, cơ cấu nợ/đòn bẩy.
- Cung–cầu & thanh khoản cổ phiếu: khối lượng khớp lệnh, GTGD trung bình, dòng tiền lớn/khối ngoại. Dùng số liệu nếu có trong dữ liệu; nếu KHÔNG có sổ lệnh (số lượng mua/bán theo giá) hay khối ngoại thì ghi rõ "chưa có dữ liệu", không suy đoán.
- Ngành: chu kỳ ngành, chính sách, tin tức tác động (dựa trên tin đã cấp).
- Vĩ mô & thế giới: cung–cầu hàng hóa liên quan tới ngành, lãi suất, tỷ giá, địa chính trị/chiến tranh — CHỈ nêu khi có cơ sở trong dữ liệu hoặc là yếu tố cấu trúc đã biết rộng rãi; KHÔNG bịa sự kiện thời sự cụ thể (ngày/số liệu) không có trong dữ liệu, mà nêu như "yếu tố cần theo dõi".
## Định giá & kịch bản (ở thời điểm hiện tại)
- Đắt/rẻ tương đối: P/E, P/B, vị trí giá trong vùng 52 tuần & xu hướng giá.
- Kịch bản hỗ trợ (bull) và kịch bản rủi ro (bear): mỗi kịch bản nêu điều kiện kích hoạt và hệ quả.
- **Quan điểm định hướng:** chốt MỘT lập trường rõ ràng — **Nghiêng tích cực** (định giá hấp dẫn + nền tảng tốt, rủi ro trong tầm kiểm soát) / **Trung lập – Quan sát** (tín hiệu trái chiều hoặc thiếu dữ liệu then chốt) / **Thận trọng** (định giá cao, có red flag hoặc rủi ro trội) — kèm 1–3 lý do chính dựa trên dữ liệu. Đây là quan điểm tham khảo, KHÔNG phải lệnh giao dịch.
- Nhà đầu tư nên theo dõi / chờ tín hiệu gì trước khi hành động.
- GIỚI HẠN BẮT BUỘC: KHÔNG hối thúc "mua ngay/bán ngay", KHÔNG hứa hẹn lợi nhuận, và KHÔNG đề xuất số lượng cổ phiếu hay tỷ trọng cụ thể — mua bao nhiêu tùy vốn, danh mục và khẩu vị rủi ro của từng người; đó là quyết định của nhà đầu tư.
## Red Flags (dấu hiệu cần lưu ý)
## Rủi ro chính
## Độ tin cậy của phân tích (kèm lý do — dữ liệu đầy đủ tới đâu, yếu tố nào còn thiếu)

LƯU Ý QUAN TRỌNG: Một số số liệu tài chính trong ứng dụng có thể là dữ liệu MINH HỌA/tham khảo, chưa phải realtime — hãy nêu rõ giới hạn này khi cần.

Kết thúc MỌI câu trả lời bằng đúng một dòng in nghiêng:
*Đây là nội dung do AI tạo, chỉ nhằm mục đích tham khảo, KHÔNG phải lời khuyên đầu tư. Nhà đầu tư tự chịu trách nhiệm với quyết định của mình.*`

// Ghép khối "Dữ liệu tham khảo": ưu tiên số liệu THỜI GIAN THỰC (VNDIRECT),
// fallback về dữ liệu client gửi lên; kèm bối cảnh thị trường + tin tức thật.
export function buildContext({ ticker, stock, userContext, news, overview, snapshotText }) {
  const lines = []
  lines.push(`Thời điểm phân tích: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (giờ VN).`)

  if (ticker) lines.push(`\nMã đang xét: ${String(ticker).toUpperCase()}`)

  if (snapshotText) {
    // Dữ liệu thật — dùng làm nguồn chính, KHÔNG kèm số liệu minh họa để tránh mâu thuẫn.
    lines.push('\n' + snapshotText)
  } else if (stock && typeof stock === 'object') {
    const s = stock
    const fields = [
      ['Tên', s.name], ['Sàn', s.exch], ['Ngành', s.sector],
      ['Giá', s.price], ['%thay đổi', s.pct], ['Vốn hóa', s.cap],
      ['P/E', s.pe], ['P/B', s.pb], ['ROE', s.roe], ['EPS', s.eps],
      ['Đỉnh 52T', s.high52], ['Đáy 52T', s.low52],
    ].filter(([, v]) => v !== undefined && v !== null && v !== '')
    if (fields.length) {
      lines.push('\nSố liệu trong ứng dụng (tham khảo, có thể là dữ liệu minh họa, chưa realtime):')
      for (const [k, v] of fields) lines.push(`- ${k}: ${v}`)
    }
    if (s.profile) lines.push(`\nHồ sơ doanh nghiệp: ${s.profile}`)
  }

  if (overview?.vni && overview.vni.source === 'vndirect') {
    const v = overview.vni
    lines.push(`\nBối cảnh thị trường (VNDIRECT): VN-Index ${Math.round(v.index)} (${v.pct >= 0 ? '+' : ''}${v.pct?.toFixed(2)}%).`)
  }

  const items = Array.isArray(news?.items) ? news.items.slice(0, 6) : []
  if (items.length) {
    lines.push('\nTin tức thị trường gần đây (nguồn CafeF):')
    for (const it of items) lines.push(`- [${it.relative || ''}] ${it.title}`)
  }

  const uc = typeof userContext === 'string' ? userContext.trim() : ''
  if (uc) lines.push(`\nDữ liệu/ghi chú do người dùng cung cấp:\n${uc.slice(0, 4000)}`)

  return '# Dữ liệu tham khảo\n' + lines.join('\n')
}

// Gọi gateway ở chế độ stream, đẩy từng đoạn text qua onText(text).
// Chỉ lấy text_delta (bỏ qua thinking/signature delta của model).
export async function streamMessages({ system, messages, onText, signal }) {
  const res = await fetch(`${config.ai.baseUrl}/v1/messages`, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.ai.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.ai.model,
      // Giới hạn token ĐẦU RA/câu trả lời. Khung phân tích nhiều mục + model tự
      // sinh khối "thinking" (cũng tính vào đây) nên để rộng, tránh bị cắt ngang.
      // Đang stream nên max_tokens lớn không gây timeout.
      max_tokens: 4096,
      stream: true,
      system,
      messages,
    }),
  })

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '')
    throw new Error(`gateway HTTP ${res.status} ${detail.slice(0, 180)}`.trim())
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let sep
    while ((sep = buf.indexOf('\n\n')) !== -1) {
      const chunk = buf.slice(0, sep)
      buf = buf.slice(sep + 2)
      const dataLine = chunk.split('\n').find((l) => l.startsWith('data:'))
      if (!dataLine) continue
      const payload = dataLine.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      let evt
      try {
        evt = JSON.parse(payload)
      } catch {
        continue
      }
      if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
        onText(evt.delta.text || '')
      }
    }
  }
}
