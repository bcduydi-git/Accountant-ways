import { h } from '../ui/dom';
import { loadSprite, manifest } from './assets';

// Cảnh pixel vẽ bằng Canvas 2D (SPEC 5.1). Chưa có asset thì vẽ khối màu giữ chỗ.

export interface SceneCharacter {
  id: string;
  name: string;
  role: string;
  color: string;
}

const W = 320;
const H = 112;

type Loaded = { img: HTMLImageElement; frame?: [number, number, number, number] } | null;

export class Scene {
  readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly g: CanvasRenderingContext2D | null;
  private readonly nameEl: HTMLElement;
  private readonly textEl: HTMLElement;
  private speaking: string | null = null;
  private sprites = new Map<string, Loaded>();
  private office: Record<string, Loaded> = {};

  constructor(private readonly chars: SceneCharacter[]) {
    this.canvas = h('canvas', { class: 'scene-canvas', attrs: { width: W, height: H, 'aria-hidden': 'true' } });
    this.g = this.canvas.getContext('2d');
    this.nameEl = h('div', { class: 'speaker' });
    this.textEl = h('div', { class: 'line' });
    this.el = h('div', { class: 'scene' }, this.canvas, h('div', { class: 'dialogue', attrs: { 'aria-live': 'polite' } }, this.nameEl, this.textEl));
    void this.loadAssets();
    this.draw();
  }

  private async loadAssets() {
    for (const c of this.chars) this.sprites.set(c.id, await loadSprite(manifest.characters[c.id]));
    for (const k of Object.keys(manifest.office)) this.office[k] = await loadSprite(manifest.office[k]);
    this.draw();
  }

  say(speakerId: string, text: string) {
    const c = this.chars.find((x) => x.id === speakerId);
    this.speaking = speakerId;
    this.nameEl.textContent = c ? `${c.name} · ${c.role}` : speakerId;
    this.nameEl.style.color = c?.color ?? '';
    this.textEl.textContent = text;
    this.draw();
  }

  private blit(s: Loaded, x: number, y: number, w: number, hgt: number) {
    if (!s || !this.g) return false;
    const [sx, sy, sw, sh] = s.frame ?? [0, 0, s.img.width, s.img.height];
    this.g.drawImage(s.img, sx, sy, sw, sh, x, y, w, hgt);
    return true;
  }

  draw() {
    const g = this.g;
    if (!g) return;
    g.imageSmoothingEnabled = false;
    if (!this.blit(this.office.background ?? null, 0, 0, W, H)) {
      // Tường, cửa sổ, sàn caro
      g.fillStyle = '#3b3f58';
      g.fillRect(0, 0, W, 64);
      g.fillStyle = '#8fb8de';
      g.fillRect(20, 12, 56, 30);
      g.fillRect(244, 12, 56, 30);
      g.fillStyle = '#3b3f58';
      g.fillRect(47, 12, 2, 30);
      g.fillRect(271, 12, 2, 30);
      g.fillStyle = '#c9a66b';
      g.fillRect(120, 14, 80, 22);
      g.fillStyle = '#3b3f58';
      g.font = '8px monospace';
      g.fillText('SỔ SÁCH', 140, 28);
      for (let y = 64; y < H; y += 8)
        for (let x = 0; x < W; x += 8) {
          g.fillStyle = (x + y) % 16 === 0 ? '#6b5a4a' : '#5e4f41';
          g.fillRect(x, y, 8, 8);
        }
    }
    const n = this.chars.length;
    this.chars.forEach((c, i) => {
      const cx = Math.round(((i + 1) * W) / (n + 1));
      const talking = c.id === this.speaking;
      const baseY = talking ? 52 : 54;
      // Bàn làm việc
      if (!this.blit(this.office.desk ?? null, cx - 18, 78, 36, 18)) {
        g.fillStyle = '#8a6a4a';
        g.fillRect(cx - 18, 80, 36, 6);
        g.fillStyle = '#6a4f36';
        g.fillRect(cx - 16, 86, 4, 12);
        g.fillRect(cx + 12, 86, 4, 12);
      }
      if (!this.blit(this.sprites.get(c.id) ?? null, cx - 12, baseY - 8, 24, 32)) {
        g.fillStyle = c.color;
        g.fillRect(cx - 7, baseY + 6, 14, 18);
        g.fillStyle = '#f1c9a5';
        g.fillRect(cx - 5, baseY - 6, 10, 11);
        g.fillStyle = '#2b2b2b';
        g.fillRect(cx - 5, baseY - 7, 10, 3);
        g.fillRect(cx - 3, baseY - 1, 1, 1);
        g.fillRect(cx + 2, baseY - 1, 1, 1);
      }
      if (talking) {
        g.fillStyle = '#ffe066';
        g.fillRect(cx - 2, baseY - 16, 4, 4);
        g.fillRect(cx - 1, baseY - 12, 2, 2);
      }
      g.fillStyle = talking ? '#ffe066' : '#e8e8e8';
      g.font = '7px monospace';
      const label = c.name.split(' ').slice(-1)[0] ?? c.name;
      g.fillText(label, cx - label.length * 2, 108);
    });
  }
}
