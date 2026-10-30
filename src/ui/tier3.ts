import { formatVND, parseVND } from '../engine/format';
import { computeReports, type Reports } from '../engine/reports';
import { scoreEntries } from '../engine/scoring';
import type { LineInput } from '../engine/types';
import { loadAdjustmentCategories, loadCase } from '../data/registry';
import { CaseRuntime } from '../game/case-runtime';
import { scoreReconciliation, type ReconResult } from '../game/tiers';
import { app, caseProgress, persist } from './app-state';
import { button, h, mount } from './dom';
import { entryForm } from './entry-form';
import { reportsView, type ReportTab } from './reports-view';
import { ruleBadge } from './rules-screen';
import { entriesTable } from './case-screen';

export const ADJ_POINTS = { first: 4, retry: 2, revealed: 0 } as const;

export function renderTier3(root: HTMLElement, caseId: string) {
  const rt = new CaseRuntime(loadCase(caseId), app.rules);
  const adj = rt.bundle.adjustments;
  if (!adj || !rt.meta.tiers.tier3a) return mount(root, h('div', { class: 'page' }, h('p', { text: 'Hồ sơ này chưa có Tầng 3.' })));
  const prog = caseProgress(caseId);
  prog.tier3 ??= { adjustments: {} };
  const t3 = prog.tier3;
  const canonical = rt.canonicalLedger();
  const expected = rt.reconciliation(canonical);
  const catalog = app.rules.citCatalog();
  const categories = loadAdjustmentCategories();
  let reconRows: { ruleId: string; amount: number | null }[] = t3.recon ? t3.recon.lines.map((l) => ({ ...l })) : [{ ruleId: '', amount: null }];
  let lastRecon: ReconResult | null = null;
  let tab: ReportTab = 'bs';
  const pending: Record<string, number> = {};

  const draw = () => {
    // ---------- (a) Bảng đối chiếu ----------
    const taxIn = h('input', { class: 'num', attrs: { inputmode: 'numeric', value: t3.recon ? formatVND(t3.recon.taxableIncome) : '', 'aria-label': 'Thu nhập chịu thuế' } });
    const citIn = h('input', { class: 'num', attrs: { inputmode: 'numeric', value: t3.recon ? formatVND(t3.recon.citExpense) : '', 'aria-label': 'Thuế TNDN' } });
    const reconMsg = h('div', { class: 'feedback' });
    const rows = reconRows.map((row, i) => {
      const sel = h(
        'select',
        { attrs: { 'aria-label': 'Dòng điều chỉnh' } },
        h('option', { text: '— Chọn khoản điều chỉnh (rule đang bật) —', attrs: { value: '' } }),
        ...catalog.filter((r) => app.rules.isEnabled(r.id)).map((r) => h('option', { text: `${r.description}`, attrs: { value: r.id, selected: row.ruleId === r.id } })),
      );
      sel.addEventListener('change', () => (row.ruleId = sel.value));
      const amt = h('input', { class: 'num', attrs: { inputmode: 'numeric', value: row.amount ? formatVND(row.amount) : '', 'aria-label': 'Số tiền' } });
      amt.addEventListener('input', () => (row.amount = parseVND(amt.value)));
      return h('tr', {}, h('td', { text: `${i + 1}` }), h('td', {}, sel), h('td', {}, amt), h('td', {}, button('×', () => { reconRows.splice(i, 1); draw(); }, 'btn-icon')));
    });
    const submitRecon = () => {
      const lines = reconRows.filter((r) => r.ruleId && r.amount).map((r) => ({ ruleId: r.ruleId, amount: r.amount! }));
      const ti = parseVND(taxIn.value);
      const ci = parseVND(citIn.value);
      if (ti === null || ci === null) return mount(reconMsg, h('p', { class: 'bad', text: 'Nhập thu nhập chịu thuế và thuế TNDN.' }));
      lastRecon = scoreReconciliation(expected, { lines, taxableIncome: ti, citExpense: ci });
      t3.recon = { lines, taxableIncome: ti, citExpense: ci, points: lastRecon.points, maxPoints: lastRecon.maxPoints };
      persist();
      draw();
    };
    const reconResult = lastRecon ?? (t3.recon ? scoreReconciliation(expected, t3.recon) : null);
    const ruleName = (id: string) => catalog.find((r) => r.id === id)?.description ?? id;

    const partA = h(
      'section',
      { class: 'panel' },
      h('h2', { text: rt.meta.tiers.tier3b ? '(a) Bảng đối chiếu lợi nhuận kế toán → thu nhập chịu thuế' : 'Tầng 3 rút gọn — Bảng đối chiếu lợi nhuận kế toán → thu nhập chịu thuế' }),
      h('p', { text: adj.reconciliation.intro }),
      h('p', { class: 'muted small', text: 'Giản lược so với VAS 17: chênh lệch chỉ cộng lại trên bảng đối chiếu, không ghi thuế thu nhập hoãn lại (243/347).' }),
      h('table', { class: 'grid' }, h('tbody', {}, h('tr', {}, h('td', { text: 'Tổng lợi nhuận kế toán trước thuế (KQKD dòng 50)' }), h('td', { class: 'num', text: formatVND(expected.profitBeforeTax) })), h('tr', {}, h('td', { text: 'Doanh thu năm trước (chọn thuế suất)' }), h('td', { class: 'num', text: formatVND(rt.bundle.opening.priorYearRevenue) })))),
      h('h3', { text: 'Các khoản điều chỉnh tăng thu nhập chịu thuế' }),
      h('table', { class: 'grid' }, h('thead', {}, h('tr', {}, h('th', { text: '#' }), h('th', { text: 'Khoản điều chỉnh' }), h('th', { class: 'num', text: 'Số tiền' }), h('th'))), h('tbody', {}, ...rows)),
      button('+ Thêm dòng', () => { reconRows.push({ ruleId: '', amount: null }); draw(); }, 'btn-small'),
      h('div', { class: 'field' }, h('label', { text: 'Thu nhập chịu thuế' }), taxIn),
      h('div', { class: 'field' }, h('label', {}, 'Chi phí thuế TNDN hiện hành ', ruleBadge('cit-rate')), citIn),
      h('div', { class: 'actions' }, button('Chấm bảng đối chiếu', submitRecon, 'btn primary')),
      reconMsg,
      reconResult
        ? h(
            'div',
            { class: 'result ' + (reconResult.points === reconResult.maxPoints ? 'correct' : 'wrong') },
            h('strong', { text: `Điểm: ${reconResult.points}/${reconResult.maxPoints}` }),
            h(
              'table',
              { class: 'grid' },
              h('thead', {}, h('tr', {}, h('th', { text: 'Dòng (đáp án engine)' }), h('th', { class: 'num', text: 'Đáp án' }), h('th', { class: 'num', text: 'Bạn nhập' }), h('th', { text: '' }))),
              h(
                'tbody',
                {},
                h('tr', {}, h('td', { text: 'LN kế toán trước thuế' }), h('td', { class: 'num', text: formatVND(expected.profitBeforeTax) }), h('td'), h('td')),
                ...expected.lines.map((l) => {
                  const r = reconResult.lineResults.find((x) => x.ruleId === l.ruleId)!;
                  return h('tr', {}, h('td', {}, `${ruleName(l.ruleId)} `, ruleBadge(l.ruleId), h('div', { class: 'small muted', text: `Nghiệp vụ: ${l.events.join(', ')}` })), h('td', { class: 'num', text: formatVND(l.amount) }), h('td', { class: 'num', text: r.got === null ? '—' : formatVND(r.got) }), h('td', { class: r.ok ? 'ok' : 'bad', text: r.ok ? '✔' : '✘' }));
                }),
                ...reconResult.extraLines.map((x) => h('tr', {}, h('td', { text: `${ruleName(x.ruleId)} (không có trong đáp án)` }), h('td', { class: 'num', text: '0' }), h('td', { class: 'num', text: formatVND(x.amount) }), h('td', { class: 'bad', text: '✘' }))),
                h('tr', { class: 'bold' }, h('td', { text: 'Thu nhập chịu thuế' }), h('td', { class: 'num', text: formatVND(expected.taxableIncome) }), h('td', { class: 'num', text: formatVND(t3.recon?.taxableIncome ?? 0) }), h('td', { class: reconResult.taxableOk ? 'ok' : 'bad', text: reconResult.taxableOk ? '✔' : '✘' })),
                h('tr', { class: 'bold' }, h('td', { text: `Thuế TNDN (thuế suất ${Math.round(expected.rate * 100)}%)` }), h('td', { class: 'num', text: formatVND(expected.citExpense) }), h('td', { class: 'num', text: formatVND(t3.recon?.citExpense ?? 0) }), h('td', { class: reconResult.citOk ? 'ok' : 'bad', text: reconResult.citOk ? '✔' : '✘' })),
              ),
            ),
            expected.disabledLines.length
              ? h('div', { class: 'explain' }, h('b', { text: 'Rule chưa kiểm chứng (đang TẮT, không tính): ' }), ...expected.disabledLines.map((l) => h('div', {}, `${l.label} — ước tính ${formatVND(l.amount)} `, ruleBadge(l.ruleId))))
              : null,
          )
        : null,
    );

    // ---------- (b) Điều chỉnh về bản chất ----------
    let partB: HTMLElement | null = null;
    if (rt.meta.tiers.tier3b && adj.items.length) {
      const before = rt.companyBookLedger();
      const after = rt.companyBookLedger();
      for (const item of adj.items) {
        const p = t3.adjustments[item.id];
        if (p) for (const e of p.entries) after.post({ date: `${rt.meta.fiscalYear}-12-31`, memo: item.title, source: 'adjustment', lines: e.lines as LineInput[] });
      }
      const rBefore: Reports = computeReports(rt.ctx, before.entries);
      const rAfter: Reports = computeReports(rt.ctx, after.entries);
      const accounts = [...new Set([...rt.meta.months.flatMap((m) => m.openAccounts), ...adj.items.flatMap((i) => [i.answer, ...i.alternativeAnswers].flatMap((a) => a.entries.flatMap((e) => e.lines.map((l) => l.account))))])].sort();
      const details = {
        partner: rt.meta.partners.map((p) => ({ id: p.id, name: p.name })),
        item: rt.meta.items.map((p) => ({ id: p.id, name: p.name })),
        segment: rt.meta.segments.map((p) => ({ id: p.id, name: p.name })),
      };
      const adjPoints = adj.items.reduce((s, i) => s + (t3.adjustments[i.id] ? ADJ_POINTS[t3.adjustments[i.id]!.status] : 0), 0);
      partB = h(
        'section',
        { class: 'panel' },
        h('h2', { text: '(b) Bút toán điều chỉnh về bản chất' }),
        adj.companyBook ? h('p', { text: adj.companyBook.intro }) : null,
        h('p', {}, 'Điểm phần (b): ', h('b', { text: `${adjPoints}/${adj.items.length * ADJ_POINTS.first}` })),
        ...adj.items.map((item) => {
          const done = t3.adjustments[item.id];
          const box = h('div', { class: 'finding' }, h('h3', { text: item.title }), h('ul', {}, ...item.evidence.map((e) => h('li', { text: e }))));
          if (done) {
            box.append(
              h('p', { class: done.status === 'revealed' ? 'bad' : 'ok', text: `${done.status === 'revealed' ? 'Đã xem đáp án' : 'Đúng'} · Nhóm: ${categories.find((c) => c.id === item.category)?.label ?? ''}` }),
              entriesTable(rt, done.entries as never),
              h('div', { class: 'explain', text: item.explanation }),
            );
            return box;
          }
          const cat = h('select', { attrs: { 'aria-label': 'Nhóm điều chỉnh' } }, h('option', { text: '— Chọn nhóm điều chỉnh —', attrs: { value: '' } }), ...categories.map((c) => h('option', { text: c.label, attrs: { value: c.id } })));
          const form = entryForm({ ctx: rt.ctx, accounts, spec: rt.spec, details });
          const msg = h('div', { class: 'feedback' });
          const check = () => {
            const r = form.read();
            if (!cat.value) return mount(msg, h('p', { class: 'bad', text: 'Chọn nhóm điều chỉnh trước.' }));
            if (r.errors.length) return mount(msg, h('div', { class: 'bad' }, ...r.errors.map((e) => h('p', { text: e }))));
            const res = scoreEntries(rt.ctx, r.entries, [item.answer, ...item.alternativeAnswers].map((a) => a.entries as never), rt.spec, rt.substance);
            const catOk = cat.value === item.category;
            if (res.correct && catOk) {
              const attempts = (pending[item.id] ?? 0) + 1;
              t3.adjustments[item.id] = { category: cat.value, entries: r.entries as never, status: attempts === 1 ? 'first' : 'retry', attempts };
              persist();
              draw();
              return;
            }
            pending[item.id] = (pending[item.id] ?? 0) + 1;
            mount(msg, h('div', { class: 'result wrong' }, !catOk ? h('p', { text: 'Nhóm điều chỉnh chưa đúng.' }) : null, res.explanationLines.length ? h('ul', {}, ...res.explanationLines.map((x) => h('li', { text: x }))) : null, ...res.violations.map((v) => h('p', { class: 'bad', text: v.message }))));
          };
          box.append(
            h('div', { class: 'field' }, h('label', { text: 'Nhóm điều chỉnh' }), cat),
            form.el,
            h('div', { class: 'actions' }, button('Kiểm tra', check, 'btn primary'), button('Xem đáp án', () => {
              t3.adjustments[item.id] = { category: item.category, entries: item.answer.entries as never, status: 'revealed', attempts: pending[item.id] ?? 0 };
              persist();
              draw();
            })),
            msg,
          );
          return box;
        }),
        h('h3', { text: 'CĐKT và KQKD trước / sau điều chỉnh' }),
        reportsView({ ctx: rt.ctx, reports: rAfter, baseline: rBefore, baselineLabel: 'Trước điều chỉnh', currentLabel: 'Sau điều chỉnh', tab, onTab: (t) => (tab = t), tabs: ['bs', 'is'] }),
      );
    }

    mount(
      root,
      h(
        'div',
        { class: 'page' },
        h('header', { class: 'page-head' }, h('a', { class: 'btn', text: '← Về hồ sơ', attrs: { href: `#/case/${caseId}` } }), h('h1', { text: `Tầng 3 · ${rt.meta.company.name}` })),
        rt.meta.tiers.tier3Note ? h('p', { class: 'muted', text: rt.meta.tiers.tier3Note }) : null,
        app.rules.warningActive ? h('div', { class: 'warning-banner', text: '⚠ Đang bật rule chưa kiểm chứng (cờ debug): bảng đối chiếu có thể tính cả rule chưa đọc văn bản gốc.' }) : null,
        partA,
        partB,
      ),
    );
  };
  draw();
}
