import type { Anomalies } from '../data/schema';
import type { Reconciliation } from '../tax/rules';

// Chấm Tầng 2 (bắt lỗi) và Tầng 3a (bảng đối chiếu) — thuần logic, không phụ thuộc giao diện.

export const TIER2_POINTS_PER_ANOMALY = 3;
export const lineKey = (report: string, code: string) => `${report}:${code}`;

export interface Tier2Result {
  anomalyId: string | null;
  points: number;
  lineOk: boolean;
  reportsOk: boolean;
  reasonOk: boolean;
  explanation: string;
}

export function maxTier2Findings(an: Anomalies) {
  return an.anomalies.length + 3;
}

export function scoreFinding(an: Anomalies, alreadyFound: string[], f: { lineKey: string; reports: string[]; reasonId: string }): Tier2Result {
  const hit = an.anomalies.find((a) => !alreadyFound.includes(a.id) && a.lineRefs.some((r) => lineKey(r.report, r.code) === f.lineKey));
  if (!hit) {
    const dup = an.anomalies.find((a) => alreadyFound.includes(a.id) && a.lineRefs.some((r) => lineKey(r.report, r.code) === f.lineKey));
    return {
      anomalyId: null,
      points: 0,
      lineOk: false,
      reportsOk: false,
      reasonOk: false,
      explanation: dup ? `Bất thường "${dup.title}" đã được tìm ra trước đó.` : 'Khoản mục này không có bất thường được cài sẵn.',
    };
  }
  const want = [...hit.reportsTouched].sort().join(',');
  const got = [...f.reports].sort().join(',');
  const reportsOk = want === got;
  const reasonOk = f.reasonId === hit.reasonId;
  return {
    anomalyId: hit.id,
    points: 1 + (reportsOk ? 1 : 0) + (reasonOk ? 1 : 0),
    lineOk: true,
    reportsOk,
    reasonOk,
    explanation: hit.explanation,
  };
}

export interface ReconSubmission {
  lines: { ruleId: string; amount: number }[];
  taxableIncome: number;
  citExpense: number;
}

export interface ReconResult {
  lineResults: { ruleId: string; expected: number; got: number | null; ok: boolean }[];
  extraLines: { ruleId: string; amount: number }[];
  taxableOk: boolean;
  citOk: boolean;
  points: number;
  maxPoints: number;
}

/** Chấm theo từng dòng (đúng rule và đúng số) và theo tổng (TNCT, thuế TNDN). */
export function scoreReconciliation(expected: Reconciliation, sub: ReconSubmission): ReconResult {
  const byRule = new Map<string, number>();
  for (const l of sub.lines) byRule.set(l.ruleId, (byRule.get(l.ruleId) ?? 0) + l.amount);
  const lineResults = expected.lines.map((e) => {
    const got = byRule.has(e.ruleId) ? byRule.get(e.ruleId)! : null;
    return { ruleId: e.ruleId, expected: e.amount, got, ok: got === e.amount };
  });
  const extraLines = [...byRule].filter(([id]) => !expected.lines.some((e) => e.ruleId === id)).map(([ruleId, amount]) => ({ ruleId, amount }));
  const taxableOk = sub.taxableIncome === expected.taxableIncome;
  const citOk = sub.citExpense === expected.citExpense;
  const points = lineResults.filter((r) => r.ok).length * 2 + (taxableOk ? 2 : 0) + (citOk ? 2 : 0) - Math.min(extraLines.length, lineResults.filter((r) => r.ok).length) * 1;
  return { lineResults, extraLines, taxableOk, citOk, points: Math.max(0, points), maxPoints: expected.lines.length * 2 + 4 };
}
