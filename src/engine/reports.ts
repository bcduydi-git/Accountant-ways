import { cashMappingFor, hasPrefix, isCash, isProfitAndLoss } from './coa';
import { detailBalances, parseDetailKey, type EntryFilter } from './ledger';
import type { EngineContext, PostedEntry, BsSource } from './types';

export interface ReportLine {
  code: string;
  label: string;
  value: number;
  level?: number;
  bold?: boolean;
  header?: boolean;
}

export interface Reports {
  balanceSheet: ReportLine[];
  incomeStatement: ReportLine[];
  cashFlowDirect: ReportLine[];
  cashFlowIndirect: ReportLine[];
  totals: {
    totalAssets: number;
    totalSources: number;
    cashOpening: number;
    cashClosing: number;
    netCashFlow: number;
    cfoDirect: number;
    cfoIndirect: number;
    profitBeforeTax: number;
    profitAfterTax: number;
  };
  /** Chi phí sản xuất (621/622/627) còn số dư chưa kết chuyển vào 154 — chỉ để cảnh báo. */
  unallocatedProduction: number;
}

const notOpening: EntryFilter = (e) => e.kind !== 'opening';
const operating: EntryFilter = (e) => e.kind === 'normal';

function srcMatches(ctx: EngineContext, s: BsSource, account: string, partner?: string): boolean {
  if (!account.startsWith(s.prefix)) return false;
  if (s.term) {
    const term = (partner && ctx.partnerTerms[partner]) || 'short';
    if (term !== s.term) return false;
  }
  return true;
}

/** CĐKT tại thời điểm cuối của tập bút toán được lọc. */
export function balanceSheet(ctx: EngineContext, entries: readonly PostedEntry[], filter: EntryFilter = () => true) {
  const bal = detailBalances(entries, filter);
  // Gom số dư theo (TK chi tiết, đối tượng) cho các nguồn "split".
  const byAccPartner = new Map<string, number>();
  for (const [k, v] of bal) {
    const d = parseDetailKey(k);
    const key = `${d.account}|${d.partner ?? ''}`;
    byAccPartner.set(key, (byAccPartner.get(key) ?? 0) + v);
  }
  const values = new Map<string, number>();
  const defs = ctx.template.balanceSheet.lines;
  for (const def of defs) {
    if (!def.src) continue;
    let v = 0;
    for (const s of def.src) {
      for (const [k, b] of byAccPartner) {
        const [account = '', partner = ''] = k.split('|');
        if (!srcMatches(ctx, s, account, partner || undefined)) continue;
        if (s.split) {
          if (def.nature === 'debit' && b > 0) v += b;
          if (def.nature === 'credit' && b < 0) v += -b;
        } else {
          v += def.nature === 'debit' ? b : -b;
        }
      }
    }
    values.set(def.code, v);
  }
  const resolve = (code: string, seen = new Set<string>()): number => {
    if (values.has(code)) return values.get(code)!;
    const def = defs.find((d) => d.code === code);
    if (!def?.sum || seen.has(code)) return 0;
    seen.add(code);
    const v = def.sum.reduce((s, c) => s + resolve(c, seen), 0);
    values.set(code, v);
    return v;
  };
  const lines: ReportLine[] = defs.map((d) => ({
    code: d.code,
    label: d.label,
    value: resolve(d.code),
    level: d.level,
    bold: !!d.sum || d.total,
  }));
  return {
    lines,
    totalAssets: resolve(ctx.template.balanceSheet.totalAssets),
    totalSources: resolve(ctx.template.balanceSheet.totalSources),
  };
}

/** KQKD: phát sinh trong kỳ, bỏ số dư đầu kỳ và bút toán kết chuyển. */
export function incomeStatement(ctx: EngineContext, entries: readonly PostedEntry[], filter: EntryFilter = operating) {
  const values = new Map<string, number>();
  const defs = ctx.template.incomeStatement.lines;
  for (const def of defs) {
    if (!def.src) continue;
    let v = 0;
    for (const e of entries) {
      if (!filter(e) || e.kind !== 'normal') continue;
      for (const l of e.lines) {
        for (const s of def.src) {
          if (!l.account.startsWith(s.prefix)) continue;
          v += s.measure === 'credit' ? l.credit - l.debit : l.debit - l.credit;
        }
      }
    }
    values.set(def.code, v);
  }
  for (const def of defs) {
    if (!def.formula) continue;
    values.set(
      def.code,
      def.formula.reduce((s, [c, k]) => s + (values.get(c) ?? 0) * k, 0),
    );
  }
  return defs.map((d) => ({ code: d.code, label: d.label, value: values.get(d.code) ?? 0, bold: d.bold }));
}

/** Tính các dòng công thức của KQKD từ số liệu gốc (dùng cho cột năm trước). */
export function incomeStatementFromValues(ctx: EngineContext, base: Record<string, number>): ReportLine[] {
  const values = new Map<string, number>(Object.entries(base));
  const defs = ctx.template.incomeStatement.lines;
  for (const def of defs) {
    if (def.formula) values.set(def.code, def.formula.reduce((s, [c, k]) => s + (values.get(c) ?? 0) * k, 0));
  }
  return defs.map((d) => ({ code: d.code, label: d.label, value: values.get(d.code) ?? 0, bold: d.bold }));
}

export function cashBalance(ctx: EngineContext, entries: readonly PostedEntry[], filter: EntryFilter = () => true) {
  let v = 0;
  for (const e of entries) {
    if (!filter(e)) continue;
    for (const l of e.lines) if (isCash(ctx, l.account)) v += l.debit - l.credit;
  }
  return v;
}

export function cashFlowDirect(ctx: EngineContext, entries: readonly PostedEntry[]) {
  const byCode = new Map<string, number>();
  const byActivity = { KD: 0, DT: 0, TC: 0 };
  for (const e of entries) {
    for (const f of e.cashFlows) {
      byCode.set(f.code, (byCode.get(f.code) ?? 0) + f.amount);
      byActivity[f.activity] += f.amount;
    }
  }
  const lines: ReportLine[] = ctx.template.cashFlow.direct.map((d) => ({
    code: d.code,
    label: d.label,
    header: d.header,
    bold: !!d.total || d.header,
    value: d.header ? 0 : d.total ? byActivity[d.total] : (byCode.get(d.code) ?? 0),
  }));
  return { lines, byActivity };
}

/**
 * LCTT gián tiếp: lợi nhuận trước thuế + điều chỉnh từ biến động CĐKT.
 * Bút toán phi tiền tệ nối hoạt động KD với ĐT/TC được loại khỏi vốn lưu động
 * và đưa phần lãi/lỗ vào dòng "hoạt động đầu tư, tài chính và giao dịch phi tiền tệ".
 */
export function cashFlowIndirect(ctx: EngineContext, entries: readonly PostedEntry[], pbt: number, cit: number) {
  const v = new Map<string, number>();
  const production = ctx.template.incomeStatement.productionAccounts ?? [];
  let nonOperating = 0;
  for (const e of entries) {
    if (e.kind !== 'normal') continue;
    const hasCash = e.lines.some((l) => isCash(ctx, l.account));
    const nonCash = e.lines.filter((l) => !isCash(ctx, l.account));
    const acts = nonCash.map((l) => cashMappingFor(ctx, l.account)?.activity ?? 'KD');
    const mixed = !hasCash && acts.includes('KD') && acts.some((a) => a !== 'KD');
    nonCash.forEach((l, i) => {
      const m = cashMappingFor(ctx, l.account);
      const act = acts[i];
      const amount = l.credit - l.debit;
      // Chi phí sản xuất (621/622/627) chưa vào KQKD: xử lý như hàng tồn kho.
      if (isProfitAndLoss(ctx, l.account) && !hasPrefix(l.account, production)) {
        if (act !== 'KD' || mixed) nonOperating -= amount;
      } else if (act === 'KD' && !mixed && m?.indirect) {
        v.set(m.indirect, (v.get(m.indirect) ?? 0) + amount);
      }
    });
  }
  const values = new Map<string, number>();
  for (const d of ctx.template.cashFlow.indirect) {
    if (d.special === 'profitBeforeTax') values.set(d.code, pbt);
    else if (d.special === 'nonOperating') values.set(d.code, nonOperating);
    else if (d.special === 'incomeTaxPaid') values.set(d.code, (v.get(d.code) ?? 0) - cit);
    else if (d.group) values.set(d.code, v.get(d.code) ?? 0);
  }
  for (const d of ctx.template.cashFlow.indirect) {
    if (d.subtotal) values.set(d.code, d.subtotal.reduce((s, c) => s + (values.get(c) ?? 0), 0));
  }
  const lines: ReportLine[] = ctx.template.cashFlow.indirect.map((d) => ({
    code: d.code,
    label: d.label,
    value: values.get(d.code) ?? 0,
    bold: !!d.subtotal,
  }));
  const last = ctx.template.cashFlow.indirect[ctx.template.cashFlow.indirect.length - 1]!;
  return { lines, cfo: values.get(last.code) ?? 0 };
}

export function computeReports(ctx: EngineContext, entries: readonly PostedEntry[]): Reports {
  const bs = balanceSheet(ctx, entries);
  const is = incomeStatement(ctx, entries);
  const taxLine = ctx.template.config.incomeTaxExpenseLine;
  const isVal = (code: string) => is.find((l) => l.code === code)?.value ?? 0;
  const lastIs = is[is.length - 1]!;
  const cit = isVal(taxLine);
  const pat = lastIs.value;
  const pbt = pat + cit;
  const cfd = cashFlowDirect(ctx, entries);
  const cfi = cashFlowIndirect(ctx, entries, pbt, cit);
  const cashOpening = cashBalance(ctx, entries, (e) => e.kind === 'opening');
  const cashClosing = cashBalance(ctx, entries);
  const net = cfd.byActivity.KD + cfd.byActivity.DT + cfd.byActivity.TC;
  const direct: ReportLine[] = [
    ...cfd.lines,
    { code: '50', label: 'Lưu chuyển tiền thuần trong kỳ', value: net, bold: true },
    { code: '60', label: 'Tiền đầu kỳ', value: cashOpening },
    { code: '70', label: 'Tiền cuối kỳ', value: cashOpening + net, bold: true },
  ];
  const prod = ctx.template.incomeStatement.productionAccounts ?? [];
  let unallocated = 0;
  for (const e of entries) for (const l of e.lines) if (hasPrefix(l.account, prod)) unallocated += l.debit - l.credit;
  return {
    balanceSheet: bs.lines,
    incomeStatement: is,
    cashFlowDirect: direct,
    cashFlowIndirect: cfi.lines,
    totals: {
      totalAssets: bs.totalAssets,
      totalSources: bs.totalSources,
      cashOpening,
      cashClosing,
      netCashFlow: net,
      cfoDirect: cfd.byActivity.KD,
      cfoIndirect: cfi.cfo,
      profitBeforeTax: pbt,
      profitAfterTax: pat,
    },
    unallocatedProduction: unallocated,
  };
}

/** CĐKT đầu kỳ (chỉ bút toán số dư đầu kỳ) — dùng cho cột năm trước. */
export function openingBalanceSheet(ctx: EngineContext, entries: readonly PostedEntry[]) {
  return balanceSheet(ctx, entries, (e) => e.kind === 'opening');
}

/** Khoản mục báo cáo mà một TK chạm tới (để giải thích khi chấm sai). */
export function reportLinesForAccount(ctx: EngineContext, account: string): { report: 'CĐKT' | 'KQKD'; code: string; label: string }[] {
  const out: { report: 'CĐKT' | 'KQKD'; code: string; label: string }[] = [];
  for (const d of ctx.template.balanceSheet.lines) {
    if (d.src?.some((s) => account.startsWith(s.prefix))) out.push({ report: 'CĐKT', code: d.code, label: d.label });
  }
  for (const d of ctx.template.incomeStatement.lines) {
    if (d.src?.some((s) => account.startsWith(s.prefix))) out.push({ report: 'KQKD', code: d.code, label: d.label });
  }
  return out;
}

export { notOpening };
