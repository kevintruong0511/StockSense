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
- Vĩ mô & thế giới: lãi suất, tỷ giá, giá hàng hóa liên quan.
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
        const second = first === -1 ? -1 : carry.indexOf('tool_calls', first + 10);
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
}) {
  // Model đã được backend chốt theo gói (routes/ai.js); fallback về model mặc định.
  const modelId = model || config.ai.model
  // DÙNG BIẾN THỂ CƠ BẢN web_search_20250305 — endpoint tương thích Anthropic của
  // DeepSeek nhận tool này và trả về block web_search_tool_result chứa URL nguồn.
  const tools = [];
  if (config.ai.webSearch) {
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
        } else if (delta?.type === 'input_json_delta' && toolInput[event.index] != null) {
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
        if (block?.type === 'web_search_tool_result' && Array.isArray(block.content)) {
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
  const { final: final1, sawSearch } = await runTurn(messages, true, (t) => filter1.push(t));
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
    ...messages,
    { role: 'assistant', content: final1.content },
    { role: 'user', content: FORCE_WRITE_PROMPT },
  ];
  await runTurn(recoveryMsgs, false, (t) => filter2.push(t));
  filter2.flush();
}
