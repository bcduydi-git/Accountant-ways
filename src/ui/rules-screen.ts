import { app } from './app-state';
import { h, mount } from './dom';
import { REGULATION_NOTE } from './menu';

const STATUS_LABEL = {
  'verified-primary': 'Đã đọc văn bản gốc',
  'verified-secondary': 'Nguồn thứ cấp',
  unverified: 'Chưa kiểm chứng',
} as const;

export function ruleBadge(id: string) {
  const r = app.rules.get(id);
  const enabled = app.rules.isEnabled(id);
  const cls = r.status === 'unverified' ? 'badge badge-warn' : r.status === 'verified-secondary' ? 'badge badge-secondary' : 'badge';
  return h('span', { class: cls, title: `${r.description}\nCăn cứ: ${r.basis}\nTrạng thái: ${STATUS_LABEL[r.status]}${enabled ? '' : ' — đang TẮT'}`, text: `${r.status === 'verified-secondary' ? 'ⓘ nguồn thứ cấp' : r.status === 'unverified' ? '⚠ chưa kiểm chứng' : '✔ văn bản gốc'}` });
}

export function renderRules(root: HTMLElement) {
  mount(
    root,
    h(
      'div',
      { class: 'page' },
      h('header', { class: 'page-head' }, h('a', { class: 'btn', text: '← Menu', attrs: { href: '#/' } }), h('h1', { text: 'Quy định và rule pháp lý' })),
      h('p', { text: `${REGULATION_NOTE}. Game không tự cập nhật theo luật mới. Rule chưa kiểm chứng văn bản gốc mặc định TẮT.` }),
      app.rules.warningActive ? h('div', { class: 'warning-banner', text: '⚠ Đang bật rule chưa kiểm chứng (cờ debug).' }) : null,
      h(
        'table',
        { class: 'rules' },
        h('thead', {}, h('tr', {}, h('th', { text: 'Rule' }), h('th', { text: 'Nội dung' }), h('th', { text: 'Căn cứ' }), h('th', { text: 'Trạng thái' }), h('th', { text: 'Bật?' }))),
        h(
          'tbody',
          {},
          ...app.rules.all().map((r) =>
            h(
              'tr',
              { class: app.rules.isEnabled(r.id) ? '' : 'off' },
              h('td', { class: 'mono', text: r.id }),
              h('td', { text: r.description }),
              h('td', { text: r.basis }),
              h('td', {}, ruleBadge(r.id)),
              h('td', { text: app.rules.isEnabled(r.id) ? 'Bật' : 'Tắt' }),
            ),
          ),
        ),
      ),
    ),
  );
}
