import { z } from 'zod';

// Lưu tiến độ: localStorage (bọc try/catch) + xuất/nhập file .json (SPEC 5.1).

export const SAVE_KEY = 'so-sach-nguoi-de-lai.save';

const line = z
  .object({
    account: z.string(),
    debit: z.number().int().nonnegative().optional(),
    credit: z.number().int().nonnegative().optional(),
    partner: z.string().optional(),
    item: z.string().optional(),
    segment: z.string().optional(),
  })
  .strict();
const entry = z.object({ memo: z.string().optional(), lines: z.array(line) }).strict();

const eventProgress = z
  .object({ status: z.enum(['first', 'retry', 'revealed']), attempts: z.number().int().nonnegative(), entries: z.array(entry) })
  .strict();

const tier2Finding = z
  .object({ lineKey: z.string(), reports: z.array(z.string()), reasonId: z.string(), anomalyId: z.string().nullable(), points: z.number() })
  .strict();

const caseProgress = z
  .object({
    events: z.record(eventProgress).default({}),
    closedMonths: z.array(z.string()).default([]),
    tier2: z.object({ findings: z.array(tier2Finding).default([]) }).strict().optional(),
    tier3: z
      .object({
        recon: z
          .object({
            lines: z.array(z.object({ ruleId: z.string(), amount: z.number().int() }).strict()),
            taxableIncome: z.number().int(),
            citExpense: z.number().int(),
            points: z.number(),
            maxPoints: z.number(),
          })
          .strict()
          .optional(),
        adjustments: z
          .record(z.object({ category: z.string(), entries: z.array(entry), status: z.enum(['first', 'retry', 'revealed']), attempts: z.number().int() }).strict())
          .default({}),
      })
      .strict()
      .optional(),
  })
  .strict();

export const saveSchema = z
  .object({
    version: z.literal(1),
    updatedAt: z.string(),
    cases: z.record(caseProgress).default({}),
    settings: z.object({ enableUnverified: z.boolean().default(false) }).strict().default({}),
    debugEntries: z.array(entry.extend({ date: z.string() })).default([]),
  })
  .strict();

export type SaveData = z.infer<typeof saveSchema>;
export type CaseProgress = z.infer<typeof caseProgress>;
export type EventProgress = z.infer<typeof eventProgress>;
export type Tier2Finding = z.infer<typeof tier2Finding>;

export function emptySave(): SaveData {
  return { version: 1, updatedAt: new Date(0).toISOString(), cases: {}, settings: { enableUnverified: false }, debugEntries: [] };
}

export function emptyCaseProgress(): CaseProgress {
  return { events: {}, closedMonths: [] };
}

export interface KeyValueStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function parseSave(text: string): { ok: true; data: SaveData } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File không phải JSON hợp lệ.' };
  }
  const r = saveSchema.safeParse(json);
  if (!r.success) return { ok: false, error: `File lưu không đúng định dạng: ${r.error.issues[0]?.path.join('.')} — ${r.error.issues[0]?.message}` };
  return { ok: true, data: r.data };
}

export function loadSave(store: KeyValueStore | null = defaultStore()): SaveData {
  try {
    const text = store?.getItem(SAVE_KEY);
    if (!text) return emptySave();
    const r = parseSave(text);
    return r.ok ? r.data : emptySave();
  } catch {
    return emptySave();
  }
}

export function writeSave(data: SaveData, store: KeyValueStore | null = defaultStore()): boolean {
  try {
    data.updatedAt = new Date().toISOString();
    store?.setItem(SAVE_KEY, JSON.stringify(data));
    return !!store;
  } catch {
    return false;
  }
}

export function exportSave(data: SaveData): string {
  return JSON.stringify(data, null, 2);
}
