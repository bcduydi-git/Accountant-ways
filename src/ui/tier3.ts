import { h, mount } from './dom';
export function renderTier3(root: HTMLElement, id: string) {
  mount(root, h('div', { class: 'page' }, h('p', { text: `Tầng 3 của ${id}: đang dựng (M2).` })));
}
