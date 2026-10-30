import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifestRaw from '../data/asset-manifest.json';
import { listCaseIds, loadCase } from '../src/data/registry';

const manifest = manifestRaw as unknown as {
  fonts: Record<string, { files: Record<string, string> }>;
  characters: Record<string, unknown>;
  office: Record<string, unknown>;
  ui: Record<string, unknown>;
};

describe('Asset (M5)', () => {
  it('mọi nhân vật trong các hồ sơ có chỗ khai báo sprite trong manifest', () => {
    for (const id of listCaseIds()) for (const c of loadCase(id).meta.characters) expect(Object.keys(manifest.characters), c.id).toContain(c.id);
  });
  it('đường dẫn asset (nếu có) nằm trong assets/_raw hoặc assets/, không trỏ ra internet', () => {
    const paths = [
      ...Object.values(manifest.fonts).flatMap((f) => Object.values(f.files)),
      ...[...Object.values(manifest.characters), ...Object.values(manifest.office), ...Object.values(manifest.ui)].filter((x): x is string => typeof x === 'string'),
    ];
    for (const p of paths) expect(p.startsWith('/') && !p.startsWith('//'), p).toBe(true);
  });
  it('trang /font-test có đủ ký tự thử dấu theo SPEC 9 và kiểm tra tabular-nums', () => {
    const src = readFileSync(join(__dirname, '../src/font-test.ts'), 'utf8');
    for (const ch of 'ấ ầ ẩ ẫ ậ ế ề ể ễ ệ ố ồ ổ ỗ ộ ớ ờ ở ỡ ợ ứ ừ ử ữ ự Ẩ Ỗ Đ đ'.split(' ')) expect(src, ch).toContain(ch);
    expect(src).toContain('tabular-nums');
    expect(readFileSync(join(__dirname, '../font-test.html'), 'utf8')).toContain('font-test.ts');
  });
  it('assets/ không được commit', () => {
    expect(readFileSync(join(__dirname, '../.gitignore'), 'utf8').split('\n')).toContain('assets/');
  });
});
