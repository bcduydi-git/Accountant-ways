import { listCaseIds, loadCase } from '../data/registry';
import { exportSave, parseSave } from '../game/save';
import { app, persist, rebuildRules, replaceSave } from './app-state';
import { button, h, mount, toast } from './dom';

export const REGULATION_NOTE = 'Quy định áp dụng tại 30/10/2026';

function modal(...children: HTMLElement[]) {
  const dlg = h('dialog', {}, ...children, button('Đóng', () => { dlg.close(); dlg.remove(); }));
  document.body.appendChild(dlg);
  dlg.showModal?.();
  return dlg;
}

/** Xuất tiến độ: tải file .json, kèm ô văn bản để sao chép (trang Artifact chặn tải file). */
export function downloadSave() {
  const text = exportSave(app.save);
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const a = h('a', { attrs: { href: URL.createObjectURL(blob), download: `so-sach-nguoi-de-lai-${new Date().toISOString().slice(0, 10)}.json` } });
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    // Bỏ qua: vẫn còn cách sao chép bên dưới.
  }
  const area = h('textarea', { attrs: { id: 'save-export', rows: 10, readonly: true, 'aria-label': 'Nội dung file lưu' }, style: { width: '100%' } });
  area.value = text;
  modal(
    h('h2', { text: 'Xuất tiến độ' }),
    h('p', { text: 'Nếu trình duyệt không tải file về, hãy sao chép đoạn dưới và lưu thành file .json (hoặc dán thẳng vào ô "Nhập tiến độ" trên máy khác).' }),
    area,
    button('Sao chép', () => {
      navigator.clipboard?.writeText(text).then(() => toast('Đã sao chép.'), () => { area.select(); toast('Hãy bấm Ctrl+C để sao chép.'); });
    }, 'btn primary'),
  );
}

export function importSaveButton(onDone: () => void) {
  const open = () => {
    const input = h('input', { attrs: { type: 'file', accept: 'application/json,.json', id: 'save-import-file' } });
    const area = h('textarea', { attrs: { id: 'save-import-text', rows: 8, placeholder: 'Dán nội dung file lưu vào đây…', 'aria-label': 'Nội dung file lưu' }, style: { width: '100%' } });
    const apply = (text: string) => {
      const r = parseSave(text);
      if (!r.ok) return toast(r.error);
      replaceSave(r.data);
      toast('Đã nhập tiến độ.');
      dlg.close();
      dlg.remove();
      onDone();
    };
    input.addEventListener('change', async () => { const f = input.files?.[0]; if (f) apply(await f.text()); });
    const dlg = modal(h('h2', { text: 'Nhập tiến độ' }), h('p', { text: 'Chọn file .json đã xuất, hoặc dán nội dung vào ô dưới.' }), input, area, button('Nạp đoạn đã dán', () => apply(area.value), 'btn primary'));
  };
  return button('Nhập file lưu', open);
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
              { class: 'case-card', attrs: { href: `#${c.meta.id}` } },
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
          h('a', { class: 'btn', text: 'Quy định & rule', attrs: { href: '#rules' } }),
          h('a', { class: 'btn', text: 'Màn debug', attrs: { href: '#debug' } }),
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
