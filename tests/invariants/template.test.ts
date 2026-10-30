import { describe, expect, it } from 'vitest';
import { cashMappingFor, isCash, isProfitAndLoss } from '../../src/engine/coa';
import { testContext } from '../helpers';

const ctx = testContext();
const t = ctx.template;

describe('Mẫu báo cáo phủ đủ danh mục TK', () => {
  const postable = [...ctx.postable];

  it('mọi TK loại 1–4 được gán vào CĐKT đúng một lần (TK lưỡng tính tách đủ hai bên)', () => {
    for (const acc of postable.filter((a) => !isProfitAndLoss(ctx, a))) {
      const hits = t.balanceSheet.lines.flatMap((l) => (l.src ?? []).filter((s) => acc.startsWith(s.prefix)).map((s) => ({ line: l, s })));
      const plain = hits.filter((h) => !h.s.split && !h.s.term);
      const split = hits.filter((h) => h.s.split);
      const term = hits.filter((h) => h.s.term);
      const ok =
        (plain.length === 1 && split.length === 0 && term.length === 0) ||
        (plain.length === 0 && term.length === 0 && split.length === 2 && new Set(split.map((h) => h.line.nature)).size === 2) ||
        (plain.length === 0 && split.length === 0 && term.length === 2 && new Set(term.map((h) => h.s.term)).size === 2);
      expect(ok, `TK ${acc}`).toBe(true);
    }
  });

  it('TK loại 5–9 chưa kết chuyển nằm trong dòng LNST chưa phân phối', () => {
    for (const acc of postable.filter((a) => isProfitAndLoss(ctx, a))) {
      const hits = t.balanceSheet.lines.filter((l) => l.src?.some((s) => acc.startsWith(s.prefix)));
      expect(hits.length, `TK ${acc}`).toBe(1);
    }
  });

  it('mọi TK doanh thu, chi phí (trừ 621/622/627 và 911) vào KQKD đúng một lần', () => {
    const prod = t.incomeStatement.productionAccounts ?? [];
    for (const acc of postable.filter((a) => isProfitAndLoss(ctx, a))) {
      if (acc === t.config.closingAccount || prod.some((p) => acc.startsWith(p))) continue;
      const hits = t.incomeStatement.lines.filter((l) => l.src?.some((s) => acc.startsWith(s.prefix)));
      expect(hits.length, `TK ${acc}`).toBe(1);
    }
  });

  it('mọi TK (trừ tiền và 911) có mapping dòng tiền', () => {
    for (const acc of postable) {
      if (isCash(ctx, acc) || acc === t.config.closingAccount) continue;
      expect(cashMappingFor(ctx, acc), `TK ${acc}`).toBeDefined();
    }
  });

  it('mẫu tạm có nhãn "Mẫu tạm"', () => {
    expect(t.status).toBe('temp');
    expect(t.label).toBe('Mẫu tạm');
  });
});
