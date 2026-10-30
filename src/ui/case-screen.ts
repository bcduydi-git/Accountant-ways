import { accountLabel, isProfitAndLoss } from '../engine/coa';
import { formatVND } from '../engine/format';
import { detailBalances, Ledger, parseDetailKey, PostingError } from '../engine/ledger';
import { computeReports, incomeStatementFromValues, openingBalanceSheet, type Reports } from '../engine/reports';
import type { LineInput } from '../engine/types';
import { loadCase } from '../data/registry';
import type { ScenarioEvent } from '../data/schema';
import { CaseRuntime, entryInputs, type ResolvedEntry } from '../game/case-runtime';
import { evaluateRule } from '../tax/rules';
import { Scene } from '../scene/scene';
import { app, caseProgress, persist } from './app-state';
import { button, h, mount, toast } from './dom';
import { entryForm, type EntryForm } from './entry-form';
import { REGULATION_NOTE } from './menu';
import { reportsView, type ReportTab } from './reports-view';
import { ruleBadge } from './rules-screen';

export const POINTS = { first: 10, retry: 5, revealed: 0 } as const;

/** Dựng lại sổ của người chơi từ file lưu (mọi bút toán đều qua post()). */
export function playerLedger(rt: CaseRuntime, caseId: string): Ledger {
  const prog = caseProgress(caseId);
  const l = rt.newLedger();
  for (const { event } of rt.events) {
    const p = prog.events[event.id];
    if (!p) break;
    try {
      for (const e of entryInputs(event, p.entries as ResolvedEntry[], 'player')) l.post(e);
    } catch {
      // File lưu không khớp kịch bản hiện tại: bỏ tiến độ từ sự kiện này trở đi.
      const idx = rt.events.findIndex((r) => r.event.id === event.id);
      for (const r of rt.events.slice(idx)) delete prog.events[r.event.id];
      persist();
      break;
    }
  }
  return l;
}

export function caseScore(rt: CaseRuntime, caseId: string) {
  const prog = caseProgress(caseId);
  let got = 0;
  const max = rt.events.length * POINTS.first;
  for (const { event } of rt.events) {
    const p = prog.events[event.id];
    if (p) got += POINTS[p.status];
  }
  return { got, max };
}

/** Các rule liên quan tới sự kiện (để hiện biểu tượng nguồn và cảnh báo). */
function eventRules(rt: CaseRuntime, ev: ScenarioEvent): string[] {
  const ids = new Set<string>();
  if (ev.attrs.vat) ids.add(ev.attrs.vat.ruleId);
  const ctx = rt.eventContext(ev);
  for (const r of app.rules.all()) {
    const res = evaluateRule(r, ctx);
    if (res.citAmount || res.vatNotDeductible) ids.add(r.id);
  }
  if (ev.kind === 'cit') {
    ids.add('cit-rate');
    for (const r of app.rules.citCatalog()) ids.add(r.id);
  }
  return [...ids];
}

function documentsView(ev: ScenarioEvent) {
  return ev.documents.map((d) =>
    h(
      'div',
      { class: 'doc' },
      h('h4', { text: d.kind + (d.title ? ` — ${d.title}` : '') }),
      h('table', {}, h('tbody', {}, ...d.rows.map(([a, b]) => h('tr', {}, h('td', { text: a }), h('td', { text: b }))))),
    ),
  );
}

/** Chứng từ động cho sự kiện cuối năm (số liệu lấy từ sổ hiện tại). */
function dynamicDocs(rt: CaseRuntime, ev: ScenarioEvent, ledger: Ledger) {
  if (ev.kind === 'closing') {
    const rows: [string, string][] = [];
    for (const [k, v] of [...detailBalances(ledger.entries)].sort(([a], [b]) => a.localeCompare(b))) {
      const d = parseDetailKey(k);
      if (!v || !isProfitAndLoss(rt.ctx, d.account)) continue;
      const det = [d.segment && rt.segmentName(d.segment), d.item && rt.itemName(d.item), d.partner && rt.partnerName(d.partner)].filter(Boolean).join(', ');
      rows.push([`${accountLabel(rt.ctx, d.account)}${det ? ` [${det}]` : ''}`, v > 0 ? `Dư Nợ ${formatVND(v)}` : `Dư Có ${formatVND(-v)}`]);
    }
    return [h('div', { class: 'doc' }, h('h4', { text: 'Bảng số dư TK doanh thu, chi phí trước kết chuyển' }), h('table', {}, h('tbody', {}, ...rows.map(([a, b]) => h('tr', {}, h('td', { text: a }), h('td', { text: b }))))))];
  }
  if (ev.kind === 'cit') {
    const pbt = computeReports(rt.ctx, ledger.entries).totals.profitBeforeTax;
    return [
      h(
        'div',
        { class: 'doc' },
        h('h4', { text: 'Số liệu để tính thuế TNDN' }),
        h(
          'table',
          {},
          h(
            'tbody',
            {},
            h('tr', {}, h('td', { text: 'Tổng lợi nhuận kế toán trước thuế (KQKD dòng 50)' }), h('td', { text: formatVND(pbt) })),
            h('tr', {}, h('td', { text: 'Doanh thu năm trước (để chọn thuế suất)' }), h('td', { text: formatVND(rt.bundle.opening.priorYearRevenue) })),
          ),
        ),
      ),
    ];
  }
  return [];
}

export function renderCase(root: HTMLElement, caseId: string) {
  const rt = new CaseRuntime(loadCase(caseId), app.rules);
  const prog = caseProgress(caseId);
  const mentor = rt.meta.characters.find((c) => c.mentor) ?? rt.meta.characters[0]!;
  const scene = new Scene(rt.meta.characters);
  const priorIs = incomeStatementFromValues(rt.ctx, rt.bundle.opening.priorYearIncomeStatement);
  let tab: ReportTab = 'bs';
  let showPrior = false;
  let viewMonth = -1;
  let viewEvent: string | null = null;
  let introStep = 0;

  const nextRef = () => rt.events.find((r) => !prog.events[r.event.id]);
  const monthDone = (i: number) => rt.bundle.months[i]!.events.every((e) => prog.events[e.id]);
  const monthClosed = (i: number) => prog.closedMonths.includes(rt.bundle.months[i]!.id);
  const unlockedMonth = () => {
    let i = 0;
    while (i < rt.bundle.months.length - 1 && monthClosed(i)) i++;
    return i;
  };
  const yearDone = () => rt.bundle.months.every((_, i) => monthClosed(i));

  function draw() {
    const ledger = playerLedger(rt, caseId);
    const current = computeReports(rt.ctx, ledger.entries);
    const unlocked = unlockedMonth();
    if (viewMonth < 0 || viewMonth > unlocked) viewMonth = unlocked;
    const month = rt.bundle.months[viewMonth]!;
    const next = nextRef();
    const activeId = viewEvent && month.events.some((e) => e.id === viewEvent) ? viewEvent : (next && next.month.id === month.id ? next.event.id : month.events[month.events.length - 1]!.id);
    const event = month.events.find((e) => e.id === activeId)!;
    const isActive = next?.event.id === event.id;
    const score = caseScore(rt, caseId);

    // --- Cột báo cáo ---
    const reportsBox = h('div', {});
    const priorCols = showPrior ? { bs: openingBalanceSheet(rt.ctx, ledger.entries).lines, is: priorIs } : undefined;
    const showReports = (reports: Reports, baseline?: Reports, note?: string) =>
      mount(reportsBox, reportsView({ ctx: rt.ctx, reports, baseline, prior: priorCols, tab, onTab: (t) => (tab = t), previewNote: note }));
    showReports(current);

    // --- Thoại ---
    if (introStep < month.intro.length && isActive && month.events[0]!.id === event.id) {
      const d = month.intro[introStep]!;
      scene.say(d.speaker, d.text);
    } else {
      scene.say(event.speaker ?? mentor.id, event.narrative);
    }
    const introBtn =
      introStep < month.intro.length && isActive && month.events[0]!.id === event.id
        ? button(introStep + 1 < month.intro.length ? 'Tiếp ▶' : 'Vào việc ▶', () => { introStep++; draw(); }, 'btn-small')
        : null;

    // --- Cột nghiệp vụ ---
    const feedback = h('div', { class: 'feedback', attrs: { 'aria-live': 'polite' } });
    let form: EntryForm | null = null;
    const accounts = rt.openAccounts(month.id);
    const ruleIds = eventRules(rt, event);
    const warn = app.rules.warningActive && ruleIds.some((id) => app.rules.get(id).status === 'unverified');

    const workArea = h('div', {});
    if (isActive) {
      form = entryForm({
        ctx: rt.ctx,
        accounts,
        spec: rt.spec,
        details: {
          partner: rt.meta.partners.map((p) => ({ id: p.id, name: p.name })),
          item: rt.meta.items.map((p) => ({ id: p.id, name: p.name })),
          segment: rt.meta.segments.map((p) => ({ id: p.id, name: p.name })),
        },
        onChange: () => preview(),
      });
      const f = form;
      const preview = () => {
        const r = f.read();
        if (r.errors.length) return showReports(current);
        try {
          const test = ledger.clone();
          for (const e of r.entries) test.post({ date: event.date, memo: 'Xem trước', lines: e.lines, kind: event.kind === 'closing' ? 'closing' : undefined });
          showReports(computeReports(rt.ctx, test.entries), current, 'Xem trước — chưa ghi sổ. Dòng tô vàng là khoản mục bị chạm.');
        } catch {
          showReports(current);
        }
      };
      const submit = () => {
        const r = f.read();
        if (r.errors.length) {
          mount(feedback, h('div', { class: 'result wrong' }, ...r.errors.map((e) => h('p', { text: e }))));
          return;
        }
        const res = rt.score(event, ledger, r.entries);
        const ep = prog.events[event.id];
        const attempts = (pendingAttempts[event.id] ?? 0) + 1;
        if (res.correct && !ep) {
          const before = current;
          try {
            for (const e of entryInputs(event, r.entries, 'player')) ledger.post(e);
          } catch (err) {
            mount(feedback, h('p', { class: 'bad', text: err instanceof PostingError ? err.message : String(err) }));
            return;
          }
          prog.events[event.id] = { status: attempts === 1 ? 'first' : 'retry', attempts, entries: r.entries as never };
          delete pendingAttempts[event.id];
          persist();
          lastResult = { eventId: event.id, ok: true, before };
          viewEvent = event.id;
          draw();
          return;
        }
        pendingAttempts[event.id] = attempts;
        scene.say(mentor.id, attempts >= 2 ? event.explanation : (event.hint ?? 'Xem lại các tài khoản bị lệch nhé.'));
        mount(
          feedback,
          h(
            'div',
            { class: 'result wrong' },
            h('strong', { text: `Chưa đúng (lần ${attempts}).` }),
            res.explanationLines.length ? h('ul', {}, ...res.explanationLines.map((x) => h('li', { text: x }))) : null,
            res.violations.length ? h('ul', {}, ...res.violations.map((v) => h('li', { class: 'bad', text: `Sai bản chất: ${v.message}` }))) : null,
            h('div', { class: 'explain' }, h('b', { text: `${mentor.name}: ` }), attempts >= 2 ? event.explanation : (event.hint ?? 'Xem lại các tài khoản bị lệch nhé.')),
          ),
        );
      };
      const reveal = () => {
        const before = current;
        const [main] = rt.resolveAnswers(event, ledger);
        prog.events[event.id] = { status: 'revealed', attempts: pendingAttempts[event.id] ?? 0, entries: main as never };
        delete pendingAttempts[event.id];
        persist();
        lastResult = { eventId: event.id, ok: false, before };
        viewEvent = event.id;
        draw();
      };
      workArea.append(
        form.el,
        h(
          'div',
          { class: 'actions' },
          button('Ghi sổ', submit, 'btn primary'),
          event.hint ? button('Gợi ý', () => { scene.say(mentor.id, event.hint!); toast('Kế toán trưởng vừa gợi ý ở khung thoại.'); }) : null,
          button('Xem đáp án', reveal, 'btn', 'Ghi đáp án vào sổ, nghiệp vụ này 0 điểm'),
        ),
        feedback,
      );
    } else if (prog.events[event.id]) {
      const p = prog.events[event.id]!;
      const lr = lastResult?.eventId === event.id ? lastResult : null;
      if (lr) {
        showReports(current, lr.before, 'Dòng tô vàng: khoản mục vừa thay đổi sau khi ghi sổ.');
        scene.say(mentor.id, event.explanation);
      }
      workArea.append(
        h(
          'div',
          { class: `result ${p.status === 'revealed' ? 'wrong' : 'correct'}` },
          h('strong', { text: p.status === 'first' ? `Đúng ngay lần đầu (+${POINTS.first})` : p.status === 'retry' ? `Đúng sau ${p.attempts} lần (+${POINTS.retry})` : 'Đã xem đáp án (+0)' }),
          entriesTable(rt, p.entries as ResolvedEntry[]),
          h('div', { class: 'explain' }, h('b', { text: `${mentor.name}: ` }), event.explanation),
        ),
        ...(next && isNextInMonth(next.event.id) ? [button('Nghiệp vụ tiếp theo ▶', () => { viewEvent = null; lastResult = null; draw(); }, 'btn primary')] : []),
      );
    } else {
      workArea.append(h('p', { class: 'muted', text: 'Hãy làm các nghiệp vụ trước theo thứ tự.' }));
    }

    function isNextInMonth(id: string) {
      return month.events.some((e) => e.id === id);
    }

    const canClose = monthDone(viewMonth) && !monthClosed(viewMonth);
    const closeMonth = () => {
      prog.closedMonths.push(month.id);
      persist();
      const ms = month.events.reduce((s, e) => s + POINTS[prog.events[e.id]!.status], 0);
      const bsOk = current.totals.totalAssets === current.totals.totalSources;
      const dlg = h(
        'dialog',
        {},
        h('h2', { text: `Khóa sổ ${month.label}` }),
        h('p', { text: `Điểm sổ sạch của tháng: ${ms}/${month.events.length * POINTS.first}` }),
        h('p', { class: bsOk ? 'ok' : 'bad', text: bsOk ? '✔ CĐKT cân, LCTT khớp tiền.' : '✘ Báo cáo lệch!' }),
        h('p', { text: `Tiền cuối tháng: ${formatVND(current.totals.cashClosing)} · Lợi nhuận lũy kế trước thuế: ${formatVND(current.totals.profitBeforeTax)}` }),
        ...month.outro.map((d) => h('p', {}, h('b', { text: `${rt.meta.characters.find((c) => c.id === d.speaker)?.name ?? d.speaker}: ` }), d.text)),
        button('Đóng', () => { dlg.close(); dlg.remove(); viewMonth = -1; introStep = 0; draw(); }, 'btn primary'),
      );
      document.body.appendChild(dlg);
      dlg.showModal?.();
    };

    mount(
      root,
      h(
        'div',
        { class: 'page play-page' },
        h(
          'header',
          { class: 'page-head' },
          h('a', { class: 'btn', text: '← Menu', attrs: { href: '#/' } }),
          h('h1', { text: `${rt.meta.title}: ${rt.meta.company.name}` }),
        ),
        h(
          'div',
          { class: 'score-box' },
          h('span', {}, 'Sổ sạch: ', h('b', { text: `${score.got}/${score.max}` })),
          h('span', { class: 'muted', text: REGULATION_NOTE }),
          rt.meta.tiers.tier2 ? h('a', { attrs: { href: `#/case/${caseId}/tier2` }, text: yearDone() ? 'Tầng 2 — Bắt lỗi ▶' : '' }) : null,
          rt.meta.tiers.tier3a ? h('a', { attrs: { href: `#/case/${caseId}/tier3` }, text: yearDone() ? 'Tầng 3 — Đối chiếu thuế ▶' : '' }) : null,
        ),
        app.rules.warningActive ? h('div', { class: 'warning-banner', text: '⚠ Đang bật rule chưa kiểm chứng (cờ debug).' }) : null,
        scene.el,
        introBtn ? h('div', { class: 'actions' }, introBtn) : null,
        h(
          'nav',
          { class: 'month-tabs', attrs: { 'aria-label': 'Tháng' } },
          ...rt.bundle.months.map((m, i) =>
            h('button', {
              class: `tab${i === viewMonth ? ' active' : ''}${monthClosed(i) ? ' done' : ''}`,
              text: `${m.label}${monthClosed(i) ? ' ✔' : ''}`,
              attrs: { type: 'button', disabled: i > unlocked },
              on: { click: () => { viewMonth = i; viewEvent = null; draw(); } },
            }),
          ),
        ),
        yearDone()
          ? h(
              'div',
              { class: 'panel' },
              h('h2', { text: 'Đã khóa sổ cả năm 🎉' }),
              h('p', { text: 'Ba báo cáo năm đã có trong cột bên phải (bật cột năm trước để so sánh).' }),
              h(
                'div',
                { class: 'actions' },
                rt.meta.tiers.tier2 ? h('a', { class: 'btn primary', text: 'Tầng 2 — Bắt lỗi', attrs: { href: `#/case/${caseId}/tier2` } }) : null,
                rt.meta.tiers.tier3a ? h('a', { class: 'btn primary', text: rt.meta.tiers.tier3b ? 'Tầng 3 — Đối chiếu và điều chỉnh' : 'Tầng 3 rút gọn — Đối chiếu thuế', attrs: { href: `#/case/${caseId}/tier3` } }) : null,
              ),
            )
          : null,
        h(
          'div',
          { class: 'play' },
          h(
            'aside',
            { class: 'panel' },
            h('h2', { text: month.label }),
            h(
              'ul',
              { class: 'event-list' },
              ...month.events.map((e) => {
                const p = prog.events[e.id];
                const st = p ? (p.status === 'revealed' ? '◐' : '✔') : next?.event.id === e.id ? '▶' : '·';
                const li = h('li', { class: e.id === event.id ? 'active' : '', attrs: { tabindex: 0 } }, h('span', { class: 'st', text: st }), h('span', { text: e.title }));
                li.addEventListener('click', () => { if (p || next?.event.id === e.id) { viewEvent = e.id; lastResult = null; draw(); } });
                return li;
              }),
            ),
            canClose ? button(`Khóa sổ ${month.label}`, closeMonth, 'btn primary') : null,
            monthClosed(viewMonth) ? h('p', { class: 'ok', text: '✔ Tháng đã khóa sổ' }) : null,
          ),
          h(
            'section',
            { class: 'panel event-card' },
            h('div', { class: 'date', text: new Date(event.date).toLocaleDateString('vi-VN') }),
            h('h2', { text: event.title }),
            event.unusual ? h('p', { class: 'unusual', text: '⚡ Sự kiện bất thường' }) : null,
            h('p', { text: event.narrative }),
            ruleIds.length ? h('div', { class: 'rule-tags' }, h('span', { class: 'muted small', text: 'Rule liên quan:' }), ...ruleIds.map((id) => ruleBadge(id))) : null,
            warn ? h('div', { class: 'warning-banner', text: '⚠ Nghiệp vụ này chịu ảnh hưởng của rule CHƯA KIỂM CHỨNG đang được bật thủ công.' }) : null,
            ...documentsView(event),
            ...(isActive ? dynamicDocs(rt, event, ledger) : []),
            h('h3', { text: 'Định khoản' }),
            h('p', { class: 'muted small', text: `TK được dùng tháng này: ${accounts.join(', ')}` }),
            workArea,
          ),
          h(
            'section',
            {},
            h('label', { class: 'muted small' }, (() => {
              const cb = h('input', { attrs: { type: 'checkbox', checked: showPrior } });
              cb.addEventListener('change', () => { showPrior = cb.checked; draw(); });
              return cb;
            })(), ' Hiện cột năm trước'),
            reportsBox,
          ),
        ),
      ),
    );
  }

  const pendingAttempts: Record<string, number> = {};
  let lastResult: { eventId: string; ok: boolean; before: Reports } | null = null;
  draw();
}

export function entriesTable(rt: CaseRuntime, entries: { memo?: string; lines: LineInput[] }[]) {
  return h(
    'table',
    { class: 'journal' },
    h('thead', {}, h('tr', {}, h('th', { text: 'TK' }), h('th', { text: 'Chi tiết' }), h('th', { class: 'num', text: 'Nợ' }), h('th', { class: 'num', text: 'Có' }))),
    h(
      'tbody',
      {},
      ...entries.flatMap((e, i) => [
        ...(entries.length > 1 || e.memo ? [h('tr', {}, h('td', { attrs: { colspan: 4 }, class: 'muted small', text: e.memo ?? `Bút toán ${i + 1}` }))] : []),
        ...e.lines.map((l) =>
          h(
            'tr',
            {},
            h('td', { text: accountLabel(rt.ctx, l.account) }),
            h('td', { class: 'small', text: [l.partner && rt.partnerName(l.partner), l.item && rt.itemName(l.item), l.segment && rt.segmentName(l.segment)].filter(Boolean).join(', ') }),
            h('td', { class: 'num', text: l.debit ? formatVND(l.debit) : '' }),
            h('td', { class: 'num', text: l.credit ? formatVND(l.credit) : '' }),
          ),
        ),
      ]),
    ),
  );
}
