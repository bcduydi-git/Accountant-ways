/** Định dạng số tiền kiểu Việt Nam: 1.000.000; số âm trong ngoặc như trên BCTC. */
export function formatVND(n: number, opts: { parens?: boolean; zero?: string } = {}): string {
  const { parens = true, zero = '0' } = opts;
  if (n === 0) return zero;
  const abs = Math.abs(Math.round(n));
  const s = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (n < 0) return parens ? `(${s})` : `-${s}`;
  return s;
}

/** Đọc số người chơi nhập: chấp nhận "1.000.000", "1 000 000", "1000000". */
export function parseVND(text: string): number | null {
  const cleaned = text.replace(/[.\s,]/g, '');
  if (cleaned === '') return null;
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isSafeInteger(n) ? n : null;
}
