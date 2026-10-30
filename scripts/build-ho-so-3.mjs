// Sinh dữ liệu Hồ sơ 3 — Hỗn hợp SX + TM (Công ty Cổ phần Bàn Ăn Lam Thủy, hư cấu).
import { L, doc, fmt, makeVat, purchase, simple, vat, vatPct, writeJson, NONCASH_THRESHOLD, VAT_RULE } from './lib.mjs';

const DIR = 'data/cases/ho-so-3';
const CO = 'Công ty Cổ phần Bàn Ăn Lam Thủy';
const T = 'h3-chi-lam';
const O = 'h3-ong-thuy';
const K = 'h3-anh-khoa';
const X = 'h3-can-bo-thue';
const P = {
  'bach-ma': 'Công ty Đất Sét Bạch Mã',
  'song-may': 'Công ty Dệt May Sông Mây',
  'nha-xinh': 'Chuỗi Siêu thị Nhà Xinh',
  'lam-thuy-bac': 'Công ty TNHH Gốm Lam Thủy Bắc (công ty chị em)',
  'ong-thuy': 'Ông Lâm Thủy (cổ đông lớn)',
  'xe-may-man': 'Hợp tác xã Xe Tải May Mắn',
  'may-ep': 'Công ty Cơ Khí Lò Gốm',
};
const SX = { segment: 'sx' };
const TM = { segment: 'tm' };
const PRICE_SX = 400_000;
const PRICE_RP = 300_000; // giá bán cho công ty chị em
const NVL_UNIT = 160_000;
const KHAN_COST = 150_000;
const KHAN_PRICE = 200_000;
const NSX = [6000, 5500, 6000, 6500, 6000, 6000, 6500, 6000, 6500, 7000, 7000, 7500];
const NTM = [10000, 9000, 10000, 10000, 11000, 10000, 10000, 10500, 10000, 11000, 12000, 12000];
const RP_SALES = { 2: 2000, 8: 1500 };

const opening = {
  date: '2026-01-01',
  balances: [
    L.dr('111', 200_000_000),
    L.dr('112', 3_000_000_000),
    L.dr('131', 4_000_000_000, { partner: 'nha-xinh' }),
    L.dr('131', 1_200_000_000, { partner: 'lam-thuy-bac' }),
    L.dr('152', 500_000_000, { item: 'dat-men' }),
    L.dr('155', 1_200_000_000, { item: 'bo-bat-dia' }),
    L.dr('156', 1_500_000_000, { item: 'khan-ban' }),
    L.dr('211', 13_200_000_000),
    L.cr('2141', 1_104_000_000),
    L.cr('331', 900_000_000, { partner: 'bach-ma' }),
    L.cr('331', 1_200_000_000, { partner: 'song-may' }),
    L.cr('33311', 300_000_000),
    L.cr('3334', 400_000_000),
    L.cr('4111', 20_000_000_000),
    L.cr('4211', 896_000_000),
  ],
  priorYearRevenue: 65_000_000_000,
  charterCapital: { registered: 20_000_000_000, contributed: 20_000_000_000 },
  priorYearIncomeStatement: { '01': 65_000_000_000, '02': 300_000_000, '11': 52_000_000_000, '21': 40_000_000, '22': 0, '25': 1_500_000_000, '26': 3_200_000_000, '31': 0, '32': 20_000_000, '51': 1_604_000_000 },
  inventory: [
    { account: '152', item: 'dat-men', qty: 3125, unitCost: NVL_UNIT },
    { account: '155', item: 'bo-bat-dia', qty: 5000, unitCost: 240_000 },
    { account: '156', item: 'khan-ban', qty: 10000, unitCost: KHAN_COST },
  ],
  fixedAssets: [
    { id: 'lo-nung', name: 'Lò nung và dây chuyền tạo hình gốm', account: '211', cost: 6_000_000_000, accumulated: 600_000_000, monthlyDepreciation: 50_000_000, usefulLifeMonths: 120, type: 'general', businessUse: true },
    { id: 'van-phong-xe', name: 'Văn phòng làm việc và xe tải giao hàng', account: '211', cost: 3_600_000_000, accumulated: 360_000_000, monthlyDepreciation: 30_000_000, usefulLifeMonths: 120, type: 'general', businessUse: true },
    { id: 'can-ho', name: 'Căn hộ cho gia đình chủ tịch ở', account: '211', cost: 3_600_000_000, accumulated: 144_000_000, monthlyDepreciation: 12_000_000, usefulLifeMonths: 300, type: 'general', businessUse: false },
    { id: 'may-ep', name: 'Máy ép tạo hình gốm', account: '211', cost: 900_000_000, accumulated: 0, monthlyDepreciation: 7_500_000, usefulLifeMonths: 120, type: 'general', businessUse: true, acquiredInYear: true },
  ],
};

const all = [];
const push = (arr, e) => { if (e) { arr.push(e); all.push(e); } };
const VAT = makeVat({ opening, all, speaker: T });
const d = (m, day) => `2026-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const mm = (m) => String(m).padStart(2, '0');

const months = [];
const segRevenue = { sx: 0, tm: 0 };
const quarterRevenue = [0, 0, 0, 0];
let prevNhaXinh = 4_000_000_000;
let prevBachMa = 900_000_000;
let prevSongMay = 1_200_000_000;
let transportPayable = 0;

for (let m = 1; m <= 12; m++) {
  const ev = [];
  const mt = `tháng ${m}`;
  const nsx = NSX[m - 1];
  const ntm = NTM[m - 1];
  const nvl = nsx * NVL_UNIT;
  const khan = ntm * KHAN_COST;

  push(ev, purchase({
    id: `h3-m${mm(m)}-mua-nvl`, date: d(m, 3), speaker: K, title: `Mua đất sét, men cho mảng sản xuất ${mt}`,
    narrative: `Nhập đất sét và men đủ cho ${fmt(nsx)} bộ bát đĩa của Bạch Mã, trả vào tháng sau.`,
    sellerName: P['bach-ma'], buyerName: CO, supplier: 'bach-ma', pay: 'credit', debitTo: '152', detail: { item: 'dat-men' },
    lines: [{ name: 'Đất sét và men (định mức theo bộ)', qty: nsx, price: NVL_UNIT, unit: 'bộ' }],
    explanation: `Nợ 152 (đất, men) ${fmt(nvl)}, Nợ 1331 ${fmt(vat(nvl))} / Có 331 (Bạch Mã) ${fmt(nvl + vat(nvl))}.`,
  }));
  push(ev, purchase({
    id: `h3-m${mm(m)}-mua-khan`, date: d(m, 4), speaker: K, title: `Mua khăn trải bàn cho mảng thương mại ${mt}`,
    narrative: `Nhập ${fmt(ntm)} khăn trải bàn của Sông Mây, ${fmt(KHAN_COST)}/chiếc, trả vào tháng sau.`,
    sellerName: P['song-may'], buyerName: CO, supplier: 'song-may', pay: 'credit', debitTo: '156', detail: { item: 'khan-ban' },
    lines: [{ name: 'Khăn trải bàn vải', qty: ntm, price: KHAN_COST, unit: 'chiếc' }],
    explanation: `Nợ 156 (khăn) ${fmt(khan)}, Nợ 1331 ${fmt(vat(khan))} / Có 331 (Sông Mây) ${fmt(khan + vat(khan))}. Hàng mua để bán lại (mảng thương mại) vào 156, khác với nguyên liệu sản xuất vào 152.`,
  }));

  // Công nợ đầu tháng
  {
    const entries = [
      { memo: 'Thu tiền Nhà Xinh', lines: [L.dr('112', prevNhaXinh), L.cr('131', prevNhaXinh, { partner: 'nha-xinh' })] },
      { memo: 'Trả Bạch Mã, Sông Mây', lines: [L.dr('331', prevBachMa, { partner: 'bach-ma' }), L.dr('331', prevSongMay, { partner: 'song-may' }), L.cr('112', prevBachMa + prevSongMay)] },
    ];
    if (transportPayable) entries.push({ memo: 'Trả HTX xe tải', lines: [L.dr('331', transportPayable, { partner: 'xe-may-man' }), L.cr('112', transportPayable)] });
    push(ev, simple({
      id: `h3-m${mm(m)}-cong-no`, date: d(m, 10), speaker: T, title: 'Thu tiền khách, trả nhà cung cấp',
      narrative: `Nhà Xinh trả ${fmt(prevNhaXinh)}. Công ty trả Bạch Mã ${fmt(prevBachMa)} và Sông Mây ${fmt(prevSongMay)}${transportPayable ? `, trả HTX xe tải ${fmt(transportPayable)}` : ''}.`,
      documents: [doc('Sao kê ngân hàng', [[`Thu từ ${P['nha-xinh']}`, fmt(prevNhaXinh)], [`Chi cho ${P['bach-ma']}`, fmt(prevBachMa)], [`Chi cho ${P['song-may']}`, fmt(prevSongMay)], ...(transportPayable ? [[`Chi cho ${P['xe-may-man']}`, fmt(transportPayable)]] : [])])],
      hint: 'Mỗi đối tượng công nợ một dòng chi tiết; không bù trừ phải thu với phải trả.',
      explanation: 'Nợ 112 / Có 131 (Nhà Xinh); Nợ 331 (Bạch Mã), Nợ 331 (Sông Mây) / Có 112.',
      entries,
    }));
    transportPayable = 0;
  }
  push(ev, VAT.pay(`h3-m${mm(m)}-nop-gtgt`, d(m, 20), m === 1 ? 'tháng 12/2025' : `tháng ${m - 1}`));

  let extra627 = 0;
  if (m === 1) {
    push(ev, simple({
      id: 'h3-m01-co-dong-cho-vay', date: d(1, 5), speaker: O, title: 'Cổ đông lớn cho công ty vay',
      narrative: 'Ông Lâm Thủy (chủ tịch, cổ đông lớn) cho công ty vay 5.000.000.000, kỳ hạn 3 năm, lãi 12%/năm trả theo quý, để mua nguyên liệu dự trữ.',
      documents: [doc('Hợp đồng vay', [['Bên cho vay', P['ong-thuy']], ['Số tiền', fmt(5_000_000_000)], ['Kỳ hạn', '36 tháng'], ['Lãi suất', '12%/năm, trả cuối mỗi quý']])],
      hint: 'Người cho vay là bên liên quan (cổ đông lớn), nhưng bút toán vẫn là đi vay dài hạn.',
      explanation: 'Nợ 112 / Có 3411 (Ông Lâm Thủy) 5.000.000.000. Kỳ hạn trên 12 tháng: vay dài hạn. Phải thuyết minh giao dịch với bên liên quan (VAS 26). Trần lãi suất khi vay từ bên không phải tổ chức tín dụng chưa kiểm chứng nên game không điều chỉnh thuế khoản này.',
      attrs: { relatedParty: true },
      entries: [[L.dr('112', 5_000_000_000), L.cr('3411', 5_000_000_000, { partner: 'ong-thuy' })]],
    }));
  }
  if (m === 3) {
    push(ev, simple({
      id: 'h3-m03-nop-tndn', date: d(3, 25), speaker: T, title: 'Nộp thuế TNDN còn phải nộp năm 2025',
      narrative: 'Nộp 400.000.000 thuế TNDN năm 2025 còn phải nộp.',
      documents: [doc('Giấy nộp tiền vào ngân sách', [['Thuế TNDN 2025', fmt(400_000_000)]])],
      explanation: 'Nợ 3334 / Có 112 400.000.000.',
      entries: [[L.dr('3334', 400_000_000), L.cr('112', 400_000_000)]],
    }));
  }
  if (m % 3 === 0) {
    push(ev, simple({
      id: `h3-m${mm(m)}-lai-co-dong`, date: d(m, 28), speaker: T, title: `Trả lãi vay cổ đông quý ${m / 3}`,
      narrative: 'Trả lãi quý cho ông Lâm Thủy: 5.000.000.000 × 12% / 4 = 150.000.000, chuyển khoản.',
      documents: [doc('Ủy nhiệm chi', [['Người nhận', P['ong-thuy']], ['Lãi vay quý', fmt(150_000_000)]])],
      explanation: 'Nợ 635 / Có 112 150.000.000. Lãi trả cho bên liên quan: cần thuyết minh. (Rule trần lãi vay theo Bộ luật Dân sự chưa kiểm chứng, đang tắt.)',
      attrs: { relatedParty: true, interest: { amount: 150_000_000, principal: 5_000_000_000, lender: 'ong-thuy' } },
      entries: [[L.dr('635', 150_000_000), L.cr('112', 150_000_000)]],
    }));
  }
  if (m === 5) {
    push(ev, simple({
      id: 'h3-m05-tien-cham-nop', date: d(5, 15), speaker: X, title: 'Cán bộ thuế: tiền chậm nộp thuế', unusual: true,
      narrative: 'Cán bộ thuế Minh thông báo công ty nộp chậm tiền thuế GTGT một kỳ năm trước, phải nộp tiền chậm nộp 4.200.000. Công ty nộp ngay bằng chuyển khoản.',
      documents: [doc('Thông báo tiền chậm nộp', [['Số tiền chậm nộp', fmt(4_200_000)]])],
      hint: 'Tiền chậm nộp thuế không phải thuế; ghi vào chi phí khác.',
      explanation: 'Nợ 811 / Có 112 4.200.000. Tiền chậm nộp thuế không được trừ khi tính thuế TNDN (cùng rule với tiền phạt).',
      attrs: { expenseType: 'late-payment-interest' },
      entries: [[L.dr('811', 4_200_000), L.cr('112', 4_200_000)]],
    }));
  }
  if (m === 7) {
    push(ev, purchase({
      id: 'h3-m07-mua-may-ep', date: d(7, 20), speaker: O, title: 'Mua máy ép tạo hình gốm',
      narrative: 'Mua máy ép gốm 900.000.000 chưa thuế, chuyển khoản, đưa vào sử dụng từ tháng 8. Kịch bản: khấu hao 10 năm.',
      sellerName: P['may-ep'], buyerName: CO, pay: 'bank', debitTo: '211',
      lines: [{ name: 'Máy ép tạo hình gốm', qty: 1, price: 900_000_000, unit: 'chiếc' }],
      explanation: 'Nợ 211 900.000.000, Nợ 1331 72.000.000 / Có 112 972.000.000. LCTT: tiền chi mua sắm TSCĐ (đầu tư).',
    }));
  }
  if (m === 9) {
    push(ev, purchase({
      id: 'h3-m09-thue-xe-tien-mat', date: d(9, 12), speaker: K, title: 'Thuê xe chở khăn đi hội chợ, trả tiền mặt', unusual: true,
      narrative: 'Anh Khoa thuê xe chở khăn đi hội chợ: 12.000.000 chưa thuế, trả tiền mặt cho nhanh.',
      sellerName: P['xe-may-man'], buyerName: CO, pay: 'cash', debitTo: '641', detail: TM,
      lines: [{ name: 'Dịch vụ vận chuyển hàng đi hội chợ', qty: 1, price: 12_000_000, unit: 'chuyến' }],
      hint: `Chi phí bán hàng của mảng thương mại; tổng thanh toán so với ${fmt(NONCASH_THRESHOLD)}?`,
      explanation: 'Tổng 12.960.000 trả tiền mặt: GTGT không được khấu trừ, ghi hết vào 641 (mảng TM). Khoản chi không được trừ khi tính thuế TNDN.',
    }));
  }

  // Lương
  push(ev, simple({
    id: `h3-m${mm(m)}-luong`, date: d(m, 28), speaker: T, title: `Tính và trả lương ${mt}`,
    narrative: 'Bảng lương: công nhân trực tiếp 300.000.000, quản lý xưởng 100.000.000, bán hàng mảng SX 60.000.000, bán hàng mảng TM 60.000.000, văn phòng 200.000.000. Trả ngay bằng chuyển khoản. (Giản lược: chưa xét bảo hiểm, thuế TNCN.)',
    documents: [doc('Bảng lương', [['Công nhân trực tiếp (SX)', fmt(300_000_000)], ['Quản lý xưởng (SX)', fmt(100_000_000)], ['Bán hàng mảng SX', fmt(60_000_000)], ['Bán hàng mảng TM', fmt(60_000_000)], ['Văn phòng', fmt(200_000_000)], ['Cộng', fmt(720_000_000)]])],
    hint: 'Chi phí bán hàng ghi theo mảng (mã chi tiết SX/TM).',
    explanation: 'Nợ 622 300.000.000, Nợ 627 100.000.000, Nợ 641 (SX) 60.000.000, Nợ 641 (TM) 60.000.000, Nợ 642 200.000.000 / Có 334; rồi Nợ 334 / Có 112.',
    entries: [
      { memo: 'Tính lương', lines: [L.dr('622', 300_000_000), L.dr('627', 100_000_000), L.dr('641', 60_000_000, SX), L.dr('641', 60_000_000, TM), L.dr('642', 200_000_000), L.cr('334', 720_000_000)] },
      { memo: 'Trả lương', lines: [L.dr('334', 720_000_000), L.cr('112', 720_000_000)] },
    ],
  }));

  // Khấu hao
  const depF = 50_000_000 + (m >= 8 ? 7_500_000 : 0);
  const depO = 30_000_000 + 12_000_000;
  const depAttrs = [{ assetId: 'lo-nung', amount: 50_000_000 }, { assetId: 'van-phong-xe', amount: 30_000_000 }, { assetId: 'can-ho', amount: 12_000_000 }];
  if (m >= 8) depAttrs.push({ assetId: 'may-ep', amount: 7_500_000 });
  push(ev, simple({
    id: `h3-m${mm(m)}-khau-hao`, date: d(m, 30), speaker: T, title: `Khấu hao TSCĐ ${mt}`,
    narrative: `Khấu hao lò nung 50.000.000${m >= 8 ? ', máy ép 7.500.000' : ''} (xưởng); văn phòng và xe tải 30.000.000, căn hộ cho gia đình chủ tịch ở 12.000.000 (quản lý).`,
    documents: [doc('Bảng tính khấu hao', [['Lò nung, dây chuyền (xưởng)', fmt(50_000_000)], ...(m >= 8 ? [['Máy ép (xưởng)', fmt(7_500_000)]] : []), ['Văn phòng, xe tải (quản lý)', fmt(30_000_000)], ['Căn hộ cho gia đình chủ tịch (quản lý)', fmt(12_000_000)]])],
    explanation: `Nợ 627 ${fmt(depF)}, Nợ 642 ${fmt(depO)} / Có 2141 ${fmt(depF + depO)}. Căn hộ cho gia đình chủ tịch ở không phục vụ SXKD: khấu hao không được trừ khi tính thuế TNDN.`,
    attrs: { depreciation: depAttrs },
    entries: [[L.dr('627', depF), L.dr('642', depO), L.cr('2141', depF + depO)]],
  }));

  // Giá thành SX
  const c627 = 100_000_000 + depF + extra627;
  const total = nvl + 300_000_000 + c627;
  push(ev, simple({
    id: `h3-m${mm(m)}-gia-thanh`, date: d(m, 30), speaker: K, title: `Giá thành ${fmt(nsx)} bộ bát đĩa`,
    narrative: `Xuất đất, men (${fmt(nvl)}) cho sản xuất; tập hợp 621, 622, 627 vào 154; nhập kho ${fmt(nsx)} bộ bát đĩa hoàn thành (không có dở dang).`,
    documents: [doc('Phiếu tính giá thành', [['621', fmt(nvl)], ['622', fmt(300_000_000)], ['627', fmt(c627)], ['Giá thành hoàn thành', fmt(total)]])],
    explanation: `Nợ 621 / Có 152 ${fmt(nvl)}; Nợ 154 / Có 621, 622, 627 ${fmt(total)}; Nợ 155 / Có 154 ${fmt(total)}. Chỉ mảng sản xuất có giá thành; mảng thương mại đi thẳng 156 → 632.`,
    entries: [
      { memo: 'Xuất NVL', lines: [L.dr('621', nvl), L.cr('152', nvl, { item: 'dat-men' })] },
      { memo: 'Tập hợp chi phí', lines: [L.dr('154', total), L.cr('621', nvl), L.cr('622', 300_000_000), L.cr('627', c627)] },
      { memo: 'Nhập kho', lines: [L.dr('155', total, { item: 'bo-bat-dia' }), L.cr('154', total)] },
    ],
  }));

  // Bán SX
  const rpQty = RP_SALES[m] ?? 0;
  const nxQty = nsx - rpQty;
  const nxBase = nxQty * PRICE_SX;
  const nxCogs = rpQty ? Math.round((total * nxQty) / nsx) : total;
  push(ev, simple({
    id: `h3-m${mm(m)}-ban-sx`, date: d(m, 30), speaker: K, title: `Bán ${fmt(nxQty)} bộ bát đĩa cho Nhà Xinh (mảng SX)`,
    narrative: `Giao ${fmt(nxQty)} bộ bát đĩa cho Nhà Xinh, ${fmt(PRICE_SX)}/bộ, thu tiền ngày 10 tháng sau.`,
    documents: [doc('Hóa đơn GTGT', [[`Bộ bát đĩa gốm — ${fmt(nxQty)} × ${fmt(PRICE_SX)}`, fmt(nxBase)], [`Thuế GTGT (${vatPct})`, fmt(vat(nxBase))], ['Tổng', fmt(nxBase + vat(nxBase))]]), doc('Phiếu xuất kho', [['Giá vốn (giá thành lô tháng)', fmt(nxCogs)]])],
    hint: 'Doanh thu bán sản phẩm (5112) và giá vốn ghi mã mảng SX.',
    explanation: `Nợ 131 (Nhà Xinh) / Có 5112 (SX) ${fmt(nxBase)}, Có 33311 ${fmt(vat(nxBase))}; Nợ 632 (SX) / Có 155 ${fmt(nxCogs)}. Mã mảng giúp lập báo cáo bộ phận từ cùng một sổ cái.`,
    attrs: { vat: { base: nxBase, ruleId: VAT_RULE } },
    entries: [
      { memo: 'Doanh thu', lines: [L.dr('131', nxBase + vat(nxBase), { partner: 'nha-xinh' }), L.cr('5112', nxBase, SX), L.cr('33311', vat(nxBase))] },
      { memo: 'Giá vốn', lines: [L.dr('632', nxCogs, SX), L.cr('155', nxCogs, { item: 'bo-bat-dia' })] },
    ],
  }));
  segRevenue.sx += nxBase;
  quarterRevenue[Math.floor((m - 1) / 3)] += nxBase;
  if (rpQty) {
    const base = rpQty * PRICE_RP;
    const cogs = total - nxCogs;
    push(ev, simple({
      id: `h3-m${mm(m)}-ban-lien-quan`, date: d(m, 30), speaker: O, title: `Bán ${fmt(rpQty)} bộ cho công ty chị em Lam Thủy Bắc`,
      narrative: `Ông Lâm Thủy chỉ đạo bán ${fmt(rpQty)} bộ bát đĩa cho Gốm Lam Thủy Bắc (công ty do gia đình ông sở hữu) với giá ${fmt(PRICE_RP)}/bộ, thấp hơn giá bán cho Nhà Xinh, công nợ "khi nào tiện thì trả".`,
      documents: [doc('Hóa đơn GTGT', [[`Bộ bát đĩa gốm — ${fmt(rpQty)} × ${fmt(PRICE_RP)}`, fmt(base)], [`Thuế GTGT (${vatPct})`, fmt(vat(base))], ['Tổng', fmt(base + vat(base))]]), doc('Phiếu xuất kho', [['Giá vốn', fmt(cogs)]])],
      hint: 'Hạch toán như bán hàng bình thường, đúng đối tượng. Bản chất bên liên quan thể hiện ở thuyết minh.',
      explanation: `Nợ 131 (Lam Thủy Bắc) / Có 5112 (SX) ${fmt(base)}, Có 33311 ${fmt(vat(base))}; Nợ 632 (SX) / Có 155 ${fmt(cogs)}. Bút toán không khác bán thường; điều cần nhớ là giá thấp hơn giá thị trường và công nợ không hạn: phải thuyết minh giao dịch bên liên quan (VAS 26). Chuyển giá nằm ngoài phạm vi game.`,
      attrs: { relatedParty: true, vat: { base, ruleId: VAT_RULE } },
      entries: [
        { memo: 'Doanh thu', lines: [L.dr('131', base + vat(base), { partner: 'lam-thuy-bac' }), L.cr('5112', base, SX), L.cr('33311', vat(base))] },
        { memo: 'Giá vốn', lines: [L.dr('632', cogs, SX), L.cr('155', cogs, { item: 'bo-bat-dia' })] },
      ],
    }));
    segRevenue.sx += base;
    quarterRevenue[Math.floor((m - 1) / 3)] += base;
  }

  // Bán TM
  const tmBase = ntm * KHAN_PRICE;
  push(ev, simple({
    id: `h3-m${mm(m)}-ban-tm`, date: d(m, 30), speaker: K, title: `Bán ${fmt(ntm)} khăn trải bàn cho Nhà Xinh (mảng TM)`,
    narrative: `Giao ${fmt(ntm)} khăn trải bàn cho Nhà Xinh, ${fmt(KHAN_PRICE)}/chiếc, thu tiền ngày 10 tháng sau.`,
    documents: [doc('Hóa đơn GTGT', [[`Khăn trải bàn — ${fmt(ntm)} × ${fmt(KHAN_PRICE)}`, fmt(tmBase)], [`Thuế GTGT (${vatPct})`, fmt(vat(tmBase))], ['Tổng', fmt(tmBase + vat(tmBase))]]), doc('Phiếu xuất kho', [['Giá vốn', fmt(khan)]])],
    hint: 'Doanh thu bán hàng hóa (5111) và giá vốn ghi mã mảng TM.',
    explanation: `Nợ 131 (Nhà Xinh) / Có 5111 (TM) ${fmt(tmBase)}, Có 33311 ${fmt(vat(tmBase))}; Nợ 632 (TM) / Có 156 ${fmt(khan)}.`,
    attrs: { vat: { base: tmBase, ruleId: VAT_RULE } },
    entries: [
      { memo: 'Doanh thu', lines: [L.dr('131', tmBase + vat(tmBase), { partner: 'nha-xinh' }), L.cr('5111', tmBase, TM), L.cr('33311', vat(tmBase))] },
      { memo: 'Giá vốn', lines: [L.dr('632', khan, TM), L.cr('156', khan, { item: 'khan-ban' })] },
    ],
  }));
  segRevenue.tm += tmBase;
  quarterRevenue[Math.floor((m - 1) / 3)] += tmBase;
  let nextNhaXinh = nxBase + vat(nxBase) + tmBase + vat(tmBase);

  if (m === 6) {
    const rBase = 200 * KHAN_PRICE;
    push(ev, simple({
      id: 'h3-m06-hang-tra-lai', date: d(6, 30), speaker: K, title: 'Nhà Xinh trả lại 200 khăn lỗi', unusual: true,
      narrative: `Nhà Xinh trả lại 200 khăn trong lô tháng 6 vì lỗi in hoa văn, hai bên lập biên bản và điều chỉnh hóa đơn. Khăn nhập lại kho (giá vốn ${fmt(KHAN_COST)}/chiếc). Kịch bản yêu cầu dùng TK giảm trừ doanh thu.`,
      documents: [doc('Biên bản trả lại hàng', [['Số lượng', '200 chiếc'], ['Giá bán', fmt(rBase)], [`Thuế GTGT (${vatPct})`, fmt(vat(rBase))], ['Giá vốn nhập lại', fmt(200 * KHAN_COST)]])],
      hint: 'Hàng bán bị trả lại: ghi giảm trừ doanh thu, giảm thuế đầu ra, giảm phải thu; nhập lại kho và giảm giá vốn.',
      explanation: `Nợ 521 (TM) ${fmt(rBase)}, Nợ 33311 ${fmt(vat(rBase))} / Có 131 (Nhà Xinh) ${fmt(rBase + vat(rBase))}; Nợ 156 / Có 632 (TM) ${fmt(200 * KHAN_COST)}. Ghi Nợ thẳng 5111 cho ra cùng lợi nhuận nhưng bị chấm sai bản chất: KQKD phải thấy khoản giảm trừ.`,
      substance: ['no-debit-revenue'],
      entries: [
        { memo: 'Giảm trừ doanh thu', lines: [L.dr('521', rBase, TM), L.dr('33311', vat(rBase)), L.cr('131', rBase + vat(rBase), { partner: 'nha-xinh' })] },
        { memo: 'Nhập lại kho', lines: [L.dr('156', 200 * KHAN_COST, { item: 'khan-ban' }), L.cr('632', 200 * KHAN_COST, TM)] },
      ],
    }));
    nextNhaXinh -= rBase + vat(rBase);
    segRevenue.tm -= rBase;
    quarterRevenue[1] -= rBase;
  }
  if (m === 10) {
    push(ev, simple({
      id: 'h3-m10-lien-quan-tra', date: d(10, 15), speaker: O, title: 'Lam Thủy Bắc trả một phần nợ',
      narrative: 'Công ty chị em Lam Thủy Bắc chuyển khoản trả 1.000.000.000 (nợ từ năm 2025).',
      documents: [doc('Giấy báo Có', [['Người chuyển', P['lam-thuy-bac']], ['Số tiền', fmt(1_000_000_000)]])],
      explanation: 'Nợ 112 / Có 131 (Lam Thủy Bắc) 1.000.000.000. Phải thu bên liên quan vẫn còn lớn và kéo dài.',
      attrs: { relatedParty: true },
      entries: [[L.dr('112', 1_000_000_000), L.cr('131', 1_000_000_000, { partner: 'lam-thuy-bac' })]],
    }));
  }

  push(ev, VAT.offset(`h3-m${mm(m)}-khau-tru`, d(m, 30), mt));

  if (m === 12) {
    push(ev, simple({
      id: 'h3-m12-thue-tndn', date: d(12, 31), kind: 'cit', speaker: T, title: 'Tính và ghi chi phí thuế TNDN năm 2026',
      narrative: 'Tính thuế TNDN: LN kế toán trước thuế + khoản không được trừ của rule đang bật (thuê xe trả tiền mặt tháng 9, tiền chậm nộp tháng 5, khấu hao căn hộ cho gia đình chủ tịch), nhân thuế suất theo doanh thu năm trước 65 tỷ.',
      hint: 'Doanh thu năm trước trên 50 tỷ: xem rule thuế suất.',
      explanation: 'Nợ 8211 / Có 3334. Bảng đối chiếu ở Tầng 3 (a).',
      entries: [[L.dr('8211', { $calc: 'citExpense' }), L.cr('3334', { $calc: 'citExpense' })]],
    }));
    push(ev, simple({
      id: 'h3-m12-ket-chuyen', date: d(12, 31), kind: 'closing', speaker: T, title: 'Kết chuyển cuối năm (theo mảng)',
      narrative: 'Kết chuyển doanh thu, giảm trừ, giá vốn, chi phí sang 911 rồi sang 4212. Các TK có mã mảng phải kết chuyển đúng từng mảng.',
      hint: 'Mỗi dòng doanh thu, giá vốn, chi phí bán hàng giữ nguyên mã mảng khi kết chuyển.',
      explanation: 'Sau kết chuyển mọi TK loại 5–9 về 0 theo từng mảng; LNST bằng phần tăng của 4212.',
      answer: { $calc: 'closing' },
    }));
  }
  prevNhaXinh = nextNhaXinh;
  prevBachMa = nvl + vat(nvl);
  prevSongMay = khan + vat(khan);
  ev.sort((a, b) => a.date.localeCompare(b.date));
  months.push({ m, ev });
}

const OPEN = ['111', '112', '131', '1331', '1388', '152', '154', '155', '156', '211', '2141', '331', '33311', '3334', '334', '3388', '3411', '4111', '4211', '5111', '5112', '521', '621', '622', '627', '632', '635', '641', '642', '711', '811'];
const OPEN_END = [...OPEN, '8211', '911', '4212'];
const INTRO = {
  1: [
    { speaker: O, text: 'Lam Thủy vừa làm gốm vừa buôn khăn vải. Tôi còn một công ty gia đình ở phía Bắc, hai bên mua bán qua lại.' },
    { speaker: T, text: 'Em là Lam, kế toán trưởng. Một pháp nhân, một sổ cái, hai mảng: doanh thu, giá vốn, chi phí bán hàng phải ghi mã mảng SX hoặc TM.' },
    { speaker: K, text: 'Khoa đây, lo kho và giao hàng. Đất men vào 152, khăn vào 156, đừng lẫn nha!' },
  ],
  2: [{ speaker: T, text: 'Tháng này có giao dịch với công ty chị em. Ghi như bình thường, nhưng nhớ đây là bên liên quan.' }],
  5: [{ speaker: X, text: 'Chào chị Lam, tôi là Minh bên thuế. Có một khoản chậm nộp cần xử lý.' }],
  6: [{ speaker: K, text: 'Lô khăn tháng này bị in lỗi, Nhà Xinh đòi trả lại.' }],
  12: [{ speaker: T, text: 'Cuối năm: thuế TNDN, kết chuyển theo mảng, rồi đối chiếu BCTC với tờ khai và dòng tiền ở Tầng 2, điều chỉnh ở Tầng 3.' }],
};
for (const { m, ev } of months) {
  writeJson(`${DIR}/month-${mm(m)}.json`, { id: `month-${mm(m)}`, label: `Tháng ${m}`, intro: INTRO[m] ?? [], outro: m === 12 ? [{ speaker: T, text: 'Khóa sổ xong! Tầng 2 có cả tờ khai GTGT để đối chiếu.' }] : [], events: ev });
}
writeJson(`${DIR}/opening.json`, opening);

// ---- Tầng 2: cài bất thường ----
const injSale = 5000 * PRICE_RP; // bán cuối năm cho công ty chị em, không kê khai
const declared = quarterRevenue.map((q, i) => (i === 3 ? q : q));
writeJson(`${DIR}/anomalies.json`, {
  intro: 'BCTC năm 2026 của Lam Thủy (đã khóa sổ), kèm thuyết minh bộ phận, thuyết minh bên liên quan và bảng đối chiếu doanh thu trên tờ khai GTGT. Có 4 bất thường được cài sẵn.',
  injections: [
    { id: 'h3-t2-ban-lien-quan-cuoi-nam', date: '2026-12-30', memo: 'Bán 5.000 bộ cho Lam Thủy Bắc ngày 30/12, chưa thu tiền', lines: [L.dr('131', injSale + vat(injSale), { partner: 'lam-thuy-bac' }), L.cr('5112', injSale, SX), L.cr('33311', vat(injSale))] },
    { id: 'h3-t2-gia-von-lien-quan', date: '2026-12-30', memo: 'Giá vốn lô bán cho Lam Thủy Bắc', lines: [L.dr('632', 1_200_000_000, SX), L.cr('155', 1_200_000_000, { item: 'bo-bat-dia' })] },
    { id: 'h3-t2-mua-tru-khan', date: '2026-12-30', memo: 'Trả trước toàn bộ tiền khăn dự trữ năm 2027 cho Sông Mây', lines: [L.dr('331', 15_000_000_000, { partner: 'song-may' }), L.cr('112', 15_000_000_000)] },
  ],
  notes: [
    { id: 'tm-bo-phan', title: 'Thuyết minh: doanh thu thuần theo bộ phận', columns: ['Bộ phận', 'Doanh thu thuần', 'Ghi chú'], rows: [
      { code: 'bp-sx', cells: ['Sản xuất (gốm)', fmt(segRevenue.sx + injSale), ''] },
      { code: 'bp-tm', cells: ['Thương mại (khăn vải)', fmt(segRevenue.tm + 800_000_000), 'Chưa trừ hàng bán bị trả lại; có cộng nhầm hàng gửi bán'] },
      { code: 'bp-tong', cells: ['Cộng', fmt(segRevenue.sx + injSale + segRevenue.tm + 800_000_000), ''] },
    ] },
    { id: 'tm-lien-quan', title: 'Thuyết minh: giao dịch và số dư với bên liên quan (VAS 26)', columns: ['Bên liên quan', 'Số tiền', 'Nội dung'], rows: [
      { code: 'lq-lam-thuy-bac', cells: ['Gốm Lam Thủy Bắc (công ty chị em)', fmt(200_000_000 + (2000 + 1500) * PRICE_RP + vat((2000 + 1500) * PRICE_RP) + injSale + vat(injSale)), 'Phải thu cuối năm; giá bán 300.000/bộ, thấp hơn giá bán cho khách độc lập (400.000/bộ); không thời hạn thanh toán'] },
      { code: 'lq-ong-thuy', cells: ['Ông Lâm Thủy (cổ đông lớn)', fmt(5_000_000_000), 'Khoản vay dài hạn, lãi 12%/năm'] },
    ] },
    { id: 'tm-to-khai', title: 'Đối chiếu doanh thu chịu thuế trên tờ khai GTGT với sổ kế toán', columns: ['Kỳ', 'Doanh thu trên tờ khai', 'Ghi chú'], rows: [
      { code: 'tk-q1', cells: ['Quý 1', fmt(declared[0]), 'Khớp sổ'] },
      { code: 'tk-q2', cells: ['Quý 2', fmt(declared[1]), 'Khớp sổ (đã trừ hàng trả lại)'] },
      { code: 'tk-q3', cells: ['Quý 3', fmt(declared[2]), 'Khớp sổ'] },
      { code: 'tk-q4', cells: ['Quý 4', fmt(declared[3]), 'Theo hóa đơn đã kê khai'] },
    ] },
  ],
  reasons: [
    { id: 'r-lien-quan', text: 'Phải thu bên liên quan lớn, tăng nhanh, giá ưu đãi và không thời hạn: rủi ro doanh thu không thực chất, vốn bị chiếm dụng.' },
    { id: 'r-thuyet-minh', text: 'Số liệu thuyết minh không khớp báo cáo chính: tổng doanh thu các bộ phận khác dòng doanh thu thuần trên KQKD.' },
    { id: 'r-to-khai', text: 'Doanh thu trên tờ khai GTGT thấp hơn doanh thu trên sổ: có hóa đơn hoặc giao dịch chưa kê khai thuế.' },
    { id: 'r-lctt-am', text: 'Lưu chuyển tiền thuần từ hoạt động kinh doanh âm trong khi KQKD có lãi: lợi nhuận chưa chuyển thành tiền (phải thu, trả trước, tồn kho).' },
    { id: 'r-khau-hao', text: 'Khấu hao vượt khung thời gian theo quy định thuế.' },
    { id: 'r-von-gop', text: 'Vốn góp chưa đủ trong khi lãi vay lớn.' },
    { id: 'r-giam-tru', text: 'Hàng bán bị trả lại được ghi giảm thẳng doanh thu.' },
  ],
  anomalies: [
    { id: 'h3-a1', title: 'Phải thu bên liên quan lớn', pattern: 'phải thu/phải trả bên liên quan lớn', lineRefs: [{ report: 'TM', code: 'lq-lam-thuy-bac' }, { report: 'CĐKT', code: '131' }], reportsTouched: ['CĐKT', 'TM'], reasonId: 'r-lien-quan', explanation: 'Phải thu Lam Thủy Bắc lên gần 3 tỷ, gồm lô 5.000 bộ bán ngày 30/12 với giá ưu đãi, không thời hạn thanh toán. Thuyết minh VAS 26 cho thấy bản chất mà dòng 131 trên CĐKT che mất.' },
    { id: 'h3-a2', title: 'Thuyết minh bộ phận không khớp KQKD', pattern: 'thuyết minh không khớp báo cáo', lineRefs: [{ report: 'TM', code: 'bp-tm' }, { report: 'TM', code: 'bp-tong' }, { report: 'KQKD', code: '10' }], reportsTouched: ['KQKD', 'TM'], reasonId: 'r-thuyet-minh', explanation: 'Tổng doanh thu các bộ phận lớn hơn doanh thu thuần trên KQKD khoảng 800 triệu: bộ phận TM chưa trừ hàng bán bị trả lại và cộng nhầm hàng gửi bán. Vì engine lập KQKD từ sổ cái nên lệch là ở thuyết minh.' },
    { id: 'h3-a3', title: 'Tờ khai GTGT thấp hơn sổ', pattern: 'đối chiếu BCTC với tờ khai thuế', lineRefs: [{ report: 'TM', code: 'tk-q4' }, { report: 'KQKD', code: '01' }], reportsTouched: ['KQKD', 'TM'], reasonId: 'r-to-khai', explanation: `Cộng 4 quý trên tờ khai thấp hơn doanh thu thuần trên KQKD (dòng 10) đúng ${fmt(injSale)}: lô bán cho công ty chị em ngày 30/12 đã ghi sổ nhưng chưa kê khai thuế GTGT quý 4.` },
    { id: 'h3-a4', title: 'Lãi nhưng tiền từ hoạt động kinh doanh âm', pattern: 'LCTT từ HĐKD âm trong khi có lãi', lineRefs: [{ report: 'LCTT', code: '20' }, { report: 'KQKD', code: '60' }, { report: 'CĐKT', code: '132' }], reportsTouched: ['LCTT', 'KQKD'], reasonId: 'r-lctt-am', explanation: 'KQKD lãi lớn nhưng tiền thuần từ HĐKD âm vì công ty trả trước 15 tỷ tiền khăn của năm sau (dòng "Trả trước cho người bán") và tăng phải thu bên liên quan. Đây đúng là bài "lãi mà âm tiền".' },
  ],
});

// ---- Tầng 3 ----
writeJson(`${DIR}/adjustments.json`, {
  reconciliation: { intro: 'Bảng đối chiếu đầy đủ. Giao dịch bên liên quan (giá ưu đãi, lãi vay cổ đông) chỉ thuyết minh, không điều chỉnh thuế: chuyển giá và trần lãi vay nằm ngoài phạm vi "Vừa" hoặc chưa kiểm chứng.' },
  companyBook: {
    intro: 'Sổ của kế toán cũ lập cho mục đích thuế: bằng sổ của bạn cộng thêm hai bút toán (khoản cho công ty chị em vay ghi vào phải thu khách hàng; ghi doanh thu lô hàng giao năm 2027). Còn hai việc chưa xử lý: khăn mốc và nợ khó đòi của công ty chị em.',
    injections: [
      { id: 'h3-cb-cho-vay', date: '2026-09-15', memo: 'Chuyển 1,5 tỷ cho Gốm Lam Thủy Bắc vay (kế toán cũ ghi Nợ 131)', lines: [L.dr('131', 1_500_000_000, { partner: 'lam-thuy-bac' }), L.cr('112', 1_500_000_000)] },
      { id: 'h3-cb-doanh-thu-som', date: '2026-12-31', memo: 'Ghi doanh thu lô khăn giao ngày 05/01/2027 (chưa xuất hóa đơn)', lines: [L.dr('131', 400_000_000, { partner: 'nha-xinh' }), L.cr('5111', 400_000_000, TM)] },
    ],
  },
  items: [
    { id: 'h3-adj-cho-vay', category: 'related-loan-reclass', title: 'Khoản cho công ty chị em vay nằm trong phải thu khách hàng', evidence: ['Hợp đồng vay ngày 15/09/2026: Lam Thủy cho Gốm Lam Thủy Bắc vay 1.500.000.000, 12 tháng, không lãi.', 'Không có hóa đơn bán hàng nào tương ứng; kế toán cũ ghi Nợ 131 (Lam Thủy Bắc).'], answer: { entries: [{ lines: [L.dr('1283', 1_500_000_000, { partner: 'lam-thuy-bac' }), L.cr('131', 1_500_000_000, { partner: 'lam-thuy-bac' })] }] }, explanation: 'Phân loại lại: Nợ 1283 (cho vay) / Có 131 (Lam Thủy Bắc) 1.500.000.000. Lợi nhuận không đổi nhưng CĐKT đúng bản chất: phải thu thương mại giảm, đầu tư tài chính (cho vay) tăng. Trên LCTT, khoản chi này thuộc hoạt động đầu tư chứ không phải kinh doanh. Phải thuyết minh bên liên quan.' },
    { id: 'h3-adj-sai-ky', category: 'revenue-cutoff', title: 'Doanh thu ghi sớm của lô giao năm 2027', evidence: ['Biên bản giao hàng ngày 05/01/2027 cho Nhà Xinh: 2.000 khăn.', 'Kế toán cũ ghi Nợ 131 / Có 5111 (TM) 400.000.000 vào ngày 31/12/2026; hàng vẫn ở kho tại 31/12.'], answer: { entries: [{ lines: [L.dr('5111', 400_000_000, TM), L.cr('131', 400_000_000, { partner: 'nha-xinh' })] }] }, explanation: 'Hủy doanh thu ghi sai kỳ: Nợ 5111 (TM) / Có 131 (Nhà Xinh) 400.000.000. Không dùng 521 vì đây không phải hàng bán bị trả lại hay chiết khấu; đây là doanh thu chưa phát sinh trong năm 2026.' },
    { id: 'h3-adj-khan-moc', category: 'damaged-inventory', title: 'Khăn bị mốc trong kho chưa xử lý', evidence: ['Biên bản kiểm kê 31/12: 300 khăn bị mốc, không bán được, giá gốc 45.000.000.', 'Không có bồi thường.'], answer: { entries: [{ lines: [L.dr('632', 45_000_000, TM), L.cr('156', 45_000_000, { item: 'khan-ban' })] }] }, explanation: 'Nợ 632 (TM) / Có 156 (khăn) 45.000.000. Ghi đúng mảng TM để báo cáo bộ phận phản ánh đúng.' },
    { id: 'h3-adj-du-phong', category: 'provision-overdue', title: 'Nợ quá hạn của công ty chị em', evidence: ['Phải thu Lam Thủy Bắc còn 200.000.000 nợ từ năm 2025, quá hạn hơn 12 tháng.', 'Biên bản họp: trích dự phòng 100.000.000 (số kịch bản cho sẵn; game không áp tỷ lệ TT 48/2019).'], answer: { entries: [{ lines: [L.dr('642', 100_000_000), L.cr('2293', 100_000_000)] }] }, explanation: 'Nợ 642 / Có 2293 100.000.000. Bên liên quan không phải lý do để bỏ qua dự phòng.' },
  ],
});

writeJson(`${DIR}/case.json`, {
  id: 'ho-so-3', order: 3, title: 'Hồ sơ 3 — Hỗn hợp SX + TM', type: 'Hỗn hợp',
  company: { name: CO, description: 'Sản xuất bát đĩa gốm và kinh doanh khăn trải bàn trên cùng một pháp nhân. Năm hoạt động thứ hai, doanh thu năm 2025 là 65 tỷ đồng. Có công ty chị em và cổ đông cho vay.', taxNote: 'Gốm gia dụng và khăn vải: nhóm 10% đang được giảm.' },
  fiscalYear: 2026, regulationNote: 'Quy định áp dụng tại 30/10/2026',
  characters: [
    { id: T, name: 'Chị Lam', role: 'Kế toán trưởng (hướng dẫn)', color: '#f7a8b8', mentor: true },
    { id: O, name: 'Ông Lâm Thủy', role: 'Chủ tịch, cổ đông lớn', color: '#e0b85f' },
    { id: K, name: 'Anh Khoa', role: 'Kho và bán hàng', color: '#7fc8a9' },
    { id: X, name: 'Cán bộ thuế Minh', role: 'Cán bộ thuế (theo sự kiện)', color: '#9fb3d9' },
  ],
  partners: [
    { id: 'bach-ma', name: P['bach-ma'], kind: 'supplier' },
    { id: 'song-may', name: P['song-may'], kind: 'supplier' },
    { id: 'xe-may-man', name: P['xe-may-man'], kind: 'supplier' },
    { id: 'may-ep', name: P['may-ep'], kind: 'supplier' },
    { id: 'nha-xinh', name: P['nha-xinh'], kind: 'customer' },
    { id: 'lam-thuy-bac', name: P['lam-thuy-bac'], kind: 'customer', relatedParty: true },
    { id: 'ong-thuy', name: P['ong-thuy'], kind: 'shareholder', relatedParty: true, term: 'long' },
  ],
  items: [
    { id: 'dat-men', name: 'Đất sét và men', unit: 'bộ định mức' },
    { id: 'bo-bat-dia', name: 'Bộ bát đĩa gốm', unit: 'bộ' },
    { id: 'khan-ban', name: 'Khăn trải bàn vải', unit: 'chiếc' },
  ],
  segments: [{ id: 'sx', name: 'Mảng sản xuất (gốm)' }, { id: 'tm', name: 'Mảng thương mại (khăn vải)' }],
  detailAccounts: { '131': ['partner'], '331': ['partner'], '3411': ['partner'], '1283': ['partner'], '152': ['item'], '155': ['item'], '156': ['item'], '511': ['segment'], '521': ['segment'], '632': ['segment'], '641': ['segment'] },
  months: months.map(({ m }) => ({ id: `month-${mm(m)}`, label: `Tháng ${m}`, openAccounts: m === 12 ? OPEN_END : OPEN })),
  tiers: { tier2: true, tier3a: true, tier3b: true, tier3Note: 'Tầng 3 đầy đủ: (a) đối chiếu, (b) điều chỉnh về bản chất gồm phân loại lại khoản cho bên liên quan vay.' },
  reportTemplate: 'temp-simplified',
  intro: [{ speaker: T, text: 'Hồ sơ 3: hai mảng trên một sổ, bên liên quan, đối chiếu BCTC với tờ khai thuế và dòng tiền.' }],
});
console.log('Hồ sơ 3:', months.length, 'tháng,', all.length, 'nghiệp vụ; doanh thu bộ phận', segRevenue);
