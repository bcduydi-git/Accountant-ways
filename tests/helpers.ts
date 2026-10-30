import { expect } from 'vitest';
import { buildContext } from '../src/engine/coa';
import { Ledger } from '../src/engine/ledger';
import { computeReports } from '../src/engine/reports';
import type { EngineContext, EntryInput } from '../src/engine/types';
import { loadCoa, loadTemplate } from '../src/data/registry';

export function testContext(terms: Record<string, 'short' | 'long'> = {}): EngineContext {
  return buildContext(loadCoa(), loadTemplate('temp-simplified'), terms);
}

export function ledgerWithOpening(ctx: EngineContext, lines: EntryInput['lines']): Ledger {
  const l = new Ledger(ctx);
  l.post({ date: '2026-01-01', kind: 'opening', lines });
  return l;
}

/** Kiểm tra toàn bộ bất biến SPEC 5.6 (phần áp dụng được ở mọi thời điểm). */
export function expectInvariants(ledger: Ledger, label = '') {
  const ctx = ledger.ctx;
  for (const e of ledger.entries) {
    const dr = e.lines.reduce((s, l) => s + l.debit, 0);
    const cr = e.lines.reduce((s, l) => s + l.credit, 0);
    expect(dr, `${label} bút toán ${e.id} cân Nợ/Có`).toBe(cr);
  }
  const r = computeReports(ctx, ledger.entries);
  expect(r.totals.totalAssets, `${label} CĐKT cân`).toBe(r.totals.totalSources);
  expect(r.totals.cashOpening + r.totals.netCashFlow, `${label} LCTT: tiền đầu kỳ + lưu chuyển thuần = tiền cuối kỳ`).toBe(
    r.totals.cashClosing,
  );
  const bsCash = r.balanceSheet.find((l) => l.code === '110')!.value;
  expect(bsCash, `${label} tiền trên CĐKT = tiền cuối kỳ LCTT`).toBe(r.totals.cashClosing);
  expect(r.totals.cfoIndirect, `${label} LCTT gián tiếp = trực tiếp (HĐKD)`).toBe(r.totals.cfoDirect);
  return r;
}
