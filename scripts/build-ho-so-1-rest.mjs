// Hồ sơ 1, tháng 4–12 (tháng 10–12 gộp) + Tầng 2 + Tầng 3 rút gọn.
import { L, doc, fmt, simple, writeJson, NONCASH_THRESHOLD } from './lib.mjs';

export const tiers = { tier2: true, tier3a: true, tier3b: false, tier3Note: 'Tầng 3 rút gọn: chỉ bảng đối chiếu lợi nhuận kế toán → thu nhập chịu thuế.' };

export function months(h, OPEN_BASE) {
  const { push, buy, sell, salary, vatOffset, vatPay, P, T, M, N } = h;

  // ================= THÁNG 4 =================
  const m4 = [];
  push(m4, simple({
    id: 'h1-m04-tra-truoc', date: '2026-04-02', speaker: M, title: 'Trả trước cho nhà cung cấp mới',
    narrative: 'Bà Mây đặt Công ty May Lụa Trăng may 200 áo khoác gió, chuyển khoản đặt cọc trước 30.000.000. Hàng giao tháng sau.',
    documents: [doc('Ủy nhiệm chi', [['Người nhận', P['lua-trang']], ['Nội dung', 'Trả trước tiền hàng áo khoác'], ['Số tiền', fmt(30_000_000)]])],
    hint: 'Chưa nhận hàng nên chưa có hàng tồn kho; tiền trả trước vẫn theo dõi trên TK công nợ với nhà cung cấp.',
    explanation: 'Nợ 331 (Lụa Trăng) / Có 112 30.000.000. TK 331 của Lụa Trăng dư Nợ nên trên CĐKT nằm ở dòng "Trả trước cho người bán" (tài sản), không bù trừ với nợ phải trả nhà cung cấp khác.',
    entries: [[L.dr('331', 30_000_000, { partner: 'lua-trang' }), L.cr('112', 30_000_000)]],
  }));
  push(m4, simple({
    id: 'h1-m04-tam-ung', date: '2026-04-08', speaker: N, title: 'Tạm ứng cho Bé Na đi chợ đầu mối',
    narrative: 'Bé Na nhận 5.000.000 tiền mặt tạm ứng để đi chợ đầu mối khảo sát mẫu và thuê xe chở hàng mẫu.',
    documents: [doc('Phiếu chi', [['Người nhận', 'Bé Na'], ['Lý do', 'Tạm ứng công tác'], ['Số tiền', fmt(5_000_000)]])],
    explanation: 'Nợ 141 (Bé Na) / Có 111 5.000.000. Tạm ứng chưa phải chi phí: chỉ khi Bé Na nộp chứng từ quyết toán mới ghi chi phí.',
    entries: [[L.dr('141', 5_000_000, { partner: 'be-na' }), L.cr('111', 5_000_000)]],
  }));
  push(m4, sell('h1-m04-ban-ao-xinh', '2026-04-15', 'ao-thun', 500, 'credit', 'ao-xinh', 'Bán chịu 500 áo thun cho Shop Áo Xinh',
    'Shop Áo Xinh lấy thêm 500 áo thun, công nợ 60 ngày. Khoản tháng 2 vẫn chưa trả.',
    'Nợ 131 (Áo Xinh) 54.000.000 / Có 5111 50.000.000, Có 33311 4.000.000; giá vốn 30.000.000. Phải thu Áo Xinh lên 140.400.000. Bán nhiều mà tiền chưa về.'));
  push(m4, simple({
    id: 'h1-m04-quyet-toan-tam-ung', date: '2026-04-18', speaker: N, title: 'Bé Na quyết toán tạm ứng',
    narrative: 'Bé Na nộp hóa đơn GTGT thuê xe chở hàng mẫu: tiền dịch vụ 2.500.000, thuế 200.000. Số tạm ứng còn thừa 2.300.000 nộp lại quỹ.',
    documents: [
      doc('Hóa đơn GTGT', [['Dịch vụ vận chuyển hàng mẫu', fmt(2_500_000)], ['Thuế GTGT (8%)', fmt(200_000)], ['Tổng cộng', fmt(2_700_000)], ['Hình thức thanh toán', 'Tiền mặt (từ tiền tạm ứng)']], 'Hợp tác xã Vận Tải Bánh Lăn'),
      doc('Giấy thanh toán tạm ứng', [['Số tạm ứng', fmt(5_000_000)], ['Đã chi', fmt(2_700_000)], ['Nộp lại quỹ', fmt(2_300_000)]]),
    ],
    hint: 'Tạm ứng được tất toán bằng chi phí có chứng từ và số tiền nộp lại.',
    explanation: `Nợ 641 2.500.000, Nợ 1331 200.000, Nợ 111 2.300.000 / Có 141 (Bé Na) 5.000.000. Hóa đơn dưới ${fmt(NONCASH_THRESHOLD)} nên trả tiền mặt vẫn được khấu trừ.`,
    attrs: { invoice: { totalInclVAT: 2_700_000, paymentMethod: 'cash' }, vat: { base: 2_500_000, ruleId: 'vat-reduction-8' } },
    entries: [[L.dr('641', 2_500_000), L.dr('1331', 200_000), L.dr('111', 2_300_000), L.cr('141', 5_000_000, { partner: 'be-na' })]],
  }));
  push(m4, vatPay('h1-m04-nop-gtgt-t3', '2026-04-20', 'tháng 3'));
  push(m4, salary('h1-m04-luong', '2026-04-30', 'tháng 4'));
  push(m4, vatOffset('h1-m04-khau-tru', '2026-04-30', 'tháng 4'));

  // ================= THÁNG 5 =================
  const m5 = [];
  push(m5, buy({
    id: 'h1-m05-nhan-ao-khoac', date: '2026-05-05', speaker: N, title: 'Nhận 200 áo khoác, trừ tiền đã trả trước',
    narrative: 'Công ty May Lụa Trăng giao 200 áo khoác gió, đơn giá 250.000. Đã trả trước 30.000.000 từ tháng 4, phần còn lại trả sau.',
    sellerName: P['lua-trang'], supplier: 'lua-trang', pay: 'credit', debitTo: '156', detail: { item: 'ao-khoac' },
    lines: [{ name: 'Áo khoác gió', qty: 200, price: 250_000, unit: 'cái' }],
    hint: 'Ghi toàn bộ giá trị hóa đơn vào công nợ với Lụa Trăng; khoản trả trước tự bù trên cùng tài khoản của cùng nhà cung cấp.',
    explanation: 'Nợ 156 (áo khoác) 50.000.000, Nợ 1331 4.000.000 / Có 331 (Lụa Trăng) 54.000.000. Số dư Lụa Trăng từ Nợ 30.000.000 thành Có 24.000.000; bù trừ trong cùng một nhà cung cấp là đúng bản chất.',
  }));
  push(m5, sell('h1-m05-ban-ao-khoac', '2026-05-12', 'ao-khoac', 150, 'credit', 'ao-xinh', 'Bán chịu 150 áo khoác cho Shop Áo Xinh',
    'Shop Áo Xinh lấy 150 áo khoác gió, giá 400.000.',
    'Nợ 131 (Áo Xinh) 64.800.000 / Có 5111 60.000.000, Có 33311 4.800.000; giá vốn 150 × 250.000 = 37.500.000.'));
  push(m5, sell('h1-m05-ban-co-ba', '2026-05-15', 'quan-kaki', 200, 'credit', 'co-ba', 'Bán chịu 200 quần kaki cho Tạp hóa Cô Ba',
    'Cô Ba lấy 200 quần kaki, hẹn 45 ngày trả.',
    'Nợ 131 (Cô Ba) 51.840.000 / Có 5111 48.000.000, Có 33311 3.840.000; giá vốn 30.000.000.'));
  push(m5, vatPay('h1-m05-nop-gtgt-t4', '2026-05-20', 'tháng 4'));
  push(m5, buy({
    id: 'h1-m05-quang-cao-tien-mat', date: '2026-05-22', speaker: M, title: 'Quảng cáo tờ rơi trả bằng tiền mặt',
    narrative: 'Bà Mây thuê in và phát tờ rơi quảng cáo, hóa đơn 6.000.000 chưa thuế. Bên in đòi tiền mặt nên bà trả luôn từ quỹ.',
    sellerName: 'Cơ sở Quảng Cáo Lá Cải', pay: 'cash', debitTo: '641', unusual: true,
    lines: [{ name: 'In và phát tờ rơi quảng cáo', qty: 1, price: 6_000_000, unit: 'gói' }],
    hint: `Tổng thanh toán đã gồm thuế có vượt ${fmt(NONCASH_THRESHOLD)} không? Trả bằng gì?`,
    explanation: `Tổng thanh toán 6.480.000 từ ${fmt(NONCASH_THRESHOLD)} trở lên mà trả tiền mặt → thuế GTGT 480.000 KHÔNG được khấu trừ, phải tính vào chi phí: Nợ 641 6.480.000 / Có 111. Khoản chi này cũng không được trừ khi tính thuế TNDN; cuối năm phải cộng lại ở bảng đối chiếu (Tầng 3).`,
  }));
  push(m5, salary('h1-m05-luong', '2026-05-31', 'tháng 5'));
  push(m5, vatOffset('h1-m05-khau-tru', '2026-05-31', 'tháng 5'));

  // ================= THÁNG 6 =================
  const m6 = [];
  push(m6, simple({
    id: 'h1-m06-ao-xinh-tra', date: '2026-06-05', speaker: N, title: 'Shop Áo Xinh trả lô tháng 2',
    narrative: 'Shop Áo Xinh chuyển khoản 86.400.000 cho lô áo thun tháng 2, trễ hạn gần 2 tháng.',
    documents: [doc('Giấy báo Có ngân hàng', [['Người chuyển', P['ao-xinh']], ['Số tiền', fmt(86_400_000)]])],
    explanation: 'Nợ 112 / Có 131 (Áo Xinh) 86.400.000. Áo Xinh còn nợ 118.800.000. Khách trả chậm làm tiền thực thu thấp hơn doanh thu.',
    entries: [[L.dr('112', 86_400_000), L.cr('131', 86_400_000, { partner: 'ao-xinh' })]],
  }));
  push(m6, simple({
    id: 'h1-m06-tra-lua-trang', date: '2026-06-10', speaker: M, title: 'Trả nốt tiền áo khoác cho Lụa Trăng',
    narrative: 'Chuyển khoản 24.000.000 trả nốt cho Công ty May Lụa Trăng.',
    documents: [doc('Ủy nhiệm chi', [['Người nhận', P['lua-trang']], ['Số tiền', fmt(24_000_000)]])],
    explanation: 'Nợ 331 (Lụa Trăng) / Có 112 24.000.000. Hóa đơn 54.000.000 được trả bằng chuyển khoản (trả trước và trả nốt) nên giữ quyền khấu trừ.',
    entries: [[L.dr('331', 24_000_000, { partner: 'lua-trang' }), L.cr('112', 24_000_000)]],
  }));
  push(m6, simple({
    id: 'h1-m06-phat', date: '2026-06-15', speaker: T, title: 'Nộp phạt vi phạm hành chính', unusual: true,
    narrative: 'Công ty bị phạt 3.000.000 vì nộp chậm báo cáo theo quy định. Đã nộp phạt bằng chuyển khoản.',
    documents: [doc('Quyết định xử phạt vi phạm hành chính', [['Số tiền phạt', fmt(3_000_000)], ['Hình thức nộp', 'Chuyển khoản']])],
    hint: 'Tiền phạt không gắn với bán hàng hay quản lý thường xuyên; ghi vào chi phí khác.',
    explanation: 'Nợ 811 / Có 112 3.000.000. Kế toán vẫn ghi chi phí vì tiền đã thực chi, nhưng khi tính thuế TNDN thì tiền phạt vi phạm hành chính không được trừ; cuối năm cộng lại ở Tầng 3.',
    attrs: { expenseType: 'admin-penalty' },
    entries: [[L.dr('811', 3_000_000), L.cr('112', 3_000_000)]],
  }));
  push(m6, vatPay('h1-m06-nop-gtgt-t5', '2026-06-20', 'tháng 5'));
  push(m6, sell('h1-m06-ban-online', '2026-06-25', 'ao-thun', 300, 'bank', null, 'Bán online 300 áo thun',
    'Kênh bán online gom đơn được 300 áo thun, khách chuyển khoản trước.',
    'Nợ 112 32.400.000 / Có 5111 30.000.000, Có 33311 2.400.000; giá vốn 18.000.000.'));
  push(m6, salary('h1-m06-luong', '2026-06-30', 'tháng 6'));
  push(m6, vatOffset('h1-m06-khau-tru', '2026-06-30', 'tháng 6'));

  // ================= THÁNG 7 =================
  const m7 = [];
  push(m7, simple({
    id: 'h1-m07-hang-hong', date: '2026-07-03', speaker: N, title: 'Kiểm kê: 20 áo khoác bị mốc', unusual: true,
    narrative: 'Mưa dột kho, 20 áo khoác gió bị ẩm mốc, không bán được. Biên bản kiểm kê xác định giá gốc 5.000.000, không ai phải bồi thường; giám đốc duyệt xử lý vào giá vốn.',
    documents: [doc('Biên bản kiểm kê', [['Mặt hàng', 'Áo khoác gió'], ['Số lượng hỏng', '20 cái'], ['Giá gốc', fmt(5_000_000)], ['Xử lý', 'Tính vào giá vốn hàng bán']])],
    hint: 'Hàng mất giá trị phải ra khỏi tồn kho.',
    explanation: 'Nợ 632 / Có 156 (áo khoác) 5.000.000. Nếu không ghi, tồn kho trên CĐKT bị phóng đại và giá vốn bị ghi thiếu.',
    entries: [[L.dr('632', 5_000_000), L.cr('156', 5_000_000, { item: 'ao-khoac' })]],
  }));
  push(m7, buy({
    id: 'h1-m07-mua-ao-thun', date: '2026-07-10', speaker: N, title: 'Mua 1.000 áo thun trả chậm',
    narrative: 'Nhập 1.000 áo thun của Xưởng May Chỉ Hồng, đơn giá 60.000, trả chậm.',
    sellerName: P['chi-hong'], supplier: 'chi-hong', pay: 'credit', debitTo: '156', detail: { item: 'ao-thun' },
    lines: [{ name: 'Áo thun cotton', qty: 1000, price: 60_000, unit: 'cái' }],
    explanation: 'Nợ 156 (áo thun) 60.000.000, Nợ 1331 4.800.000 / Có 331 (Chỉ Hồng) 64.800.000.',
  }));
  push(m7, sell('h1-m07-ban-ao-xinh', '2026-07-15', 'ao-thun', 1000, 'credit', 'ao-xinh', 'Bán chịu 1.000 áo thun cho Shop Áo Xinh',
    'Áo Xinh mở thêm chi nhánh, lấy 1.000 áo thun, công nợ 90 ngày.',
    'Nợ 131 (Áo Xinh) 108.000.000 / Có 5111 100.000.000, Có 33311 8.000.000; giá vốn 60.000.000. Phải thu Áo Xinh lên 226.800.000, cao nhất từ đầu năm.'));
  push(m7, vatPay('h1-m07-nop-gtgt-t6', '2026-07-20', 'tháng 6'));
  push(m7, buy({
    id: 'h1-m07-ve-sinh', date: '2026-07-25', speaker: N, title: 'Dịch vụ vệ sinh văn phòng',
    narrative: 'Thuê dịch vụ vệ sinh văn phòng định kỳ, hóa đơn 4.000.000 chưa thuế, chuyển khoản.',
    sellerName: 'Công ty Vệ Sinh Sạch Bóng', pay: 'bank', debitTo: '642',
    lines: [{ name: 'Dịch vụ vệ sinh văn phòng', qty: 1, price: 4_000_000, unit: 'tháng' }],
    explanation: 'Nợ 642 4.000.000, Nợ 1331 320.000 / Có 112 4.320.000.',
  }));
  push(m7, salary('h1-m07-luong', '2026-07-31', 'tháng 7'));
  push(m7, vatOffset('h1-m07-khau-tru', '2026-07-31', 'tháng 7'));

  // ================= THÁNG 8 =================
  const m8 = [];
  push(m8, simple({
    id: 'h1-m08-co-ba-tra-mot-phan', date: '2026-08-05', speaker: N, title: 'Cô Ba trả được một phần nợ quá hạn', unusual: true,
    narrative: 'Lô quần tháng 5 của Cô Ba (51.840.000) đã quá hạn. Cô Ba báo làm ăn khó, chỉ chuyển khoản trả được 20.000.000.',
    documents: [doc('Giấy báo Có ngân hàng', [['Người chuyển', P['co-ba']], ['Số tiền', fmt(20_000_000)], ['Ghi chú', 'Còn nợ 31.840.000, quá hạn từ tháng 7']])],
    explanation: 'Nợ 112 / Có 131 (Cô Ba) 20.000.000. Phần còn lại 31.840.000 quá hạn; cuối năm cần xem có phải trích dự phòng không. Ghi nhớ khoản này cho Tầng 2.',
    entries: [[L.dr('112', 20_000_000), L.cr('131', 20_000_000, { partner: 'co-ba' })]],
  }));
  push(m8, sell('h1-m08-ban-le', '2026-08-12', 'quan-kaki', 300, 'cash', null, 'Bán lẻ 300 quần kaki',
    'Đợt giảm giá cuối hè bán được 300 quần kaki, thu tiền mặt (giá bán không đổi).',
    'Nợ 111 77.760.000 / Có 5111 72.000.000, Có 33311 5.760.000; giá vốn 45.000.000.'));
  push(m8, simple({
    id: 'h1-m08-nop-tien', date: '2026-08-14', speaker: N, title: 'Nộp 100 triệu tiền mặt vào ngân hàng',
    narrative: 'Bé Na nộp 100.000.000 tiền mặt vào tài khoản ngân hàng.',
    documents: [doc('Giấy nộp tiền', [['Số tiền', fmt(100_000_000)]])],
    explanation: 'Nợ 112 / Có 111 100.000.000. Chuyển nội bộ giữa hai loại tiền, LCTT không đổi.',
    entries: [[L.dr('112', 100_000_000), L.cr('111', 100_000_000)]],
  }));
  push(m8, vatPay('h1-m08-nop-gtgt-t7', '2026-08-20', 'tháng 7'));
  push(m8, buy({
    id: 'h1-m08-catalogue', date: '2026-08-25', speaker: N, title: 'In catalogue mẫu mới, trả tiền mặt',
    narrative: 'In catalogue mẫu thu đông, hóa đơn 4.500.000 chưa thuế, trả tiền mặt.',
    sellerName: 'Xưởng In Giấy Thơm', pay: 'cash', debitTo: '641',
    lines: [{ name: 'In catalogue', qty: 1, price: 4_500_000, unit: 'lô' }],
    hint: 'So sánh với nghiệp vụ tờ rơi tháng 5: tổng thanh toán lần này là bao nhiêu?',
    explanation: `Tổng thanh toán 4.860.000 dưới ${fmt(NONCASH_THRESHOLD)}: trả tiền mặt vẫn được khấu trừ. Nợ 641 4.500.000, Nợ 1331 360.000 / Có 111 4.860.000.`,
  }));
  push(m8, salary('h1-m08-luong', '2026-08-31', 'tháng 8'));
  push(m8, vatOffset('h1-m08-khau-tru', '2026-08-31', 'tháng 8'));

  // ================= THÁNG 9 =================
  const m9 = [];
  push(m9, simple({
    id: 'h1-m09-vay', date: '2026-09-01', speaker: M, title: 'Vay ngắn hạn ngân hàng 200 triệu',
    narrative: 'Công ty vay Ngân hàng TMCP Hạt Lúa 200.000.000, kỳ hạn 6 tháng, lãi suất 9%/năm (theo hợp đồng), trả lãi hàng tháng. Tiền giải ngân vào tài khoản.',
    documents: [doc('Hợp đồng tín dụng', [['Số tiền vay', fmt(200_000_000)], ['Kỳ hạn', '6 tháng (đến 01/03/2027)'], ['Lãi suất', '9%/năm, trả hàng tháng']])],
    explanation: 'Nợ 112 / Có 3411 (Hạt Lúa) 200.000.000. Kỳ hạn dưới 12 tháng nên nằm ở "Vay ngắn hạn". LCTT: tiền thu từ đi vay (hoạt động tài chính).',
    entries: [[L.dr('112', 200_000_000), L.cr('3411', 200_000_000, { partner: 'hat-lua' })]],
  }));
  push(m9, buy({
    id: 'h1-m09-mua-tscd', date: '2026-09-05', speaker: M, title: 'Mua bộ nội thất văn phòng',
    narrative: 'Mua bộ bàn họp và tủ hồ sơ gỗ cho văn phòng, giá 72.000.000 chưa thuế, chuyển khoản. Theo kịch bản, tài sản đủ điều kiện ghi nhận TSCĐ, khấu hao đường thẳng 3 năm, bắt đầu từ tháng 9.',
    sellerName: 'Công ty Nội Thất Gỗ Mộc', pay: 'bank', debitTo: '211',
    lines: [{ name: 'Bộ bàn họp và tủ hồ sơ gỗ', qty: 1, price: 72_000_000, unit: 'bộ' }],
    hint: 'Tài sản dùng nhiều năm thì ghi tăng TSCĐ, không ghi thẳng vào chi phí.',
    explanation: 'Nợ 211 72.000.000, Nợ 1331 5.760.000 / Có 112 77.760.000. Chi phí sẽ vào KQKD dần qua khấu hao (2.000.000/tháng). Trên LCTT: tiền chi mua sắm TSCĐ (hoạt động đầu tư).',
  }));
  push(m9, buy({
    id: 'h1-m09-nhan-ao-khoac', date: '2026-09-15', speaker: N, title: 'Nhập 200 áo khoác thu đông, trả chậm',
    narrative: 'Lụa Trăng giao 200 áo khoác gió, đơn giá 250.000, trả chậm 30 ngày.',
    sellerName: P['lua-trang'], supplier: 'lua-trang', pay: 'credit', debitTo: '156', detail: { item: 'ao-khoac' },
    lines: [{ name: 'Áo khoác gió', qty: 200, price: 250_000, unit: 'cái' }],
    explanation: 'Nợ 156 (áo khoác) 50.000.000, Nợ 1331 4.000.000 / Có 331 (Lụa Trăng) 54.000.000.',
  }));
  push(m9, vatPay('h1-m09-nop-gtgt-t8', '2026-09-20', 'tháng 8'));
  push(m9, sell('h1-m09-ban-ao-khoac', '2026-09-25', 'ao-khoac', 200, 'credit', 'ao-xinh', 'Bán chịu 200 áo khoác cho Shop Áo Xinh',
    'Áo Xinh lấy 200 áo khoác gió, giá 400.000.',
    'Nợ 131 (Áo Xinh) 86.400.000 / Có 5111 80.000.000, Có 33311 6.400.000; giá vốn 50.000.000.'));
  push(m9, simple({
    id: 'h1-m09-khau-hao', date: '2026-09-30', speaker: T, title: 'Trích khấu hao TSCĐ tháng 9',
    narrative: 'Trích khấu hao bộ nội thất văn phòng tháng 9: 72.000.000 / 36 tháng.',
    documents: [doc('Bảng tính khấu hao', [['Nguyên giá', fmt(72_000_000)], ['Thời gian (kịch bản cho)', '36 tháng'], ['Khấu hao tháng', fmt(2_000_000)]])],
    hint: 'Hao mòn ghi giảm giá trị tài sản qua TK điều chỉnh giảm, không ghi Có thẳng vào 211.',
    explanation: 'Nợ 642 / Có 2141 2.000.000. Nguyên giá trên CĐKT giữ nguyên; dòng "Giá trị hao mòn lũy kế" tăng (số âm). Khấu hao là chi phí không chi tiền: LCTT gián tiếp cộng lại ở dòng "Khấu hao TSCĐ". Game không chấm đúng/sai khung khấu hao TT 45 vì chưa đọc văn bản gốc.',
    attrs: { depreciation: [{ assetId: 'noi-that-vp', amount: 2_000_000 }] },
    entries: [[L.dr('642', 2_000_000), L.cr('2141', 2_000_000)]],
  }));
  push(m9, simple({
    id: 'h1-m09-lai-vay', date: '2026-09-30', speaker: T, title: 'Trả lãi vay tháng 9',
    narrative: 'Ngân hàng trừ tài khoản tiền lãi tháng 9: 200.000.000 × 9% / 12 = 1.500.000.',
    documents: [doc('Giấy báo Nợ ngân hàng', [['Nội dung', 'Thu lãi vay tháng 9'], ['Số tiền', fmt(1_500_000)]])],
    explanation: 'Nợ 635 / Có 112 1.500.000. Lãi vay là chi phí tài chính; trên LCTT trực tiếp nằm ở "Tiền lãi vay đã trả" (thuộc hoạt động kinh doanh).',
    entries: [[L.dr('635', 1_500_000), L.cr('112', 1_500_000)]],
  }));
  push(m9, salary('h1-m09-luong', '2026-09-30', 'tháng 9'));
  push(m9, vatOffset('h1-m09-khau-tru', '2026-09-30', 'tháng 9'));

  // ================= THÁNG 10–12 (gộp) =================
  const q4 = [];
  push(q4, simple({
    id: 'h1-q4-ao-xinh-tra', date: '2026-10-05', speaker: N, title: 'Shop Áo Xinh trả lô tháng 4 và tháng 5',
    narrative: 'Áo Xinh chuyển khoản 118.800.000 cho hai lô tháng 4 (54.000.000) và tháng 5 (64.800.000).',
    documents: [doc('Giấy báo Có ngân hàng', [['Người chuyển', P['ao-xinh']], ['Số tiền', fmt(118_800_000)]])],
    explanation: 'Nợ 112 / Có 131 (Áo Xinh) 118.800.000.',
    entries: [[L.dr('112', 118_800_000), L.cr('131', 118_800_000, { partner: 'ao-xinh' })]],
  }));
  push(q4, simple({
    id: 'h1-q4-tra-ncc', date: '2026-10-10', speaker: M, title: 'Trả nợ hai nhà cung cấp',
    narrative: 'Chuyển khoản trả Xưởng May Chỉ Hồng 64.800.000 (lô tháng 7) và Công ty May Lụa Trăng 54.000.000 (lô tháng 9).',
    documents: [doc('Ủy nhiệm chi', [[P['chi-hong'], fmt(64_800_000)], [P['lua-trang'], fmt(54_000_000)], ['Tổng', fmt(118_800_000)]])],
    hint: 'Mỗi nhà cung cấp một dòng chi tiết.',
    explanation: 'Nợ 331 (Chỉ Hồng) 64.800.000, Nợ 331 (Lụa Trăng) 54.000.000 / Có 112 118.800.000. Ghi gộp một dòng 331 không chi tiết sẽ bị chấm sai: sổ chi tiết công nợ phải đúng từng đối tượng.',
    entries: [[L.dr('331', 64_800_000, { partner: 'chi-hong' }), L.dr('331', 54_000_000, { partner: 'lua-trang' }), L.cr('112', 118_800_000)]],
  }));
  push(q4, sell('h1-q4-ban-ao-xinh', '2026-11-15', 'ao-thun', 600, 'credit', 'ao-xinh', 'Bán chịu 600 áo thun cho Shop Áo Xinh',
    'Mùa mua sắm cuối năm, Áo Xinh lấy 600 áo thun, công nợ 90 ngày.',
    'Nợ 131 (Áo Xinh) 64.800.000 / Có 5111 60.000.000, Có 33311 4.800.000; giá vốn 36.000.000.'));
  push(q4, sell('h1-q4-ban-le', '2026-11-20', 'quan-kaki', 200, 'bank', null, 'Bán 200 quần kaki thu chuyển khoản',
    'Bán hết 200 quần kaki còn lại cho khách lẻ qua kênh online, thu chuyển khoản.',
    'Nợ 112 51.840.000 / Có 5111 48.000.000, Có 33311 3.840.000; giá vốn 30.000.000. Quần kaki hết hàng.'));
  push(q4, vatOffset('h1-q4-khau-tru-t11', '2026-11-30', 'tháng 11'));
  push(q4, vatPay('h1-q4-nop-gtgt-t11', '2026-12-20', 'tháng 11'));
  push(q4, simple({
    id: 'h1-q4-khau-hao', date: '2026-12-31', speaker: T, title: 'Trích khấu hao tháng 10–12',
    narrative: 'Trích khấu hao bộ nội thất văn phòng cho 3 tháng 10, 11, 12 (gộp một bút toán).',
    documents: [doc('Bảng tính khấu hao', [['Khấu hao tháng', fmt(2_000_000)], ['Số tháng', '3'], ['Cộng', fmt(6_000_000)]])],
    explanation: 'Nợ 642 / Có 2141 6.000.000. Hao mòn lũy kế cả năm 8.000.000.',
    attrs: { depreciation: [{ assetId: 'noi-that-vp', amount: 6_000_000 }] },
    entries: [[L.dr('642', 6_000_000), L.cr('2141', 6_000_000)]],
  }));
  push(q4, simple({
    id: 'h1-q4-lai-vay', date: '2026-12-31', speaker: T, title: 'Trả lãi vay tháng 10–12',
    narrative: 'Lãi vay 3 tháng 10–12, mỗi tháng 1.500.000, ngân hàng đã trừ tài khoản.',
    documents: [doc('Giấy báo Nợ ngân hàng', [['Lãi 3 tháng', fmt(4_500_000)]])],
    explanation: 'Nợ 635 / Có 112 4.500.000.',
    entries: [[L.dr('635', 4_500_000), L.cr('112', 4_500_000)]],
  }));
  push(q4, salary('h1-q4-luong', '2026-12-31', 'tháng 10–12', 18_000_000, 24_000_000, 'tháng 10–12'));
  push(q4, simple({
    id: 'h1-q4-thue-tndn', date: '2026-12-31', kind: 'cit', speaker: T, title: 'Tính và ghi chi phí thuế TNDN năm 2026',
    narrative: 'Cuối năm, tự tính thuế TNDN: lấy tổng lợi nhuận kế toán trước thuế, cộng các khoản chi không được trừ đã gặp trong năm (nhớ lại tháng 5 và tháng 6), nhân thuế suất chọn theo doanh thu năm trước. Ghi chi phí thuế TNDN hiện hành đối ứng thuế phải nộp.',
    hint: 'Thu nhập chịu thuế = LN kế toán trước thuế + chi không được trừ (quảng cáo trả tiền mặt từ 5 triệu, tiền phạt). Doanh thu năm trước 750 triệu thuộc khung thuế suất nào? Xem trang "Quy định & rule".',
    explanation: 'Nợ 8211 / Có 3334 số thuế tính được. Bảng đối chiếu chi tiết từng dòng làm ở Tầng 3. Game chỉ ghi thuế hiện hành, không ghi thuế hoãn lại (giản lược so với VAS 17).',
    entries: [[L.dr('8211', { $calc: 'citExpense' }), L.cr('3334', { $calc: 'citExpense' })]],
  }));
  push(q4, simple({
    id: 'h1-q4-ket-chuyen', date: '2026-12-31', kind: 'closing', speaker: T, title: 'Kết chuyển cuối năm',
    narrative: 'Tự làm bút toán kết chuyển: đưa doanh thu và mọi chi phí (kể cả chi phí thuế TNDN) sang TK 911, rồi kết chuyển lãi sang TK 4212. Bảng số dư bên dưới lấy từ sổ của bạn.',
    hint: 'Ba bước: Nợ 5111 / Có 911; Nợ 911 / Có 632, 635, 641, 642, 811, 8211; số dư Có còn lại của 911 chuyển sang Có 4212.',
    explanation: 'Sau kết chuyển, mọi TK loại 5–9 về 0. Lợi nhuận sau thuế trên KQKD đúng bằng phần tăng của TK 4212. Engine không tự kết chuyển: đây là bước người làm kế toán phải tự hiểu.',
    answer: { $calc: 'closing' },
  }));

  const OPEN_4 = [...OPEN_BASE, '141', '811'];
  const OPEN_9 = [...OPEN_4, '211', '2141', '3411', '635'];
  const OPEN_Q4 = [...OPEN_9, '8211', '911', '4212'];

  writeTier2(h);
  writeJson(`${h.DIR}/adjustments.json`, {
    reconciliation: {
      intro: 'Tầng 3 rút gọn: lập bảng đối chiếu từ lợi nhuận kế toán trước thuế sang thu nhập chịu thuế. Chọn từng dòng điều chỉnh từ danh mục rule đang bật, nhập số tiền; engine tự tính đáp án từ rule engine.',
    },
  });

  return [
    { id: 'month-04', label: 'Tháng 4', events: m4, open: OPEN_4, intro: [
      { speaker: T, text: 'Từ tháng này có thêm tạm ứng (141) và chi phí khác (811). Nhớ: số dư 331 của từng nhà cung cấp có thể dư Nợ.' },
    ] },
    { id: 'month-05', label: 'Tháng 5', events: m5, open: OPEN_4, intro: [
      { speaker: M, text: 'Tháng 5 chị định chạy quảng cáo mạnh tay.' },
      { speaker: T, text: 'Chạy thì chạy, nhưng hóa đơn lớn thì nhớ chuyển khoản nhé chị.' },
    ] },
    { id: 'month-06', label: 'Tháng 6', events: m6, open: OPEN_4, intro: [{ speaker: T, text: 'Giữa năm rồi. Thử mở tab LCTT xem tiền thuần từ hoạt động kinh doanh so với lợi nhuận.' }] },
    { id: 'month-07', label: 'Tháng 7', events: m7, open: OPEN_4, intro: [{ speaker: N, text: 'Anh/chị ơi, kho bị dột!' }] },
    { id: 'month-08', label: 'Tháng 8', events: m8, open: OPEN_4, intro: [{ speaker: T, text: 'Có khách trả chậm rồi đó. Phải thu quá hạn thì cuối năm phải xem lại.' }] },
    { id: 'month-09', label: 'Tháng 9', events: m9, open: OPEN_9, intro: [{ speaker: M, text: 'Chị vay ngân hàng ít vốn, sắm lại bàn ghế văn phòng cho đàng hoàng.' }, { speaker: T, text: 'Có thêm TSCĐ (211, 2141), vay (3411) và chi phí lãi vay (635).' }] },
    { id: 'month-10-12', label: 'Tháng 10–12', events: q4, open: OPEN_Q4, intro: [
      { speaker: T, text: 'Ba tháng cuối được gộp cho nhanh. Tháng 10 không phát sinh thuế GTGT phải nộp vì đầu vào tháng 9 còn dư.' },
      { speaker: T, text: 'Cuối năm em tự tính thuế TNDN và tự kết chuyển nhé. Máy không làm hộ đâu!' },
    ], outro: [{ speaker: T, text: 'Khóa sổ năm xong! Giờ thử làm Tầng 2 (bắt lỗi BCTC) và Tầng 3 rút gọn (đối chiếu thuế).' }] },
  ];
}

function writeTier2(h) {
  writeJson(`${h.DIR}/anomalies.json`, {
    intro: 'Đây là bộ BCTC năm 2026 do kế toán dịch vụ lập lại cho Sợi Mây và đã khóa sổ. Có cột đầu năm và năm trước. Trong đó có 4 bất thường được cài sẵn. Hãy chọn khoản mục, cho biết bất thường chạm báo cáo nào và chọn lý do.',
    injections: [
      { id: 'h1-t2-hang-cuoi-nam', date: '2026-12-30', memo: 'Nhập lô áo khoác lớn cuối năm, chưa bán, chưa trả tiền', lines: [L.dr('156', 400_000_000, { item: 'ao-khoac' }), L.dr('1331', 32_000_000), L.cr('331', 432_000_000, { partner: 'lua-trang' })] },
      { id: 'h1-t2-xe-tai', date: '2026-12-30', memo: 'Mua xe tải giao hàng, ngân hàng giải ngân vay ngắn hạn trả thẳng người bán', lines: [L.dr('211', 600_000_000), L.cr('3411', 600_000_000, { partner: 'hat-lua' })] },
    ],
    notes: [
      {
        id: 'tm-tuoi-no', title: 'Thuyết minh: tuổi nợ phải thu khách hàng tại 31/12/2026',
        columns: ['Khách hàng', 'Số dư', 'Tình trạng'],
        rows: [
          { code: 'tm-ao-xinh', cells: ['Shop Áo Xinh', fmt(259_200_000), 'Trong hạn (lô gần nhất tháng 11)'] },
          { code: 'tm-co-ba', cells: ['Tạp hóa Cô Ba', fmt(31_840_000), 'Quá hạn từ tháng 7/2026, khách báo khó khăn, chưa có kế hoạch trả'] },
        ],
      },
      {
        id: 'tm-vay', title: 'Thuyết minh: vay',
        columns: ['Bên cho vay', 'Số dư', 'Kỳ hạn'],
        rows: [{ code: 'tm-vay-hat-lua', cells: ['Ngân hàng TMCP Hạt Lúa', fmt(800_000_000), 'Ngắn hạn: 200 triệu đến 01/03/2027; 600 triệu đến 30/06/2027'] }],
      },
    ],
    reasons: [
      { id: 'r-phai-thu-tang', text: 'Phải thu tăng nhanh hơn nhiều so với doanh thu: chính sách bán chịu nới lỏng hoặc doanh thu có thể chưa thực thu; cần xem tuổi nợ và vòng quay phải thu.' },
      { id: 'r-chua-du-phong', text: 'Có khoản phải thu quá hạn, khách khó khăn nhưng dòng dự phòng bằng 0: tài sản và lợi nhuận có thể bị phóng đại.' },
      { id: 'r-ton-kho-phinh', text: 'Hàng tồn kho tăng vọt so với đầu năm trong khi giá vốn không tăng tương ứng: rủi ro hàng chậm luân chuyển, đọng vốn.' },
      { id: 'r-vay-ngan-tai-tro-dai', text: 'Tài sản dài hạn được tài trợ bằng vay ngắn hạn: lệch kỳ hạn, rủi ro thanh khoản khi khoản vay đến hạn.' },
      { id: 'r-lctt-lech', text: 'Tiền trên LCTT không khớp với tiền trên CĐKT: lỗi cộng số trên báo cáo.' },
      { id: 'r-khau-hao-vuot-khung', text: 'Khấu hao vượt khung thời gian theo quy định thuế.' },
      { id: 'r-lo-gop', text: 'Giá vốn lớn hơn doanh thu, lỗ gộp.' },
    ],
    anomalies: [
      { id: 'h1-a1', title: 'Phải thu tăng nhanh hơn doanh thu', pattern: 'phải thu tăng nhanh hơn doanh thu', lineRefs: [{ report: 'CĐKT', code: '131' }, { report: 'KQKD', code: '01' }], reportsTouched: ['CĐKT', 'KQKD'], reasonId: 'r-phai-thu-tang', explanation: 'Phải thu khách hàng từ 60 triệu đầu năm lên khoảng 291 triệu (gấp gần 5 lần) trong khi doanh thu chỉ tăng khoảng 8% so với năm trước. Phải đối chiếu CĐKT (dòng 131) với KQKD (dòng 01) mới thấy.' },
      { id: 'h1-a2', title: 'Phải thu quá hạn không có dự phòng', pattern: 'phải thu quá hạn không có dự phòng', lineRefs: [{ report: 'CĐKT', code: '137' }, { report: 'TM', code: 'tm-co-ba' }, { report: 'CĐKT', code: '131' }], reportsTouched: ['CĐKT', 'TM'], reasonId: 'r-chua-du-phong', explanation: 'Thuyết minh tuổi nợ cho thấy Cô Ba nợ 31.840.000 quá hạn từ tháng 7, khách báo khó khăn, nhưng dòng 137 "Dự phòng phải thu khó đòi" bằng 0. (Game chưa áp tỷ lệ dự phòng theo TT 48 vì chưa đọc văn bản gốc; ở đây chỉ nhận diện dấu hiệu.)' },
      { id: 'h1-a3', title: 'Tồn kho phình', pattern: 'tồn kho phình', lineRefs: [{ report: 'CĐKT', code: '141' }, { report: 'CĐKT', code: '140' }], reportsTouched: ['CĐKT'], reasonId: 'r-ton-kho-phinh', explanation: 'Hàng tồn kho cuối năm khoảng 420 triệu so với 240 triệu đầu năm, do một lô áo khoác 400 triệu nhập ngày 30/12 chưa bán, trong khi cả năm chỉ bán khoảng 350 áo khoác.' },
      { id: 'h1-a4', title: 'Vay ngắn hạn tài trợ tài sản dài hạn', pattern: 'vay ngắn hạn tài trợ tài sản dài hạn', lineRefs: [{ report: 'CĐKT', code: '320' }, { report: 'CĐKT', code: '221' }, { report: 'TM', code: 'tm-vay-hat-lua' }], reportsTouched: ['CĐKT'], reasonId: 'r-vay-ngan-tai-tro-dai', explanation: 'Xe tải 600 triệu (tài sản dài hạn) được mua bằng khoản vay ngắn hạn 600 triệu đến hạn tháng 6/2027. Vay ngắn hạn lên 800 triệu, trong khi tài sản ngắn hạn không đủ trả nếu ngân hàng không gia hạn.' },
    ],
  });
}
