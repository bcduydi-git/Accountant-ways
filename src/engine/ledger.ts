import { cashMappingFor, hasPrefix, isCash } from './coa';
import type { CashFlowItem, EngineContext, EntryInput, Line, PostedEntry } from './types';

export class PostingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PostingError';
  }
}

function normalizeLine(raw: EntryInput['lines'][number], ctx: EngineContext, idx: number): Line {
  const debit = raw.debit ?? 0;
  const credit = raw.credit ?? 0;
  const where = `Dòng ${idx + 1} (TK ${raw.account})`;
  if (!ctx.accounts.has(raw.account)) throw new PostingError(`${where}: tài khoản không có trong danh mục.`);
  if (!ctx.postable.has(raw.account))
    throw new PostingError(`${where}: tài khoản có tài khoản chi tiết, hãy chọn TK chi tiết.`);
  for (const v of [debit, credit]) {
    if (!Number.isSafeInteger(v) || v < 0) throw new PostingError(`${where}: số tiền phải là số nguyên không âm.`);
  }
  if ((debit > 0) === (credit > 0)) throw new PostingError(`${where}: mỗi dòng ghi đúng một bên Nợ hoặc Có.`);
  const line: Line = { account: raw.account, debit, credit };
  if (raw.partner) line.partner = raw.partner;
  if (raw.item) line.item = raw.item;
  if (raw.segment) line.segment = raw.segment;
  if (raw.cashFlow) line.cashFlow = raw.cashFlow;
  return line;
}

/** Nhãn dòng tiền: suy từ TK đối ứng theo bảng mapping, hoặc nhãn kịch bản gán sẵn trên dòng tiền. */
export function deriveCashFlows(ctx: EngineContext, lines: Line[]): CashFlowItem[] {
  const cashLines = lines.filter((l) => isCash(ctx, l.account));
  if (cashLines.length === 0) return [];
  const others = lines.filter((l) => !isCash(ctx, l.account));
  const override = cashLines.length === 1 ? cashLines[0]!.cashFlow : undefined;
  const out: CashFlowItem[] = [];
  for (const l of others) {
    const amount = l.credit - l.debit;
    if (amount === 0) continue;
    if (override) {
      out.push({ activity: override.activity, code: override.code, amount, account: l.account });
      continue;
    }
    const m = cashMappingFor(ctx, l.account);
    if (!m) throw new PostingError(`TK ${l.account} chưa có mapping dòng tiền.`);
    const code = typeof m.direct === 'string' ? m.direct : amount > 0 ? m.direct.in : m.direct.out;
    out.push({ activity: m.activity, code, amount, account: l.account });
  }
  return out;
}

/**
 * Sổ cái duy nhất. Mọi bút toán (kể cả số dư đầu kỳ, kết chuyển, điều chỉnh)
 * phải đi qua `post()`; báo cáo chỉ được tính từ `entries`.
 */
export class Ledger {
  private readonly _entries: PostedEntry[] = [];
  private seq = 0;

  constructor(readonly ctx: EngineContext) {}

  get entries(): readonly PostedEntry[] {
    return this._entries;
  }

  post(input: EntryInput): PostedEntry {
    if (!input.lines || input.lines.length < 2) throw new PostingError('Bút toán cần ít nhất hai dòng.');
    const lines = input.lines.map((l, i) => normalizeLine(l, this.ctx, i));
    const dr = lines.reduce((s, l) => s + l.debit, 0);
    const cr = lines.reduce((s, l) => s + l.credit, 0);
    if (dr !== cr) throw new PostingError(`Bút toán không cân: tổng Nợ ${dr} ≠ tổng Có ${cr}.`);
    const touchesClosing = lines.some((l) => hasPrefix(l.account, [this.ctx.template.config.closingAccount]));
    const kind = input.kind ?? (touchesClosing ? 'closing' : 'normal');
    if (kind !== 'closing' && touchesClosing)
      throw new PostingError('TK xác định kết quả chỉ dùng trong bút toán kết chuyển.');
    this.seq += 1;
    const entry: PostedEntry = {
      id: input.id ?? `E${this.seq}`,
      seq: this.seq,
      date: input.date,
      kind,
      lines,
      cashFlows: kind === 'opening' ? [] : deriveCashFlows(this.ctx, lines),
    };
    if (input.memo) entry.memo = input.memo;
    if (input.eventId) entry.eventId = input.eventId;
    if (input.source) entry.source = input.source;
    this._entries.push(entry);
    return entry;
  }

  /** Bản sao để thử bút toán (xem trước) mà không chạm sổ thật. */
  clone(): Ledger {
    const l = new Ledger(this.ctx);
    for (const e of this._entries) l.post({ ...e, lines: e.lines.map((x) => ({ ...x })) });
    return l;
  }
}

export const detailKey = (l: { account: string; partner?: string; item?: string; segment?: string }) =>
  `${l.account}|${l.partner ?? ''}|${l.item ?? ''}|${l.segment ?? ''}`;

export function parseDetailKey(k: string) {
  const [account = '', partner = '', item = '', segment = ''] = k.split('|');
  return { account, partner: partner || undefined, item: item || undefined, segment: segment || undefined };
}

export type EntryFilter = (e: PostedEntry) => boolean;

/** Số dư Nợ ròng (Nợ − Có) theo khóa chi tiết đầy đủ. */
export function detailBalances(entries: readonly PostedEntry[], filter: EntryFilter = () => true) {
  const m = new Map<string, number>();
  for (const e of entries) {
    if (!filter(e)) continue;
    for (const l of e.lines) {
      const k = detailKey(l);
      m.set(k, (m.get(k) ?? 0) + l.debit - l.credit);
    }
  }
  return m;
}

/** Số dư Nợ ròng theo TK. */
export function accountBalances(entries: readonly PostedEntry[], filter: EntryFilter = () => true) {
  const m = new Map<string, number>();
  for (const e of entries) {
    if (!filter(e)) continue;
    for (const l of e.lines) m.set(l.account, (m.get(l.account) ?? 0) + l.debit - l.credit);
  }
  return m;
}
