// Sinh dữ liệu Hồ sơ 1 — Thương mại (Công ty TNHH Thời Trang Sợi Mây, hư cấu).
import { L, doc, fmt, purchase, sale, simple, vat, vatPct, writeJson, NONCASH_THRESHOLD } from './lib.mjs';

const DIR = 'data/cases/ho-so-1';
const CO = 'Công ty TNHH Thời Trang Sợi Mây';
const T = 'h1-chu-tu';
const M = 'h1-ba-may';
const N = 'h1-be-na';

const ITEMS = {
  'ao-thun': { name: 'Áo thun cotton', unit: 'cái', cost: 60_000, price: 100_000 },
  'quan-kaki': { name: 'Quần kaki', unit: 'cái', cost: 150_000, price: 240_000 },
  'ao-khoac': { name: 'Áo khoác gió', unit: 'cái', cost: 250_000, price: 400_000 },
};
const P = {
  'ao-xinh': 'Shop Áo Xinh',
  'co-ba': 'Tạp hóa Cô Ba',
  'chi-hong': 'Xưởng May Chỉ Hồng',
  'lua-trang': 'Công ty May Lụa Trăng',
  'hat-lua': 'Ngân hàng TMCP Hạt Lúa',
  'be-na': 'Bé Na (nhân viên)',
};

// ---- Số dư đầu kỳ 01/01/2026 ----
const opening = {
  date: '2026-01-01',
  balances: [
    L.dr('111', 80_000_000),
    L.dr('112', 420_000_000),
    L.dr('131', 40_000_000, { partner: 'ao-xinh' }),
    L.dr('131', 20_000_000, { partner: 'co-ba' }),
    L.dr('156', 120_000_000, { item: 'ao-thun' }),
    L.dr('156', 120_000_000, { item: 'quan-kaki' }),
    L.cr('331', 90_000_000, { partner: 'chi-hong' }),
    L.cr('33311', 8_000_000),
    L.cr('3334', 4_000_000),
    L.cr('4111', 600_000_000),
    L.cr('4211', 98_000_000),
  ],
  priorYearRevenue: 750_000_000,
  charterCapital: { registered: 600_000_000, contributed: 600_000_000 },
  priorYearIncomeStatement: { '01': 750_000_000, '02': 0, '11': 470_000_000, '21': 1_000_000, '22': 0, '25': 120_000_000, '26': 110_000_000, '31': 0, '32': 0, '51': 7_650_000 },
  inventory: [
    { account: '156', item: 'ao-thun', qty: 2000, unitCost: 60_000 },
    { account: '156', item: 'quan-kaki', qty: 800, unitCost: 150_000 },
  ],
  fixedAssets: [
    { id: 'noi-that-vp', name: 'Bộ nội thất văn phòng (bàn họp, tủ hồ sơ gỗ)', account: '211', cost: 72_000_000, accumulated: 0, monthlyDepreciation: 2_000_000, usefulLifeMonths: 36, type: 'general', businessUse: true, acquiredInYear: true },
  ],
};

// ---- Theo dõi số dư GTGT để sinh bút toán khấu trừ, nộp thuế tự động ----
const all = [];
const bal = (acc) =>
  [...opening.balances, ...all.flatMap((e) => ('entries' in e.answer ? e.answer.entries.flatMap((x) => x.lines) : []))]
    .filter((l) => l.account === acc)
    .reduce((s, l) => s + (l.debit ?? 0) - (l.credit ?? 0), 0);

function vatOffset(id, date, monthText) {
  const input = bal('1331');
  const output = -bal('33311');
  const amt = Math.min(input, output);
  if (amt <= 0) return null;
  return simple({
    id, date, speaker: T,
    title: `Khấu trừ thuế GTGT ${monthText}`,
    narrative: `Cuối ${monthText}, chú Tư lập tờ khai GTGT. Thuế đầu vào được khấu trừ còn ${fmt(input)}, thuế đầu ra phải nộp ${fmt(output)}. Hãy bù trừ phần đầu vào được khấu trừ với đầu ra.`,
    documents: [doc('Bảng kê thuế GTGT', [['Thuế GTGT đầu vào được khấu trừ (số dư 1331)', fmt(input)], ['Thuế GTGT đầu ra (số dư 33311)', fmt(output)], ['Số được khấu trừ trong kỳ', fmt(amt)], [output > input ? 'Còn phải nộp' : 'Đầu vào còn được khấu trừ chuyển kỳ sau', fmt(Math.abs(output - input))]])],
    hint: 'Ghi Nợ thuế GTGT đầu ra, Có thuế GTGT được khấu trừ, với số nhỏ hơn trong hai số dư.',
    explanation: `Khấu trừ là bù trừ hai số dư: Nợ 33311 / Có 1331 ${fmt(amt)}. ${output > input ? `Phần còn lại ${fmt(output - input)} là số thuế phải nộp, sẽ nộp vào tháng sau.` : `Đầu vào còn dư ${fmt(input - output)} được chuyển sang kỳ sau, nằm ở dòng "Thuế GTGT được khấu trừ" trên CĐKT.`}`,
    entries: [[L.dr('33311', amt), L.cr('1331', amt)]],
  });
}

function vatPay(id, date, monthText) {
  const due = -bal('33311');
  if (due <= 0) return null;
  return simple({
    id, date, speaker: T,
    title: `Nộp thuế GTGT ${monthText}`,
    narrative: `Nộp số thuế GTGT còn phải nộp của ${monthText} là ${fmt(due)} bằng chuyển khoản.`,
    documents: [doc('Giấy nộp tiền vào ngân sách', [['Nội dung', `Thuế GTGT ${monthText}`], ['Số tiền', fmt(due)], ['Hình thức', 'Chuyển khoản']])],
    hint: 'Nộp thuế làm giảm nghĩa vụ với Nhà nước và giảm tiền gửi.',
    explanation: `Nợ 33311 / Có 112 ${fmt(due)}. Trên LCTT đây là "tiền chi khác cho hoạt động kinh doanh"; KQKD không đổi vì thuế GTGT không phải chi phí.`,
    entries: [[L.dr('33311', due), L.cr('112', due)]],
  });
}

function salary(id, date, monthText, sell = 6_000_000, admin = 8_000_000, label = monthText) {
  const total = sell + admin;
  return simple({
    id, date, speaker: T,
    title: `Tính và trả lương ${label}`,
    narrative: `Bảng lương ${label}: bộ phận bán hàng ${fmt(sell)}, bộ phận quản lý ${fmt(admin)}. Trả ngay bằng chuyển khoản. (Kịch bản giản lược: chưa xét bảo hiểm bắt buộc và thuế TNCN.)`,
    documents: [doc('Bảng thanh toán tiền lương', [['Bộ phận bán hàng', fmt(sell)], ['Bộ phận quản lý', fmt(admin)], ['Cộng', fmt(total)], ['Hình thức trả', 'Chuyển khoản']])],
    hint: 'Ghi chi phí theo bộ phận (641, 642) đối ứng phải trả người lao động, rồi trả lương.',
    explanation: `Lương bán hàng vào 641, lương quản lý vào 642, ghi Có 334. Khi trả: Nợ 334 / Có 112. Ghi thẳng Có 112 không qua 334 cũng được chấm đúng vì số dư cuối cùng như nhau; ghi qua 334 thì sổ ghi rõ hơn thời điểm phát sinh nghĩa vụ.`,
    entries: [
      { memo: 'Tính lương', lines: [L.dr('641', sell), L.dr('642', admin), L.cr('334', total)] },
      { memo: 'Trả lương', lines: [L.dr('334', total), L.cr('112', total)] },
    ],
  });
}

const sell = (id, date, item, qty, collect, customer, title, narrative, explanation, extra = {}) =>
  sale({
    id, date, item, qty, collect, customer, title, narrative, explanation,
    speaker: N, price: ITEMS[item].price, unitCost: ITEMS[item].cost, itemName: ITEMS[item].name, unit: ITEMS[item].unit,
    sellerName: CO, buyerName: customer ? P[customer] : 'Khách lẻ', ...extra,
  });

const buy = (o) => purchase({ buyerName: CO, ...o });

// ================= THÁNG 1 =================
const m1 = [];
const push = (arr, e) => { if (e) { arr.push(e); all.push(e); } };
push(m1, buy({
  id: 'h1-m01-mua-ao-thun', date: '2026-01-05', speaker: N, title: 'Mua 1.000 áo thun, chưa trả tiền',
  narrative: 'Bé Na nhập kho 1.000 áo thun cotton của Xưởng May Chỉ Hồng, đơn giá 60.000. Hai bên thỏa thuận trả chậm 30 ngày.',
  sellerName: P['chi-hong'], supplier: 'chi-hong', pay: 'credit', debitTo: '156', detail: { item: 'ao-thun' },
  lines: [{ name: 'Áo thun cotton', qty: 1000, price: 60_000, unit: 'cái' }],
  hint: 'Hàng về kho làm tăng hàng hóa; thuế GTGT đầu vào được khấu trừ; chưa trả tiền thì phát sinh nợ phải trả.',
  explanation: `Nợ 156 (áo thun) 60.000.000, Nợ 1331 4.800.000 / Có 331 (Chỉ Hồng) 64.800.000. Thuế suất ${vatPct} vì hàng may mặc thuộc nhóm 10% đang được giảm. Hóa đơn trên ${fmt(NONCASH_THRESHOLD)} nên khi trả phải chuyển khoản mới giữ được quyền khấu trừ.`,
}));
push(m1, vatPay('h1-m01-nop-gtgt-t12', '2026-01-10', 'tháng 12/2025'));
push(m1, sell('h1-m01-ban-ao-xinh', '2026-01-15', 'ao-thun', 600, 'bank', null, 'Bán 600 áo thun thu chuyển khoản',
  'Một khách sỉ mới mua 600 áo thun, giá 100.000/cái, chuyển khoản ngay. Bé Na đã xuất kho.',
  'Doanh thu 60.000.000 và thuế đầu ra 4.800.000 ghi Có, tiền gửi tăng 64.800.000. Giá vốn 600 × 60.000 = 36.000.000: Nợ 632 / Có 156. Doanh thu và giá vốn vào KQKD; tồn kho trên CĐKT giảm.'));
push(m1, sell('h1-m01-ban-chiu-co-ba', '2026-01-20', 'quan-kaki', 300, 'credit', 'co-ba', 'Bán chịu 300 quần kaki cho Tạp hóa Cô Ba',
  'Tạp hóa Cô Ba lấy 300 quần kaki, giá 240.000/cái, hẹn 45 ngày trả.',
  'Nợ 131 (Cô Ba) 77.760.000 / Có 5111 72.000.000, Có 33311 5.760.000. Giá vốn 300 × 150.000 = 45.000.000. Bán chịu vẫn ghi doanh thu ngay khi giao hàng; tiền chưa về nên LCTT chưa có gì.'));
push(m1, simple({
  id: 'h1-m01-ao-xinh-tra-no', date: '2026-01-25', speaker: N, title: 'Shop Áo Xinh trả nợ cũ',
  narrative: 'Shop Áo Xinh chuyển khoản trả hết khoản nợ 40.000.000 còn từ năm trước.',
  documents: [doc('Giấy báo Có ngân hàng', [['Người chuyển', P['ao-xinh']], ['Nội dung', 'Thanh toán công nợ 2025'], ['Số tiền', fmt(40_000_000)]])],
  hint: 'Thu nợ: tiền tăng, phải thu giảm. Doanh thu không đổi.',
  explanation: 'Nợ 112 / Có 131 (Áo Xinh) 40.000.000. Doanh thu đã ghi từ năm trước nên KQKD không đổi; LCTT có thêm "tiền thu từ bán hàng". Đây là chỗ đầu tiên thấy lãi và tiền lệch nhau theo thời điểm.',
  entries: [[L.dr('112', 40_000_000), L.cr('131', 40_000_000, { partner: 'ao-xinh' })]],
}));
push(m1, salary('h1-m01-luong', '2026-01-31', 'tháng 1'));
push(m1, vatOffset('h1-m01-khau-tru', '2026-01-31', 'tháng 1'));

// ================= THÁNG 2 =================
const m2 = [];
push(m2, buy({
  id: 'h1-m02-mua-quan', date: '2026-02-03', speaker: N, title: 'Mua 400 quần kaki, trả ngay bằng chuyển khoản',
  narrative: 'Nhập thêm 400 quần kaki của Xưởng May Chỉ Hồng, đơn giá 150.000, chuyển khoản luôn.',
  sellerName: P['chi-hong'], supplier: 'chi-hong', pay: 'bank', debitTo: '156', detail: { item: 'quan-kaki' },
  lines: [{ name: 'Quần kaki', qty: 400, price: 150_000, unit: 'cái' }],
  explanation: 'Nợ 156 (quần kaki) 60.000.000, Nợ 1331 4.800.000 / Có 112 64.800.000. Nếu ghi qua 331 rồi trả ngay thì vector số dư vẫn như vậy, vẫn được chấm đúng.',
}));
push(m2, simple({
  id: 'h1-m02-tra-chi-hong', date: '2026-02-10', speaker: M, title: 'Trả hết nợ Xưởng May Chỉ Hồng',
  narrative: 'Bà Mây duyệt chi trả Xưởng May Chỉ Hồng toàn bộ công nợ: 90.000.000 nợ cũ và 64.800.000 lô áo thun tháng 1.',
  documents: [doc('Ủy nhiệm chi', [['Người nhận', P['chi-hong']], ['Nợ năm 2025', fmt(90_000_000)], ['Hóa đơn tháng 1/2026', fmt(64_800_000)], ['Tổng', fmt(154_800_000)]])],
  hint: 'Trả nợ: phải trả giảm, tiền giảm. Không có chi phí mới.',
  explanation: 'Nợ 331 (Chỉ Hồng) 154.800.000 / Có 112. Lô áo thun tháng 1 trên 5 triệu đã được trả bằng chuyển khoản nên thuế đầu vào được giữ quyền khấu trừ.',
  entries: [[L.dr('331', 154_800_000, { partner: 'chi-hong' }), L.cr('112', 154_800_000)]],
}));
push(m2, sell('h1-m02-ban-chiu-ao-xinh', '2026-02-14', 'ao-thun', 800, 'credit', 'ao-xinh', 'Bán chịu 800 áo thun cho Shop Áo Xinh',
  'Dịp Valentine, Shop Áo Xinh đặt 800 áo thun, giá 100.000, công nợ 60 ngày.',
  'Nợ 131 (Áo Xinh) 86.400.000 / Có 5111 80.000.000, Có 33311 6.400.000; giá vốn 48.000.000. Để ý: phải thu bắt đầu phình theo doanh số bán chịu.'));
push(m2, vatPay('h1-m02-nop-gtgt-t1', '2026-02-20', 'tháng 1'));
push(m2, buy({
  id: 'h1-m02-sua-may-lanh', date: '2026-02-25', speaker: N, title: 'Sửa máy lạnh văn phòng, trả tiền mặt',
  narrative: 'Thợ sửa máy lạnh văn phòng, hóa đơn 2.000.000 chưa thuế. Bé Na trả bằng tiền mặt.',
  sellerName: 'Cơ sở Điện Lạnh Gió Mát', pay: 'cash', debitTo: '642',
  lines: [{ name: 'Dịch vụ sửa chữa máy lạnh', qty: 1, price: 2_000_000, unit: 'lần' }],
  hint: `So tổng thanh toán với ngưỡng ${fmt(NONCASH_THRESHOLD)} trước khi quyết định có ghi thuế được khấu trừ hay không.`,
  explanation: `Tổng thanh toán ${fmt(2_160_000)} dưới ngưỡng ${fmt(NONCASH_THRESHOLD)} nên trả tiền mặt vẫn được khấu trừ: Nợ 642 2.000.000, Nợ 1331 160.000 / Có 111 2.160.000. Rule áp dụng: hóa đơn từ ngưỡng trở lên mới bắt buộc chứng từ thanh toán không dùng tiền mặt.`,
}));
push(m2, salary('h1-m02-luong', '2026-02-28', 'tháng 2'));
push(m2, vatOffset('h1-m02-khau-tru', '2026-02-28', 'tháng 2'));

// ================= THÁNG 3 =================
const m3 = [];
push(m3, simple({
  id: 'h1-m03-co-ba-tra', date: '2026-03-05', speaker: N, title: 'Tạp hóa Cô Ba trả hết nợ',
  narrative: 'Tạp hóa Cô Ba chuyển khoản 97.760.000: gồm 20.000.000 nợ cũ và 77.760.000 lô quần tháng 1.',
  documents: [doc('Giấy báo Có ngân hàng', [['Người chuyển', P['co-ba']], ['Số tiền', fmt(97_760_000)]])],
  explanation: 'Nợ 112 / Có 131 (Cô Ba) 97.760.000. Phải thu của Cô Ba về 0.',
  entries: [[L.dr('112', 97_760_000), L.cr('131', 97_760_000, { partner: 'co-ba' })]],
}));
push(m3, sell('h1-m03-ban-le', '2026-03-10', 'quan-kaki', 200, 'cash', null, 'Bán lẻ 200 quần kaki thu tiền mặt',
  'Hội chợ cuối tuần bán được 200 quần kaki, giá 240.000, thu tiền mặt.',
  'Nợ 111 51.840.000 / Có 5111 48.000.000, Có 33311 3.840.000; giá vốn 30.000.000. Thu tiền mặt khi bán hàng không bị giới hạn bởi rule 5 triệu; rule đó chỉ áp cho hóa đơn đầu vào.'));
push(m3, simple({
  id: 'h1-m03-nop-tien', date: '2026-03-15', speaker: N, title: 'Nộp tiền mặt vào ngân hàng',
  narrative: 'Quỹ tiền mặt nhiều quá, Bé Na mang 50.000.000 nộp vào tài khoản ngân hàng.',
  documents: [doc('Giấy nộp tiền', [['Số tiền', fmt(50_000_000)]])],
  hint: 'Chuyển tiền từ túi này sang túi khác của chính công ty.',
  explanation: 'Nợ 112 / Có 111 50.000.000. Tổng tiền không đổi nên LCTT không có dòng nào; CĐKT dòng "Tiền" cũng không đổi.',
  entries: [[L.dr('112', 50_000_000), L.cr('111', 50_000_000)]],
}));
push(m3, vatPay('h1-m03-nop-gtgt-t2', '2026-03-20', 'tháng 2'));
push(m3, simple({
  id: 'h1-m03-nop-tndn-2025', date: '2026-03-25', speaker: T, title: 'Nộp thuế TNDN còn thiếu của năm 2025',
  narrative: 'Quyết toán thuế TNDN năm 2025 xong, công ty còn phải nộp 4.000.000 (đã treo trên TK 3334 từ đầu năm). Nộp bằng chuyển khoản.',
  documents: [doc('Giấy nộp tiền vào ngân sách', [['Nội dung', 'Thuế TNDN năm 2025 còn phải nộp'], ['Số tiền', fmt(4_000_000)]])],
  hint: 'Chi phí thuế đã ghi vào năm 2025; năm nay chỉ trả nợ.',
  explanation: 'Nợ 3334 / Có 112 4.000.000. KQKD 2026 không đổi; LCTT dòng "Thuế TNDN đã nộp".',
  entries: [[L.dr('3334', 4_000_000), L.cr('112', 4_000_000)]],
}));
push(m3, salary('h1-m03-luong', '2026-03-31', 'tháng 3'));
push(m3, vatOffset('h1-m03-khau-tru', '2026-03-31', 'tháng 3'));

export const ho1 = { DIR, CO, T, M, N, ITEMS, P, opening, all, push, bal, vatOffset, vatPay, salary, sell, buy, months: { m1, m2, m3 } };

// Các tháng 4–12 nằm ở file riêng (thêm ở M2).
const extra = await import('./build-ho-so-1-rest.mjs').catch((e) => {
  if (e.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw e;
});

const OPEN_BASE = ['111', '112', '131', '1331', '1388', '156', '331', '33311', '3334', '334', '3388', '4111', '4211', '5111', '5113', '632', '641', '642', '711'];
const months = [
  { id: 'month-01', label: 'Tháng 1', events: m1, open: OPEN_BASE, intro: [
    { speaker: M, text: 'Chào em! Chị là Mây, giám đốc Sợi Mây. Kế toán cũ nghỉ, để lại sổ sách cho em đó.' },
    { speaker: T, text: 'Chú là Tư, kế toán trưởng làm bán thời gian. Mỗi nghiệp vụ em chọn tài khoản, ghi Nợ/Có, chú xem báo cáo thay đổi ra sao.' },
    { speaker: T, text: 'Nhớ là ghi theo kiểu nào cũng được, miễn số dư cuối cùng đúng. Công ty kê khai GTGT theo tháng.' },
  ] },
  { id: 'month-02', label: 'Tháng 2', events: m2, open: OPEN_BASE, intro: [
    { speaker: N, text: 'Tháng này Tết xong là đông khách lắm anh/chị ơi, Valentine nữa!' },
    { speaker: T, text: `Để ý hóa đơn nào từ ${fmt(NONCASH_THRESHOLD)} trở lên mà trả tiền mặt nhé.` },
  ] },
  { id: 'month-03', label: 'Tháng 3', events: m3, open: OPEN_BASE, intro: [
    { speaker: T, text: 'Tháng 3 có quyết toán thuế năm cũ. Thuế TNDN năm ngoái còn nợ 4 triệu, nằm sẵn trên TK 3334.' },
  ] },
];
if (extra) months.push(...extra.months(ho1, OPEN_BASE));

for (const m of months) {
  writeJson(`${DIR}/${m.id}.json`, { id: m.id, label: m.label, intro: m.intro, outro: m.outro ?? [], events: m.events });
}

writeJson(`${DIR}/opening.json`, opening);
writeJson(`${DIR}/case.json`, {
  id: 'ho-so-1',
  order: 1,
  title: 'Hồ sơ 1 — Thương mại',
  type: 'Thương mại',
  company: {
    name: CO,
    description: 'Bán sỉ và lẻ quần áo may sẵn. Năm hoạt động thứ hai, doanh thu năm 2025 là 750 triệu đồng.',
    taxNote: 'Hàng may mặc: nhóm 10% đang được giảm thuế GTGT.',
  },
  fiscalYear: 2026,
  regulationNote: 'Quy định áp dụng tại 30/10/2026',
  characters: [
    { id: T, name: 'Chú Tư Sổ', role: 'Kế toán trưởng (hướng dẫn)', color: '#7ec4cf', mentor: true },
    { id: M, name: 'Bà Lò Thị Mây', role: 'Giám đốc', color: '#e58fb1' },
    { id: N, name: 'Bé Na', role: 'Bán hàng kiêm thủ kho', color: '#f6c85f' },
  ],
  partners: [
    { id: 'ao-xinh', name: P['ao-xinh'], kind: 'customer' },
    { id: 'co-ba', name: P['co-ba'], kind: 'customer' },
    { id: 'chi-hong', name: P['chi-hong'], kind: 'supplier' },
    { id: 'lua-trang', name: P['lua-trang'], kind: 'supplier' },
    { id: 'hat-lua', name: P['hat-lua'], kind: 'lender', term: 'short' },
    { id: 'be-na', name: P['be-na'], kind: 'employee' },
  ],
  items: Object.entries(ITEMS).map(([id, x]) => ({ id, name: x.name, unit: x.unit })),
  segments: [],
  detailAccounts: { '131': ['partner'], '331': ['partner'], '141': ['partner'], '3411': ['partner'], '156': ['item'] },
  months: months.map((m) => ({ id: m.id, label: m.label, openAccounts: m.open })),
  tiers: extra ? extra.tiers : { tier2: false, tier3a: false, tier3b: false },
  reportTemplate: 'temp-simplified',
  intro: [{ speaker: T, text: 'Hồ sơ 1: công ty thương mại nhỏ. Mục tiêu: hiểu phương trình kế toán và ba báo cáo nối nhau.' }],
});
console.log('Hồ sơ 1:', months.length, 'tháng,', all.length, 'nghiệp vụ');
