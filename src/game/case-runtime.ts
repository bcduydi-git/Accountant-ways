import { buildContext } from '../engine/coa';
import { generateClosingEntries } from '../engine/closing';
import { Ledger } from '../engine/ledger';
import { computeReports } from '../engine/reports';
import { keySpecFrom, scoreEntries, type KeySpec, type ScoreResult, type SubstanceRule } from '../engine/scoring';
import type { EngineContext, EntryInput, LineInput } from '../engine/types';
import type { CaseBundle } from '../data/registry';
import { loadCoa, loadRuleRecords, loadSubstanceRules, loadTemplate } from '../data/registry';
import type { FixedAsset, ScenarioEntry, ScenarioEvent, ScenarioLine, ScenarioMonth } from '../data/schema';
import { reconcile, RuleSet, type EventContext, type Reconciliation } from '../tax/rules';

export interface EventRef {
  month: ScenarioMonth;
  monthIndex: number;
  event: ScenarioEvent;
  index: number;
}

export type ResolvedEntry = { memo?: string; lines: LineInput[] };

export function entryInputs(event: ScenarioEvent, entries: ResolvedEntry[], source: string): EntryInput[] {
  return entries.map((e, i) => ({
    id: `${event.id}#${i + 1}`,
    date: event.date,
    eventId: event.id,
    memo: e.memo ?? event.title,
    source,
    kind: event.kind === 'closing' ? 'closing' : undefined,
    lines: e.lines,
  }));
}

/** Toàn bộ logic của một hồ sơ: sổ đáp án, giải $calc, chấm điểm, đối chiếu thuế. */
export class CaseRuntime {
  readonly ctx: EngineContext;
  readonly spec: KeySpec;
  readonly substance: SubstanceRule[];
  readonly assets: Map<string, FixedAsset>;
  readonly events: EventRef[];

  constructor(
    readonly bundle: CaseBundle,
    readonly rules: RuleSet = new RuleSet(loadRuleRecords()),
  ) {
    const terms: Record<string, 'short' | 'long'> = {};
    for (const p of bundle.meta.partners) if (p.term) terms[p.id] = p.term;
    this.ctx = buildContext(loadCoa(), loadTemplate(bundle.meta.reportTemplate), terms);
    this.spec = keySpecFrom(bundle.meta.detailAccounts);
    this.substance = loadSubstanceRules();
    this.assets = new Map(bundle.opening.fixedAssets.map((a) => [a.id, a]));
    this.events = bundle.months.flatMap((month, monthIndex) => month.events.map((event, index) => ({ month, monthIndex, event, index })));
  }

  get meta() {
    return this.bundle.meta;
  }

  openAccounts(monthId: string): string[] {
    return this.meta.months.find((m) => m.id === monthId)?.openAccounts ?? [];
  }

  partnerName(id?: string) {
    return this.meta.partners.find((p) => p.id === id)?.name ?? id ?? '';
  }

  itemName(id?: string) {
    return this.meta.items.find((p) => p.id === id)?.name ?? id ?? '';
  }

  segmentName(id?: string) {
    return this.meta.segments.find((p) => p.id === id)?.name ?? id ?? '';
  }

  /** Sổ mới chỉ có số dư đầu kỳ (đi qua post như mọi bút toán khác). */
  newLedger(): Ledger {
    const l = new Ledger(this.ctx);
    l.post({
      id: 'OPENING',
      date: this.bundle.opening.date,
      kind: 'opening',
      memo: 'Số dư đầu kỳ',
      source: 'opening',
      lines: this.bundle.opening.balances.map((b) => toLine(b, () => 0)),
    });
    return l;
  }

  /** Bối cảnh thuế của một sự kiện (dòng đáp án chính, $calc tính là 0). */
  eventContext(event: ScenarioEvent): EventContext {
    const lines = 'entries' in event.answer ? event.answer.entries.flatMap((e) => e.lines.map((l) => toLine(l, () => 0))) : [];
    return {
      eventId: event.id,
      date: event.date,
      attrs: event.attrs,
      lines,
      assets: this.assets,
      uncontributedCapital: this.uncontributedAt(event.date),
    };
  }

  uncontributedAt(date: string): number {
    const prefix = this.ctx.template.config.ownerCapitalPrefix;
    let contributed = this.bundle.opening.charterCapital.contributed;
    for (const { event } of this.events) {
      if (event.date > date || !('entries' in event.answer)) continue;
      for (const e of event.answer.entries)
        for (const l of e.lines) if (l.account.startsWith(prefix)) contributed += num(l.credit) - num(l.debit);
    }
    return Math.max(0, this.bundle.opening.charterCapital.registered - contributed);
  }

  /** Bảng đối chiếu LN kế toán → TNCT trên sổ cho trước. */
  reconciliation(ledger: Ledger): Reconciliation {
    const pbt = computeReports(this.ctx, ledger.entries).totals.profitBeforeTax;
    return reconcile(
      this.rules,
      this.events.map((r) => this.eventContext(r.event)),
      pbt,
      this.bundle.opening.priorYearRevenue,
    );
  }

  /** Đáp án chính + thay thế, đã giải $calc theo trạng thái sổ hiện tại. */
  resolveAnswers(event: ScenarioEvent, ledger: Ledger): ResolvedEntry[][] {
    if (!('entries' in event.answer)) {
      return [generateClosingEntries(this.ctx, ledger.entries, event.date).map((e) => ({ memo: e.memo, lines: e.lines }))];
    }
    let cit: number | null = null;
    const calc = (name: string) => {
      if (name === 'citExpense') {
        cit ??= this.reconciliation(ledger).citExpense;
        return cit;
      }
      throw new Error(`$calc không hỗ trợ: ${name}`);
    };
    const resolve = (entries: ScenarioEntry[]) =>
      entries.map((e) => {
        const out: ResolvedEntry = { lines: e.lines.map((l) => toLine(l, calc)).filter((l) => (l.debit ?? 0) + (l.credit ?? 0) > 0) };
        if (e.memo) out.memo = e.memo;
        return out;
      });
    return [resolve(event.answer.entries), ...event.alternativeAnswers.map((a) => resolve(a.entries))];
  }

  score(event: ScenarioEvent, ledger: Ledger, player: ResolvedEntry[]): ScoreResult {
    return scoreEntries(this.ctx, player, this.resolveAnswers(event, ledger), this.spec, this.substance, {
      eventRules: event.substance,
      isClosing: event.kind === 'closing',
    });
  }

  /** Ghi đáp án chính của sự kiện vào sổ (dùng cho sổ đáp án và nút "Xem đáp án"). */
  postAnswer(ledger: Ledger, event: ScenarioEvent, source = 'answer') {
    const [main] = this.resolveAnswers(event, ledger);
    for (const e of entryInputs(event, main!, source)) ledger.post(e);
  }

  /** Sổ đáp án: số dư đầu kỳ + đáp án chính của mọi sự kiện đến hết `untilEventId` (bao gồm). */
  canonicalLedger(untilEventId?: string, onPost?: (ledger: Ledger, ref: EventRef) => void): Ledger {
    const l = this.newLedger();
    for (const ref of this.events) {
      this.postAnswer(l, ref.event);
      onPost?.(l, ref);
      if (ref.event.id === untilEventId) break;
    }
    return l;
  }

  /** Bút toán chèn (Tầng 2, sổ công ty Tầng 3b) — vẫn đi qua post(). */
  postInjections(ledger: Ledger, injections: { id: string; date: string; memo: string; lines: ScenarioLine[] }[], source: string) {
    for (const inj of injections) {
      ledger.post({ id: inj.id, date: inj.date, memo: inj.memo, source, lines: inj.lines.map((x) => toLine(x, () => 0)) });
    }
  }

  /** Bộ BCTC đã khóa sổ cho Tầng 2: sổ đáp án (bỏ kết chuyển) + bút toán cài bất thường + kết chuyển lại. */
  tier2Ledger(): Ledger {
    const canonical = this.canonicalLedger();
    const l = new Ledger(this.ctx);
    for (const e of canonical.entries) if (e.kind !== 'closing') l.post({ ...e });
    this.postInjections(l, this.bundle.anomalies?.injections ?? [], 'anomaly');
    const last = this.events[this.events.length - 1]!.event.date;
    for (const e of generateClosingEntries(this.ctx, l.entries, last)) l.post({ ...e, source: 'closing' });
    return l;
  }

  /** Sổ công ty lập cho mục đích thuế (Tầng 3b): sổ đáp án + bút toán sai của kế toán cũ. */
  companyBookLedger(): Ledger {
    const l = this.canonicalLedger();
    this.postInjections(l, this.bundle.adjustments?.companyBook?.injections ?? [], 'company-book');
    return l;
  }
}

function num(v: ScenarioLine['debit']): number {
  return typeof v === 'number' ? v : 0;
}

function toLine(l: ScenarioLine, calc: (name: string) => number): LineInput {
  const amt = (v: ScenarioLine['debit']) => (v === undefined ? undefined : typeof v === 'number' ? v : calc(v.$calc));
  const out: LineInput = { account: l.account };
  const d = amt(l.debit);
  const c = amt(l.credit);
  if (d !== undefined) out.debit = d;
  if (c !== undefined) out.credit = c;
  if (l.partner) out.partner = l.partner;
  if (l.item) out.item = l.item;
  if (l.segment) out.segment = l.segment;
  if (l.cashFlow) out.cashFlow = l.cashFlow;
  return out;
}
