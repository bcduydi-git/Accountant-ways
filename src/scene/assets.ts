import manifestRaw from '../../data/asset-manifest.json';

// Nạp font và sprite từ assets/ (SPEC 9). Thiếu file → dùng font hệ thống và hình giữ chỗ.

export interface SpriteRef {
  src: string;
  frame?: [number, number, number, number];
}

interface Manifest {
  fonts: Record<string, { family: string; files: Record<string, string> }>;
  office: Record<string, string | SpriteRef | null>;
  characters: Record<string, string | SpriteRef | null>;
  ui: Record<string, string | SpriteRef | null>;
}

export const manifest = manifestRaw as unknown as Manifest;

export const fontStatus: Record<string, 'loaded' | 'missing' | 'pending'> = {};

/** Nạp font theo manifest; lỗi thì bỏ qua để CSS rơi về font dự phòng. */
export async function applyFonts(): Promise<Record<string, 'loaded' | 'missing' | 'pending'>> {
  if (typeof FontFace === 'undefined' || typeof document === 'undefined') return fontStatus;
  const jobs: Promise<void>[] = [];
  for (const [key, f] of Object.entries(manifest.fonts)) {
    for (const [weight, url] of Object.entries(f.files)) {
      const id = `${key}:${weight}`;
      fontStatus[id] = 'pending';
      const face = new FontFace(f.family, `url(${url})`, { weight, display: 'swap' });
      jobs.push(
        face
          .load()
          .then((loaded) => {
            document.fonts.add(loaded);
            fontStatus[id] = 'loaded';
          })
          .catch(() => {
            fontStatus[id] = 'missing';
          }),
      );
    }
  }
  await Promise.all(jobs);
  return fontStatus;
}

const cache = new Map<string, Promise<HTMLImageElement | null>>();

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!cache.has(src)) {
    cache.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      }),
    );
  }
  return cache.get(src)!;
}

export function spriteRef(v: string | SpriteRef | null | undefined): SpriteRef | null {
  if (!v) return null;
  return typeof v === 'string' ? { src: v } : v;
}

export async function loadSprite(v: string | SpriteRef | null | undefined) {
  const ref = spriteRef(v);
  if (!ref) return null;
  const img = await loadImage(ref.src);
  return img ? { img, frame: ref.frame } : null;
}
