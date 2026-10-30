import { describe, expect, it } from 'vitest';
import { loadRuleRecords } from '../../src/data/registry';
import { citRate, evaluateRule, eventEffects, reconcile, RuleSet, vatAmount, type EventContext } from '../../src/tax/rules';
import type { FixedAsset } from '../../src/data/schema';

// Mỗi rule trong data/rules có ít nhất một golden test; tên test ghi căn cứ (SPEC 5.4).
const records = loadRuleRecords();
const rs = new RuleSet(records);
const covered = new Set<string>();
const basis = (id: string) => {
  covered.add(id);
  return `${id} — ${rs.get(id).basis} [${rs.get(id).status}]`;
};

const assets = new Map<string, FixedAsset>([
  ['villa', { id: 'villa', name: 'Bộ bàn ghế tại nhà riêng', account: '211', cost: 240_000_000, accumulated: 0, monthlyDepreciation: 4_000_000, usefulLifeMonths: 60, type: 'general', businessUse: false }],
  ['car', { id: 'car', name: 'Ô tô 7 chỗ', account: '211', cost: 1_920_000_000, accumulated: 0, monthlyDepreciation: 20_000_000, usefulLifeMonths: 96, type: 'passenger-car', seats: 7, businessUse: true }],
]);

const ev = (over: Partial<EventContext>): EventContext => ({
  eventId: 'x',
  date: '2026-05-22',
  attrs: {},
  lines: [],
  assets,
  uncontributedCapital: 0,
  ...over,
});

describe('Golden test rule pháp lý', () => {
  it(basis('cit-rate'), () => {
    expect(citRate(rs, 750_000_000).rate).toBe(0.15);
    expect(citRate(rs, 3_000_000_000).rate).toBe(0.15);
    expect(citRate(rs, 3_000_000_001).rate).toBe(0.17);
    expect(citRate(rs, 9_000_000_000).rate).toBe(0.17);
    expect(citRate(rs, 50_000_000_000).rate).toBe(0.17);
    expect(citRate(rs, 65_000_000_000).rate).toBe(0.2);
  });

  it(basis('vat-reduction-8'), () => {
    expect(vatAmount(rs, 'vat-reduction-8', 60_000_000, '2026-01-05')).toBe(4_800_000);
    expect(vatAmount(rs, 'vat-reduction-8', 6_000_000, '2026-12-31')).toBe(480_000);
    // Ngoài thời hạn giảm: về thuế suất phổ thông 10%
    expect(vatAmount(rs, 'vat-reduction-8', 60_000_000, '2027-01-01')).toBe(6_000_000);
  });

  it(basis('vat-input-noncash-threshold'), () => {
    const r = rs.get('vat-input-noncash-threshold');
    const lines = [{ account: '641', debit: 6_480_000 }, { account: '111', credit: 6_480_000 }];
    expect(evaluateRule(r, ev({ attrs: { invoice: { totalInclVAT: 6_480_000, paymentMethod: 'cash' } }, lines }))).toEqual({ vatNotDeductible: true, citAmount: 6_480_000 });
    // Đúng bằng ngưỡng ("từ 5 triệu trở lên") vẫn bị áp
    expect(evaluateRule(r, ev({ attrs: { invoice: { totalInclVAT: 5_000_000, paymentMethod: 'cash' } }, lines: [{ account: '642', debit: 5_000_000 }] })).vatNotDeductible).toBe(true);
    // Dưới ngưỡng hoặc chuyển khoản: không áp
    expect(evaluateRule(r, ev({ attrs: { invoice: { totalInclVAT: 4_860_000, paymentMethod: 'cash' } }, lines })).vatNotDeductible).toBe(false);
    expect(evaluateRule(r, ev({ attrs: { invoice: { totalInclVAT: 6_480_000, paymentMethod: 'bank' } }, lines })).vatNotDeductible).toBe(false);
  });

  it(basis('cit-admin-penalty'), () => {
    const r = rs.get('cit-admin-penalty');
    const lines = [{ account: '811', debit: 3_000_000 }, { account: '112', credit: 3_000_000 }];
    expect(evaluateRule(r, ev({ attrs: { expenseType: 'admin-penalty' }, lines })).citAmount).toBe(3_000_000);
    expect(evaluateRule(r, ev({ attrs: { expenseType: 'late-payment-interest' }, lines })).citAmount).toBe(3_000_000);
    expect(evaluateRule(r, ev({ attrs: {}, lines })).citAmount).toBe(0);
  });

  it(basis('cit-nonbusiness-depreciation'), () => {
    const r = rs.get('cit-nonbusiness-depreciation');
    expect(evaluateRule(r, ev({ attrs: { depreciation: [{ assetId: 'villa', amount: 4_000_000 }, { assetId: 'car', amount: 20_000_000 }] } })).citAmount).toBe(4_000_000);
  });

  it(basis('cit-passenger-car-cap'), () => {
    const r = rs.get('cit-passenger-car-cap');
    expect(rs.isEnabled(r.id)).toBe(false);
    // 20.000.000 × (1.920.000.000 − 1.600.000.000) / 1.920.000.000
    expect(evaluateRule(r, ev({ attrs: { depreciation: [{ assetId: 'car', amount: 20_000_000 }] } })).citAmount).toBe(3_333_333);
  });

  it(basis('cit-interest-uncontributed-capital'), () => {
    const r = rs.get('cit-interest-uncontributed-capital');
    expect(rs.isEnabled(r.id)).toBe(false);
    expect(evaluateRule(r, ev({ attrs: { interest: { amount: 4_000_000, principal: 480_000_000, lender: 'b' } }, uncontributedCapital: 240_000_000 })).citAmount).toBe(2_000_000);
  });

  it(basis('invoice-validity'), () => {
    const r = rs.get('invoice-validity');
    expect(rs.isEnabled(r.id)).toBe(false);
    expect(evaluateRule(r, ev({ attrs: { invoice: { totalInclVAT: 1_000_000, paymentMethod: 'bank', valid: false } }, lines: [{ account: '642', debit: 1_000_000 }] }))).toEqual({ vatNotDeductible: true, citAmount: 1_000_000 });
  });

  for (const id of ['cit-noncredit-interest-cap', 'depreciation-frame-tt45', 'provision-tt48']) {
    it(basis(id), () => {
      expect(rs.get(id).status).toBe('unverified');
      expect(rs.isEnabled(id)).toBe(false);
      expect(evaluateRule(rs.get(id), ev({})).citAmount).toBe(0);
    });
  }

  it('rule unverified mặc định tắt; bật bằng cờ debug thì phải hiện cảnh báo', () => {
    for (const r of records) expect(rs.isEnabled(r.id)).toBe(r.status !== 'unverified');
    expect(rs.warningActive).toBe(false);
    const dbg = new RuleSet(records, { enableUnverified: true });
    expect(dbg.isEnabled('cit-passenger-car-cap')).toBe(true);
    expect(dbg.warningActive).toBe(true);
  });

  it('rule tắt không sinh tác động; đối chiếu chỉ cộng rule đang bật', () => {
    const e = ev({ eventId: 'dep', attrs: { depreciation: [{ assetId: 'car', amount: 20_000_000 }, { assetId: 'villa', amount: 4_000_000 }] } });
    expect(eventEffects(rs, e).cit).toEqual([{ ruleId: 'cit-nonbusiness-depreciation', eventId: 'dep', amount: 4_000_000 }]);
    const rec = reconcile(rs, [e], 100_000_000, 750_000_000);
    expect(rec.taxableIncome).toBe(104_000_000);
    expect(rec.citExpense).toBe(15_600_000);
    expect(rec.disabledLines.map((l) => l.ruleId)).toEqual(['cit-passenger-car-cap']);
  });

  it('mọi rule trong data/rules đều có golden test', () => {
    for (const r of records) expect(covered.has(r.id), r.id).toBe(true);
  });
});
