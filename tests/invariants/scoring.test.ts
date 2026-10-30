import { describe, expect, it } from 'vitest';
import { impactVector, keySpecFrom, scoreEntries } from '../../src/engine/scoring';
import { loadSubstanceRules } from '../../src/data/registry';
import { testContext } from '../helpers';

const ctx = testContext();
const spec = keySpecFrom({ '131': ['partner'], '331': ['partner'], '156': ['item'] });
const rules = loadSubstanceRules();

const answer = [
  {
    lines: [
      { account: '156', debit: 60_000_000, item: 'ao' },
      { account: '1331', debit: 4_800_000 },
      { account: '331', credit: 64_800_000, partner: 'A' },
    ],
  },
  { lines: [{ account: '331', debit: 64_800_000, partner: 'A' }, { account: '112', credit: 64_800_000 }] },
];

describe('Chấm theo tác động số dư (SPEC 4.2)', () => {
  it('ghi thẳng tiền thay vì qua 331 vẫn đúng', () => {
    const player = [{ lines: [{ account: '156', debit: 60_000_000, item: 'ao' }, { account: '1331', debit: 4_800_000 }, { account: '112', credit: 64_800_000 }] }];
    expect(scoreEntries(ctx, player, [answer], spec, rules).correct).toBe(true);
  });

  it('tách dòng hoặc gộp dòng vẫn đúng', () => {
    const player = [
      {
        lines: [
          { account: '156', debit: 30_000_000, item: 'ao' },
          { account: '156', debit: 30_000_000, item: 'ao' },
          { account: '1331', debit: 4_800_000 },
          { account: '112', credit: 60_000_000 },
          { account: '112', credit: 4_800_000 },
        ],
      },
    ];
    expect(scoreEntries(ctx, player, [answer], spec, rules).correct).toBe(true);
  });

  it('sai mặt hàng chi tiết → sai, chỉ ra TK lệch và khoản mục chạm', () => {
    const player = [{ lines: [{ account: '156', debit: 60_000_000, item: 'quan' }, { account: '1331', debit: 4_800_000 }, { account: '112', credit: 64_800_000 }] }];
    const r = scoreEntries(ctx, player, [answer], spec, rules);
    expect(r.correct).toBe(false);
    expect(r.diffs.map((d) => d.account)).toEqual(['156', '156']);
    expect(r.explanationLines[0]).toMatch(/CĐKT 141/);
    expect(r.explanationLines[0]).toMatch(/60\.000\.000/);
  });

  it('chấp nhận alternativeAnswers', () => {
    const alt = [{ lines: [{ account: '642', debit: 5_000_000 }, { account: '112', credit: 5_000_000 }] }];
    const main = [{ lines: [{ account: '641', debit: 5_000_000 }, { account: '112', credit: 5_000_000 }] }];
    const r = scoreEntries(ctx, alt, [main, alt], spec, rules);
    expect(r.correct).toBe(true);
    expect(r.matchedAnswer).toBe(1);
  });

  it('quy tắc bản chất: không bù trừ phải thu khách A với phải trả nhà cung cấp B dù vector khớp', () => {
    const expected = [
      { lines: [{ account: '112', debit: 10_000_000 }, { account: '131', credit: 10_000_000, partner: 'A' }] },
      { lines: [{ account: '331', debit: 10_000_000, partner: 'B' }, { account: '112', credit: 10_000_000 }] },
    ];
    const player = [{ lines: [{ account: '331', debit: 10_000_000, partner: 'B' }, { account: '131', credit: 10_000_000, partner: 'A' }] }];
    expect(impactVector(player, spec)).toEqual(impactVector(expected, spec));
    const r = scoreEntries(ctx, player, [expected], spec, rules);
    expect(r.correct).toBe(false);
    expect(r.violations.map((v) => v.ruleId)).toContain('no-cross-partner-offset');
  });

  it('quy tắc bản chất theo sự kiện: không ghi doanh thu âm thay cho giảm trừ', () => {
    const expected = [{ lines: [{ account: '521', debit: 1_000_000 }, { account: '131', credit: 1_000_000, partner: 'A' }] }];
    const player = [{ lines: [{ account: '5111', debit: 1_000_000 }, { account: '131', credit: 1_000_000, partner: 'A' }] }];
    const r = scoreEntries(ctx, player, [expected], spec, rules, { eventRules: ['no-debit-revenue'] });
    expect(r.correct).toBe(false);
    expect(r.violations.map((v) => v.ruleId)).toContain('no-debit-revenue');
  });

  it('kết chuyển thẳng vào 421 không qua 911 bị chặn', () => {
    const expected = [
      { lines: [{ account: '5111', debit: 100 }, { account: '911', credit: 100 }] },
      { lines: [{ account: '911', debit: 100 }, { account: '4212', credit: 100 }] },
    ];
    const player = [{ lines: [{ account: '5111', debit: 100 }, { account: '4212', credit: 100 }] }];
    const r = scoreEntries(ctx, player, [expected], spec, rules, { isClosing: true });
    expect(r.diffs).toEqual([]);
    expect(r.correct).toBe(false);
    expect(r.violations.map((v) => v.ruleId)).toContain('closing-via-911');
  });
});
