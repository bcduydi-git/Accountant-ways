import type { Account, EngineContext, ReportTemplate, Term } from './types';

export interface CoaFile {
  accounts: Account[];
}

export function buildContext(
  coa: CoaFile,
  template: ReportTemplate,
  partnerTerms: Record<string, Term> = {},
): EngineContext {
  const accounts = new Map<string, Account>();
  for (const a of coa.accounts) accounts.set(a.code, a);
  const parents = new Set(coa.accounts.map((a) => a.parent).filter((p): p is string => !!p));
  const postable = new Set(coa.accounts.filter((a) => !parents.has(a.code)).map((a) => a.code));
  return { accounts, postable, template, partnerTerms };
}

export function hasPrefix(account: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => account.startsWith(p));
}

export function accountName(ctx: EngineContext, code: string): string {
  return ctx.accounts.get(code)?.name ?? code;
}

export function accountLabel(ctx: EngineContext, code: string): string {
  return `${code} – ${accountName(ctx, code)}`;
}

export function isCash(ctx: EngineContext, account: string): boolean {
  return hasPrefix(account, ctx.template.config.cashAccounts);
}

export function isProfitAndLoss(ctx: EngineContext, account: string): boolean {
  return hasPrefix(account, ctx.template.config.profitAndLossPrefixes);
}

/** Mapping dòng tiền theo tiền tố dài nhất. */
export function cashMappingFor(ctx: EngineContext, account: string) {
  let best: ReportTemplate['cashFlow']['mapping'][number] | undefined;
  for (const m of ctx.template.cashFlow.mapping) {
    if (account.startsWith(m.prefix) && (!best || m.prefix.length > best.prefix.length)) best = m;
  }
  return best;
}
