import { computeReports, incomeStatementFromValues, openingBalanceSheet } from '../engine/reports';
import { loadCase } from '../data/registry';
import { CaseRuntime } from '../game/case-runtime';
import { lineKey, maxTier2Findings, scoreFinding, TIER2_POINTS_PER_ANOMALY } from '../game/tiers';
import { app, caseProgress, persist } from './app-state';
import { button, h, mount } from './dom';
import { reportsView, type ReportTab } from './reports-view';

const REPORTS = ['CĐKT', 'KQKD', 'LCTT', 'TM'] as const;
const REPORT_NAME: Record<string, string> = { CĐKT: 'Bảng cân đối kế toán', KQKD: 'Kết quả kinh doanh', LCTT: 'Lưu chuyển tiền tệ', TM: 'Thuyết minh' };

export function renderTier2(root: HTMLElement, caseId: string) {
  const rt = new CaseRuntime(loadCase(caseId), app.rules);
  const an = rt.bundle.anomalies;
  if (!an) return mount(root, h('div', { class: 'page' }, h('p', { text: 'Hồ sơ này chưa có Tầng 2.' })));
  const prog = caseProgress(caseId);
  prog.tier2 ??= { findings: [] };
  const t2 = prog.tier2;
  const ledger = rt.tier2Ledger();
  const reports = computeReports(rt.ctx, ledger.entries);
  const prior = { bs: openingBalanceSheet(rt.ctx, ledger.entries).lines, is: incomeStatementFromValues(rt.ctx, rt.bundle.opening.priorYearIncomeStatement) };
  let picked: { key: string; label: string } | null = null;
  let tab: ReportTab = 'bs';
  let revealAll = false;
  const maxF = maxTier2Findings(an);

  const draw = () => {
    const found = t2.findings.map((f) => f.anomalyId).filter((x): x is string => !!x);
    const points = t2.findings.reduce((s, f) => s + f.points, 0);
    const left = maxF - t2.findings.length;
    const done = left <= 0 || found.length === an.anomalies.length || revealAll;
    const reportsChecks = REPORTS.map((r) => {
      const cb = h('input', { attrs: { type: 'checkbox', value: r } });
      return { r, cb, el: h('label', {}, cb, ` ${r}`) };
    });
    const reason = h('select', { attrs: { 'aria-label': 'Lý do' } }, h('option', { text: '— Chọn lý do —', attrs: { value: '' } }), ...an.reasons.map((x) => h('option', { text: x.text, attrs: { value: x.id } })));
    const msg = h('div', { class: 'feedback' });
    const submit = () => {
      if (!picked) return mount(msg, h('p', { class: 'bad', text: 'Hãy bấm chọn một khoản mục trên báo cáo hoặc thuyết minh.' }));
      const reps = reportsChecks.filter((x) => x.cb.checked).map((x) => x.r);
      if (!reps.length) return mount(msg, h('p', { class: 'bad', text: 'Chọn ít nhất một báo cáo bị chạm.' }));
      if (!reason.value) return mount(msg, h('p', { class: 'bad', text: 'Chọn lý do.' }));
      const res = scoreFinding(an, found, { lineKey: picked.key, reports: reps, reasonId: reason.value });
      t2.findings.push({ lineKey: picked.key, reports: reps, reasonId: reason.value, anomalyId: res.anomalyId, points: res.points });
      persist();
      picked = null;
      draw();
    };
    const pick = (report: string, code: string, label: string) => {
      picked = { key: lineKey(report, code), label: `${report} ${code} — ${label}` };
      draw();
    };

    mount(
      root,
      h(
        'div',
        { class: 'page' },
        h('header', { class: 'page-head' }, h('a', { class: 'btn', text: '← Về hồ sơ', attrs: { href: `#/case/${caseId}` } }), h('h1', { text: `Tầng 2 — Bắt lỗi BCTC · ${rt.meta.company.name}` })),
        h('p', { text: an.intro }),
        h('div', { class: 'score-box' }, h('span', {}, 'Hiểu bản chất (Tầng 2): ', h('b', { text: `${points}/${an.anomalies.length * TIER2_POINTS_PER_ANOMALY}` })), h('span', { text: `Đã tìm ${found.length}/${an.anomalies.length} bất thường` }), h('span', { class: 'muted', text: `Còn ${Math.max(0, left)} lượt nộp` })),
        h(
          'div',
          { class: 'two-col' },
          h(
            'div',
            {},
            reportsView({ ctx: rt.ctx, reports, prior, tab, onTab: (t) => (tab = t), onPickLine: (r, l) => pick(r, l.code, l.label), currentLabel: 'Cuối năm 2026' }),
            ...an.notes.map((n) =>
              h(
                'div',
                { class: 'note-table reports' },
                h('h4', { text: n.title }),
                h(
                  'table',
                  { class: 'report' },
                  h('thead', {}, h('tr', {}, ...n.columns.map((c) => h('th', { text: c })))),
                  h('tbody', {}, ...n.rows.map((r) => {
                    const tr = h('tr', { class: `pickable${picked?.key === lineKey('TM', r.code) ? ' picked' : ''}`, attrs: { tabindex: 0 } }, ...r.cells.map((c, i) => h('td', { class: i === 1 ? 'num' : '', text: c })));
                    tr.addEventListener('click', () => pick('TM', r.code, r.cells[0] ?? r.code));
                    return tr;
                  })),
                ),
              ),
            ),
          ),
          h(
            'div',
            {},
            done
              ? h('div', { class: 'panel' }, h('h2', { text: 'Kết thúc Tầng 2' }), h('p', { text: `Điểm: ${points}/${an.anomalies.length * TIER2_POINTS_PER_ANOMALY}` }))
              : h(
                  'div',
                  { class: 'panel' },
                  h('h2', { text: 'Nộp một phát hiện' }),
                  h('p', {}, 'Khoản mục đã chọn: ', h('b', { text: picked?.label ?? '(bấm vào một dòng bên trái)' })),
                  h('div', { class: 'field' }, h('label', { text: 'Bất thường chạm báo cáo nào?' }), h('div', { class: 'checks-inline' }, ...reportsChecks.map((x) => x.el))),
                  h('div', { class: 'field' }, h('label', { text: 'Lý do' }), reason),
                  h('div', { class: 'actions' }, button('Nộp phát hiện', submit, 'btn primary'), button('Xem lời giải', () => { revealAll = true; draw(); })),
                  msg,
                ),
            h('h3', { text: 'Các phát hiện đã nộp' }),
            ...t2.findings.map((f) => {
              const a = an.anomalies.find((x) => x.id === f.anomalyId);
              const cls = !a ? 'miss' : f.points === TIER2_POINTS_PER_ANOMALY ? 'good' : 'part';
              const reasonText = an.reasons.find((r) => r.id === f.reasonId)?.text ?? '';
              return h(
                'div',
                { class: `finding ${cls}` },
                h('b', { text: `${f.lineKey} → ${a ? a.title : 'không phải bất thường cài sẵn'} (+${f.points})` }),
                h('div', { class: 'small', text: `Báo cáo bạn chọn: ${f.reports.join(', ')}${a ? ` · đáp án: ${a.reportsTouched.join(', ')}` : ''}` }),
                h('div', { class: 'small', text: `Lý do bạn chọn: ${reasonText}${a && a.reasonId !== f.reasonId ? ' ✘' : a ? ' ✔' : ''}` }),
                a ? h('div', { class: 'explain', text: a.explanation }) : null,
              );
            }),
            done || revealAll
              ? h(
                  'div',
                  { class: 'panel' },
                  h('h3', { text: 'Lời giải' }),
                  ...an.anomalies.map((a) =>
                    h('div', { class: `finding ${found.includes(a.id) ? 'good' : 'miss'}` }, h('b', { text: `${a.title} — ${a.lineRefs.map((r) => `${r.report} ${r.code}`).join(', ')}` }), h('div', { class: 'small', text: `Chạm: ${a.reportsTouched.map((r) => REPORT_NAME[r]).join(', ')}` }), h('div', { class: 'explain', text: a.explanation })),
                  ),
                  button('Làm lại Tầng 2', () => { t2.findings = []; revealAll = false; persist(); draw(); }),
                )
              : null,
          ),
        ),
      ),
    );
  };
  draw();
}
