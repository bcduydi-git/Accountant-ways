import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// SPEC 5.4: không đặt con số pháp lý trong code TS — mọi số nằm trong data/rules.
const FORBIDDEN: { re: RegExp; what: string }[] = [
  { re: /\b5[_.]?000[_.]?000\b/, what: 'ngưỡng 5 triệu' },
  { re: /\b1[_.]?600[_.]?000[_.]?000\b/, what: 'trần 1,6 tỷ' },
  { re: /\b3[_.]?000[_.]?000[_.]?000\b/, what: 'ngưỡng 3 tỷ' },
  { re: /\b50[_.]?000[_.]?000[_.]?000\b/, what: 'ngưỡng 50 tỷ' },
  { re: /(?<![\d.])0\.(08|1|10|15|17|2|20)(?![\d])/, what: 'thuế suất dạng thập phân' },
  { re: /\b(8|10|15|17|20)\s*\/\s*100\b/, what: 'thuế suất dạng phân số' },
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('Không có hằng số pháp lý ngoài data/rules', () => {
  const files = walk(join(__dirname, '../../src'));
  it('đã quét được mã nguồn', () => expect(files.length).toBeGreaterThan(5));
  for (const f of files) {
    it(f.replace(/.*\/src\//, 'src/'), () => {
      const lines = readFileSync(f, 'utf8').split('\n');
      const hits: string[] = [];
      lines.forEach((line, i) => {
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
        for (const { re, what } of FORBIDDEN) if (re.test(line)) hits.push(`dòng ${i + 1} (${what}): ${line.trim()}`);
      });
      expect(hits).toEqual([]);
    });
  }
});
