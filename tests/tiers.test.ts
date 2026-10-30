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

describe('Hồ sơ 3 — bên liên quan, giảm trừ, phân loại lại', () => {
  const rt3 = new CaseRuntime(loadCase('ho-so-3'));
  it('hàng bán bị trả lại ghi Nợ thẳng 5111 bị chặn bởi quy tắc bản chất', () => {
    const l = rt3.canonicalLedger('h3-m06-ban-tm');
    const ev = rt3.events.find((r) => r.event.id === 'h3-m06-hang-tra-lai')!.event;
    const wrong = [
      { lines: [{ account: '5111', debit: 40_000_000, segment: 'tm' }, { account: '33311', debit: 3_200_000 }, { account: '131', credit: 43_200_000, partner: 'nha-xinh' }] },
      { lines: [{ account: '156', debit: 30_000_000, item: 'khan-ban' }, { account: '632', credit: 30_000_000, segment: 'tm' }] },
    ];
    const r = rt3.score(ev, l, wrong);
    expect(r.correct).toBe(false);
    expect(rt3.score(ev, l, rt3.resolveAnswers(ev, l)[0]!).correct).toBe(true);
  });
  it('sai mảng (SX thay vì TM) bị chấm sai', () => {
    const l = rt3.canonicalLedger('h3-m01-ban-sx');
    const ev = rt3.events.find((r) => r.event.id === 'h3-m01-ban-tm')!.event;
    const ans = rt3.resolveAnswers(ev, l)[0]!.map((e) => ({ lines: e.lines.map((x) => (x.segment ? { ...x, segment: 'sx' } : x)) }));
    expect(rt3.score(ev, l, ans).correct).toBe(false);
  });
  it('Tầng 3b có phân loại lại khoản cho bên liên quan vay; Tầng 2 có bất thường bên liên quan và tờ khai GTGT', () => {
    expect(rt3.bundle.adjustments!.items.map((i) => i.category)).toContain('related-loan-reclass');
    const pats = rt3.bundle.anomalies!.anomalies.map((a) => a.pattern);
    expect(pats).toContain('phải thu/phải trả bên liên quan lớn');
    expect(pats).toContain('đối chiếu BCTC với tờ khai thuế');
    expect(rt3.meta.partners.filter((p) => p.relatedParty).length).toBeGreaterThanOrEqual(2);
  });
});

describe('KQKD theo mảng', () => {
  it('tổng các mảng + chưa phân bổ = KQKD toàn công ty', async () => {
    const { incomeStatementBySegment } = await import('../src/engine/reports');
    const rt3 = new CaseRuntime(loadCase('ho-so-3'));
    const l = rt3.canonicalLedger();
    const r = incomeStatementBySegment(rt3.ctx, l.entries, ['sx', 'tm']);
    for (const line of r.total) {
      const sum = r.cols.reduce((s, c) => s + c.lines.find((x) => x.code === line.code)!.value, 0) + r.unallocated.find((x) => x.code === line.code)!.value;
      expect(sum, line.code).toBe(line.value);
    }
    expect(r.cols[0]!.lines.find((x) => x.code === '01')!.value).toBeGreaterThan(0);
    expect(r.cols[1]!.lines.find((x) => x.code === '02')!.value).toBe(40_000_000);
  });
});
