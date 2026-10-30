import { formatVND } from '../engine/format';
import type { ReportLine, Reports } from '../engine/reports';
import type { EngineContext } from '../engine/types';
import { h } from './dom';

export type ReportTab = 'bs' | 'is' | 'cfd' | 'cfi';

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'bs', label: 'CĐKT' },
  { id: 'is', label: 'KQKD' },
  { id: 'cfd', label: 'LCTT trực tiếp' },
  { id: 'cfi', label: 'LCTT gián tiếp' },
];

export interface ReportsViewOptions {
  ctx: EngineContext;
  reports: Reports;
  /** Báo cáo trước khi ghi/xem trước — để tô sáng khoản mục bị chạm. */
  baseline?: Reports;
  /** Cột năm trước (CĐKT đầu kỳ, KQKD năm trước). */
  prior?: { bs?: ReportLine[]; is?: ReportLine[] };
  /** Nhãn cột so sánh khi dùng baseline (vd "Trước điều chỉnh"). */
  baselineLabel?: string;
  currentLabel?: string;
  tab?: ReportTab;
  onTab?: (t: ReportTab) => void;
  previewNote?: string;
  /** Cho phép chọn dòng (Tầng 2). */
  onPickLine?: (report: 'CĐKT' | 'KQKD' | 'LCTT', line: ReportLine) => void;
  tabs?: ReportTab[];
}

const REPORT_NAME: Record<ReportTab, 'CĐKT' | 'KQKD' | 'LCTT'> = { bs: 'CĐKT', is: 'KQKD', cfd: 'LCTT', cfi: 'LCTT' };

function linesFor(r: Reports, tab: ReportTab): ReportLine[] {
  return tab === 'bs' ? r.balanceSheet : tab === 'is' ? r.incomeStatement : tab === 'cfd' ? r.cashFlowDirect : r.cashFlowIndirect;
}

export function templateBadge(ctx: EngineContext) {
  return ctx.template.status === 'temp'
    ? h('span', { class: 'badge badge-temp', text: ctx.template.label, title: ctx.template.note ?? '' })
    : h('span', { class: 'badge', text: ctx.template.label });
}

export function reportsView(o: ReportsViewOptions): HTMLElement {
  let tab: ReportTab = o.tab ?? 'bs';
  const root = h('section', { class: 'reports', attrs: { 'aria-label': 'Báo cáo tài chính' } });
  const render = () => {
    root.replaceChildren();
    const t = o.reports.totals;
    const bsOk = t.totalAssets === t.totalSources;
    const cfOk = t.cfoDirect === t.cfoIndirect && t.cashOpening + t.netCashFlow === t.cashClosing;
    root.append(
      h(
        'div',
        { class: 'reports-head' },
        h('div', { class: 'tabs', attrs: { role: 'tablist' } }, ...(o.tabs ? TABS.filter((x) => o.tabs!.includes(x.id)) : TABS).map((x) =>
          h('button', {
            class: `tab${x.id === tab ? ' active' : ''}`,
            text: x.label,
            attrs: { type: 'button', role: 'tab', 'aria-selected': x.id === tab },
            on: { click: () => { tab = x.id; o.onTab?.(tab); render(); } },
          }),
        )),
        templateBadge(o.ctx),
      ),
      h(
        'div',
        { class: 'checks' },
        h('span', { class: bsOk ? 'ok' : 'bad', text: bsOk ? '✔ CĐKT cân' : '✘ CĐKT lệch' }),
        h('span', { class: cfOk ? 'ok' : 'bad', text: cfOk ? '✔ LCTT khớp tiền' : '✘ LCTT lệch' }),
        h('span', { class: 'cash-health', title: 'Chỉ để quan sát, không cộng điểm', text: `Tiền thuần từ HĐKD: ${formatVND(t.cfoDirect)}` }),
      ),
      ...(o.previewNote ? [h('div', { class: 'preview-note', text: o.previewNote })] : []),
      table(o, tab),
    );
    if (o.reports.unallocatedProduction !== 0 && tab === 'is') {
      root.append(h('p', { class: 'muted', text: `${o.ctx.template.incomeStatement.productionLabel ?? ''}: ${formatVND(o.reports.unallocatedProduction)}` }));
    }
  };
  render();
  return root;
}

function table(o: ReportsViewOptions, tab: ReportTab) {
  const cur = linesFor(o.reports, tab);
  const base = o.baseline ? linesFor(o.baseline, tab) : undefined;
  const prior = tab === 'bs' ? o.prior?.bs : tab === 'is' ? o.prior?.is : undefined;
  const head = h(
    'tr',
    {},
    h('th', { text: 'Mã', class: 'code' }),
    h('th', { text: 'Chỉ tiêu' }),
    base && o.baselineLabel ? h('th', { class: 'num', text: o.baselineLabel }) : null,
    h('th', { class: 'num', text: o.currentLabel ?? 'Kỳ này' }),
    base ? h('th', { class: 'num', text: 'Thay đổi' }) : null,
    prior ? h('th', { class: 'num', text: tab === 'bs' ? 'Đầu năm' : 'Năm trước' }) : null,
  );
  const rows = cur.map((l) => {
    const b = base?.find((x) => x.code === l.code);
    const delta = b ? l.value - b.value : 0;
    const p = prior?.find((x) => x.code === l.code);
    const cls = [l.bold ? 'bold' : '', l.header ? 'header' : '', delta !== 0 ? 'touched' : '', o.onPickLine && !l.header ? 'pickable' : '']
      .filter(Boolean)
      .join(' ');
    const tr = h(
      'tr',
      { class: cls },
      h('td', { class: 'code', text: l.code }),
      h('td', { class: `label lv${l.level ?? 0}`, text: l.label }),
      base && o.baselineLabel ? h('td', { class: 'num', text: l.header ? '' : formatVND(b?.value ?? 0) }) : null,
      h('td', { class: 'num', text: l.header ? '' : formatVND(l.value) }),
      base ? h('td', { class: `num delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`, text: delta ? (delta > 0 ? '+' : '') + formatVND(delta, { parens: false }) : '' }) : null,
      prior ? h('td', { class: 'num prior', text: l.header ? '' : p ? formatVND(p.value) : '—' }) : null,
    );
    if (o.onPickLine && !l.header) {
      tr.tabIndex = 0;
      tr.addEventListener('click', () => o.onPickLine!(REPORT_NAME[tab], l));
      tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') o.onPickLine!(REPORT_NAME[tab], l); });
    }
    return tr;
  });
  return h('div', { class: 'table-wrap' }, h('table', { class: 'report' }, h('thead', {}, head), h('tbody', {}, ...rows)));
}
