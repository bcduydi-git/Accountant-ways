import { describe, expect, it } from 'vitest';
import { generateClosingEntries, profitAndLossResidual } from '../../src/engine/closing';
import { accountBalances, Ledger, PostingError } from '../../src/engine/ledger';
import { computeReports } from '../../src/engine/reports';
import type { EntryInput } from '../../src/engine/types';
import sample from '../../data/debug/sample-entries.json';
import { expectInvariants, ledgerWithOpening, testContext } from '../helpers';

const ctx = testContext({ 'bank-mau': 'short' });

describe('post() — cửa duy nhất ghi sổ', () => {
  const base = () => ledgerWithOpening(ctx, sample.opening);

  it('từ chối bút toán không cân', () => {
    expect(() => base().post({ date: '2026-01-02', lines: [{ account: '111', debit: 10 }, { account: '112', credit: 9 }] })).toThrow(PostingError);
  });
  it('từ chối TK không có trong danh mục', () => {
    expect(() => base().post({ date: '2026-01-02', lines: [{ account: '999', debit: 10 }, { account: '112', credit: 10 }] })).toThrow(/danh mục/);
  });
  it('từ chối TK tổng hợp có TK chi tiết', () => {
    expect(() => base().post({ date: '2026-01-02', lines: [{ account: '133', debit: 10 }, { account: '112', credit: 10 }] })).toThrow(/chi tiết/);
  });
  it('từ chối dòng ghi cả hai bên hoặc số âm, số lẻ', () => {
    expect(() => base().post({ date: '2026-01-02', lines: [{ account: '111', debit: 10, credit: 10 }, { account: '112', credit: 0 }] })).toThrow();
    expect(() => base().post({ date: '2026-01-02', lines: [{ account: '111', debit: -10 }, { account: '112', credit: -10 }] })).toThrow();
    expect(() => base().post({ date: '2026-01-02', lines: [{ account: '111', debit: 1.5 }, { account: '112', credit: 1.5 }] })).toThrow();
  });
  it('TK 911 chỉ dùng trong bút toán kết chuyển', () => {
    expect(() => base().post({ date: '2026-01-02', kind: 'normal', lines: [{ account: '911', debit: 10 }, { account: '112', credit: 10 }] })).toThrow();
    const e = base().post({ date: '2026-12-31', lines: [{ account: '911', debit: 10 }, { account: '4212', credit: 10 }] });
    expect(e.kind).toBe('closing');
  });
});

describe('M0 — 10 bút toán mẫu ra ba báo cáo cân', () => {
  it('sau từng bút toán: Nợ = Có, CĐKT cân, LCTT khớp tiền, trực tiếp = gián tiếp', () => {
    const l = ledgerWithOpening(ctx, sample.opening);
    expectInvariants(l, 'đầu kỳ');
    for (const e of sample.entries as EntryInput[]) {
      l.post(e);
      expectInvariants(l, e.memo);
    }
    expect(l.entries.length).toBe(11);
    const r = computeReports(ctx, l.entries);
    expect(r.totals.totalAssets).toBeGreaterThan(0);
    // Doanh thu 80.000.000, giá vốn 48.000.000, chi phí QLDN 13.000.000
    expect(r.incomeStatement.find((x) => x.code === '01')!.value).toBe(80_000_000);
    expect(r.totals.profitBeforeTax).toBe(80_000_000 - 48_000_000 - 13_000_000);
  });

  it('kết chuyển cuối năm: TK loại 5–9 về 0, LN trên KQKD = biến động 421', () => {
    const l = ledgerWithOpening(ctx, sample.opening);
    for (const e of sample.entries as EntryInput[]) l.post(e);
    l.post({ date: '2026-12-31', lines: [{ account: '8211', debit: 3_800_000 }, { account: '3334', credit: 3_800_000 }] });
    const before = computeReports(ctx, l.entries);
    for (const e of generateClosingEntries(ctx, l.entries, '2026-12-31')) l.post(e);
    expectInvariants(l, 'sau kết chuyển');
    expect(profitAndLossResidual(ctx, l.entries)).toEqual([]);
    const after = computeReports(ctx, l.entries);
    expect(after.totals.profitAfterTax).toBe(before.totals.profitAfterTax);
    const d421 = accountBalances(l.entries, (e) => e.kind !== 'opening');
    const delta421 = -[...d421].filter(([a]) => a.startsWith('421')).reduce((s, [, v]) => s + v, 0);
    expect(delta421).toBe(after.totals.profitAfterTax);
  });
});

describe('LCTT gián tiếp với giao dịch phi tiền tệ và chi phí sản xuất', () => {
  it('mua TSCĐ chịu, sản xuất dở dang, phân loại lại khoản cho vay — trực tiếp vẫn = gián tiếp', () => {
    const l = ledgerWithOpening(ctx, sample.opening);
    const steps: EntryInput[] = [
      { date: '2026-02-01', lines: [{ account: '211', debit: 50_000_000 }, { account: '331', credit: 50_000_000, partner: 'ncc-mau' }] },
      { date: '2026-02-02', lines: [{ account: '331', debit: 20_000_000, partner: 'ncc-mau' }, { account: '112', credit: 20_000_000 }] },
      { date: '2026-02-03', lines: [{ account: '621', debit: 30_000_000 }, { account: '156', credit: 30_000_000 }] },
      { date: '2026-02-04', lines: [{ account: '622', debit: 5_000_000 }, { account: '111', credit: 5_000_000 }] },
      { date: '2026-02-05', lines: [{ account: '131', debit: 10_000_000, partner: 'kh-mau' }, { account: '112', credit: 10_000_000 }] },
      { date: '2026-02-06', lines: [{ account: '1283', debit: 10_000_000, partner: 'kh-mau' }, { account: '131', credit: 10_000_000, partner: 'kh-mau' }] },
      { date: '2026-02-07', lines: [{ account: '811', debit: 2_000_000 }, { account: '211', credit: 2_000_000 }] },
      { date: '2026-02-08', lines: [{ account: '112', debit: 1_000_000 }, { account: '515', credit: 1_000_000 }] },
      { date: '2026-02-09', lines: [{ account: '154', debit: 35_000_000 }, { account: '621', credit: 30_000_000 }, { account: '622', credit: 5_000_000 }] },
      { date: '2026-02-10', lines: [{ account: '1388', debit: 500_000, partner: 'kh-mau' }, { account: '515', credit: 500_000 }] },
    ];
    for (const s of steps) {
      l.post(s);
      expectInvariants(l, s.date);
    }
  });

  it('kiểm thử ngẫu nhiên 300 bút toán cân: mọi bất biến luôn đúng', () => {
    const accounts = ['111', '112', '131', '1331', '1388', '141', '152', '154', '155', '156', '211', '2141', '2293', '242', '1283', '331', '33311', '3334', '334', '3388', '3411', '4111', '5111', '515', '621', '627', '632', '635', '641', '642', '711', '811', '8211'];
    let seed = 42;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const pick = () => accounts[Math.floor(rnd() * accounts.length)]!;
    const l = ledgerWithOpening(ctx, sample.opening);
    for (let i = 0; i < 300; i++) {
      const n = 2 + Math.floor(rnd() * 3);
      const lines: EntryInput['lines'] = [];
      let total = 0;
      for (let k = 0; k < n - 1; k++) {
        const amt = 1000 * (1 + Math.floor(rnd() * 5000));
        total += amt;
        lines.push({ account: pick(), debit: amt, partner: rnd() > 0.5 ? 'p1' : 'p2' });
      }
      lines.push({ account: pick(), credit: total, partner: rnd() > 0.5 ? 'p1' : 'p2' });
      l.post({ date: '2026-03-01', lines });
    }
    expectInvariants(l, 'ngẫu nhiên');
    for (const e of generateClosingEntries(ctx, l.entries, '2026-12-31')) l.post(e);
    expectInvariants(l, 'ngẫu nhiên sau kết chuyển');
    expect(profitAndLossResidual(ctx, l.entries)).toEqual([]);
  });
});

describe('Ledger.clone', () => {
  it('bản sao không làm thay đổi sổ gốc', () => {
    const l = ledgerWithOpening(ctx, sample.opening);
    const c = l.clone();
    c.post({ date: '2026-01-02', lines: [{ account: '111', debit: 1 }, { account: '112', credit: 1 }] });
    expect(l.entries.length).toBe(1);
    expect(c.entries.length).toBe(2);
    expect(c).toBeInstanceOf(Ledger);
  });
});
