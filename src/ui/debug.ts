import { buildContext } from '../engine/coa';
import { Ledger, PostingError } from '../engine/ledger';
import { computeReports } from '../engine/reports';
import { keySpecFrom } from '../engine/scoring';
import type { EntryInput } from '../engine/types';
import { formatVND } from '../engine/format';
import { loadCoa, loadTemplate, rawFiles } from '../data/registry';
import { app, persist } from './app-state';
import { button, h, mount, toast } from './dom';
import { entryForm } from './entry-form';
import { reportsView } from './reports-view';

interface SampleFile {
  opening: EntryInput['lines'];
  entries: (EntryInput & { memo: string })[];
}

/** Màn debug (M0): nhập bút toán tay vào một sổ thử, xem ba báo cáo. */
export function renderDebug(root: HTMLElement) {
  const sample = rawFiles()['/data/debug/sample-entries.json'] as SampleFile;
  const ctx = buildContext(loadCoa(), loadTemplate('temp-simplified'), { 'bank-mau': 'short' });
  const spec = keySpecFrom({ '131': ['partner'], '331': ['partner'], '3411': ['partner'] });
  const partners = [
    { id: 'kh-mau', name: 'Khách hàng mẫu' },
    { id: 'ncc-mau', name: 'Nhà cung cấp mẫu' },
    { id: 'bank-mau', name: 'Ngân hàng mẫu (vay ngắn hạn)' },
  ];

  const build = () => {
    const l = new Ledger(ctx);
    l.post({ date: '2026-01-01', kind: 'opening', memo: 'Số dư đầu kỳ mẫu', lines: sample.opening });
    for (const e of app.save.debugEntries) l.post({ date: e.date, memo: e.memo, lines: e.lines });
    return l;
  };

  const draw = () => {
    const ledger = build();
    const form = entryForm({ ctx, accounts: [...ctx.postable].sort(), spec, details: { partner: partners, item: [], segment: [] } });
    const reports = computeReports(ctx, ledger.entries);
    const msg = h('div', { class: 'feedback', attrs: { 'aria-live': 'polite' } });
    const post = () => {
      const r = form.read();
      if (r.errors.length) {
        mount(msg, h('div', { class: 'bad' }, ...r.errors.map((e) => h('p', { text: e }))));
        return;
      }
      try {
        const test = build();
        for (const e of r.entries) test.post({ date: '2026-01-31', memo: 'Nhập tay', lines: e.lines });
        for (const e of r.entries) app.save.debugEntries.push({ memo: `Nhập tay #${app.save.debugEntries.length + 1}`, date: '2026-01-31', lines: e.lines as never });
        persist();
        draw();
        toast('Đã ghi sổ thử.');
      } catch (err) {
        mount(msg, h('p', { class: 'bad', text: err instanceof PostingError ? err.message : String(err) }));
      }
    };
    mount(
      root,
      h(
        'div',
        { class: 'page debug' },
        h('header', { class: 'page-head' }, h('a', { class: 'btn', text: '← Menu', attrs: { href: '#/' } }), h('h1', { text: 'Màn debug — nhập bút toán tay' })),
        h('p', { class: 'muted', text: 'Sổ thử độc lập với các hồ sơ. Mọi bút toán đi qua post(); ba báo cáo tính từ sổ cái.' }),
        h(
          'div',
          { class: 'two-col' },
          h(
            'div',
            {},
            form.el,
            h(
              'div',
              { class: 'actions' },
              button('Ghi sổ', post, 'btn primary'),
              button('Nạp 10 bút toán mẫu', () => {
                app.save.debugEntries = sample.entries.map((e) => ({ memo: e.memo, date: e.date, lines: e.lines as never }));
                persist();
                draw();
              }),
              button('Xóa sổ thử', () => {
                app.save.debugEntries = [];
                persist();
                draw();
              }),
            ),
            msg,
            h('h2', { text: `Nhật ký (${ledger.entries.length} bút toán)` }),
            h(
              'table',
              { class: 'journal' },
              h('thead', {}, h('tr', {}, h('th', { text: 'Bút toán' }), h('th', { text: 'TK' }), h('th', { class: 'num', text: 'Nợ' }), h('th', { class: 'num', text: 'Có' }))),
              h(
                'tbody',
                {},
                ...ledger.entries.flatMap((e) =>
                  e.lines.map((ln, i) =>
                    h('tr', {}, h('td', { text: i === 0 ? e.memo ?? e.id : '' }), h('td', { text: ln.account + (ln.partner ? ` (${ln.partner})` : '') }), h('td', { class: 'num', text: ln.debit ? formatVND(ln.debit) : '' }), h('td', { class: 'num', text: ln.credit ? formatVND(ln.credit) : '' })),
                  ),
                ),
              ),
            ),
          ),
          reportsView({ ctx, reports }),
        ),
      ),
    );
  };
  draw();
}
