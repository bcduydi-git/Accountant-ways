import './styles.css';
import { applyFonts, manifest } from './scene/assets';
import { h, mount } from './ui/dom';
import { formatVND } from './engine/format';

// Trang /font-test (SPEC 9): thử dấu tiếng Việt ở cỡ thực tế và chữ số đều độ rộng.
const SAMPLE_LOWER = 'ấ ầ ẩ ẫ ậ ế ề ể ễ ệ ố ồ ổ ỗ ộ ớ ờ ở ỡ ợ ứ ừ ử ữ ự đ';
const SAMPLE_UPPER = 'Ấ Ầ Ẩ Ẫ Ậ Ế Ề Ể Ễ Ệ Ố Ồ Ổ Ỗ Ộ Ớ Ờ Ở Ỡ Ợ Ứ Ừ Ử Ữ Ự Ẩ Ỗ Đ';
const SENTENCE = 'Sổ Sách Người Để Lại — Kế toán trưởng: “Định khoản xong nhớ khóa sổ cuối tháng nhé!”';
const NUMBERS = [1000000, 64800000, 111111111, 7500, 2400000000];

const root = document.getElementById('app')!;

async function render() {
  const status = await applyFonts();
  const loaded = (family: string) =>
    Object.entries(manifest.fonts)
      .filter(([, f]) => f.family === family)
      .flatMap(([k, f]) => Object.keys(f.files).map((w) => status[`${k}:${w}`]))
      .some((s) => s === 'loaded');
  const block = (family: string, sizes: number[]) =>
    h(
      'section',
      { class: 'panel', style: { margin: '12px 0' } },
      h('h2', { text: `${family} — ${loaded(family) ? 'ĐÃ NẠP file font' : 'CHƯA có file (đang hiện font dự phòng)'}` }),
      ...sizes.map((px) =>
        h(
          'div',
          { style: { fontFamily: `'${family}', monospace`, fontSize: `${px}px`, margin: '8px 0' } },
          h('div', { class: 'muted small', text: `${px}px` }),
          h('div', { text: SAMPLE_LOWER }),
          h('div', { text: SAMPLE_UPPER }),
          h('div', { text: SENTENCE }),
        ),
      ),
    );
  const numbers = (feature: string) =>
    h(
      'table',
      { class: 'grid', style: { width: 'auto', fontFamily: "'Be Vietnam Pro', sans-serif", fontVariantNumeric: feature } },
      h('tbody', {}, ...NUMBERS.map((n) => h('tr', {}, h('td', { class: 'num', style: { fontVariantNumeric: feature }, text: formatVND(n) })))),
    );
  mount(
    root,
    h(
      'div',
      { class: 'page' },
      h('a', { class: 'btn', text: '← Về game', attrs: { href: 'index.html' } }),
      h('h1', { text: 'Thử font tiếng Việt' }),
      h('p', { class: 'muted', text: 'Đặt file font vào assets/_raw/<tên-gói>/ theo data/asset-manifest.json rồi tải lại trang. Kiểm tra bằng mắt: dấu không bị cắt, không chồng, không rơi về ô vuông.' }),
      block('Cairopixel', [16, 32]),
      block('VT323', [16, 24, 32]),
      block('Be Vietnam Pro', [13, 15, 18]),
      h(
        'section',
        { class: 'panel' },
        h('h2', { text: 'Cột số: tabular-nums (trái) và mặc định (phải)' }),
        h('div', { style: { display: 'flex', gap: '24px' } }, numbers('tabular-nums'), numbers('normal')),
        h('p', { class: 'muted', text: 'Nếu hai cột lệch nhau khi dùng tabular-nums, font thiếu chữ số đều độ rộng → game giữ căn phải và font số dự phòng (biến --font-num).' }),
      ),
    ),
  );
}
void render();
