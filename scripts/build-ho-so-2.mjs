// Sinh dữ liệu Hồ sơ 2 — Sản xuất (Công ty TNHH Xưởng Mộc Chim Sẻ, hư cấu).
import { L, doc, fmt, makeVat, purchase, simple, vat, vatPct, writeJson, NONCASH_THRESHOLD, VAT_RULE } from './lib.mjs';

const DIR = 'data/cases/ho-so-2';
const CO = 'Công ty TNHH Xưởng Mộc Chim Sẻ';
const T = 'h2-co-ngan';
const B = 'h2-ong-bao';
const C = 'h2-anh-cua';
const V = 'h2-ha-vy';
const P = {
  'sao-mai': 'Công ty Ván Ép Sao Mai',
  'tho-gioi': 'Công ty Dụng Cụ Thợ Giỏi',
  'ben-bi': 'Công ty Bảo Trì Máy Bền Bỉ',
  'tan-tien': 'Công ty Máy Gỗ Tân Tiến',
  'pho-moi': 'Siêu thị Nội Thất Phố Mới',
  'doi-thong': 'Cửa hàng Nội Thất Đồi Thông',
  'hat-lua': 'Ngân hàng TMCP Hạt Lúa (vay trung hạn)',
  'hat-lua-nh': 'Ngân hàng TMCP Hạt Lúa (vay ngắn hạn)',
};
const PRICE = 1_000_000;
const MDF = 300_000; // đơn giá ván MDF / tấm
const SK = 500_000; // đơn giá sơn keo / thùng
const N = [700, 650, 800, 750, 800, 850, 800, 750, 800, 850, 900, 950];

const opening = {
  date: '2026-01-01',
  balances: [
    L.dr('111', 100_000_000),
    L.dr('112', 300_000_000),
    L.dr('131', 600_000_000, { partner: 'pho-moi' }),
    L.dr('152', 90_000_000, { item: 'van-mdf' }),
    L.dr('155', 140_000_000, { item: 'ghe-go' }),
    L.dr('211', 3_360_000_000),
    L.cr('2141', 408_000_000),
    L.cr('331', 400_000_000, { partner: 'sao-mai' }),
    L.cr('33311', 50_000_000),
    L.cr('3334', 30_000_000),
    L.cr('4111', 3_000_000_000),
    L.cr('4211', 702_000_000),
  ],
  priorYearRevenue: 9_000_000_000,
  charterCapital: { registered: 5_000_000_000, contributed: 3_000_000_000 },
  priorYearIncomeStatement: { '01': 9_000_000_000, '02': 0, '11': 6_700_000_000, '21': 5_000_000, '22': 0, '25': 240_000_000, '26': 1_100_000_000, '31': 0, '32': 0, '51': 164_050_000 },
  inventory: [
    { account: '152', item: 'van-mdf', qty: 300, unitCost: MDF },
    { account: '155', item: 'ghe-go', qty: 200, unitCost: 700_000 },
  ],
  fixedAssets: [
    { id: 'day-chuyen', name: 'Dây chuyền máy cưa, bào', account: '211', cost: 1_200_000_000, accumulated: 120_000_000, monthlyDepreciation: 10_000_000, usefulLifeMonths: 120, type: 'general', businessUse: true },
    { id: 'o-to', name: 'Ô tô 7 chỗ chở người', account: '211', cost: 1_920_000_000, accumulated: 240_000_000, monthlyDepreciation: 20_000_000, usefulLifeMonths: 96, type: 'passenger-car', seats: 7, businessUse: true },
    { id: 'ban-ghe-nha-rieng', name: 'Bộ bàn ghế gỗ đặt tại nhà riêng giám đốc', account: '211', cost: 240_000_000, accumulated: 48_000_000, monthlyDepreciation: 4_000_000, usefulLifeMonths: 60, type: 'general', businessUse: false },
    { id: 'may-cnc', name: 'Máy CNC cắt gỗ', account: '211', cost: 600_000_000, accumulated: 0, monthlyDepreciation: 5_000_000, usefulLifeMonths: 120, type: 'general', businessUse: true, acquiredInYear: true },
  ],
};

const all = [];
const push = (arr, e) => { if (e) { arr.push(e); all.push(e); } };
const VAT = makeVat({ opening, all, speaker: T });
const d = (m, day) => `2026-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const months = [];
let wipOpening = 0;
let prevPurchase = 0; // tổng thanh toán NVL tháng trước (trả trong tháng)
let prevSale = 600_000_000; // phải thu Phố Mới thu trong tháng (tháng 1: số dư đầu kỳ)
let maintenancePayable = 0;

for (let m = 1; m <= 12; m++) {
  const ev = [];
  const mt = `tháng ${m}`;
  const n = N[m - 1];
  const mdfQty = n * 1.5;
  const skQty = n / 10;
  const nvl = mdfQty * MDF + skQty * SK;

  // 1. Công nợ đầu tháng
  {
    const lines = [];
    const entries = [];
    if (prevSale) entries.push({ memo: 'Thu tiền Phố Mới', lines: [L.dr('112', prevSale), L.cr('131', prevSale, { partner: 'pho-moi' })] });
    const paySupplier = m === 1 ? 400_000_000 : prevPurchase;
    entries.push({ memo: 'Trả Sao Mai', lines: [L.dr('331', paySupplier, { partner: 'sao-mai' }), L.cr('112', paySupplier)] });
    if (maintenancePayable) {
      entries.push({ memo: 'Trả Bền Bỉ', lines: [L.dr('331', maintenancePayable, { partner: 'ben-bi' }), L.cr('112', maintenancePayable)] });
    }
    push(ev, simple({
      id: `h2-m${String(m).padStart(2, '0')}-cong-no`, date: d(m, 10), speaker: T, title: 'Thu tiền khách, trả tiền nhà cung cấp',
      narrative: `Phố Mới chuyển khoản ${fmt(prevSale)} (${m === 1 ? 'nợ cuối năm trước' : `lô ghế tháng ${m - 1}`}). Công ty trả Sao Mai ${fmt(paySupplier)} (${m === 1 ? 'nợ cuối năm trước' : `ván, sơn tháng ${m - 1}`})${maintenancePayable ? ` và trả Bền Bỉ ${fmt(maintenancePayable)} tiền bảo trì` : ''}.`,
      documents: [doc('Sao kê ngân hàng', [['Thu từ ' + P['pho-moi'], fmt(prevSale)], ['Chi cho ' + P['sao-mai'], fmt(paySupplier)], ...(maintenancePayable ? [['Chi cho ' + P['ben-bi'], fmt(maintenancePayable)]] : [])])],
      hint: 'Thu và chi là hai việc riêng với hai đối tượng khác nhau: ghi qua tiền gửi, không bù trừ thẳng phải thu Phố Mới với phải trả Sao Mai.',
      explanation: 'Nợ 112 / Có 131 (Phố Mới); Nợ 331 (Sao Mai) / Có 112. Dù tiền "vào rồi ra", phải thu và phải trả của hai đối tượng khác nhau không được bù trừ (quy tắc bản chất). Trên LCTT: tiền thu bán hàng và tiền chi trả nhà cung cấp hiện riêng.',
      entries: entries.map((e) => ({ memo: e.memo, lines: e.lines })),
    }));
    void lines;
    maintenancePayable = 0;
  }

  // 2. Mua NVL
  push(ev, purchase({
    id: `h2-m${String(m).padStart(2, '0')}-mua-nvl`, date: d(m, 5), speaker: C, title: `Mua ván MDF và sơn keo ${mt}`,
    narrative: `Anh Cưa nhập ${fmt(mdfQty)} tấm ván MDF (${fmt(MDF)}/tấm) và ${fmt(skQty)} thùng sơn keo (${fmt(SK)}/thùng) của Sao Mai, trả vào tháng sau.`,
    sellerName: P['sao-mai'], buyerName: CO, supplier: 'sao-mai', pay: 'credit',
    lines: [{ name: 'Ván MDF', qty: mdfQty, price: MDF, unit: 'tấm' }, { name: 'Sơn và keo', qty: skQty, price: SK, unit: 'thùng' }],
    split: [{ account: '152', amount: mdfQty * MDF, detail: { item: 'van-mdf' } }, { account: '152', amount: skQty * SK, detail: { item: 'son-keo' } }],
    hint: 'Nguyên vật liệu nhập kho theo từng loại; mỗi loại một dòng chi tiết.',
    explanation: `Nợ 152 (ván MDF) ${fmt(mdfQty * MDF)}, Nợ 152 (sơn keo) ${fmt(skQty * SK)}, Nợ 1331 ${fmt(vat(nvl))} / Có 331 (Sao Mai) ${fmt(nvl + vat(nvl))}.`,
  }));
  const thisPurchase = nvl + vat(nvl);

  // 3. Nộp GTGT tháng trước
  push(ev, VAT.pay(`h2-m${String(m).padStart(2, '0')}-nop-gtgt`, d(m, 20), m === 1 ? 'tháng 12/2025' : `tháng ${m - 1}`));

  // ---- Sự kiện riêng theo tháng (trước cuối tháng) ----
  let extra627 = 0;
  if (m === 2) {
    push(ev, purchase({
      id: 'h2-m02-mua-ccdc', date: d(2, 12), speaker: C, title: 'Mua bộ dao cụ và xuất dùng ngay',
      narrative: 'Mua 10 bộ dao cụ cho máy cưa, 3.000.000/bộ, chuyển khoản. Xuất dùng ngay cho xưởng. Theo kịch bản, giá trị được phân bổ dần trong 6 tháng (tháng 2 đến tháng 7).',
      sellerName: P['tho-gioi'], buyerName: CO, pay: 'bank', debitTo: '153', detail: { item: 'bo-dao' },
      lines: [{ name: 'Bộ dao cụ máy cưa', qty: 10, price: 3_000_000, unit: 'bộ' }],
      explanation: 'Nợ 153 (bộ dao cụ) 30.000.000, Nợ 1331 2.400.000 / Có 112 32.400.000. Bước xuất dùng và chuyển sang chi phí chờ phân bổ là nghiệp vụ tiếp theo.',
    }));
    push(ev, simple({
      id: 'h2-m02-xuat-ccdc', date: d(2, 12), speaker: T, title: 'Xuất dùng dao cụ, chuyển sang chi phí chờ phân bổ',
      narrative: 'Xuất 10 bộ dao cụ cho xưởng dùng. Giá trị 30.000.000 phân bổ 6 tháng, mỗi tháng 5.000.000 vào chi phí sản xuất chung.',
      documents: [doc('Phiếu xuất kho CCDC', [['Bộ dao cụ', fmt(30_000_000)], ['Thời gian phân bổ (kịch bản cho)', '6 tháng']])],
      hint: 'Công cụ dùng nhiều kỳ: chưa ghi hết vào chi phí ngay mà treo ở TK chi phí chờ phân bổ.',
      explanation: 'Nợ 242 / Có 153 30.000.000. Mỗi cuối tháng 2–7 ghi Nợ 627 / Có 242 5.000.000 (cùng bút toán khấu hao).',
      entries: [[L.dr('242', 30_000_000), L.cr('153', 30_000_000, { item: 'bo-dao' })]],
    }));
  }
  if (m === 3) {
    push(ev, simple({
      id: 'h2-m03-nop-tndn', date: d(3, 25), speaker: T, title: 'Nộp thuế TNDN còn phải nộp năm 2025',
      narrative: 'Nộp 30.000.000 thuế TNDN năm 2025 còn thiếu theo quyết toán.',
      documents: [doc('Giấy nộp tiền vào ngân sách', [['Thuế TNDN 2025', fmt(30_000_000)]])],
      explanation: 'Nợ 3334 / Có 112 30.000.000.',
      entries: [[L.dr('3334', 30_000_000), L.cr('112', 30_000_000)]],
    }));
  }
  if (m === 4) {
    push(ev, simple({
      id: 'h2-m04-vay', date: d(4, 2), speaker: B, title: 'Vay trung hạn mua máy CNC',
      narrative: 'Ngân hàng Hạt Lúa giải ngân khoản vay 480.000.000, kỳ hạn 3 năm, lãi 10%/năm trả hàng tháng (theo hợp đồng), để mua máy CNC.',
      documents: [doc('Hợp đồng tín dụng trung hạn', [['Số tiền', fmt(480_000_000)], ['Kỳ hạn', '36 tháng'], ['Lãi suất', '10%/năm, trả hàng tháng']])],
      explanation: 'Nợ 112 / Có 3411 (Hạt Lúa – trung hạn) 480.000.000. Kỳ hạn trên 12 tháng nên nằm ở "Vay dài hạn" trên CĐKT. Lưu ý: vốn điều lệ còn góp thiếu 2 tỷ.',
      entries: [[L.dr('112', 480_000_000), L.cr('3411', 480_000_000, { partner: 'hat-lua' })]],
    }));
    push(ev, purchase({
      id: 'h2-m04-mua-cnc', date: d(4, 25), speaker: B, title: 'Mua máy CNC cắt gỗ',
      narrative: 'Mua máy CNC 600.000.000 chưa thuế, chuyển khoản, lắp đặt xong và đưa vào sử dụng từ 01/05. Kịch bản: khấu hao đường thẳng 10 năm, bắt đầu từ tháng 5.',
      sellerName: P['tan-tien'], buyerName: CO, pay: 'bank', debitTo: '211',
      lines: [{ name: 'Máy CNC cắt gỗ', qty: 1, price: 600_000_000, unit: 'chiếc' }],
      explanation: 'Nợ 211 600.000.000, Nợ 1331 48.000.000 / Có 112 648.000.000. Máy dùng ngay nên lãi vay từ tháng 5 là chi phí kỳ (không vốn hóa).',
    }));
  }
  if (m >= 5) {
    push(ev, simple({
      id: `h2-m${String(m).padStart(2, '0')}-lai-vay`, date: d(m, 25), speaker: T, title: `Trả lãi vay ${mt}`,
      narrative: `Ngân hàng trừ tài khoản lãi vay ${mt}: 480.000.000 × 10% / 12 = 4.000.000.`,
      documents: [doc('Giấy báo Nợ', [['Lãi vay', fmt(4_000_000)]])],
      explanation: 'Nợ 635 / Có 112 4.000.000. Máy CNC đã dùng nên lãi vay ghi chi phí tài chính, không vốn hóa.',
      attrs: { interest: { amount: 4_000_000, principal: 480_000_000, lender: 'hat-lua' } },
      entries: [[L.dr('635', 4_000_000), L.cr('112', 4_000_000)]],
    }));
  }
  if (m === 5) {
    push(ev, purchase({
      id: 'h2-m05-sua-may-tien-mat', date: d(5, 18), speaker: C, title: 'Sửa máy cưa, trả tiền mặt', unusual: true,
      narrative: 'Máy cưa hỏng giữa ca, anh Cưa gọi thợ ngoài sửa gấp: 8.000.000 chưa thuế, trả tiền mặt luôn tại xưởng.',
      sellerName: 'Cơ sở Cơ Khí Lửa Hàn', buyerName: CO, pay: 'cash', debitTo: '627',
      lines: [{ name: 'Sửa chữa máy cưa', qty: 1, price: 8_000_000, unit: 'lần' }],
      hint: `Chi phí sản xuất chung, nhưng chú ý ngưỡng ${fmt(NONCASH_THRESHOLD)}.`,
      explanation: `Tổng thanh toán 8.640.000 từ ${fmt(NONCASH_THRESHOLD)} trở lên mà trả tiền mặt: thuế GTGT không được khấu trừ, ghi hết vào chi phí sản xuất chung: Nợ 627 8.640.000 / Có 111. Chi phí này đi vào giá thành rồi giá vốn, và không được trừ khi tính thuế TNDN.`,
    }));
    extra627 += 8_640_000;
  }
  if (m === 6) {
    push(ev, simple({
      id: 'h2-m06-gop-von', date: d(6, 15), speaker: B, title: 'Chủ sở hữu góp thêm vốn',
      narrative: 'Ông Bào góp thêm 1.000.000.000 vốn điều lệ bằng chuyển khoản. Vốn đã góp lên 4 tỷ trên 5 tỷ đăng ký.',
      documents: [doc('Giấy báo Có', [['Nội dung', 'Góp vốn điều lệ'], ['Số tiền', fmt(1_000_000_000)]])],
      explanation: 'Nợ 112 / Có 4111 1.000.000.000. LCTT: tiền thu từ nhận vốn góp (hoạt động tài chính). Vốn góp chưa đủ trong khi đi vay là điểm cần chú ý khi đọc BCTC.',
      entries: [[L.dr('112', 1_000_000_000), L.cr('4111', 1_000_000_000)]],
    }));
  }
  if (m === 7) {
    push(ev, purchase({
      id: 'h2-m07-kiem-toan-bao-tri', date: d(7, 8), speaker: V, title: 'Kiểm toán giữa năm: hóa đơn bảo trì chưa ghi sổ', unusual: true,
      narrative: 'Kiểm toán viên Hạ Vy rà soát giữa năm, phát hiện hóa đơn bảo trì máy của Bền Bỉ tháng 6 chưa được ghi sổ (chưa trả tiền). Cô Ngân quyết định ghi vào tháng 7.',
      sellerName: P['ben-bi'], buyerName: CO, supplier: 'ben-bi', pay: 'credit', debitTo: '627',
      lines: [{ name: 'Bảo trì định kỳ máy móc', qty: 1, price: 12_000_000, unit: 'lần' }],
      hint: 'Chi phí bảo trì máy xưởng là chi phí sản xuất chung; chưa trả tiền.',
      explanation: 'Nợ 627 12.000.000, Nợ 1331 960.000 / Có 331 (Bền Bỉ) 12.960.000. Kiểm toán viên nhắc: ghi thiếu chi phí làm giá thành và giá vốn thấp, lãi bị phóng đại.',
    }));
    extra627 += 12_000_000;
    maintenancePayable = 12_960_000;
  }
  if (m === 8) {
    push(ev, simple({
      id: 'h2-m08-phat', date: d(8, 12), speaker: T, title: 'Nộp phạt vi phạm hành chính về phòng cháy', unusual: true,
      narrative: 'Đoàn kiểm tra phạt 15.000.000 vì xưởng thiếu bình chữa cháy. Đã nộp phạt bằng chuyển khoản.',
      documents: [doc('Quyết định xử phạt', [['Số tiền', fmt(15_000_000)]])],
      explanation: 'Nợ 811 / Có 112 15.000.000. Không được trừ khi tính thuế TNDN.',
      attrs: { expenseType: 'admin-penalty' },
      entries: [[L.dr('811', 15_000_000), L.cr('112', 15_000_000)]],
    }));
  }
  if (m === 9) {
    push(ev, simple({
      id: 'h2-m09-ban-phe-lieu', date: d(9, 14), speaker: C, title: 'Bán phế liệu gỗ thu tiền mặt',
      narrative: `Bán mùn cưa, gỗ vụn cho cơ sở ép củi: 5.000.000 chưa thuế, thuế GTGT ${vatPct}, thu tiền mặt.`,
      documents: [doc('Hóa đơn GTGT', [['Phế liệu gỗ', fmt(5_000_000)], [`Thuế GTGT (${vatPct})`, fmt(vat(5_000_000))], ['Tổng', fmt(5_000_000 + vat(5_000_000))]])],
      hint: 'Không phải hoạt động bán sản phẩm chính.',
      explanation: `Nợ 111 ${fmt(5_000_000 + vat(5_000_000))} / Có 711 5.000.000, Có 33311 ${fmt(vat(5_000_000))}. Thu nhập khác, không nằm trong doanh thu bán hàng.`,
      attrs: { vat: { base: 5_000_000, ruleId: VAT_RULE } },
      entries: [[L.dr('111', 5_000_000 + vat(5_000_000)), L.cr('711', 5_000_000), L.cr('33311', vat(5_000_000))]],
    }));
  }

  // 4. Lương
  push(ev, simple({
    id: `h2-m${String(m).padStart(2, '0')}-luong`, date: d(m, 28), speaker: T, title: `Tính và trả lương ${mt}`,
    narrative: `Bảng lương ${mt}: công nhân trực tiếp 120.000.000, quản lý xưởng 30.000.000, bán hàng 20.000.000, văn phòng 50.000.000. Trả ngay bằng chuyển khoản. (Giản lược: chưa xét bảo hiểm, thuế TNCN.)`,
    documents: [doc('Bảng lương', [['Công nhân trực tiếp sản xuất', fmt(120_000_000)], ['Quản lý xưởng', fmt(30_000_000)], ['Bán hàng', fmt(20_000_000)], ['Quản lý doanh nghiệp', fmt(50_000_000)], ['Cộng', fmt(220_000_000)]])],
    hint: 'Lương công nhân trực tiếp → 622; quản lý xưởng → 627; bán hàng → 641; văn phòng → 642.',
    explanation: 'Nợ 622 120.000.000, Nợ 627 30.000.000, Nợ 641 20.000.000, Nợ 642 50.000.000 / Có 334 220.000.000; rồi Nợ 334 / Có 112. Lương ở xưởng đi vào giá thành sản phẩm, không vào thẳng KQKD.',
    entries: [
      { memo: 'Tính lương', lines: [L.dr('622', 120_000_000), L.dr('627', 30_000_000), L.dr('641', 20_000_000), L.dr('642', 50_000_000), L.cr('334', 220_000_000)] },
      { memo: 'Trả lương', lines: [L.dr('334', 220_000_000), L.cr('112', 220_000_000)] },
    ],
  }));

  // 5. Khấu hao + phân bổ CCDC
  const depFactory = 10_000_000 + (m >= 5 ? 5_000_000 : 0);
  const depOffice = 20_000_000 + 4_000_000;
  const ccdc = m >= 2 && m <= 7 ? 5_000_000 : 0;
  const depAttrs = [{ assetId: 'day-chuyen', amount: 10_000_000 }, { assetId: 'o-to', amount: 20_000_000 }, { assetId: 'ban-ghe-nha-rieng', amount: 4_000_000 }];
  if (m >= 5) depAttrs.push({ assetId: 'may-cnc', amount: 5_000_000 });
  push(ev, simple({
    id: `h2-m${String(m).padStart(2, '0')}-khau-hao`, date: d(m, 30), speaker: T, title: `Khấu hao TSCĐ${ccdc ? ' và phân bổ dao cụ' : ''} ${mt}`,
    narrative: `Trích khấu hao ${mt}: dây chuyền cưa bào 10.000.000${m >= 5 ? ', máy CNC 5.000.000' : ''} (xưởng); ô tô 7 chỗ 20.000.000 và bộ bàn ghế đặt tại nhà riêng giám đốc 4.000.000 (ghi chi phí quản lý).${ccdc ? ' Phân bổ dao cụ 5.000.000 vào sản xuất chung.' : ''}`,
    documents: [doc('Bảng tính khấu hao', [['Dây chuyền cưa bào (xưởng)', fmt(10_000_000)], ...(m >= 5 ? [['Máy CNC (xưởng)', fmt(5_000_000)]] : []), ['Ô tô 7 chỗ (quản lý)', fmt(20_000_000)], ['Bộ bàn ghế tại nhà riêng giám đốc (quản lý)', fmt(4_000_000)], ...(ccdc ? [['Phân bổ dao cụ (242)', fmt(ccdc)]] : [])])],
    hint: 'Khấu hao máy xưởng vào 627; tài sản văn phòng vào 642. Phân bổ CCDC: Có 242.',
    explanation: `Nợ 627 ${fmt(depFactory + ccdc)}, Nợ 642 ${fmt(depOffice)} / Có 2141 ${fmt(depFactory + depOffice)}${ccdc ? `, Có 242 ${fmt(ccdc)}` : ''}. Bộ bàn ghế đặt ở nhà riêng giám đốc không dùng cho sản xuất kinh doanh: kế toán vẫn trích, nhưng khấu hao này không được trừ khi tính thuế TNDN. Ô tô có nguyên giá 1,92 tỷ: rule trần khấu hao ô tô chưa kiểm chứng văn bản gốc nên đang tắt.`,
    attrs: { depreciation: depAttrs },
    entries: [[L.dr('627', depFactory + ccdc), L.dr('642', depOffice), L.cr('2141', depFactory + depOffice), ...(ccdc ? [L.cr('242', ccdc)] : [])]],
  }));

  // 6. Tập hợp chi phí, giá thành, nhập kho
  const c627 = 30_000_000 + depFactory + ccdc + extra627;
  const total = nvl + 120_000_000 + c627;
  const wipClosing = m === 6 ? 40_000_000 : 0;
  const finished = total + wipOpening - wipClosing;
  push(ev, simple({
    id: `h2-m${String(m).padStart(2, '0')}-gia-thanh`, date: d(m, 30), speaker: C, title: `Xuất NVL, tập hợp chi phí và nhập kho ${fmt(n)} ghế`,
    narrative: `Xuất toàn bộ ván, sơn mua trong tháng (${fmt(nvl)}) cho sản xuất. Cuối tháng tập hợp chi phí 621, 622, 627 vào 154 và nhập kho ${fmt(n)} ghế hoàn thành.${wipOpening ? ` Đầu tháng có sản phẩm dở dang ${fmt(wipOpening)}, đã hoàn thành hết trong tháng.` : ''}${wipClosing ? ` Cuối tháng còn dở dang ${fmt(wipClosing)} (theo biên bản kiểm kê).` : ''}`,
    documents: [doc('Phiếu tính giá thành', [
      ['Dở dang đầu kỳ', fmt(wipOpening)],
      ['Chi phí NVL trực tiếp (621)', fmt(nvl)],
      ['Chi phí nhân công trực tiếp (622)', fmt(120_000_000)],
      ['Chi phí sản xuất chung (627)', fmt(c627)],
      ['Dở dang cuối kỳ', fmt(wipClosing)],
      [`Giá thành ${fmt(n)} ghế hoàn thành`, fmt(finished)],
    ])],
    hint: 'Ba bước: Nợ 621 / Có 152; Nợ 154 / Có 621, 622, 627; Nợ 155 / Có 154 theo giá thành hoàn thành.',
    explanation: `Nợ 621 / Có 152 ${fmt(nvl)}; Nợ 154 ${fmt(total)} / Có 621 ${fmt(nvl)}, Có 622 120.000.000, Có 627 ${fmt(c627)}; Nợ 155 / Có 154 ${fmt(finished)}.${wipClosing ? ` Số dư 154 còn ${fmt(wipClosing)} là sản phẩm dở dang trên CĐKT (hàng tồn kho).` : ''} Chi phí sản xuất chưa vào KQKD cho tới khi bán.`,
    entries: [
      { memo: 'Xuất NVL', lines: [L.dr('621', nvl), L.cr('152', mdfQty * MDF, { item: 'van-mdf' }), L.cr('152', skQty * SK, { item: 'son-keo' })] },
      { memo: 'Tập hợp chi phí', lines: [L.dr('154', total), L.cr('621', nvl), L.cr('622', 120_000_000), L.cr('627', c627)] },
      { memo: 'Nhập kho thành phẩm', lines: [L.dr('155', finished, { item: 'ghe-go' }), L.cr('154', finished)] },
    ],
  }));
  wipOpening = wipClosing;

  // 7. Bán hàng
  const sales = m === 2 ? [['pho-moi', n - 100], ['doi-thong', 100]] : [['pho-moi', n]];
  let saleThisMonth = 0;
  let cogsSoFar = 0;
  for (const [i, [cust, qty]] of sales.entries()) {
    const base = qty * PRICE;
    const cogs = i === sales.length - 1 ? finished - cogsSoFar : Math.round((finished * qty) / n);
    cogsSoFar += cogs;
    if (cust === 'pho-moi') saleThisMonth = base + vat(base);
    push(ev, simple({
      id: `h2-m${String(m).padStart(2, '0')}-ban-${cust}`, date: d(m, 30), speaker: B, title: `Bán ${fmt(qty)} ghế cho ${P[cust]}`,
      narrative: `Giao ${fmt(qty)} ghế gỗ cho ${P[cust]}, giá ${fmt(PRICE)}/cái, ${cust === 'pho-moi' ? 'thu tiền vào ngày 10 tháng sau' : 'hẹn trả sau 30 ngày'}. Giá vốn theo giá thành lô hoàn thành trong tháng.`,
      documents: [
        doc('Hóa đơn GTGT', [[`Ghế gỗ — ${fmt(qty)} cái × ${fmt(PRICE)}`, fmt(base)], [`Thuế GTGT (${vatPct})`, fmt(vat(base))], ['Tổng cộng', fmt(base + vat(base))]], `${CO} → ${P[cust]}`),
        doc('Phiếu xuất kho thành phẩm', [[`Ghế gỗ — ${fmt(qty)} cái (giá thành lô tháng ${m})`, fmt(cogs)]]),
      ],
      hint: 'Bán sản phẩm tự sản xuất: doanh thu bán sản phẩm (5112); giá vốn ghi Có 155.',
      explanation: `Nợ 131 (${P[cust]}) ${fmt(base + vat(base))} / Có 5112 ${fmt(base)}, Có 33311 ${fmt(vat(base))}; Nợ 632 / Có 155 ${fmt(cogs)}.`,
      attrs: { vat: { base, ruleId: VAT_RULE } },
      entries: [
        { memo: 'Doanh thu', lines: [L.dr('131', base + vat(base), { partner: cust }), L.cr('5112', base), L.cr('33311', vat(base))] },
        { memo: 'Giá vốn', lines: [L.dr('632', cogs), L.cr('155', cogs, { item: 'ghe-go' })] },
      ],
    }));
  }
  prevSale = saleThisMonth;
  prevPurchase = thisPurchase;

  // 8. Khấu trừ GTGT
  if (m < 12) push(ev, VAT.offset(`h2-m${String(m).padStart(2, '0')}-khau-tru`, d(m, 30), mt));
  else push(ev, VAT.offset('h2-m12-khau-tru', d(12, 30), mt));

  if (m === 12) {
    push(ev, simple({
      id: 'h2-m12-thue-tndn', date: d(12, 31), kind: 'cit', speaker: T, title: 'Tính và ghi chi phí thuế TNDN năm 2026',
      narrative: 'Tính thuế TNDN: LN kế toán trước thuế + các khoản không được trừ của rule đang bật (sửa máy trả tiền mặt tháng 5, tiền phạt tháng 8, khấu hao tài sản không dùng cho SXKD), nhân thuế suất theo doanh thu năm trước 9 tỷ.',
      hint: 'Rule đang tắt (trần ô tô, lãi vay tương ứng vốn góp thiếu) không được tính.',
      explanation: 'Nợ 8211 / Có 3334. Bảng đối chiếu chi tiết ở Tầng 3 (a).',
      entries: [[L.dr('8211', { $calc: 'citExpense' }), L.cr('3334', { $calc: 'citExpense' })]],
    }));
    push(ev, simple({
      id: 'h2-m12-ket-chuyen', date: d(12, 31), kind: 'closing', speaker: T, title: 'Kết chuyển cuối năm',
      narrative: 'Kết chuyển doanh thu, thu nhập khác và mọi chi phí (gồm chi phí thuế TNDN) sang 911, rồi kết chuyển lãi sang 4212. Lưu ý 621, 622, 627 đã về 0 qua 154.',
      hint: 'Doanh thu 5112 và thu nhập 711 ghi Nợ; 632, 635, 641, 642, 811, 8211 ghi Có; phần chênh lệch của 911 sang 4212.',
      explanation: 'Sau kết chuyển mọi TK loại 5–9 về 0; LNST trên KQKD bằng phần tăng của 4212.',
      answer: { $calc: 'closing' },
    }));
  }
  ev.sort((a, b) => a.date.localeCompare(b.date));
  months.push({ m, ev });
}

const OPEN_BASE = ['111', '112', '131', '1331', '1388', '152', '153', '154', '155', '156', '211', '2141', '242', '331', '33311', '3334', '334', '3388', '4111', '4211', '5111', '5112', '621', '622', '627', '632', '641', '642', '711', '811'];
const OPEN_LOAN = [...OPEN_BASE, '3411', '635'];
const OPEN_END = [...OPEN_LOAN, '8211', '911', '4212'];

const INTRO = {
  1: [
    { speaker: B, text: 'Chào bạn! Xưởng Mộc Chim Sẻ làm ghế gỗ. Năm ngoái doanh thu 9 tỷ. Tôi cần sổ sách sạch để đi vay mở rộng.' },
    { speaker: T, text: 'Cô là Sáu Ngân, kế toán trưởng. Ở xưởng, chi phí không vào thẳng KQKD: nó đi qua 621, 622, 627 → 154 → 155 rồi mới thành giá vốn khi bán.' },
    { speaker: C, text: 'Còn tôi là Cưa, quản đốc. Nguyên liệu nhập bao nhiêu, xuất bấy nhiêu, tháng nào cũng vậy!' },
  ],
  2: [{ speaker: C, text: 'Tháng này mua thêm dao cụ. Đồi Thông cũng lấy 100 ghế, mà nghe nói họ hay khất nợ...' }],
  4: [{ speaker: B, text: 'Tôi vay ngân hàng mua máy CNC. Vốn góp còn thiếu 2 tỷ, để sau tính.' }, { speaker: T, text: 'Từ tháng này có TK vay (3411) và chi phí lãi vay (635).' }],
  6: [{ speaker: T, text: 'Cuối tháng 6 xưởng còn hàng dở dang, nhìn số dư 154 nhé.' }],
  7: [{ speaker: V, text: 'Chào chị Ngân, tôi là Hạ Vy, kiểm toán viên. Tôi xem qua chứng từ nửa năm đầu.' }],
  12: [{ speaker: T, text: 'Tháng cuối: tự tính thuế TNDN và tự kết chuyển. Sau đó làm Tầng 2 và Tầng 3.' }],
};

for (const { m, ev } of months) {
  const id = `month-${String(m).padStart(2, '0')}`;
  writeJson(`${DIR}/${id}.json`, { id, label: `Tháng ${m}`, intro: INTRO[m] ?? [], outro: m === 12 ? [{ speaker: T, text: 'Khóa sổ năm xong. Mời làm Tầng 2 và Tầng 3!' }] : [], events: ev });
}

writeJson(`${DIR}/opening.json`, opening);

writeJson(`${DIR}/anomalies.json`, {
  intro: 'BCTC năm 2026 do kế toán dịch vụ lập lại để đi vay ngân hàng, đã khóa sổ. Có 4 bất thường được cài sẵn.',
  injections: [
    { id: 'h2-t2-tich-tru-van', date: '2026-12-30', memo: 'Mua tích trữ ván MDF cuối năm, chưa trả tiền', lines: [L.dr('152', 1_200_000_000, { item: 'van-mdf' }), L.dr('1331', 96_000_000), L.cr('331', 1_296_000_000, { partner: 'sao-mai' })] },
    { id: 'h2-t2-doi-khau-hao', date: '2026-12-30', memo: 'Đổi thời gian khấu hao dây chuyền từ 10 lên 20 năm, ghi giảm khấu hao cả năm', lines: [L.dr('2141', 60_000_000), L.cr('632', 60_000_000)] },
    { id: 'h2-t2-vay-ngan', date: '2026-12-30', memo: 'Vay ngắn hạn 3 tỷ', lines: [L.dr('112', 3_000_000_000), L.cr('3411', 3_000_000_000, { partner: 'hat-lua-nh' })] },
    { id: 'h2-t2-xay-xuong', date: '2026-12-30', memo: 'Chi xây nhà xưởng mới (dở dang)', lines: [L.dr('241', 2_800_000_000), L.cr('112', 2_800_000_000)] },
    { id: 'h2-t2-lai-vay-ngan', date: '2026-12-30', memo: 'Lãi vay ngắn hạn và phí thu xếp vốn', lines: [L.dr('635', 180_000_000), L.cr('112', 180_000_000)] },
  ],
  notes: [
    { id: 'tm-tscd', title: 'Thuyết minh: khấu hao TSCĐ trong năm', columns: ['Nhóm tài sản', 'Khấu hao năm nay', 'Ghi chú'], rows: [
      { code: 'tm-kh-day-chuyen', cells: ['Dây chuyền cưa bào', fmt(60_000_000), 'Năm trước 120.000.000; đổi thời gian khấu hao từ 10 năm lên 20 năm, áp dụng từ 01/2026'] },
      { code: 'tm-kh-cnc', cells: ['Máy CNC', fmt(40_000_000), 'Từ tháng 5'] },
      { code: 'tm-kh-van-phong', cells: ['Ô tô, bàn ghế', fmt(288_000_000), ''] },
    ] },
    { id: 'tm-von', title: 'Thuyết minh: vốn chủ sở hữu và vay', columns: ['Khoản mục', 'Số tiền', 'Ghi chú'], rows: [
      { code: 'tm-von-dieu-le', cells: ['Vốn điều lệ đăng ký', fmt(5_000_000_000), 'Đã góp 4.000.000.000, còn thiếu 1.000.000.000'] },
      { code: 'tm-vay-ngan', cells: ['Vay ngắn hạn Hạt Lúa', fmt(3_000_000_000), 'Đến hạn 12/2027, dùng xây nhà xưởng mới'] },
      { code: 'tm-vay-dai', cells: ['Vay trung hạn Hạt Lúa', fmt(480_000_000), 'Mua máy CNC'] },
    ] },
  ],
  reasons: [
    { id: 'r-ton-kho', text: 'Hàng tồn kho tăng vọt cuối năm so với nhu cầu sản xuất: đọng vốn, rủi ro hàng chậm luân chuyển.' },
    { id: 'r-khau-hao', text: 'Khấu hao giảm đột ngột do đổi thời gian khấu hao: lợi nhuận được "làm đẹp", cần xem lý do thay đổi ước tính.' },
    { id: 'r-von-gop', text: 'Vốn điều lệ góp chưa đủ trong khi chi phí lãi vay lớn: chủ sở hữu dùng vốn vay thay vốn góp; phần lãi tương ứng có thể không được trừ khi tính thuế.' },
    { id: 'r-vay-ngan', text: 'Dùng vay ngắn hạn tài trợ xây dựng tài sản dài hạn: lệch kỳ hạn, rủi ro thanh khoản.' },
    { id: 'r-lctt-lech', text: 'Tiền trên LCTT không khớp với tiền trên CĐKT.' },
    { id: 'r-doanh-thu-am', text: 'Doanh thu bị ghi âm thay vì dùng khoản giảm trừ.' },
    { id: 'r-ben-lien-quan', text: 'Phải thu bên liên quan lớn bất thường.' },
  ],
  anomalies: [
    { id: 'h2-a1', title: 'Tồn kho phình', pattern: 'tồn kho phình', lineRefs: [{ report: 'CĐKT', code: '141' }, { report: 'CĐKT', code: '140' }], reportsTouched: ['CĐKT'], reasonId: 'r-ton-kho', explanation: 'Nguyên vật liệu cuối năm hơn 1,2 tỷ, gấp khoảng 3 tháng nhu cầu, trong khi đầu năm chỉ 90 triệu. Mua ngày 30/12, chưa trả tiền.' },
    { id: 'h2-a2', title: 'Khấu hao bất thường', pattern: 'khấu hao bất thường', lineRefs: [{ report: 'TM', code: 'tm-kh-day-chuyen' }, { report: 'CĐKT', code: '222' }, { report: 'LCTT', code: '02' }], reportsTouched: ['CĐKT', 'KQKD', 'TM'], reasonId: 'r-khau-hao', explanation: 'Thuyết minh cho thấy khấu hao dây chuyền chỉ còn 60 triệu so với 120 triệu năm trước vì đổi thời gian khấu hao giữa chừng. Giá vốn giảm 60 triệu, lợi nhuận tăng tương ứng.' },
    { id: 'h2-a3', title: 'Vốn góp chưa đủ trong khi lãi vay lớn', pattern: 'vốn góp chưa đủ trong khi lãi vay lớn', lineRefs: [{ report: 'CĐKT', code: '411' }, { report: 'KQKD', code: '22' }, { report: 'TM', code: 'tm-von-dieu-le' }], reportsTouched: ['CĐKT', 'KQKD', 'TM'], reasonId: 'r-von-gop', explanation: 'Vốn góp mới 4 trên 5 tỷ đăng ký, trong khi chi phí tài chính hơn 200 triệu. Chủ sở hữu đang dùng tiền vay thay cho vốn phải góp.' },
    { id: 'h2-a4', title: 'Vay ngắn hạn tài trợ tài sản dài hạn', pattern: 'vay ngắn hạn tài trợ tài sản dài hạn', lineRefs: [{ report: 'CĐKT', code: '320' }, { report: 'CĐKT', code: '240' }, { report: 'TM', code: 'tm-vay-ngan' }], reportsTouched: ['CĐKT'], reasonId: 'r-vay-ngan', explanation: 'Khoản vay ngắn hạn 3 tỷ đến hạn năm 2027 được dùng xây nhà xưởng (XDCB dở dang 2,8 tỷ), là tài sản thu hồi vốn trong nhiều năm.' },
  ],
});

writeJson(`${DIR}/adjustments.json`, {
  reconciliation: { intro: 'Lập bảng đối chiếu LN kế toán → thu nhập chịu thuế. Khoản của rule đang tắt (chưa kiểm chứng) hiện ở cuối bảng để tham khảo, không tính.' },
  companyBook: {
    intro: 'Sổ do kế toán cũ lập cho mục đích thuế: bằng sổ của bạn cộng thêm hai bút toán sai (treo chi phí hội chợ ở 242, vốn hóa lãi vay sau khi máy đã dùng). Ngoài ra còn hai việc chưa xử lý: nợ khó đòi của Đồi Thông và ván hỏng. Lập bút toán điều chỉnh về bản chất.',
    injections: [
      { id: 'h2-cb-hoi-cho', date: '2026-11-20', memo: 'Chi phí tham gia hội chợ nội thất tháng 11 (kế toán cũ treo vào 242)', lines: [L.dr('242', 90_000_000), L.cr('112', 90_000_000)] },
      { id: 'h2-cb-von-hoa-lai', date: '2026-12-31', memo: 'Kế toán cũ vốn hóa lãi vay tháng 5–12 vào nguyên giá máy CNC', lines: [L.dr('211', 32_000_000), L.cr('635', 32_000_000)] },
    ],
  },
  items: [
    { id: 'h2-adj-hoi-cho', category: 'prepaid-should-expense', title: 'Chi phí hội chợ tháng 11 đang treo ở 242', evidence: ['Hội chợ nội thất diễn ra 20–23/11/2026, đã kết thúc.', 'Hợp đồng không tạo lợi ích cho kỳ sau (không có đơn hàng ký kèm).', 'Sổ đang ghi Nợ 242 90.000.000.'], answer: { entries: [{ lines: [L.dr('641', 90_000_000), L.cr('242', 90_000_000)] }] }, explanation: 'Chi phí hội chợ đã diễn ra là chi phí bán hàng của kỳ: Nợ 641 / Có 242 90.000.000. Treo ở 242 làm tài sản và lợi nhuận bị phóng đại.' },
    { id: 'h2-adj-du-phong', category: 'provision-overdue', title: 'Nợ quá hạn của Đồi Thông chưa trích dự phòng', evidence: ['Đồi Thông nợ 108.000.000 từ tháng 2/2026, quá hạn từ tháng 3, đã gửi 3 lần thư nhắc.', 'Biên bản họp: trích dự phòng 54.000.000 (số kịch bản cho sẵn; game không áp tỷ lệ TT 48/2019 vì chưa đọc văn bản gốc).'], answer: { entries: [{ lines: [L.dr('642', 54_000_000), L.cr('2293', 54_000_000)] }] }, explanation: 'Nợ 642 / Có 2293 54.000.000. Phải thu trên CĐKT được trình bày thuần sau dự phòng. Về thuế: rule dự phòng TT 48 đang tắt nên bảng đối chiếu không điều chỉnh khoản này.' },
    { id: 'h2-adj-lai-vay', category: 'interest-capitalization', title: 'Lãi vay bị vốn hóa sau khi máy đã đưa vào sử dụng', evidence: ['Máy CNC đưa vào sử dụng từ 01/05/2026.', 'Kế toán cũ chuyển 32.000.000 lãi vay tháng 5–12 từ 635 sang nguyên giá máy (Nợ 211 / Có 635).'], answer: { entries: [{ lines: [L.dr('635', 32_000_000), L.cr('211', 32_000_000)] }] }, explanation: 'Tài sản đã sẵn sàng sử dụng thì lãi vay không còn được vốn hóa: Nợ 635 / Có 211 32.000.000. (Giản lược: không tính lại khấu hao của phần nguyên giá sai.)' },
    { id: 'h2-adj-van-hong', category: 'damaged-inventory', title: 'Ván MDF ngấm nước chưa xử lý', evidence: ['Biên bản kiểm kê 31/12: 50 tấm ván MDF ngấm nước, không còn dùng được, giá gốc 15.000.000.', 'Không có bồi thường; giám đốc duyệt xử lý vào giá vốn.'], answer: { entries: [{ lines: [L.dr('632', 15_000_000), L.cr('152', 15_000_000, { item: 'van-mdf' })] }] }, explanation: 'Nợ 632 / Có 152 (ván MDF) 15.000.000. Hàng hỏng còn nằm trong kho làm tồn kho bị phóng đại.' },
  ],
});

writeJson(`${DIR}/case.json`, {
  id: 'ho-so-2', order: 2, title: 'Hồ sơ 2 — Sản xuất', type: 'Sản xuất',
  company: { name: CO, description: 'Xưởng sản xuất ghế gỗ từ ván MDF. Năm hoạt động thứ hai, doanh thu năm 2025 là 9 tỷ đồng; vốn điều lệ đăng ký 5 tỷ, mới góp 3 tỷ.', taxNote: 'Đồ gỗ nội thất: nhóm 10% đang được giảm.' },
  fiscalYear: 2026, regulationNote: 'Quy định áp dụng tại 30/10/2026',
  characters: [
    { id: T, name: 'Cô Sáu Ngân', role: 'Kế toán trưởng (hướng dẫn)', color: '#9ad17a', mentor: true },
    { id: B, name: 'Ông Đinh Văn Bào', role: 'Giám đốc', color: '#d98c5f' },
    { id: C, name: 'Anh Cưa', role: 'Quản đốc xưởng', color: '#6fa8dc' },
    { id: V, name: 'Hạ Vy', role: 'Kiểm toán viên (giữa năm)', color: '#c39bd3' },
  ],
  partners: [
    { id: 'sao-mai', name: P['sao-mai'], kind: 'supplier' },
    { id: 'tho-gioi', name: P['tho-gioi'], kind: 'supplier' },
    { id: 'ben-bi', name: P['ben-bi'], kind: 'supplier' },
    { id: 'tan-tien', name: P['tan-tien'], kind: 'supplier' },
    { id: 'pho-moi', name: P['pho-moi'], kind: 'customer' },
    { id: 'doi-thong', name: P['doi-thong'], kind: 'customer' },
    { id: 'hat-lua', name: P['hat-lua'], kind: 'lender', term: 'long' },
    { id: 'hat-lua-nh', name: P['hat-lua-nh'], kind: 'lender', term: 'short' },
  ],
  items: [
    { id: 'van-mdf', name: 'Ván MDF', unit: 'tấm' },
    { id: 'son-keo', name: 'Sơn và keo', unit: 'thùng' },
    { id: 'bo-dao', name: 'Bộ dao cụ máy cưa', unit: 'bộ' },
    { id: 'ghe-go', name: 'Ghế gỗ', unit: 'cái' },
  ],
  segments: [],
  detailAccounts: { '131': ['partner'], '331': ['partner'], '3411': ['partner'], '152': ['item'], '153': ['item'], '155': ['item'] },
  months: months.map(({ m }) => ({ id: `month-${String(m).padStart(2, '0')}`, label: `Tháng ${m}`, openAccounts: m >= 12 ? OPEN_END : m >= 4 ? OPEN_LOAN : OPEN_BASE })),
  tiers: { tier2: true, tier3a: true, tier3b: true, tier3Note: 'Tầng 3: (a) bảng đối chiếu đầy đủ, (b) bút toán điều chỉnh về bản chất mức cơ bản.' },
  reportTemplate: 'temp-simplified',
  intro: [{ speaker: T, text: 'Hồ sơ 2: doanh nghiệp sản xuất. Học giá thành, TSCĐ, vay, thuế TNDN và điều chỉnh về bản chất.' }],
});
console.log('Hồ sơ 2:', months.length, 'tháng,', all.length, 'nghiệp vụ');
