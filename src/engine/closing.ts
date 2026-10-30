import { isProfitAndLoss } from './coa';
import { detailBalances, parseDetailKey } from './ledger';
import type { EngineContext, EntryInput, LineInput, PostedEntry } from './types';

/**
 * Sinh bút toán kết chuyển cuối năm (doanh thu, chi phí → 911 → LNST năm nay).
 * Engine KHÔNG tự gọi hàm này trong lúc chơi: người chơi tự kết chuyển (SPEC 4.1.6).
 * Hàm dùng để tạo đáp án kịch bản và bộ BCTC đã khóa sổ ở Tầng 2.
 */
export function generateClosingEntries(ctx: EngineContext, entries: readonly PostedEntry[], date: string): EntryInput[] {
  const { closingAccount, retainedEarningsCurrent } = ctx.template.config;
  const bal = detailBalances(entries);
  const credits: LineInput[] = []; // TK dư Có (doanh thu, thu nhập) → ghi Nợ để kết chuyển
  const debits: LineInput[] = []; // TK dư Nợ (chi phí) → ghi Có để kết chuyển
  let toSummary = 0;
  for (const [k, b] of [...bal.entries()].sort(([a], [z]) => a.localeCompare(z))) {
    if (b === 0) continue;
    const d = parseDetailKey(k);
    if (!isProfitAndLoss(ctx, d.account) || d.account === closingAccount) continue;
    const base: LineInput = { account: d.account };
    if (d.partner) base.partner = d.partner;
    if (d.item) base.item = d.item;
    if (d.segment) base.segment = d.segment;
    if (b < 0) credits.push({ ...base, debit: -b });
    else debits.push({ ...base, credit: b });
    toSummary += b;
  }
  const out: EntryInput[] = [];
  const revTotal = credits.reduce((s, l) => s + (l.debit ?? 0), 0);
  const expTotal = debits.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (credits.length) {
    out.push({ date, kind: 'closing', memo: 'Kết chuyển doanh thu, thu nhập', lines: [...credits, { account: closingAccount, credit: revTotal }] });
  }
  if (debits.length) {
    out.push({ date, kind: 'closing', memo: 'Kết chuyển chi phí', lines: [{ account: closingAccount, debit: expTotal }, ...debits] });
  }
  if (toSummary < 0) {
    out.push({ date, kind: 'closing', memo: 'Kết chuyển lãi', lines: [{ account: closingAccount, debit: -toSummary }, { account: retainedEarningsCurrent, credit: -toSummary }] });
  } else if (toSummary > 0) {
    out.push({ date, kind: 'closing', memo: 'Kết chuyển lỗ', lines: [{ account: retainedEarningsCurrent, debit: toSummary }, { account: closingAccount, credit: toSummary }] });
  }
  return out;
}

/** Tổng số dư các TK loại 5–9 (dùng cho test bất biến sau kết chuyển). */
export function profitAndLossResidual(ctx: EngineContext, entries: readonly PostedEntry[]) {
  const bal = detailBalances(entries);
  const nonZero: string[] = [];
  for (const [k, b] of bal) {
    const d = parseDetailKey(k);
    if (isProfitAndLoss(ctx, d.account) && b !== 0) nonZero.push(k);
  }
  return nonZero;
}
