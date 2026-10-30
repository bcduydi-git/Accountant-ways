// Công cụ soạn kịch bản: sinh file JSON trong data/cases từ mô tả gọn.
// File JSON sinh ra mới là dữ liệu game; script chỉ giúp tránh sai số học khi soạn.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const vatRule = JSON.parse(readFileSync(join(ROOT, 'data/rules/vat-reduction-8.json'), 'utf8'));
const noncash = JSON.parse(readFileSync(join(ROOT, 'data/rules/vat-input-noncash-threshold.json'), 'utf8'));

/** Thuế suất lấy từ data/rules — script không tự ghi con số pháp lý. */
export const VAT_RULE = vatRule.id;
export const vat = (base) => Math.round(base * vatRule.params.reducedRate);
export const vatPct = `${Math.round(vatRule.params.reducedRate * 100)}%`;
export const NONCASH_THRESHOLD = noncash.params.thresholdVND;

export const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function writeJson(rel, data) {
  const p = join(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

export const L = {
  dr: (account, amount, extra = {}) => ({ account, debit: amount, ...extra }),
  cr: (account, amount, extra = {}) => ({ account, credit: amount, ...extra }),
};

export function invoiceDoc({ seller, buyer, lines, payment, kind = 'Hóa đơn GTGT' }) {
  const base = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const tax = vat(base);
  const rows = lines.map((l) => [`${l.name} — ${fmt(l.qty)} ${l.unit ?? ''} × ${fmt(l.price)}`.replace('  ', ' '), fmt(l.qty * l.price)]);
  rows.push(['Cộng tiền hàng, dịch vụ', fmt(base)]);
  rows.push([`Thuế GTGT (${vatPct})`, fmt(tax)]);
  rows.push(['Tổng cộng thanh toán', fmt(base + tax)]);
  if (payment) rows.push(['Hình thức thanh toán', payment]);
  return { kind, title: `${seller} → ${buyer}`, rows };
}

export function doc(kind, rows, title) {
  return title ? { kind, title, rows } : { kind, rows };
}

const PAY_TEXT = { cash: 'Tiền mặt', bank: 'Chuyển khoản', credit: 'Mua chịu — thanh toán sau' };
const CASH_ACC = { cash: '111', bank: '112' };

/**
 * Mua hàng/dịch vụ có hóa đơn GTGT.
 * debitTo: TK ghi Nợ phần giá trị (156, 152, 641, 642...), detail: { item } nếu cần.
 */
export function purchase(o) {
  const base = o.lines.reduce((s, l) => s + l.qty * l.price, 0);
  const tax = vat(base);
  const total = base + tax;
  const deductible = !(o.pay === 'cash' && total >= NONCASH_THRESHOLD);
  const credit = o.pay === 'credit' ? L.cr('331', total, { partner: o.supplier }) : L.cr(CASH_ACC[o.pay], total);
  const debits = [];
  if (o.split) for (const s of o.split) debits.push(L.dr(s.account, s.amount, s.detail ?? {}));
  else debits.push(L.dr(o.debitTo, deductible ? base : total, o.detail ?? {}));
  if (o.split && !deductible) throw new Error('split + không khấu trừ chưa hỗ trợ');
  if (deductible) debits.push(L.dr('1331', tax));
  return {
    id: o.id,
    date: o.date,
    title: o.title,
    speaker: o.speaker,
    narrative: o.narrative,
    documents: [invoiceDoc({ seller: o.sellerName, buyer: o.buyerName, lines: o.lines, payment: PAY_TEXT[o.pay] }), ...(o.extraDocs ?? [])],
    hint: o.hint,
    explanation: o.explanation,
    attrs: { invoice: { totalInclVAT: total, paymentMethod: o.pay }, vat: { base, ruleId: VAT_RULE } },
    answer: { entries: [{ lines: [...debits, credit] }] },
    ...(o.alternativeAnswers ? { alternativeAnswers: o.alternativeAnswers } : {}),
    ...(o.unusual ? { unusual: true } : {}),
  };
}

/** Bán hàng có hóa đơn GTGT + ghi giá vốn. */
export function sale(o) {
  const base = o.qty * o.price;
  const tax = vat(base);
  const total = base + tax;
  const debit = o.collect === 'credit' ? L.dr('131', total, { partner: o.customer }) : L.dr(CASH_ACC[o.collect], total);
  const rev = o.revenueAccount ?? '5111';
  const seg = o.segment ? { segment: o.segment } : {};
  const cogs = o.qty * o.unitCost;
  const entries = [
    { memo: 'Doanh thu và thuế GTGT đầu ra', lines: [debit, L.cr(rev, base, seg), L.cr('33311', tax)] },
    { memo: 'Giá vốn hàng bán', lines: [L.dr('632', cogs, seg), L.cr(o.inventoryAccount ?? '156', cogs, { item: o.item })] },
  ];
  return {
    id: o.id,
    date: o.date,
    title: o.title,
    speaker: o.speaker,
    narrative: o.narrative,
    documents: [
      invoiceDoc({ seller: o.sellerName, buyer: o.buyerName, lines: [{ name: o.itemName, qty: o.qty, price: o.price, unit: o.unit }], payment: PAY_TEXT[o.collect] }),
      doc('Phiếu xuất kho', [[`${o.itemName} — ${fmt(o.qty)} ${o.unit ?? ''} × giá vốn ${fmt(o.unitCost)}`, fmt(cogs)]]),
    ],
    hint: o.hint ?? 'Hai bút toán: ghi nhận doanh thu cùng thuế GTGT đầu ra, rồi ghi giá vốn cho hàng xuất kho.',
    explanation: o.explanation,
    attrs: { vat: { base, ruleId: VAT_RULE } },
    answer: { entries },
  };
}

export function simple(o) {
  return {
    id: o.id,
    date: o.date,
    title: o.title,
    ...(o.kind ? { kind: o.kind } : {}),
    speaker: o.speaker,
    narrative: o.narrative,
    documents: o.documents ?? [],
    ...(o.hint ? { hint: o.hint } : {}),
    explanation: o.explanation,
    attrs: o.attrs ?? {},
    answer: o.answer ?? { entries: o.entries.map((lines) => (Array.isArray(lines) ? { lines } : lines)) },
    ...(o.alternativeAnswers ? { alternativeAnswers: o.alternativeAnswers } : {}),
    ...(o.substance ? { substance: o.substance } : {}),
    ...(o.unusual ? { unusual: true } : {}),
  };
}

export const monthLabel = (m) => `Tháng ${m}`;

/** Bộ theo dõi GTGT: khấu trừ cuối tháng, nộp số còn phải nộp của tháng trước. */
export function makeVat({ opening, all, speaker, inputAcc = '1331', outputAcc = '33311' }) {
  const bal = (acc) =>
    [...opening.balances, ...all.flatMap((e) => ('entries' in e.answer ? e.answer.entries.flatMap((x) => x.lines) : []))]
      .filter((l) => l.account === acc)
      .reduce((s, l) => s + (typeof l.debit === 'number' ? l.debit : 0) - (typeof l.credit === 'number' ? l.credit : 0), 0);
  let pending = -opening.balances.filter((l) => l.account === outputAcc).reduce((s, l) => s + (l.debit ?? 0) - (l.credit ?? 0), 0);
  return {
    bal,
    offset(id, date, monthText) {
      const input = bal(inputAcc);
      const output = -bal(outputAcc);
      const amt = Math.max(0, Math.min(input, output));
      pending = output - amt;
      if (amt <= 0) return null;
      return simple({
        id, date, speaker, title: `Khấu trừ thuế GTGT ${monthText}`,
        narrative: `Lập tờ khai GTGT ${monthText}: thuế đầu vào được khấu trừ ${fmt(input)}, thuế đầu ra ${fmt(output)}. Bù trừ phần được khấu trừ.`,
        documents: [doc('Bảng kê thuế GTGT', [['Thuế GTGT đầu vào được khấu trừ', fmt(input)], ['Thuế GTGT đầu ra', fmt(output)], ['Số khấu trừ trong kỳ', fmt(amt)], [output > input ? 'Còn phải nộp' : 'Chuyển kỳ sau', fmt(Math.abs(output - input))]])],
        hint: 'Nợ thuế GTGT đầu ra / Có thuế GTGT được khấu trừ, với số nhỏ hơn trong hai số dư.',
        explanation: `Nợ ${outputAcc} / Có ${inputAcc} ${fmt(amt)}.${output > input ? ` Còn phải nộp ${fmt(output - input)}, nộp vào tháng sau.` : ` Đầu vào còn ${fmt(input - output)} chuyển kỳ sau.`}`,
        entries: [[L.dr(outputAcc, amt), L.cr(inputAcc, amt)]],
      });
    },
    pay(id, date, monthText) {
      const due = pending;
      pending = 0;
      if (due <= 0) return null;
      return simple({
        id, date, speaker, title: `Nộp thuế GTGT ${monthText}`,
        narrative: `Nộp thuế GTGT còn phải nộp của ${monthText}: ${fmt(due)}, chuyển khoản.`,
        documents: [doc('Giấy nộp tiền vào ngân sách', [['Nội dung', `Thuế GTGT ${monthText}`], ['Số tiền', fmt(due)]])],
        explanation: `Nợ ${outputAcc} / Có 112 ${fmt(due)}. Không ảnh hưởng KQKD.`,
        entries: [[L.dr(outputAcc, due), L.cr('112', due)]],
      });
    },
  };
}
