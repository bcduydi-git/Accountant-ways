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
