import { h, mount } from './dom';
export function renderCase(root: HTMLElement, id: string) {
  mount(root, h('div', { class: 'page' }, h('p', { text: `Hồ sơ ${id}: đang dựng (M1).` })));
}
