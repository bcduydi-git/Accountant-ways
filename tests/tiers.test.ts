import { describe, expect, it } from 'vitest';
import { loadCase } from '../src/data/registry';
import { CaseRuntime } from '../src/game/case-runtime';
import { lineKey, scoreFinding, scoreReconciliation } from '../src/game/tiers';

const rt = new CaseRuntime(loadCase('ho-so-1'));
const an = rt.bundle.anomalies!;

describe('Tầng 2 — chấm bất thường', () => {
  it('đủ 3–5 bất thường, mỗi bất thường chấm được đủ điểm', () => {
    expect(an.anomalies.length).toBeGreaterThanOrEqual(3);
    const found: string[] = [];
    for (const a of an.anomalies) {
      const r = scoreFinding(an, found, { lineKey: lineKey(a.lineRefs[0]!.report, a.lineRefs[0]!.code), reports: a.reportsTouched, reasonId: a.reasonId });
      expect(r.anomalyId).toBe(a.id);
      expect(r.points).toBe(3);
      found.push(a.id);
    }
  });
  it('sai lý do, sai báo cáo bị trừ điểm; khoản mục không có bất thường được 0 điểm', () => {
    const a = an.anomalies[0]!;
    const r = scoreFinding(an, [], { lineKey: lineKey(a.lineRefs[0]!.report, a.lineRefs[0]!.code), reports: ['LCTT'], reasonId: 'r-lctt-lech' });
    expect(r).toMatchObject({ lineOk: true, reportsOk: false, reasonOk: false, points: 1 });
    expect(scoreFinding(an, [], { lineKey: 'CĐKT:411', reports: ['CĐKT'], reasonId: a.reasonId }).points).toBe(0);
  });
});

describe('Tầng 3 rút gọn — đối chiếu LN kế toán → TNCT khớp engine', () => {
  const rec = rt.reconciliation(rt.canonicalLedger());
  it('đáp án engine có dòng tiền mặt từ 5 triệu và tiền phạt', () => {
    expect(rec.lines.map((l) => l.ruleId).sort()).toEqual(['cit-admin-penalty', 'vat-input-noncash-threshold']);
    expect(rec.taxableIncome).toBe(rec.profitBeforeTax + rec.lines.reduce((s, l) => s + l.amount, 0));
  });
  it('bài làm đúng được điểm tối đa; sai một dòng bị trừ', () => {
    const ok = scoreReconciliation(rec, { lines: rec.lines.map((l) => ({ ruleId: l.ruleId, amount: l.amount })), taxableIncome: rec.taxableIncome, citExpense: rec.citExpense });
    expect(ok.points).toBe(ok.maxPoints);
    const bad = scoreReconciliation(rec, { lines: [{ ruleId: rec.lines[0]!.ruleId, amount: 1 }], taxableIncome: rec.taxableIncome, citExpense: rec.citExpense });
    expect(bad.points).toBeLessThan(ok.maxPoints);
    expect(bad.lineResults.filter((x) => !x.ok).length).toBe(2);
  });
});
