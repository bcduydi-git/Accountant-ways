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
  // Hash dạng tên phẳng (#menu, #rules, #debug, #ho-so-1, #ho-so-1-tier2) để chạy được cả trong trang Artifact.
  // Vẫn nhận dạng cũ #/case/ho-so-1/tier2.
  const hash = location.hash.replace(/^#\/?/, '');
  const old = /^case\/([^/]+)(?:\/(tier2|tier3))?$/.exec(hash);
  const m = old ? [hash, old[1], old[2]] : /^(ho-so-\d+)(?:-(tier2|tier3))?$/.exec(hash);
  try {
    if (hash === 'debug') return renderDebug(root);
    if (hash === 'rules') return renderRules(root);
    if (m && m[1]) {
      if (m[2] === 'tier2') return renderTier2(root, m[1]);
      if (m[2] === 'tier3') return renderTier3(root, m[1]);
      return renderCase(root, m[1]);
    }
    return renderMenu(root);
  } catch (err) {
    console.error(err);
    mount(root, h('div', { class: 'page' }, h('h1', { text: 'Có lỗi khi mở màn này' }), h('pre', { text: String(err) }), h('a', { class: 'btn', text: '← Menu', attrs: { href: '#menu' } })));
  }
}

applyFonts();
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });
route();
