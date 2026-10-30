import { h, mount } from './dom';
export function renderTier2(root: HTMLElement, id: string) {
  mount(root, h('div', { class: 'page' }, h('p', { text: `Tầng 2 của ${id}: đang dựng (M2).` })));
}
