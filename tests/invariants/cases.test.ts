import { describe, expect, it } from 'vitest';
import { hasPrefix } from '../../src/engine/coa';
import { profitAndLossResidual } from '../../src/engine/closing';
import { accountBalances, detailBalances, parseDetailKey } from '../../src/engine/ledger';
import { computeReports, incomeStatementFromValues } from '../../src/engine/reports';
import { impactVector } from '../../src/engine/scoring';
import { listCaseIds, loadAdjustmentCategories, loadCase, rawFiles } from '../../src/data/registry';
import { CaseRuntime, entryInputs } from '../../src/game/case-runtime';
import { eventEffects, vatAmount, vatPrefixes } from '../../src/tax/rules';
import { expectInvariants } from '../helpers';

const ids = listCaseIds();

describe('Danh sách hồ sơ', () => {
  it('mọi file trong data/cases thuộc một hồ sơ có case.json', () => {
    for (const p of Object.keys(rawFiles()).filter((x) => x.startsWith('/data/cases/'))) {
      const id = p.split('/')[3]!;
      expect(ids, p).toContain(id);
    }
  });
});

for (const id of ids) {
  describe(`Kịch bản ${id}`, () => {
    const bundle = loadCase(id); // validate schema khi load
    const rt = new CaseRuntime(bundle);
    const meta = bundle.meta;
    const partnerIds = new Set(meta.partners.map((p) => p.id));
    const itemIds = new Set(meta.items.map((p) => p.id));
    const segmentIds = new Set(meta.segments.map((p) => p.id));

    it('pass schema, id sự kiện duy nhất, ngày tăng dần trong năm tài chính', () => {
      const seen = new Set<string>();
      let last = bundle.opening.date;
      for (const { event } of rt.events) {
        expect(seen.has(event.id), event.id).toBe(false);
        seen.add(event.id);
        expect(event.date >= last, `${event.id} ngày ${event.date}`).toBe(true);
        expect(event.date.startsWith(String(meta.fiscalYear)), event.id).toBe(true);
        last = event.date;
      }
    });

    it('nhân vật nói thoại có trong danh sách; có kế toán trưởng hướng dẫn', () => {
      const chars = new Set(meta.characters.map((c) => c.id));
      expect(meta.characters.some((c) => c.mentor)).toBe(true);
      for (const m of bundle.months) {
        for (const d of [...m.intro, ...m.outro]) expect(chars.has(d.speaker), `${m.id} ${d.speaker}`).toBe(true);
        for (const e of m.events) if (e.speaker) expect(chars.has(e.speaker), e.id).toBe(true);
      }
    });

    it('số dư đầu kỳ cân, khớp tồn kho theo mặt hàng và TSCĐ', () => {
      const l = rt.newLedger();
      expectInvariants(l, 'đầu kỳ');
      const bal = detailBalances(l.entries);
      for (const inv of bundle.opening.inventory) {
        expect(bal.get(`${inv.account}||${inv.item}|`) ?? 0, `tồn kho ${inv.item}`).toBe(inv.qty * inv.unitCost);
      }
      const accBal = accountBalances(l.entries);
      const opening = bundle.opening.fixedAssets.filter((a) => !a.acquiredInYear);
      const byAcc = new Map<string, number>();
      for (const a of opening) byAcc.set(a.account, (byAcc.get(a.account) ?? 0) + a.cost);
      for (const [acc, cost] of byAcc) expect(accBal.get(acc) ?? 0, `nguyên giá ${acc}`).toBe(cost);
      for (const a of bundle.opening.fixedAssets) expect(a.monthlyDepreciation * a.usefulLifeMonths, `khấu hao ${a.id}`).toBe(a.cost);
      const capital = [...accBal].filter(([a]) => a.startsWith(rt.ctx.template.config.ownerCapitalPrefix)).reduce((s, [, v]) => s - v, 0);
      expect(capital).toBe(bundle.opening.charterCapital.contributed);
    });

    it('doanh thu năm trước nằm rõ trong một khung thuế suất (cách ngưỡng ≥ 20%)', () => {
      const rule = rt.rules.get('cit-rate');
      const thresholds = (rule.params.brackets as { maxRevenueVND: number }[]).map((b) => b.maxRevenueVND);
      const rev = bundle.opening.priorYearRevenue;
      for (const t of thresholds) expect(Math.abs(rev - t) / t, `ngưỡng ${t}`).toBeGreaterThanOrEqual(0.2);
      expect(bundle.opening.priorYearIncomeStatement['01']).toBe(rev);
      expect(incomeStatementFromValues(rt.ctx, bundle.opening.priorYearIncomeStatement).length).toBeGreaterThan(5);
    });

    it('mọi đáp án dùng TK mở của tháng, đủ đối tượng chi tiết hợp lệ', () => {
      for (const { month, event } of rt.events) {
        const open = new Set(rt.openAccounts(month.id));
        const answers = 'entries' in event.answer ? [event.answer, ...event.alternativeAnswers] : event.alternativeAnswers;
        for (const a of answers)
          for (const e of a.entries)
            for (const l of e.lines) {
              const where = `${event.id} TK ${l.account}`;
              expect(open.has(l.account), `${where} chưa mở`).toBe(true);
              expect(rt.ctx.postable.has(l.account), `${where} không phải TK chi tiết`).toBe(true);
              for (const f of rt.spec(l.account)) expect(l[f], `${where} thiếu ${f}`).toBeTruthy();
              if (l.partner) expect(partnerIds.has(l.partner), `${where} đối tượng ${l.partner}`).toBe(true);
              if (l.item) expect(itemIds.has(l.item), `${where} mặt hàng ${l.item}`).toBe(true);
              if (l.segment) expect(segmentIds.has(l.segment), `${where} mảng ${l.segment}`).toBe(true);
            }
      }
      for (const b of bundle.opening.balances) for (const f of rt.spec(b.account)) expect(b[f], `đầu kỳ ${b.account} thiếu ${f}`).toBeTruthy();
    });

    const hasClosing = rt.events.some((r) => r.event.kind === 'closing');
    const hasCit = rt.events.some((r) => r.event.kind === 'cit');

    it('đáp án tự cân: chạy toàn bộ đáp án qua engine, bất biến đúng sau từng sự kiện', () => {
      const l = rt.canonicalLedger(undefined, (ledger, ref) => expectInvariants(ledger, ref.event.id));
      const r = computeReports(rt.ctx, l.entries);
      expect(r.unallocatedProduction).toBe(0);
      if (!hasClosing) return;
      expect(profitAndLossResidual(rt.ctx, l.entries), 'TK loại 5–9 về 0 sau kết chuyển').toEqual([]);
      const d421 = [...accountBalances(l.entries, (e) => e.kind !== 'opening')].filter(([a]) => a.startsWith('421')).reduce((s, [, v]) => s - v, 0);
      expect(d421, 'LN trên KQKD = biến động 421').toBe(r.totals.profitAfterTax);
      expect(r.totals.profitBeforeTax).toBeGreaterThan(0);
    });

    it('sự kiện cuối năm: có thuế TNDN rồi mới kết chuyển (khi hồ sơ đã đủ 12 tháng)', () => {
      if (!hasClosing) return;
      expect(hasCit).toBe(true);
      const last = rt.events[rt.events.length - 1]!.event;
      expect(last.kind).toBe('closing');
    });

    it('tiền và tồn kho không âm tại mọi thời điểm', () => {
      rt.canonicalLedger(undefined, (ledger, ref) => {
        for (const [k, v] of detailBalances(ledger.entries)) {
          const d = parseDetailKey(k);
          if (hasPrefix(d.account, ['15', '111', '112'])) expect(v, `${ref.event.id}: ${k}`).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('chơi hết hồ sơ bằng đáp án: mọi đáp án chính và thay thế đều được chấm đúng', () => {
      const l = rt.newLedger();
      for (const { event } of rt.events) {
        const answers = rt.resolveAnswers(event, l);
        for (const a of answers) {
          const res = rt.score(event, l, a);
          expect(res.correct, `${event.id}: ${res.explanationLines.join('; ')} ${res.violations.map((v) => v.ruleId).join(',')}`).toBe(true);
        }
        for (const e of entryInputs(event, answers[0]!, 'player')) l.post(e);
      }
    });

    it('đáp án thay thế có cùng vector với đáp án chính', () => {
      const l = rt.newLedger();
      for (const { event } of rt.events) {
        const [main, ...alts] = rt.resolveAnswers(event, l);
        for (const alt of alts) expect(impactVector(alt, rt.spec), event.id).toEqual(impactVector(main!, rt.spec));
        for (const e of entryInputs(event, main!, 'answer')) l.post(e);
      }
    });

    it('GTGT trong đáp án khớp rule thuế suất; vi phạm điều kiện khấu trừ thì không ghi 133', () => {
      for (const { event } of rt.events) {
        const v = event.attrs.vat;
        if (!v || !('entries' in event.answer)) continue;
        const effects = eventEffects(rt.rules, rt.eventContext(event));
        const lines = event.answer.entries.flatMap((e) => e.lines);
        const pre = vatPrefixes(rt.rules, v.ruleId);
        const sum = (ps: string[], side: 'debit' | 'credit') =>
          lines.filter((l) => hasPrefix(l.account, ps)).reduce((s, l) => s + (typeof l[side] === 'number' ? (l[side] as number) : 0), 0);
        const input = sum(pre.input, 'debit');
        const output = sum(pre.output, 'credit');
        const expected = vatAmount(rt.rules, v.ruleId, v.base, event.date);
        if (effects.vatNotDeductible.length) expect(input, `${event.id}: không được khấu trừ`).toBe(0);
        else expect(input + output, `${event.id}: GTGT = ${expected}`).toBe(expected);
        if (event.attrs.invoice) expect(event.attrs.invoice.totalInclVAT, `${event.id}: tổng thanh toán`).toBe(v.base + expected);
      }
    });

    it('đối chiếu LN kế toán → TNCT khớp chi phí thuế TNDN đã ghi', () => {
      if (!hasCit) return;
      const l = rt.canonicalLedger();
      const rec = rt.reconciliation(l);
      const r = computeReports(rt.ctx, l.entries);
      expect(r.incomeStatement.find((x) => x.code === rt.ctx.template.config.incomeTaxExpenseLine)!.value).toBe(rec.citExpense);
      expect(rec.taxableIncome).toBe(rec.profitBeforeTax + rec.totalAdjustments);
    });

    if (meta.tiers.tier2) {
      it('Tầng 2: 3–5 bất thường; bộ BCTC đã khóa sổ cân; khoản mục tham chiếu tồn tại', () => {
        const an = bundle.anomalies!;
        expect(an).toBeDefined();
        const l = rt.tier2Ledger();
        expectInvariants(l, 'tầng 2');
        expect(profitAndLossResidual(rt.ctx, l.entries)).toEqual([]);
        const r = computeReports(rt.ctx, l.entries);
        const reasonIds = new Set(an.reasons.map((x) => x.id));
        for (const a of an.anomalies) {
          expect(reasonIds.has(a.reasonId), a.id).toBe(true);
          for (const ref of a.lineRefs) {
            const list =
              ref.report === 'CĐKT' ? r.balanceSheet : ref.report === 'KQKD' ? r.incomeStatement : ref.report === 'LCTT' ? [...r.cashFlowDirect, ...r.cashFlowIndirect] : an.notes.flatMap((n) => n.rows);
            expect(list.some((x) => x.code === ref.code), `${a.id} → ${ref.report} ${ref.code}`).toBe(true);
          }
        }
        for (const inj of an.injections) for (const ln of inj.lines) for (const f of rt.spec(ln.account)) expect(ln[f], `${inj.id} ${ln.account} thiếu ${f}`).toBeTruthy();
      });
    }

    if (meta.tiers.tier3b) {
      it('Tầng 3b: sổ công ty cân, mọi điều chỉnh ghi được và giữ báo cáo cân', () => {
        const adj = bundle.adjustments!;
        const cats = new Set(loadAdjustmentCategories().map((c) => c.id));
        const l = rt.companyBookLedger();
        expect(computeReports(rt.ctx, l.entries).totals.totalAssets).toBe(computeReports(rt.ctx, l.entries).totals.totalSources);
        expect(adj.items.length).toBeGreaterThanOrEqual(3);
        for (const item of adj.items) {
          expect(cats.has(item.category), item.id).toBe(true);
          for (const alt of item.alternativeAnswers) expect(impactVector(alt.entries as never, rt.spec)).toEqual(impactVector(item.answer.entries as never, rt.spec));
          for (const e of item.answer.entries) {
            for (const ln of e.lines) for (const f of rt.spec(ln.account)) expect(ln[f], `${item.id} ${ln.account} thiếu ${f}`).toBeTruthy();
            l.post({ date: `${meta.fiscalYear}-12-31`, memo: item.title, lines: e.lines as never });
          }
          const rr = computeReports(rt.ctx, l.entries);
          expect(rr.totals.totalAssets, item.id).toBe(rr.totals.totalSources);
        }
      });
    }
    if (meta.tiers.tier3a) {
      it('Tầng 3a có ít nhất một dòng điều chỉnh từ rule đang bật', () => {
        expect(rt.reconciliation(rt.canonicalLedger()).lines.length).toBeGreaterThan(0);
      });
    }
  });
}
