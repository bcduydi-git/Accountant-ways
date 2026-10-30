import { hasPrefix } from '../engine/coa';
import type { LineInput } from '../engine/types';
import type { Attrs, FixedAsset, RuleRecord } from '../data/schema';

// Rule engine đọc data/rules. Mọi con số pháp lý nằm trong params của rule;
// file này chỉ chứa logic theo `kind`.

export type RuleStatus = RuleRecord['status'];

export interface RuleSetOptions {
  /** Cờ debug: bật cả rule unverified (game phải hiện cảnh báo). */
  enableUnverified?: boolean;
}

export class RuleSet {
  private readonly byId = new Map<string, RuleRecord>();
  constructor(
    records: RuleRecord[],
    readonly opts: RuleSetOptions = {},
  ) {
    for (const r of records) this.byId.set(r.id, r);
  }
  all(): RuleRecord[] {
    return [...this.byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
  get(id: string): RuleRecord {
    const r = this.byId.get(id);
    if (!r) throw new Error(`Không có rule "${id}"`);
    return r;
  }
  has(id: string) {
    return this.byId.has(id);
  }
  isEnabled(id: string): boolean {
    const r = this.byId.get(id);
    if (!r) return false;
    return r.status !== 'unverified' || !!this.opts.enableUnverified;
  }
  /** Đang bật rule chưa kiểm chứng → mọi màn liên quan phải hiện biển cảnh báo. */
  get warningActive(): boolean {
    return !!this.opts.enableUnverified && this.all().some((r) => r.status === 'unverified');
  }
  enabledOfKind(kind: RuleRecord['kind']) {
    return this.all().filter((r) => r.kind === kind && this.isEnabled(r.id));
  }
  /** Danh mục dòng điều chỉnh TNCT mà người chơi được chọn ở Tầng 3 (a). */
  citCatalog(): RuleRecord[] {
    return this.all().filter((r) => r.effects.includes('cit-nondeductible-expense') && r.kind !== 'informational');
  }
}

const num = (v: unknown, name: string): number => {
  if (typeof v !== 'number') throw new Error(`Tham số rule "${name}" phải là số`);
  return v;
};
const strs = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

// ---- Thuế suất TNDN ----

export function citRate(rs: RuleSet, priorYearRevenue: number): { rate: number; ruleId: string } {
  const [rule] = rs.enabledOfKind('cit-rate');
  if (!rule) throw new Error('Chưa có rule thuế suất TNDN được bật');
  const brackets = (rule.params.brackets as { maxRevenueVND: number; rate: number }[]) ?? [];
  const sorted = [...brackets].sort((a, b) => a.maxRevenueVND - b.maxRevenueVND);
  const hit = sorted.find((b) => priorYearRevenue <= b.maxRevenueVND);
  return { rate: hit ? hit.rate : num(rule.params.defaultRate, 'defaultRate'), ruleId: rule.id };
}

// ---- GTGT ----

export function vatAmount(rs: RuleSet, ruleId: string, base: number, date: string): number {
  const r = rs.get(ruleId);
  if (r.kind !== 'vat-reduced-rate') throw new Error(`Rule ${ruleId} không phải rule thuế suất GTGT`);
  const from = String(r.params.validFrom);
  const to = String(r.params.validTo);
  const inRange = date >= from && date <= to && rs.isEnabled(ruleId);
  const rate = inRange ? num(r.params.reducedRate, 'reducedRate') : num(r.params.standardRate, 'standardRate');
  return Math.round(base * rate);
}

export function vatPrefixes(rs: RuleSet, ruleId: string) {
  const r = rs.get(ruleId);
  return { input: strs(r.params.inputVatPrefixes), output: strs(r.params.outputVatPrefixes) };
}

// ---- Tác động của sự kiện ----

export interface EventContext {
  eventId: string;
  date: string;
  attrs: Attrs;
  /** Các dòng của đáp án chính (đã giải $calc). */
  lines: LineInput[];
  assets: Map<string, FixedAsset>;
  /** Vốn điều lệ còn thiếu tại ngày sự kiện. */
  uncontributedCapital: number;
}

export interface CitAdjustment {
  ruleId: string;
  eventId: string;
  amount: number;
}

export interface EventEffects {
  vatNotDeductible: string[];
  cit: CitAdjustment[];
}

function expenseAmount(lines: LineInput[], prefixes: string[]): number {
  return lines.filter((l) => hasPrefix(l.account, prefixes)).reduce((s, l) => s + (l.debit ?? 0) - (l.credit ?? 0), 0);
}

/** Đánh giá MỘT rule trên một sự kiện (bỏ qua trạng thái bật/tắt). */
export function evaluateRule(rule: RuleRecord, ev: EventContext): { vatNotDeductible: boolean; citAmount: number } {
  const a = ev.attrs;
  const p = rule.params;
  switch (rule.kind) {
    case 'noncash-payment-threshold': {
      const hit = !!a.invoice && a.invoice.paymentMethod === 'cash' && a.invoice.totalInclVAT >= num(p.thresholdVND, 'thresholdVND');
      return { vatNotDeductible: hit, citAmount: hit ? expenseAmount(ev.lines, strs(p.expensePrefixes)) : 0 };
    }
    case 'nondeductible-expense-type': {
      const hit = !!a.expenseType && strs(p.expenseTypes).includes(a.expenseType);
      return { vatNotDeductible: false, citAmount: hit ? expenseAmount(ev.lines, strs(p.expensePrefixes)) : 0 };
    }
    case 'nonbusiness-depreciation': {
      const amt = (a.depreciation ?? []).filter((d) => ev.assets.get(d.assetId)?.businessUse === false).reduce((s, d) => s + d.amount, 0);
      return { vatNotDeductible: false, citAmount: amt };
    }
    case 'passenger-car-depreciation-cap': {
      const cap = num(p.capVND, 'capVND');
      const seats = num(p.maxSeats, 'maxSeats');
      let amt = 0;
      for (const d of a.depreciation ?? []) {
        const asset = ev.assets.get(d.assetId);
        if (!asset || asset.type !== 'passenger-car' || asset.businessUse === false) continue;
        if ((asset.seats ?? 0) > seats || asset.cost <= cap) continue;
        amt += Math.round((d.amount * (asset.cost - cap)) / asset.cost);
      }
      return { vatNotDeductible: false, citAmount: amt };
    }
    case 'interest-uncontributed-capital': {
      if (!a.interest || ev.uncontributedCapital <= 0) return { vatNotDeductible: false, citAmount: 0 };
      const ratio = Math.min(1, ev.uncontributedCapital / a.interest.principal);
      return { vatNotDeductible: false, citAmount: Math.round(a.interest.amount * ratio) };
    }
    case 'invalid-invoice': {
      const hit = a.invoice?.valid === false;
      return { vatNotDeductible: hit, citAmount: hit ? expenseAmount(ev.lines, strs(p.expensePrefixes)) : 0 };
    }
    default:
      return { vatNotDeductible: false, citAmount: 0 };
  }
}

/** Tác động của các rule ĐANG BẬT lên một sự kiện. */
export function eventEffects(rs: RuleSet, ev: EventContext): EventEffects {
  const out: EventEffects = { vatNotDeductible: [], cit: [] };
  for (const r of rs.all()) {
    if (!rs.isEnabled(r.id)) continue;
    const res = evaluateRule(r, ev);
    if (res.vatNotDeductible) out.vatNotDeductible.push(r.id);
    if (res.citAmount !== 0) out.cit.push({ ruleId: r.id, eventId: ev.eventId, amount: res.citAmount });
  }
  return out;
}

// ---- Bảng đối chiếu LN kế toán → thu nhập chịu thuế (Tầng 3 a) ----

export interface ReconLine {
  ruleId: string;
  label: string;
  amount: number;
  events: string[];
  enabled: boolean;
  status: RuleStatus;
  basis: string;
}

export interface Reconciliation {
  profitBeforeTax: number;
  lines: ReconLine[];
  /** Dòng của rule đang tắt (chưa kiểm chứng) — chỉ hiển thị để học, không tính. */
  disabledLines: ReconLine[];
  totalAdjustments: number;
  taxableIncome: number;
  rate: number;
  rateRuleId: string;
  citExpense: number;
}

export function reconcile(rs: RuleSet, events: EventContext[], profitBeforeTax: number, priorYearRevenue: number): Reconciliation {
  const group = new Map<string, ReconLine>();
  for (const rule of rs.citCatalog()) {
    group.set(rule.id, {
      ruleId: rule.id,
      label: rule.description,
      amount: 0,
      events: [],
      enabled: rs.isEnabled(rule.id),
      status: rule.status,
      basis: rule.basis,
    });
  }
  for (const ev of events) {
    for (const rule of rs.citCatalog()) {
      const res = evaluateRule(rule, ev);
      if (res.citAmount === 0) continue;
      const g = group.get(rule.id)!;
      g.amount += res.citAmount;
      g.events.push(ev.eventId);
    }
  }
  const all = [...group.values()].filter((g) => g.amount !== 0);
  const lines = all.filter((g) => g.enabled);
  const disabledLines = all.filter((g) => !g.enabled);
  const totalAdjustments = lines.reduce((s, l) => s + l.amount, 0);
  const taxableIncome = Math.max(0, profitBeforeTax + totalAdjustments);
  const { rate, ruleId } = citRate(rs, priorYearRevenue);
  return {
    profitBeforeTax,
    lines,
    disabledLines,
    totalAdjustments,
    taxableIncome,
    rate,
    rateRuleId: ruleId,
    citExpense: Math.round(taxableIncome * rate),
  };
}
