import { accountLabel, hasPrefix, isCash } from './coa';
import { formatVND } from './format';
import { reportLinesForAccount } from './reports';
import type { DetailField, EngineContext, LineInput } from './types';

/** Cho biết TK nào cần theo dõi theo đối tượng chi tiết nào (khai báo ở kịch bản). */
export type KeySpec = (account: string) => DetailField[];

export function keySpecFrom(detailAccounts: Record<string, DetailField[]>): KeySpec {
  const entries = Object.entries(detailAccounts).sort(([a], [b]) => b.length - a.length);
  return (account) => entries.find(([p]) => account.startsWith(p))?.[1] ?? [];
}

export function vectorKey(l: LineInput, spec: KeySpec): string {
  const fields = spec(l.account);
  return [l.account, ...fields.map((f) => `${f}=${l[f] ?? ''}`)].join('|');
}

/** Vector thay đổi số dư (Nợ − Có) theo TK + đối tượng chi tiết, bỏ phần tử 0. */
export function impactVector(entries: { lines: LineInput[] }[], spec: KeySpec): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) {
    for (const l of e.lines) {
      const k = vectorKey(l, spec);
      m.set(k, (m.get(k) ?? 0) + (l.debit ?? 0) - (l.credit ?? 0));
    }
  }
  for (const [k, v] of m) if (v === 0) m.delete(k);
  return m;
}

export interface VectorDiff {
  key: string;
  account: string;
  detail: string;
  player: number;
  expected: number;
  diff: number;
}

export function compareVectors(player: Map<string, number>, expected: Map<string, number>): VectorDiff[] {
  const keys = new Set([...player.keys(), ...expected.keys()]);
  const diffs: VectorDiff[] = [];
  for (const k of [...keys].sort()) {
    const p = player.get(k) ?? 0;
    const e = expected.get(k) ?? 0;
    if (p !== e) {
      const [account = '', ...rest] = k.split('|');
      diffs.push({ key: k, account, detail: rest.join(', '), player: p, expected: e, diff: p - e });
    }
  }
  return diffs;
}

// ---- Quy tắc bản chất (data/scoring/substance-rules.json) ----

export type SubstanceRule =
  | {
      id: string;
      type: 'forbid-cross-partner-offset';
      scope: 'global' | 'event';
      receivablePrefixes: string[];
      payablePrefixes: string[];
      message: string;
    }
  | { id: string; type: 'forbid-side'; scope: 'global' | 'event'; prefixes: string[]; side: 'debit' | 'credit'; message: string }
  | {
      id: string;
      type: 'require-account-when-touching';
      scope: 'global' | 'event' | 'closing';
      whenTouching: string[];
      require: string;
      message: string;
    };

export interface SubstanceViolation {
  ruleId: string;
  message: string;
}

function crossOffset(ctx: EngineContext, rule: Extract<SubstanceRule, { type: 'forbid-cross-partner-offset' }>, lines: LineInput[]) {
  if (lines.some((l) => isCash(ctx, l.account))) return false;
  const recCr = lines.filter((l) => hasPrefix(l.account, rule.receivablePrefixes) && (l.credit ?? 0) > 0);
  const payDr = lines.filter((l) => hasPrefix(l.account, rule.payablePrefixes) && (l.debit ?? 0) > 0);
  return recCr.some((r) => payDr.some((p) => (r.partner ?? '') !== (p.partner ?? '')));
}

function violates(ctx: EngineContext, rule: SubstanceRule, entries: { lines: LineInput[] }[]): boolean {
  switch (rule.type) {
    case 'forbid-cross-partner-offset':
      return entries.some((e) => crossOffset(ctx, rule, e.lines));
    case 'forbid-side':
      return entries.some((e) =>
        e.lines.some((l) => hasPrefix(l.account, rule.prefixes) && ((rule.side === 'debit' ? l.debit : l.credit) ?? 0) > 0),
      );
    case 'require-account-when-touching':
      return entries.some(
        (e) => e.lines.some((l) => hasPrefix(l.account, rule.whenTouching)) && !e.lines.some((l) => l.account.startsWith(rule.require)),
      );
  }
}

export interface ScoreResult {
  correct: boolean;
  matchedAnswer: number | null;
  diffs: VectorDiff[];
  violations: SubstanceViolation[];
  explanationLines: string[];
}

/**
 * Chấm theo tác động số dư (SPEC 4.2): đúng khi vector của người chơi bằng vector
 * của đáp án chính hoặc một đáp án thay thế, và không vi phạm quy tắc bản chất.
 */
export function scoreEntries(
  ctx: EngineContext,
  player: { lines: LineInput[] }[],
  answers: { lines: LineInput[] }[][],
  spec: KeySpec,
  rules: SubstanceRule[],
  opts: { eventRules?: string[]; isClosing?: boolean } = {},
): ScoreResult {
  const pv = impactVector(player, spec);
  let best: { idx: number; diffs: VectorDiff[] } | null = null;
  answers.forEach((ans, idx) => {
    const diffs = compareVectors(pv, impactVector(ans, spec));
    if (!best || diffs.length < best.diffs.length) best = { idx, diffs };
  });
  const chosen = best as { idx: number; diffs: VectorDiff[] } | null;
  const diffs = chosen?.diffs ?? [];
  const active = rules.filter(
    (r) =>
      r.scope === 'global' ||
      (r.scope === 'event' && opts.eventRules?.includes(r.id)) ||
      (r.scope === 'closing' && opts.isClosing),
  );
  const matched = chosen && diffs.length === 0 ? answers[chosen.idx]! : null;
  const violations: SubstanceViolation[] = [];
  for (const r of active) {
    // Quy tắc toàn cục không chặn chính mẫu hạch toán mà đáp án dùng.
    if (r.scope === 'global' && matched && violates(ctx, r, matched)) continue;
    if (violates(ctx, r, player)) violations.push({ ruleId: r.id, message: r.message });
  }
  const explanationLines = diffs.map((d) => {
    const touched = reportLinesForAccount(ctx, d.account)
      .map((t) => `${t.report} ${t.code}`)
      .join(', ');
    const side = d.diff > 0 ? 'thừa Nợ (hoặc thiếu Có)' : 'thừa Có (hoặc thiếu Nợ)';
    return `${accountLabel(ctx, d.account)}${d.detail ? ` [${d.detail}]` : ''}: lệch ${formatVND(Math.abs(d.diff))} — ${side}${touched ? `; chạm ${touched}` : ''}`;
  });
  return {
    correct: diffs.length === 0 && violations.length === 0,
    matchedAnswer: diffs.length === 0 && chosen ? chosen.idx : null,
    diffs,
    violations,
    explanationLines,
  };
}
