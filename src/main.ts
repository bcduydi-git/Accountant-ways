import './styles.css';
import { h, mount } from './ui/dom';
import { renderMenu } from './ui/menu';
import { renderDebug } from './ui/debug';
import { renderRules } from './ui/rules-screen';
import { renderCase } from './ui/case-screen';
import { renderTier2 } from './ui/tier2';
import { renderTier3 } from './ui/tier3';
import { applyFonts } from './scene/assets';

const root = document.getElementById('app')!;

function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  try {
    if (parts[0] === 'debug') return renderDebug(root);
    if (parts[0] === 'rules') return renderRules(root);
    if (parts[0] === 'case' && parts[1]) {
      if (parts[2] === 'tier2') return renderTier2(root, parts[1]);
      if (parts[2] === 'tier3') return renderTier3(root, parts[1]);
      return renderCase(root, parts[1]);
    }
    return renderMenu(root);
  } catch (err) {
    console.error(err);
    mount(root, h('div', { class: 'page' }, h('h1', { text: 'Có lỗi khi mở màn này' }), h('pre', { text: String(err) }), h('a', { class: 'btn', text: '← Menu', attrs: { href: '#/' } })));
  }
}

applyFonts();
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });
route();
