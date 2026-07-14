// Trang Hướng dẫn: video YouTube nhúng ở đầu + nội dung hướng dẫn bên dưới.
// Nội dung TĨNH trong code — sửa ở 2 chỗ đánh dấu 👉 bên dưới (VIDEO + GUIDE_SECTIONS).
import {
  BookOpen,
  Sparkle,
  Wallet,
  Users,
  ArrowRight,
} from '../components/icons.jsx';

// 👉 VIDEO: đổi ID nếu cần. START = giây bắt đầu (đặt 0 để phát từ đầu; link của bạn là t=598s).
const YOUTUBE_ID = 'wwOWbN09Kkc';
const YOUTUBE_START = 0;

// 👉 NỘI DUNG: sửa/điền các mục ở đây. Mỗi mục = { title, paragraphs:[...], bullets:[...] }.
// paragraphs = các đoạn văn; bullets = gạch đầu dòng (tùy chọn). Thêm/bớt mục thoải mái.
const GUIDE_SECTIONS = [
  {
    title: 'StockSense VN là gì?',
    paragraphs: [
      'StockSense VN là công cụ phân tích cổ phiếu Việt Nam (HOSE/HNX/UPCoM) có AI hỗ trợ. Thay vì phải đọc rải rác báo cáo tài chính, tin tức và biểu đồ ở nhiều nơi, bạn nhập một mã cổ phiếu và AI sẽ tự nạp số liệu thật, tự tìm kiếm thông tin trên web, rồi bóc tách doanh nghiệp và đưa ra khuyến nghị Mua / Bán / Giữ có cơ sở, kèm nguồn trích dẫn.',
      'Mục tiêu là giúp nhà đầu tư cá nhân hiểu sâu doanh nghiệp và ra quyết định nhanh, có kỷ luật — dựa trên dữ liệu chứ không theo cảm tính hay tin đồn.',
    ],
    bullets: [],
  },
  {
    title: 'Chứng khoán cơ bản cho người mới',
    paragraphs: [
      'Nếu bạn mới bắt đầu, hãy nắm vài khái niệm nền tảng trước khi xuống tiền:',
    ],
    bullets: [
      'Cổ phiếu: là phần sở hữu một doanh nghiệp. Mua cổ phiếu FPT nghĩa là bạn sở hữu một phần rất nhỏ của FPT và hưởng lợi (hoặc chịu rủi ro) theo kết quả kinh doanh của họ.',
      'Ba sàn giao dịch: HOSE (sàn lớn nhất, cổ phiếu doanh nghiệp lớn), HNX và UPCoM (doanh nghiệp nhỏ/vừa hơn). Mỗi mã có một sàn niêm yết.',
      'Mở tài khoản: cần một tài khoản tại công ty chứng khoán (VD: SSI, VNDIRECT, VPS, TCBS…). Đăng ký online, xác thực eKYC, rồi nạp tiền là giao dịch được.',
      'Giờ giao dịch: Thứ 2–Thứ 6, khoảng 9h00–15h00 (nghỉ trưa 11h30–13h00). Ngoài giờ này giá đứng yên.',
      'Lệnh Mua/Bán: đặt lệnh với khối lượng (thường lô 100 cổ phiếu) và giá. Khi có người khớp lệnh đối ứng thì giao dịch thành công. Cổ phiếu vừa mua thường về tài khoản sau ~2 ngày làm việc (T+2) mới bán lại được.',
      'Biên độ giá trong ngày: HOSE ±7%, HNX ±10%, UPCoM ±15% so với giá tham chiếu. Chạm mức trên gọi là giá trần, mức dưới là giá sàn.',
    ],
  },
  {
    title: 'Đọc các chỉ số quan trọng',
    paragraphs: [
      'Khi phân tích một cổ phiếu, đây là các chỉ số bạn sẽ gặp nhiều nhất (StockSense hiển thị và AI sẽ giải thích chúng theo từng mã):',
    ],
    bullets: [
      'P/E (giá / lợi nhuận): thị trường trả bao nhiêu đồng cho mỗi đồng lợi nhuận. P/E thấp có thể là rẻ, nhưng phải so với trung bình ngành và lịch sử chính nó.',
      'P/B (giá / giá trị sổ sách): giá cổ phiếu so với tài sản ròng trên mỗi cổ phiếu.',
      'ROE (lợi nhuận / vốn chủ sở hữu): đo hiệu quả sinh lời trên vốn cổ đông — ROE cao và ổn định là dấu hiệu doanh nghiệp làm ăn tốt.',
      'EPS (lợi nhuận trên mỗi cổ phiếu): mỗi cổ phiếu tạo ra bao nhiêu đồng lợi nhuận.',
      'Vốn hóa: quy mô doanh nghiệp = giá × số cổ phiếu lưu hành.',
      'Thanh khoản (khối lượng khớp lệnh): mã có khối lượng lớn thì dễ mua/bán, mã thanh khoản thấp dễ bị kẹt hàng.',
    ],
  },
  {
    title: 'Nguyên tắc đầu tư có kỷ luật',
    paragraphs: [
      'Công cụ tốt vẫn cần người dùng có kỷ luật. Vài nguyên tắc giúp bạn tồn tại lâu dài trên thị trường:',
    ],
    bullets: [
      'Chỉ dùng tiền nhàn rỗi: đừng bao giờ đầu tư bằng tiền sinh hoạt hay tiền vay nóng.',
      'Quản trị vốn: chia vốn thành nhiều phần, không "tất tay" một mã. Một vị thế nên chiếm tỷ trọng hợp lý để nếu sai còn cơ hội sửa.',
      'Luôn có điểm cắt lỗ: xác định trước mức giá sẽ bán nếu nhận định sai, và tuân thủ nó. Giữ lỗ nhỏ để bảo toàn vốn.',
      'Đa dạng hóa: nắm vài mã ở các ngành khác nhau thay vì dồn hết vào một cổ phiếu.',
      'Tránh FOMO và tin đồn: không mua đuổi chỉ vì giá đang tăng nóng hay vì "phím hàng". Mọi quyết định nên có lý do rõ ràng.',
      'Kiên nhẫn và nhất quán: đầu tư là hành trình dài. Bám quy trình, ghi lại lý do mua/bán để rút kinh nghiệm.',
    ],
  },
  {
    title: 'Cách dùng StockSense để đầu tư',
    paragraphs: [
      'Bốn khu vực chính của ứng dụng và cách áp dụng vào việc đầu tư thực tế:',
    ],
    bullets: [
      'Trang chủ: nắm nhanh bối cảnh thị trường — VN-Index, số mã tăng/giảm, bảng giá (danh mục theo dõi của bạn và rổ VN30), tin tức trong ngày. Bấm "AI nhận định thị trường" để AI phân tích toàn cảnh phiên, dòng tiền và yếu tố vĩ mô rồi đưa nhận định xu hướng + chiến lược.',
      'Phân tích cổ phiếu: nhập mã bất kỳ → AI nạp số liệu thật, tự research web rồi phân tích sâu (định giá, kỹ thuật, red flag, rủi ro) và chốt khuyến nghị Mua/Bán/Giữ kèm độ tin cậy, vùng giá mua, mục tiêu chốt lời và điểm cắt lỗ. Hỏi tiếp để đào sâu, hoặc đính kèm ảnh biểu đồ để AI đọc cùng.',
      'Danh mục: nhập các lệnh Mua/Bán đã khớp để theo dõi giá vốn trung bình và lãi/lỗ cập nhật theo giá trong ngày. Bấm "AI phân tích danh mục" để AI soi từng vị thế và lập kế hoạch hành động: Giữ / Mua thêm / Chốt lời / Cắt lỗ.',
      'Cộng Đồng: đăng bài chia sẻ nhận định (kèm ảnh), thích và bình luận để học hỏi, trao đổi cùng các nhà đầu tư khác.',
    ],
  },
  {
    title: 'Quy trình gợi ý',
    paragraphs: ['Một cách kết hợp các tính năng thành thói quen đầu tư:'],
    bullets: [
      'Bước 1 — Nắm bối cảnh: mở Trang chủ, xem VN-Index và để AI nhận định thị trường để biết "thời tiết" chung.',
      'Bước 2 — Soi mã: có mã quan tâm thì vào Phân tích cổ phiếu, đọc kỹ phần định giá, rủi ro và khuyến nghị của AI.',
      'Bước 3 — Ra quyết định: nếu mua, ghi lệnh vào Danh mục để theo dõi lãi/lỗ và giá vốn.',
      'Bước 4 — Rà soát định kỳ: thỉnh thoảng để AI phân tích lại danh mục để biết nên giữ, gia tăng hay chốt.',
      'Bước 5 — Trao đổi: chia sẻ và học hỏi thêm góc nhìn ở Cộng Đồng.',
    ],
  },
];

// Nút nhảy nhanh tới tính năng (dùng onNavigate của App).
function QuickLink({ Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
    >
      <Icon size={17} className="text-blue-600 dark:text-blue-400" />
      {label}
      <ArrowRight
        size={15}
        className="text-slate-300 transition-colors group-hover:text-blue-500 dark:text-slate-600 dark:group-hover:text-blue-400"
      />
    </button>
  );
}

export default function Guide({ onNavigate }) {
  const embedSrc =
    `https://www.youtube.com/embed/${YOUTUBE_ID}?rel=0` +
    (YOUTUBE_START ? `&start=${YOUTUBE_START}` : '');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      {/* header */}
      <div>
        <h1 className="m-0 flex items-center gap-2 text-2xl font-extrabold tracking-[-0.02em] text-slate-900 dark:text-white">
          <BookOpen size={22} className="text-blue-600 dark:text-blue-400" />
          Hướng dẫn
        </h1>
        <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">
          Xem video hướng dẫn và tìm hiểu cách chơi chứng khoán cùng cách áp
          dụng StockSense vào đầu tư.
        </p>
      </div>

      {/* video YouTube — khung 16:9 tự co theo màn hình */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm dark:border-slate-800">
        <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
          <iframe
            className="absolute inset-0 h-full w-full"
            src={embedSrc}
            title="Video hướng dẫn StockSense"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>

      {/* nút nhảy nhanh tới tính năng */}
      <div className="flex flex-wrap gap-2.5">
        <QuickLink
          Icon={Sparkle}
          label="Phân tích cổ phiếu"
          onClick={() => onNavigate?.('ai')}
        />
        <QuickLink
          Icon={Wallet}
          label="Danh mục"
          onClick={() => onNavigate?.('portfolio')}
        />
        <QuickLink
          Icon={Users}
          label="Cộng Đồng"
          onClick={() => onNavigate?.('community')}
        />
      </div>

      {/* nội dung hướng dẫn */}
      <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {GUIDE_SECTIONS.map((s, i) => (
          <section key={i}>
            <h2 className="m-0 mb-2 text-lg font-bold text-slate-900 dark:text-white">
              {s.title}
            </h2>
            {s.paragraphs?.map((p, j) => (
              <p
                key={j}
                className="m-0 mb-2 text-[14.5px] leading-relaxed text-slate-700 dark:text-slate-300"
              >
                {p}
              </p>
            ))}
            {s.bullets?.length > 0 && (
              <ul className="my-1 list-disc space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-slate-700 dark:text-slate-300">
                {s.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
