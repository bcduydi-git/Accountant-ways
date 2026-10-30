import type { ZodType } from 'zod';
import type { CoaFile } from '../engine/coa';
import type { ReportTemplate } from '../engine/types';
import type { SubstanceRule } from '../engine/scoring';
import {
  adjustmentsSchema,
  anomaliesSchema,
  caseSchema,
  monthSchema,
  openingSchema,
  ruleSchema,
  type Adjustments,
  type Anomalies,
  type CaseMeta,
  type Opening,
  type RuleRecord,
  type ScenarioMonth,
} from './schema';

// Toàn bộ dữ liệu JSON trong data/ được gom lúc build (Vite) hoặc lúc test (Vitest).
const raw = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;

export function rawFiles(): Record<string, unknown> {
  return raw;
}

function file(path: string): unknown {
  const v = raw[path];
  if (v === undefined) throw new Error(`Thiếu file dữ liệu ${path}`);
  return v;
}

export function parseWith<T>(schema: ZodType<T, any, any>, path: string, value: unknown = file(path)): T {
  const r = schema.safeParse(value);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`File ${path} không đúng schema: ${msg}`);
  }
  return r.data;
}

export const loadCoa = () => file('/data/coa/accounts.json') as CoaFile;
export const loadTemplate = (id: string) => file(`/data/report-templates/${id}.json`) as ReportTemplate;
export const loadSubstanceRules = () => (file('/data/scoring/substance-rules.json') as { rules: SubstanceRule[] }).rules;
export const loadAdjustmentCategories = () =>
  (file('/data/scoring/adjustment-categories.json') as { categories: { id: string; label: string }[] }).categories;

export function loadRuleRecords(): RuleRecord[] {
  return Object.keys(raw)
    .filter((p) => p.startsWith('/data/rules/'))
    .sort()
    .map((p) => parseWith(ruleSchema, p));
}

export interface CaseBundle {
  meta: CaseMeta;
  opening: Opening;
  months: ScenarioMonth[];
  anomalies?: Anomalies;
  adjustments?: Adjustments;
}

export function listCaseIds(): string[] {
  const ids = new Set<string>();
  for (const p of Object.keys(raw)) {
    const m = /^\/data\/cases\/([^/]+)\/case\.json$/.exec(p);
    if (m) ids.add(m[1]!);
  }
  return [...ids].sort();
}

export function loadCase(id: string): CaseBundle {
  const base = `/data/cases/${id}`;
  const meta = parseWith(caseSchema, `${base}/case.json`);
  const opening = parseWith(openingSchema, `${base}/opening.json`);
  const months = meta.months.map((m) => {
    const month = parseWith(monthSchema, `${base}/${m.id}.json`);
    if (month.id !== m.id) throw new Error(`${base}/${m.id}.json: id tháng không khớp`);
    return month;
  });
  const bundle: CaseBundle = { meta, opening, months };
  if (raw[`${base}/anomalies.json`] !== undefined) bundle.anomalies = parseWith(anomaliesSchema, `${base}/anomalies.json`);
  if (raw[`${base}/adjustments.json`] !== undefined) bundle.adjustments = parseWith(adjustmentsSchema, `${base}/adjustments.json`);
  return bundle;
}
