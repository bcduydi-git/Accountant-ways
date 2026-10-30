import { it } from 'vitest';
import { computeReports } from '../../src/engine/reports';
import { loadCase } from '../../src/data/registry';
import { CaseRuntime } from '../../src/game/case-runtime';

// Công cụ xem nhanh số liệu kịch bản: INSPECT=ho-so-1 npx vitest run tests/tools
const id = process.env.INSPECT;
it.skipIf(!id)('in số liệu kịch bản', () => {
  const rt = new CaseRuntime(loadCase(id!));
  const l = rt.canonicalLedger();
  const r = computeReports(rt.ctx, l.entries);
  const show = (xs: { code: string; label: string; value: number }[]) => xs.forEach((x) => console.log(x.code.padEnd(4), x.label.padEnd(60), x.value.toLocaleString('vi-VN')));
  show(r.incomeStatement);
  console.log(JSON.stringify(rt.reconciliation(l), null, 1));
  show(r.balanceSheet);
  show(r.cashFlowDirect);
  show(r.cashFlowIndirect);
  const t2 = computeReports(rt.ctx, rt.tier2Ledger().entries);
  console.log('--- Tầng 2 ---');
  show(t2.balanceSheet.filter((x) => ['131', '137', '141', '221', '320', '270'].includes(x.code)));
  show(t2.cashFlowDirect.filter((x) => ['20', '30', '40'].includes(x.code)));
});
