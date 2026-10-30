import { listCaseIds, loadCase } from '../data/registry';
import { exportSave, parseSave } from '../game/save';
import { app, persist, rebuildRules, replaceSave } from './app-state';
import { button, h, mount, toast } from './dom';

export const REGULATION_NOTE = 'Quy định áp dụng tại 30/10/2026';

export function downloadSave() {
  try {
    const blob = new Blob([exportSave(app.save)], { type: 'application/json' });
    const a = h('a', { attrs: { href: URL.createObjectURL(blob), download: `so-sach-nguoi-de-lai-${new Date().toISOString().slice(0, 10)}.json` } });
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    toast('Không xuất được file lưu.');
  }
}

export function importSaveButton(onDone: () => void) {
  const input = h('input', { attrs: { type: 'file', accept: 'application/json,.json', hidden: true } });
  input.addEventListener('change', async () => {
    const f = input.files?.[0];
    if (!f) return;
    const r = parseSave(await f.text());
    if (!r.ok) return toast(r.error);
    replaceSave(r.data);
    toast('Đã nhập file lưu.');
    onDone();
  });
  return h('span', {}, input, button('Nhập file lưu', () => input.click()));
}

export function renderMenu(root: HTMLElement) {
  const cases = listCaseIds().map((id) => loadCase(id)).sort((a, b) => a.meta.order - b.meta.order);
  const draw = () =>
    mount(
      root,
      h(
        'div',
        { class: 'page menu' },
        h('h1', { class: 'pixel-title', text: 'Sổ Sách Người Để Lại' }),
        h('p', { class: 'subtitle', text: `Game học kế toán Việt Nam · Năm tài chính 2026 · ${REGULATION_NOTE}` }),
        app.rules.warningActive ? h('div', { class: 'warning-banner', text: '⚠ Đang bật rule CHƯA KIỂM CHỨNG văn bản gốc (chế độ debug). Kết quả thuế có thể sai.' }) : null,
        !app.persisted ? h('div', { class: 'warning-banner', text: 'Trình duyệt chặn lưu trữ cục bộ — hãy dùng "Xuất file lưu" để giữ tiến độ.' }) : null,
        h(
          'div',
          { class: 'case-grid' },
          ...cases.map((c) => {
            const prog = app.save.cases[c.meta.id];
            const total = c.months.reduce((s, m) => s + m.events.length, 0);
            const done = prog ? Object.keys(prog.events).length : 0;
            return h(
              'a',
              { class: 'case-card', attrs: { href: `#/case/${c.meta.id}` } },
              h('div', { class: 'case-type', text: c.meta.type }),
              h('h2', { text: c.meta.title }),
              h('p', { text: c.meta.company.name }),
              h('p', { class: 'muted', text: c.meta.company.description }),
              h('div', { class: 'progress' }, h('div', { class: 'bar', style: { width: `${total ? (100 * done) / total : 0}%` } })),
              h('p', { class: 'muted', text: `${done}/${total} nghiệp vụ` }),
            );
          }),
        ),
        h(
          'div',
          { class: 'actions' },
          button('Xuất file lưu (.json)', downloadSave),
          importSaveButton(draw),
          h('a', { class: 'btn', text: 'Quy định & rule', attrs: { href: '#/rules' } }),
          h('a', { class: 'btn', text: 'Màn debug', attrs: { href: '#/debug' } }),
          h('a', { class: 'btn', text: 'Thử font', attrs: { href: 'font-test.html' } }),
        ),
        h(
          'label',
          { class: 'debug-flag' },
          (() => {
            const cb = h('input', { attrs: { type: 'checkbox', checked: app.save.settings.enableUnverified } });
            cb.addEventListener('change', () => {
              app.save.settings.enableUnverified = cb.checked;
              rebuildRules();
              persist();
              draw();
            });
            return cb;
          })(),
          ' Cờ debug: bật cả rule chưa kiểm chứng (sẽ hiện biển cảnh báo)',
        ),
        h('p', { class: 'muted small', text: 'Dùng cá nhân, phi thương mại. Công ty và nhân vật đều hư cấu.' }),
      ),
    );
  draw();
}
