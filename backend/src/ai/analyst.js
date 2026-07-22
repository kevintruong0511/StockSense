// Gọi DeepSeek qua endpoint TƯƠNG THÍCH ANTHROPIC (api.deepseek.com/anthropic) để
// phân tích cổ phiếu Việt Nam. Dùng lại @anthropic-ai/sdk để: (1) stream token,
// (2) bật tool web_search server-side. DeepSeek BỎ QUA citations gốc → không có chip
// inline; thay vào đó ta bóc URL từ block web_search_tool_result (onSource) để
// frontend hiện danh sách "Nguồn tham khảo".
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';

// Khởi tạo lười để không throw khi chưa cấu hình DEEPSEEK_API_KEY (AI tắt).
let _client = null;
function client() {
  if (!_client) {
    _client = new Anthropic({
      apiKey: config.ai.apiKey,
      ...(config.ai.baseUrl ? { baseURL: config.ai.baseUrl } : {}),
    });
  }
  return _client;
}

// Vai trò + khung phân tích. Vào thẳng, RA QUYẾT ĐỊNH Mua/Bán/Giữ, không disclaimer.
export const BASE_SYSTEM = `Bạn là chuyên gia phân tích cổ phiếu Việt Nam (HOSE/HNX/UPCoM) trong ứng dụng StockSense VN.

Nhiệm vụ: phân tích sâu doanh nghiệp và ĐƯA RA QUYẾT ĐỊNH đầu tư rõ ràng — MUA / BÁN / GIỮ — tại thời điểm hiện tại.

Cách làm:
- RESEARCH KỸ bằng web_search TRƯỚC KHI kết luận. Tìm NHIỀU truy vấn, mỗi truy vấn cho một khía cạnh riêng: kết quả kinh doanh quý gần nhất, tin/sự kiện doanh nghiệp, khối ngoại mua/bán ròng, biến động & chính sách ngành, định giá so sánh cùng ngành, yếu tố vĩ mô, PHÂN TÍCH KỸ THUẬT (hỗ trợ/kháng cự, đường MA, xu hướng, mẫu hình). ĐỪNG dừng ở 1–2 lần tìm — dùng đủ ngân sách tìm kiếm để phủ hết các góc, rồi HOÀN TẤT phân tích ngay trong lượt này (đừng dừng lại để "chờ" hay hỏi lại). Với số liệu/sự kiện then chốt, đối chiếu ít nhất 2 nguồn. Ưu tiên nguồn uy tín (CafeF, Vietstock, VNDIRECT, SSI, báo chính thống).
- Dùng số liệu ở phần "Dữ liệu tham khảo" làm nền, kết hợp thông tin tìm được. TUYỆT ĐỐI KHÔNG bịa số/ngày/sự kiện; nếu thiếu thì nói rõ "chưa có dữ liệu".
- TRÍCH NGUỒN THEO TỪNG LUẬN ĐIỂM: mỗi câu ý chính / số liệu lấy từ web phải dựa trên kết quả web_search để hệ thống **tự gắn trích dẫn (citation) NGAY SAU CÂU đó**. TUYỆT ĐỐI KHÔNG tự gõ tên nguồn trong ngoặc (đừng viết "(CafeF)", "(Vietstock)", "(theo …)") — ứng dụng tự hiển thị chip nguồn từ citation. Số liệu lấy từ "Dữ liệu tham khảo" (không phải web) thì ghi nhãn nguồn/ngày như đã cho sẵn.
- Trình bày tiếng Việt, mạch lạc, dùng markdown. Số kiểu Việt Nam (nghìn ngăn bằng dấu chấm, thập phân bằng dấu phẩy).

Đi THẲNG vào phân tích, không rào đón. Trình bày theo khung:
## Tóm tắt & Luận điểm chính
## Chỉ số then chốt
Định giá (P/E, P/B, P/S), hiệu quả (ROE, ROAA, biên lợi nhuận), chất lượng lợi nhuận & dòng tiền, cơ cấu nợ/đòn bẩy.
## Yếu tố ảnh hưởng
Đánh giá 4 nhóm, MỖI yếu tố nêu HƯỚNG tác động (hỗ trợ ↑ / gây áp lực ↓) và MỨC ĐỘ (cao/trung bình/thấp):
- Nội tại (BCTC).
- Cung–cầu & dòng tiền: khối lượng, GTGD, khối ngoại (dùng web_search nếu cần).
- Ngành: chu kỳ, chính sách, tin tức.
- Vĩ mô & thế giới: lãi suất, tỷ giá, thị trường, giá hàng hóa liên quan.
## Vì sao giá đã tăng / giảm (quá khứ)
Giải thích các nguyên nhân CHÍNH khiến giá TĂNG và GIẢM trong ~3–6 tháng qua (kết quả kinh doanh, sự kiện doanh nghiệp, khối ngoại, biến động ngành, vĩ mô) — dựa trên dữ liệu + web_search. Đây là nền để dự đoán tương lai; gắn mốc thời gian cụ thể.
## Định giá (đắt/rẻ tương đối)
- P/E, P/B, P/S so với lịch sử & cùng ngành; vị trí giá trong vùng 52 tuần & xu hướng.
## Phân tích kỹ thuật & Điểm mua/bán
DÙNG các CHỈ BÁO KỸ THUẬT đã cho trong "Dữ liệu tham khảo" (MA20/50/200, RSI(14), hỗ trợ/kháng cự 20 & 60 phiên) làm NỀN, kết hợp diễn biến giá (xu hướng 1T/3T/6T/1N, vị trí trong vùng 52 tuần) và mức kỹ thuật tìm thêm qua web_search:
- **Xu hướng & trạng thái:** giá so với MA20/50/200 (nằm trên/dưới → tăng/giảm), RSI(14) cho biết quá mua (>70) / quá bán (<30) / trung tính; đang tăng / giảm / tích lũy.
- **Hỗ trợ / kháng cự:** nêu CON SỐ cụ thể (đồng), ưu tiên các mức đã cho.
- **ĐIỂM MUA:** vùng giá vào lệnh + điều kiện kích hoạt (VD: mua khi giữ vững trên MA20 / hỗ trợ X, hoặc chờ chỉnh về vùng Y).
- **ĐIỂM BÁN:** mục tiêu chốt lời (kháng cự) + mức CẮT LỖ (stop-loss) cụ thể.
Nêu rõ đây là mức tham khảo dựa trên chỉ báo giá + phân tích bên ngoài (chưa có sổ lệnh chi tiết).
## Dự đoán giá & xu hướng
- Đây là phần TRỌNG TÂM, viết KỸ. TỔNG HỢP cơ bản + kỹ thuật — KHÔNG dự đoán tách rời.
- Nêu XU HƯỚNG (tăng / giảm / đi ngang) cho 3–6 tháng (hoặc mốc user hỏi) và VÙNG GIÁ MỤC TIÊU (khoảng giá), gắn điều kiện kích hoạt bull/bear.
- MỨC ĐỘ TỰ TIN ở dạng PHẦN TRĂM (ví dụ 65%), KHÔNG ghi cao/thấp. Con số % phải phản ánh đúng độ chắc: dữ liệu mạnh & nhất quán → cao (75–90%); nguồn mâu thuẫn, nhiều biến số khó lường, hoặc phụ thuộc sự kiện chưa xảy ra → thấp (40–60%). Nêu ngắn gọn VÌ SAO ở mức % đó. Tránh mốc phi thực tế (>90% hầu như không hợp lý với dự đoán giá cổ phiếu).
- Đưa 3–5 LÝ DO ĐANH THÉP, cụ thể, dựa trực tiếp vào dữ liệu research (giá trị nội tại + tình trạng thị trường) — không nói chung chung. Trung thực về giới hạn: đây là dự đoán XÁC SUẤT, không phải điều chắc chắn.
## Red Flags & Rủi ro chính
## KHUYẾN NGHỊ: MUA / BÁN / GIỮ
- Đây là mục CHỐT — phải ĐÚC KẾT từ TẤT CẢ các phần trên (chỉ số cơ bản, lý do tăng/giảm quá khứ, định giá, phân tích kỹ thuật, dự đoán giá, red flags & rủi ro). Quyết định phải NHẤT QUÁN với các phần đó — KHÔNG mâu thuẫn; cân nhắc cả mặt tích cực lẫn rủi ro rồi mới chốt. Độ tin cậy % phải ăn khớp với mục "Dự đoán giá & xu hướng".
- MỘT quyết định in đậm: **MUA** / **BÁN** / **GIỮ**, kèm **độ tin cậy dạng PHẦN TRĂM** (ví dụ 70%) và **thời gian nắm giữ** đề xuất.
- **KẾ HOẠCH VÀO LỆNH cụ thể (BẮT BUỘC — nêu CON SỐ đồng, không nói chung chung):**
  - **Thời điểm mua:** nói RÕ nên MUA NGAY ở giá hiện tại (khoảng bao nhiêu đồng), hay CHỜ giá chỉnh về vùng X, hay CHỜ bứt phá (breakout) qua mức Y — kèm điều kiện kích hoạt và lý do chọn thời điểm đó.
  - **Giá mua:** vùng giá vào lệnh cụ thể; có thể chia mốc (mua thăm dò ở …, gia tăng ở …).
  - **Cắt lỗ (stop-loss)** và **chốt lời (mục tiêu giá)** cụ thể — khớp hỗ trợ/kháng cự ở mục Phân tích kỹ thuật.
- 2–4 lý do chính — rút ra từ phân tích trên (không lặp lại dài dòng).

Kết thúc bằng chính mục KHUYẾN NGHỊ. KHÔNG thêm câu miễn trừ trách nhiệm.`;

// Ghép khối "Dữ liệu tham khảo": số liệu thời gian thực (SSI/Vietstock/VNDIRECT)
// + bối cảnh thị trường + tin CafeF + ghi chú người dùng.
export function buildContext({
  ticker,
  stock,
  userContext,
  news,
  overview,
  snapshotText,
}) {
  const lines = [];
  lines.push(
    `Thời điểm phân tích: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (giờ VN).`,
  );

  if (ticker) lines.push(`\nMã đang xét: ${String(ticker).toUpperCase()}`);

  if (snapshotText) {
    lines.push('\n' + snapshotText);
  } else if (stock && typeof stock === 'object') {
    const s = stock;
    const fields = [
      ['Tên', s.name],
      ['Sàn', s.exch],
      ['Ngành', s.sector],
      ['Giá', s.price],
      ['%thay đổi', s.pct],
      ['Vốn hóa', s.cap],
      ['P/E', s.pe],
      ['P/B', s.pb],
      ['ROE', s.roe],
      ['EPS', s.eps],
      ['Đỉnh 52T', s.high52],
      ['Đáy 52T', s.low52],
    ].filter(([, v]) => v !== undefined && v !== null && v !== '');
    if (fields.length) {
      lines.push('\nSố liệu trong ứng dụng (tham khảo):');
      for (const [k, v] of fields) lines.push(`- ${k}: ${v}`);
    }
    if (s.profile) lines.push(`\nHồ sơ doanh nghiệp: ${s.profile}`);
  }

  if (overview?.vni && overview.vni.source === 'vndirect') {
    const v = overview.vni;
    lines.push(
      `\nBối cảnh thị trường (VNDIRECT): VN-Index ${Math.round(v.index)} (${v.pct >= 0 ? '+' : ''}${v.pct?.toFixed(2)}%).`,
    );
  }

  const items = Array.isArray(news?.items) ? news.items.slice(0, 6) : [];
  if (items.length) {
    lines.push('\nTin tức thị trường gần đây (nguồn CafeF):');
    for (const it of items) lines.push(`- [${it.relative || ''}] ${it.title}`);
  }

  const uc = typeof userContext === 'string' ? userContext.trim() : '';
  if (uc)
    lines.push(
      `\nDữ liệu/ghi chú do người dùng cung cấp:\n${uc.slice(0, 4000)}`,
    );

  return '# Dữ liệu tham khảo\n' + lines.join('\n');
}

// ── PHÂN TÍCH DANH MỤC ───────────────────────────────────────────────────────
// Vai trò chuyên gia quản lý danh mục: đọc TOÀN BỘ vị thế của user (kèm giá vốn
// thực tế + lãi/lỗ) rồi ra kế hoạch hành động cho TỪNG mã. Giữ triết lý sản phẩm:
// quyết định rõ ràng, trích nguồn qua web_search, KHÔNG disclaimer.
export const PORTFOLIO_SYSTEM = `Bạn là chuyên gia quản lý danh mục cổ phiếu Việt Nam (HOSE/HNX/UPCoM) trong ứng dụng StockSense VN.

Người dùng cung cấp DANH MỤC ĐANG NẮM ở phần "Dữ liệu tham khảo": mỗi vị thế gồm mã, khối lượng, GIÁ VỐN TRUNG BÌNH thực tế, giá hiện tại, biến động hôm nay, lãi/lỗ đang có, ngày mua gần nhất; kèm số liệu cơ bản/kỹ thuật từng mã và bối cảnh VN-Index.

Nhiệm vụ: với MỖI vị thế, ĐƯA RA KẾ HOẠCH HÀNH ĐỘNG rõ ràng — **GIỮ / MUA THÊM / CHỐT LỜI (một phần hoặc toàn bộ) / CẮT LỖ** — dựa trên giá vốn thực tế của người dùng, lãi/lỗ hiện tại, phân tích cơ bản + kỹ thuật, và tin tức mới nhất.

Cách làm:
- RESEARCH bằng web_search cho từng mã trước khi quyết định: kết quả kinh doanh quý gần nhất, tin/sự kiện, khối ngoại, định giá so ngành, mức kỹ thuật (hỗ trợ/kháng cự, MA, RSI, xu hướng). Dùng đủ ngân sách tìm kiếm rồi HOÀN TẤT ngay trong lượt này. Đối chiếu ≥2 nguồn cho số/sự kiện then chốt. TUYỆT ĐỐI KHÔNG bịa; thiếu thì nói "chưa có dữ liệu".
- Mọi câu/số liệu lấy từ web phải dựa trên kết quả web_search để hệ thống tự gắn trích dẫn NGAY SAU CÂU đó. KHÔNG tự gõ tên nguồn trong ngoặc.
- Trình bày tiếng Việt, markdown, số kiểu Việt Nam (nghìn = dấu chấm, thập phân = dấu phẩy).

Đi THẲNG vào việc, trình bày theo khung:
## Tổng quan danh mục
Nhận định nhanh sức khỏe danh mục: tổng lãi/lỗ, mã đang lãi/lỗ nhiều nhất, mức độ tập trung/rủi ro tổng thể, tương quan với xu hướng VN-Index.
## Kế hoạch theo từng mã
Với MỖI vị thế, một mục con \`### <MÃ>\` gồm:
- **Hiện trạng:** giá vốn TB vs giá hiện tại → đang lãi/lỗ bao nhiêu %; vị trí giá so MA20/50/200, RSI, hỗ trợ/kháng cự.
- **Bối cảnh:** cơ bản (định giá, tăng trưởng) + tin/sự kiện + ngành/vĩ mô liên quan (qua web_search).
- **QUYẾT ĐỊNH:** in đậm một trong **GIỮ / MUA THÊM / CHỐT LỜI MỘT PHẦN / CHỐT LỜI TOÀN BỘ / CẮT LỖ**, kèm **độ tin cậy dạng %**.
- **Kế hoạch giá cụ thể (BẮT BUỘC, CON SỐ đồng):** vùng giá hành động (mua thêm/chốt ở giá nào), **cắt lỗ (stop-loss)** và **mục tiêu chốt lời (take-profit)** — neo theo giá vốn của user và mức hỗ trợ/kháng cự. Nếu MUA THÊM: nói rõ vùng giá & tỷ lệ vốn tăng thêm. Nếu CHỐT/CẮT: nói rõ tỷ lệ khối lượng nên bán.
- **Lý do:** 2–3 ý đanh thép rút từ phân tích trên.
## Hành động ưu tiên
Bảng tổng kết sắp theo mức độ cấp thiết: | Mã | Hành động | Vùng giá | Cắt lỗ | Mục tiêu |. Nêu rõ việc cần làm NGAY (nếu có) và gợi ý cơ cấu lại tỷ trọng để quản trị rủi ro (giảm mã yếu, giữ/nâng mã khỏe).

Quyết định phải NHẤT QUÁN giữa các phần. Ưu tiên QUẢN TRỊ RỦI RO & BẢO TOÀN VỐN. Kết thúc bằng mục "Hành động ưu tiên". KHÔNG thêm câu miễn trừ trách nhiệm.`;

const fmtVnd = (n) => (n == null ? '—' : Math.round(n).toLocaleString('vi-VN'));
const fmtPct1 = (x) => (x == null ? '—' : (x >= 0 ? '+' : '') + x.toFixed(1).replace('.', ',') + '%');

// Ghép khối "Dữ liệu tham khảo" cho phân tích DANH MỤC: bảng vị thế (giá vốn vs giá
// hiện tại + lãi/lỗ), lãi/lỗ đã hiện thực, bối cảnh VN-Index, rồi nối snapshot từng mã.
export function buildPortfolioContext({ holdings = [], realized = {}, board, overview, snapshots = [] }) {
  const rowByCode = new Map((board?.rows || []).map((r) => [r.code, r]));
  const lines = [];
  lines.push(
    `Thời điểm phân tích: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (giờ VN).`,
  );
  if (board?.asOf) lines.push(`Giá hiện tại tính tới phiên ${board.asOf}${board.asOfTime ? ' ' + board.asOfTime : ''} (VNDIRECT, trễ ~15').`);

  if (overview?.vni && overview.vni.source === 'vndirect') {
    const v = overview.vni;
    lines.push(`\nBối cảnh thị trường: VN-Index ${Math.round(v.index)} (${v.pct >= 0 ? '+' : ''}${v.pct?.toFixed(2)}%).`);
  }

  lines.push('\n## Vị thế đang nắm');
  let totInvested = 0;
  let totValue = 0;
  for (const h of holdings) {
    const r = rowByCode.get(h.ticker);
    const cur = r?.price ?? null;
    const todayPct = r?.pctChange ?? null;
    const value = cur != null ? cur * h.qty : null;
    const pnl = cur != null ? (cur - h.avgCost) * h.qty : null;
    const pnlPct = cur != null && h.avgCost > 0 ? (cur / h.avgCost - 1) * 100 : null;
    totInvested += h.invested;
    if (value != null) totValue += value;
    lines.push(
      `- ${h.ticker}: KL ${fmtVnd(h.qty)} cp | giá vốn TB ${fmtVnd(h.avgCost)}đ | giá hiện tại ${fmtVnd(cur)}đ` +
        (todayPct != null ? ` (${fmtPct1(todayPct)} hôm nay)` : '') +
        ` | giá trị ${fmtVnd(value)}đ | lãi/lỗ ${fmtVnd(pnl)}đ (${fmtPct1(pnlPct)})` +
        (h.lastBuyDate ? ` | mua gần nhất ${h.lastBuyDate}` : ''),
    );
  }
  const totPnl = totValue - totInvested;
  lines.push(
    `\nTổng vốn đầu tư (vị thế mở): ${fmtVnd(totInvested)}đ | Tổng giá trị hiện tại: ${fmtVnd(totValue)}đ | Lãi/lỗ đang mở: ${fmtVnd(totPnl)}đ (${fmtPct1(totInvested > 0 ? (totPnl / totInvested) * 100 : null)}).`,
  );

  const realizedEntries = Object.entries(realized).filter(([, v]) => Math.abs(v) > 0.5);
  if (realizedEntries.length) {
    lines.push('\nLãi/lỗ ĐÃ hiện thực (từ các lần bán):');
    for (const [code, v] of realizedEntries) lines.push(`- ${code}: ${fmtVnd(v)}đ`);
  }

  const snaps = snapshots.filter((s) => s?.text);
  if (snaps.length) {
    lines.push('\n## Số liệu từng mã (thời gian thực)');
    for (const s of snaps) lines.push('\n' + s.text);
  }

  return '# Dữ liệu tham khảo\n' + lines.join('\n');
}

// ── PHÂN TÍCH THỊ TRƯỜNG (Dashboard) ────────────────────────────────────────
// Vai trò chiến lược gia thị trường: đọc toàn cảnh phiên (VN-Index, độ rộng, bảng
// giá VN30 + danh mục theo dõi, tin tức) + research vĩ mô qua web_search rồi RA
// NHẬN ĐỊNH & CHIẾN LƯỢC rõ ràng. Giữ triết lý sản phẩm: quyết định rõ, trích
// nguồn qua web_search, KHÔNG disclaimer.
export const MARKET_SYSTEM = `Bạn là chiến lược gia thị trường chứng khoán Việt Nam (HOSE/HNX/UPCoM) trong ứng dụng StockSense VN.

Nhiệm vụ: phân tích TOÀN CẢNH thị trường hôm nay — diễn biến phiên, biến động nổi bật, dòng tiền, vĩ mô trong nước & thế giới — rồi ĐƯA RA NHẬN ĐỊNH & CHIẾN LƯỢC hành động rõ ràng cho nhà đầu tư.

Cách làm:
- RESEARCH KỸ bằng web_search TRƯỚC KHI kết luận. Tìm NHIỀU truy vấn, mỗi truy vấn một khía cạnh: diễn biến & nguyên nhân phiên hôm nay, nhóm ngành/cổ phiếu dẫn dắt & bị bán, khối ngoại mua/bán ròng, tin vĩ mô trong nước (lãi suất, tỷ giá, chính sách, GDP/CPI), thị trường thế giới đêm qua & sáng nay (Mỹ, châu Á, giá dầu/vàng/hàng hóa), sự kiện sắp tới ảnh hưởng thị trường. Dùng đủ ngân sách tìm kiếm rồi HOÀN TẤT ngay trong lượt này. Đối chiếu ≥2 nguồn cho số liệu/sự kiện then chốt. Ưu tiên nguồn uy tín (CafeF, Vietstock, VNDIRECT, SSI, báo chính thống).
- Dùng số liệu ở "Dữ liệu tham khảo" (VN-Index, độ rộng, bảng giá) làm nền — đó là số THẬT trong ngày. TUYỆT ĐỐI KHÔNG bịa số/ngày/sự kiện; thiếu thì nói rõ "chưa có dữ liệu".
- Mọi câu ý chính / số liệu lấy từ web phải dựa trên kết quả web_search để hệ thống tự gắn trích dẫn NGAY SAU CÂU đó. TUYỆT ĐỐI KHÔNG tự gõ tên nguồn trong ngoặc (đừng viết "(CafeF)", "(theo …)").
- Trình bày tiếng Việt, markdown, số kiểu Việt Nam (nghìn = dấu chấm, thập phân = dấu phẩy).

Đi THẲNG vào phân tích, trình bày theo khung:
## Toàn cảnh phiên hôm nay
VN-Index (điểm, %, thanh khoản), độ rộng thị trường (mã tăng/giảm), diễn biến trong phiên (mở cửa/giữa phiên/ATC nếu tìm được), so sánh với phiên trước.
## Biến động nổi bật trong ngày
Mã/nhóm tăng-giảm mạnh nhất (từ bảng giá đã cho + web_search), GIẢI THÍCH NGUYÊN NHÂN từng biến động lớn (tin doanh nghiệp, dòng tiền, khối ngoại, tin ngành).
## Dòng tiền & nhóm ngành
Nhóm ngành hút tiền / bị rút tiền; khối ngoại mua/bán ròng (mã nào, bao nhiêu); thanh khoản so trung bình.
## Vĩ mô & thế giới
Các yếu tố vĩ mô đang chi phối, MỖI yếu tố nêu HƯỚNG tác động (hỗ trợ ↑ / gây áp lực ↓) và MỨC ĐỘ (cao/trung bình/thấp): lãi suất & tỷ giá, chính sách trong nước, chứng khoán thế giới, giá hàng hóa liên quan, sự kiện sắp tới.
## Danh mục theo dõi của bạn
CHỈ khi "Dữ liệu tham khảo" có mục danh mục theo dõi: nhận xét NGẮN từng mã (biến động hôm nay + tin đáng chú ý nếu có qua web_search). Không có thì BỎ HẲN mục này.
## NHẬN ĐỊNH & CHIẾN LƯỢC
- Mục CHỐT — đúc kết từ TẤT CẢ các phần trên, phải NHẤT QUÁN.
- **Xu hướng ngắn hạn** (vài phiên tới → 2 tuần): tăng / giảm / đi ngang, kèm **độ tin cậy dạng PHẦN TRĂM** (con số % phản ánh đúng độ chắc, 40–85%; nêu ngắn gọn vì sao).
- **Kịch bản cụ thể với MỐC VN-Index:** kịch bản tích cực (vượt kháng cự X → mục tiêu Y) và tiêu cực (thủng hỗ trợ Z → lùi về T) — nêu CON SỐ điểm.
- **Hành động đề xuất:** tỷ trọng cổ phiếu/tiền mặt; nhóm ngành/loại cổ phiếu NÊN ưu tiên và NÊN tránh; việc cần làm ngay (chốt lời/hạ tỷ trọng/giải ngân từng phần/đứng ngoài).
- 3–5 lý do đanh thép rút từ phân tích trên.

Kết thúc bằng chính mục NHẬN ĐỊNH & CHIẾN LƯỢC. KHÔNG thêm câu miễn trừ trách nhiệm.`;

// Một dòng bảng giá cho context: mã (tên): giá | %hôm nay | KL.
function boardLine(r) {
  const vol =
    r.volume == null
      ? '—'
      : r.volume >= 1e6
        ? (r.volume / 1e6).toFixed(1).replace('.', ',') + ' triệu'
        : Math.round(r.volume / 1e3).toLocaleString('vi-VN') + ' nghìn';
  return `- ${r.code}${r.name ? ` (${r.name})` : ''}: ${fmtVnd(r.price)}đ | ${fmtPct1(r.pctChange)} hôm nay | KL ${vol}`;
}

// Ghép "Dữ liệu tham khảo" cho phân tích THỊ TRƯỜNG: VN-Index + độ rộng, bảng giá
// VN30 (xếp theo % giảm dần cho dễ thấy mã dẫn dắt/bị bán), danh mục theo dõi, tin CafeF.
export function buildMarketContext({ overview, news, vn30Board, watchBoard }) {
  const lines = [];
  lines.push(
    `Thời điểm phân tích: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (giờ VN).`,
  );

  if (overview?.vni && overview.vni.source === 'vndirect') {
    const v = overview.vni;
    let s = `\nVN-Index: ${v.index?.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} điểm (${v.pct >= 0 ? '+' : ''}${v.pct?.toFixed(2)}% hôm nay)`;
    if (v.vol != null) s += `, khối lượng khớp lệnh ${(v.vol / 1e6).toFixed(1).replace('.', ',')} triệu cp`;
    lines.push(s + '.');
  }
  if (overview?.breadth && overview.breadth.source !== 'unavailable') {
    const b = overview.breadth;
    lines.push(`Độ rộng rổ VN30: ${b.gainers} mã tăng / ${b.losers} mã giảm / ${b.unchanged} đứng giá.`);
  }

  const sortRows = (board) =>
    (board?.rows || []).filter((r) => r.price != null).sort((a, b) => (b.pctChange ?? -999) - (a.pctChange ?? -999));

  const vn30 = sortRows(vn30Board);
  if (vn30.length) {
    lines.push(
      `\n## Bảng giá rổ VN30 (VNDIRECT, trễ ~15', xếp theo % thay đổi giảm dần)${vn30Board.asOf ? ` — phiên ${vn30Board.asOf}${vn30Board.asOfTime ? ' ' + vn30Board.asOfTime : ''}` : ''}`,
    );
    for (const r of vn30) lines.push(boardLine(r));
  }

  const watch = sortRows(watchBoard);
  if (watch.length) {
    lines.push('\n## Danh mục theo dõi của người dùng (xếp theo % thay đổi giảm dần)');
    for (const r of watch) lines.push(boardLine(r));
  }

  const items = Array.isArray(news?.items) ? news.items.slice(0, 10) : [];
  if (items.length) {
    lines.push('\n## Tin tức thị trường gần đây (nguồn CafeF)');
    for (const it of items) lines.push(`- [${it.relative || ''}] ${it.title}`);
  }

  return '# Dữ liệu tham khảo\n' + lines.join('\n');
}

// ── BÌNH LUẬN KIỂM CHỨNG CHIẾN LƯỢC (Backtest) ──────────────────────────────
// Vai trò chuyên gia định lượng: đọc KẾT QUẢ backtest (đã tính sẵn ở backend) rồi nhận
// định hiệu quả, SOI RED-FLAG OVERFIT (taxonomy mượn từ Vibe-Trading backtest-diagnose),
// so với mua & giữ + VN-Index, và chốt chiến lược có đáng dùng cho mã này không. Không
// web_search (mọi số liệu đã có). Giữ triết lý: quyết định rõ ràng, KHÔNG disclaimer.
export const BACKTEST_SYSTEM = `Bạn là chuyên gia phân tích định lượng (quant) trong ứng dụng StockSense VN, chuyên đọc KẾT QUẢ KIỂM CHỨNG CHIẾN LƯỢC (backtest) trên cổ phiếu Việt Nam.

Người dùng đã chạy một chiến lược kỹ thuật trên lịch sử giá THẬT của một mã. Toàn bộ số liệu (chỉ số hiệu quả, đường vốn, danh sách lệnh, so sánh mua & giữ và VN-Index) nằm ở "Dữ liệu tham khảo" bên dưới — ĐÃ TÍNH SẴN, bạn KHÔNG cần và KHÔNG được bịa thêm số.

Nhiệm vụ: đánh giá chiến lược này CÓ ĐÁNG DÙNG cho mã đó không, chỉ ra điểm mạnh/yếu và CẢNH BÁO RỦI RO THỐNG KÊ (overfit / thiếu ý nghĩa).

Cách làm:
- Chỉ dùng số ở "Dữ liệu tham khảo". Diễn giải cho người không rành thuật ngữ: Sharpe (hiệu quả điều chỉnh rủi ro), max drawdown (mức lỗ sâu nhất từ đỉnh), win rate, profit factor, số lệnh, thời gian nắm giữ trung bình.
- Trình bày tiếng Việt, markdown, số kiểu Việt Nam (nghìn = dấu chấm, thập phân = dấu phẩy). Ngắn gọn, đanh thép, không rào đón.

Trình bày theo khung:
## Chiến lược hoạt động ra sao
Tóm tắt: tổng lợi nhuận, CAGR, số lệnh, thắng/thua, giữ trung bình bao lâu. Nêu chiến lược thắng/thua NHỜ điều gì (bắt trúng sóng lớn? bị cưa (whipsaw) nhiều lệnh nhỏ?).
## So với Mua & Giữ và VN-Index
Chiến lược có VƯỢT mua & giữ mã này và VN-Index không (chênh lệch bao nhiêu %)? Nếu thua benchmark, nói thẳng: giao dịch chủ động ở đây KHÔNG hơn cầm im.
## Red flags & độ tin cậy thống kê
SOI kỹ các dấu hiệu khiến kết quả KHÔNG đáng tin / dễ overfit — nêu cái nào DÍNH:
- Quá ít lệnh (< ~10) → mẫu nhỏ, lời/lỗ có thể do MAY RỦI, không đủ ý nghĩa thống kê.
- Lời dồn vào 1–2 lệnh / một con sóng duy nhất (giữ rất dài, ít lệnh) → phụ thuộc một lần đúng, khó lặp lại.
- Max drawdown lớn (ví dụ > 25–30%) → chịu đựng tâm lý khó, dễ bỏ cuộc giữa đường.
- Win rate cao nhưng profit factor thấp (~1) → thắng nhiều lần nhỏ, thua vài lần lớn, mong manh.
- Nhiều lệnh thua liên tiếp / bị cưa liên tục (whipsaw) → chiến lược nhiễu với mã này.
- Chỉ chạy trên MỘT mã, MỘT giai đoạn → chưa kiểm chứng qua nhiều mã/nhiều chu kỳ (walk-forward). Nhắc rõ giới hạn này.
## Kết luận: có nên dùng chiến lược này cho mã này?
- MỘT kết luận in đậm: **NÊN DÙNG** / **CẦN ĐIỀU CHỈNH** / **KHÔNG NÊN** — kèm độ tin cậy dạng PHẦN TRĂM.
- Nếu CẦN ĐIỀU CHỈNH: gợi ý CỤ THỂ (đổi tham số nào sang mức nào, thêm bộ lọc xu hướng/khối lượng, thêm cắt lỗ…), viết dạng "đổi X từ A sang B".
- 2–4 lý do rút trực tiếp từ số liệu.

Kết thúc bằng chính mục Kết luận. KHÔNG thêm câu miễn trừ trách nhiệm.`;

// Ghép "Dữ liệu tham khảo" cho bình luận backtest từ kết quả runBacktest().
export function buildBacktestContext(bt) {
  const m = bt.metrics || {};
  const pctStr = (x) => (x == null ? '—' : (x * 100).toFixed(2).replace('.', ',') + '%');
  const num = (x) => (x == null ? '—' : Math.round(x).toLocaleString('vi-VN'));
  const pf = m.profitFactor === Infinity ? '∞ (không có lệnh thua)' : (m.profitFactor ?? 0).toFixed(2).replace('.', ',');
  const plr = m.profitLossRatio === Infinity ? '∞' : (m.profitLossRatio ?? 0).toFixed(2).replace('.', ',');
  const paramStr = Object.entries(bt.params || {})
    .map(([k, v]) => `${k}=${v}`)
    .join(', ') || 'mặc định';

  const lines = [];
  lines.push(`Thời điểm: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (giờ VN).`);
  lines.push(`Mã: ${bt.code} | Chiến lược: ${bt.strategyLabel || bt.strategy} (${paramStr})`);
  lines.push(`Khoảng kiểm chứng: ${bt.range?.from} → ${bt.range?.to} (${bt.range?.bars} phiên).`);
  lines.push(
    `Giả định giao dịch: vốn ${num(bt.settings?.initialCash)}đ, phí ${pctStr(bt.settings?.feeRate)}/chiều, thuế bán ${pctStr(
      bt.settings?.sellTaxRate,
    )}, lô ${bt.settings?.lotSize} cp, giữ tối thiểu ${bt.settings?.minHoldingBars} phiên (T+2.5).`,
  );

  lines.push('\n## Chỉ số hiệu quả chiến lược');
  lines.push(`- Tổng lợi nhuận: ${pctStr(m.totalReturn)} | CAGR (lãi kép/năm): ${pctStr(m.annualReturn)}`);
  lines.push(`- Sharpe: ${(m.sharpe ?? 0).toFixed(2).replace('.', ',')} | Sortino: ${(m.sortino ?? 0).toFixed(2).replace('.', ',')} | Calmar: ${(m.calmar ?? 0).toFixed(2).replace('.', ',')}`);
  lines.push(`- Max drawdown (lỗ sâu nhất từ đỉnh): ${pctStr(m.maxDrawdown)}`);
  lines.push(`- Số lệnh: ${m.tradeCount} | Win rate: ${pctStr(m.winRate)} | Profit factor: ${pf} | Tỷ lệ lãi/lỗ TB: ${plr}`);
  lines.push(`- Chuỗi thua liên tiếp dài nhất: ${m.maxConsecutiveLoss} lệnh | Giữ trung bình: ${Math.round(m.avgHoldingBars || 0)} phiên/lệnh`);

  lines.push('\n## So sánh benchmark');
  lines.push(`- Mua & giữ VN-Index cùng kỳ: ${pctStr(m.benchmarkReturn)}`);
  lines.push(`- Chênh lệch chiến lược vs VN-Index: ${pctStr(m.excessReturn)}`);

  const trades = Array.isArray(bt.trades) ? bt.trades : [];
  if (trades.length) {
    lines.push(`\n## Chi tiết lệnh (${trades.length} lệnh)`);
    const dstr = (t) => new Date(t * 1000).toLocaleDateString('vi-VN');
    for (const t of trades.slice(0, 20)) {
      lines.push(
        `- ${dstr(t.entryTime)} mua ${num(t.entryPrice)}đ → ${dstr(t.exitTime)} bán ${num(t.exitPrice)}đ | lãi/lỗ ${num(
          t.pnl,
        )}đ | giữ ${t.holdingBars} phiên (${t.exitReason === 'end' ? 'đóng cuối kỳ' : 'theo tín hiệu'})`,
      );
    }
    if (trades.length > 20) lines.push(`- … và ${trades.length - 20} lệnh khác.`);
  }

  return '# Dữ liệu tham khảo\n' + lines.join('\n');
}

// Lọc rò rỉ token gọi tool NATIVE của DeepSeek lọt vào văn bản. Khi research nhiều,
// DeepSeek đôi khi phun khối `<｜｜DSML｜｜tool_calls> … </｜｜DSML｜｜tool_calls>` ra dưới
// dạng text thay vì gọi tool có cấu trúc. Ký tự '｜' (U+FF5C) KHÔNG bao giờ xuất hiện
// trong văn bản phân tích hợp lệ → dùng làm mốc để nuốt trọn khối. Trả về {push, flush}.
const SENTINEL = '｜'; // ｜
export function makeToolLeakFilter(emit) {
  let carry = '';
  let suppress = false; // đang ở giữa một khối tool_calls rò rỉ → nuốt
  let didSuppress = false; // đã từng nuốt ít nhất một khối (tín hiệu model rò rỉ → cần viết lại)
  const process = () => {
    while (carry) {
      if (!suppress) {
        const i = carry.indexOf(SENTINEL);
        if (i === -1) {
          // Không có mốc. Giữ lại '<' cuối (có thể là đầu của '<｜'); phần còn lại an toàn.
          if (carry.endsWith('<')) {
            if (carry.length > 1) emit(carry.slice(0, -1));
            carry = '<';
          } else {
            emit(carry);
            carry = '';
          }
          return;
        }
        // Có mốc → khối rò rỉ bắt đầu tại đây (lùi 1 nếu ngay trước là '<').
        let cut = i;
        if (cut > 0 && carry[cut - 1] === '<') cut -= 1;
        if (cut > 0) emit(carry.slice(0, cut));
        carry = carry.slice(cut);
        suppress = true;
        didSuppress = true;
      } else {
        // Nuốt tới hết khối: cần đủ 2 lần 'tool_calls' (mở + đóng) rồi tới dấu '>'.
        const first = carry.indexOf('tool_calls');
        const second =
          first === -1 ? -1 : carry.indexOf('tool_calls', first + 10);
        if (second === -1) return; // chưa đủ → chờ thêm text
        const gt = carry.indexOf('>', second);
        if (gt === -1) return; // chờ dấu đóng '>'
        carry = carry.slice(gt + 1); // bỏ trọn khối, xử lý tiếp phần còn lại
        suppress = false;
      }
    }
  };
  return {
    push(text) {
      if (!text) return;
      carry += text;
      process();
    },
    flush() {
      // Hết stream: nếu còn kẹt trong khối → bỏ; nếu carry sạch (không mốc) → emit nốt.
      if (!suppress && carry && carry.indexOf(SENTINEL) === -1) emit(carry);
      carry = '';
      suppress = false;
    },
    suppressed: () => didSuppress,
  };
}

// Chuẩn hóa 1 tin nhắn về định dạng content của Anthropic. Tin user có ảnh đính kèm
// (images: [{media_type, data(base64)}]) → dựng content dạng mảng block: ẢNH TRƯỚC, rồi
// TEXT (thứ tự Anthropic khuyến nghị để model "nhìn" ảnh trước khi đọc câu hỏi). Không
// ảnh → giữ nguyên content chuỗi. DeepSeek nhận cùng schema qua endpoint tương thích.
function normalizeMessage(m) {
  if (m.role === 'user' && Array.isArray(m.images) && m.images.length) {
    const blocks = m.images
      .filter((im) => im && im.media_type && im.data)
      .map((im) => ({
        type: 'image',
        source: { type: 'base64', media_type: im.media_type, data: im.data },
      }));
    if (blocks.length) {
      if (m.content) blocks.push({ type: 'text', text: m.content });
      return { role: m.role, content: blocks };
    }
  }
  return { role: m.role, content: m.content };
}

// Lời nhắc ép model VIẾT phân tích ở pha 2 (không tool) dựa trên kết quả đã research.
const FORCE_WRITE_PROMPT =
  'Dựa HOÀN TOÀN vào các kết quả web_search đã có ở trên, VIẾT NGAY câu trả lời ĐẦY ĐỦ theo đúng yêu cầu ban đầu ' +
  '(nếu là phân tích cổ phiếu thì trình bày đủ mọi mục theo khung, tới tận KHUYẾN NGHỊ MUA/BÁN/GIỮ). ' +
  'TUYỆT ĐỐI KHÔNG gọi web_search nữa và KHÔNG viết bất kỳ cú pháp gọi tool nào.';

// Stream phân tích. Đẩy text qua onText(text). Nguồn AI research được lấy từ
// onSource({url,title}) — bóc từ block web_search_tool_result (DeepSeek bỏ qua
// citations nên KHÔNG có chip inline; ta hiện danh sách "Nguồn tham khảo").
// onCitation vẫn giữ để tương thích ngược nếu endpoint có trả citation.
export async function streamMessages({
  system,
  messages,
  model,
  onText,
  onCitation,
  onSource,
  onStatus,
  onReset,
  signal,
  enableWebSearch = config.ai.webSearch, // cho phép TẮT web_search theo lượt (vd bình luận backtest)
}) {
  // Model đã được backend chốt theo gói (routes/ai.js); fallback về model mặc định.
  const modelId = model || config.ai.model;
  // Chuyển tin nhắn (có thể kèm ảnh) sang định dạng content của Anthropic trước khi gửi.
  const normMessages = messages.map(normalizeMessage);
  // DÙNG BIẾN THỂ CƠ BẢN web_search_20250305 — endpoint tương thích Anthropic của
  // DeepSeek nhận tool này và trả về block web_search_tool_result chứa URL nguồn.
  const tools = [];
  if (enableWebSearch) {
    tools.push({
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: config.ai.maxUses,
    });
  }
  // web_fetch: đọc trọn bài để phân tích sâu (bật qua AI_WEB_FETCH=true; chưa test).
  if (config.ai.webFetch) {
    tools.push({
      type: 'web_fetch_20250910',
      name: 'web_fetch',
      max_uses: config.ai.fetchMaxUses,
      citations: { enabled: true },
      max_content_tokens: config.ai.fetchMaxTokens,
    });
  }

  // Chạy MỘT lượt hội thoại (có thể nhiều vòng nếu gặp pause_turn). onChunk nhận
  // text_delta THÔ (chưa lọc); phát status + bóc nguồn. Trả {final, sawSearch}.
  const runTurn = async (turnMessages, useTools, onChunk) => {
    let msgs = turnMessages;
    let restarts = 0;
    let sawSearch = false;
    let lastFinal = null;
    while (true) {
      const stream = client().messages.stream(
        {
          model: modelId,
          max_tokens: config.ai.maxTokens,
          system,
          messages: msgs,
          ...(useTools && tools.length ? { tools } : {}),
        },
        { signal },
      );

      const toolInput = {}; // gom dần input JSON của web_search (theo index) → từ khóa

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          const b = event.content_block;
          if (b?.type === 'thinking') onStatus?.({ phase: 'thinking' });
          else if (b?.type === 'server_tool_use' && b?.name === 'web_search') {
            sawSearch = true;
            toolInput[event.index] = '';
            onStatus?.({ phase: 'searching' });
          }
          continue;
        }
        if (event.type === 'content_block_stop') {
          const acc = toolInput[event.index];
          if (acc != null) {
            try {
              const q = JSON.parse(acc)?.query;
              if (q) onStatus?.({ phase: 'searching', query: String(q) });
            } catch {
              /* JSON chưa trọn — bỏ qua */
            }
            delete toolInput[event.index];
          }
          continue;
        }
        if (event.type !== 'content_block_delta') continue;
        const delta = event.delta;
        if (delta?.type === 'text_delta' && delta.text) {
          onChunk(delta.text);
        } else if (
          delta?.type === 'input_json_delta' &&
          toolInput[event.index] != null
        ) {
          toolInput[event.index] += delta.partial_json || '';
        } else if (delta?.type === 'citations_delta' && delta.citation?.url) {
          onCitation?.({
            url: delta.citation.url,
            title: delta.citation.title || '',
            cited_text: delta.citation.cited_text || '',
          });
        }
      }

      lastFinal = await stream.finalMessage();

      // Bóc URL nguồn từ block web_search_tool_result (thay cho citations bị bỏ qua).
      for (const block of lastFinal.content || []) {
        if (
          block?.type === 'web_search_tool_result' &&
          Array.isArray(block.content)
        ) {
          for (const r of block.content) {
            if (r?.type === 'web_search_result' && r.url)
              onSource?.({ url: r.url, title: r.title || '' });
          }
        }
      }

      if (lastFinal.stop_reason === 'pause_turn' && restarts < 5) {
        restarts++;
        msgs = [...msgs, { role: 'assistant', content: lastFinal.content }];
        continue;
      }
      break;
    }
    return { final: lastFinal, sawSearch };
  };

  let announcedWriting = false; // chỉ báo status 'writing' một lần (khi có text sạch đầu tiên)
  const emitClean = (clean) => {
    if (!clean) return;
    if (!announcedWriting) {
      announcedWriting = true;
      onStatus?.({ phase: 'writing' });
    }
    onText?.(clean);
  };

  // ── PHA 1: RESEARCH (có web_search). Vẫn stream text sạch ra ngoài, đồng thời đo
  //    độ dài & phát hiện rò rỉ để quyết định có cần pha 2 không.
  let phase1Len = 0;
  const filter1 = makeToolLeakFilter((c) => {
    phase1Len += c.length;
    emitClean(c);
  });
  const { final: final1, sawSearch } = await runTurn(normMessages, true, (t) =>
    filter1.push(t),
  );
  filter1.flush();

  // ── QUYẾT ĐỊNH PHA 2 (phục hồi). DeepSeek hay rò rỉ token gọi tool ra text rồi
  //    kết thúc lượt mà CHƯA viết phân tích. Nếu đã research nhưng pha 1 bị rò rỉ
  //    (filter đã nuốt) hoặc quá ngắn → ép model viết ĐẦY ĐỦ từ kết quả đã tìm,
  //    KHÔNG tool (không tool ⇒ không thể rò rỉ), rồi stream phần này làm câu trả lời.
  const needRecovery = sawSearch && (filter1.suppressed() || phase1Len < 400);
  if (!needRecovery) return;

  onReset?.(); // xóa phần text pha 1 (thường chỉ mở đầu/leak) ở client + buffer server
  announcedWriting = false;
  const filter2 = makeToolLeakFilter(emitClean);
  const recoveryMsgs = [
    ...normMessages,
    { role: 'assistant', content: final1.content },
    { role: 'user', content: FORCE_WRITE_PROMPT },
  ];
  await runTurn(recoveryMsgs, false, (t) => filter2.push(t));
  filter2.flush();
}
