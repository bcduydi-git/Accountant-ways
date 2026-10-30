import { z } from 'zod';

// Schema kịch bản (SPEC 5.3.4). Mọi file trong data/cases được validate khi load.

const int = z.number().int().nonnegative();
const id = z.string().min(1);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const calcAmount = z.object({ $calc: z.enum(['citExpense']) }).strict();
const amount = z.union([int, calcAmount]);

export const scenarioLine = z
  .object({
    account: id,
    debit: amount.optional(),
    credit: amount.optional(),
    partner: id.optional(),
    item: id.optional(),
    segment: id.optional(),
    cashFlow: z.object({ activity: z.enum(['KD', 'DT', 'TC']), code: id }).optional(),
  })
  .strict();

export const scenarioEntry = z.object({ memo: z.string().optional(), lines: z.array(scenarioLine).min(2) }).strict();
export const entriesAnswer = z.object({ entries: z.array(scenarioEntry).min(1) }).strict();
export const answer = z.union([entriesAnswer, z.object({ $calc: z.literal('closing') }).strict()]);

export const attrs = z
  .object({
    invoice: z
      .object({ totalInclVAT: int, paymentMethod: z.enum(['cash', 'bank', 'credit']), valid: z.boolean().optional() })
      .strict()
      .optional(),
    vat: z.object({ base: int, ruleId: id }).strict().optional(),
    expenseType: z.string().optional(),
    depreciation: z.array(z.object({ assetId: id, amount: int }).strict()).optional(),
    interest: z.object({ amount: int, principal: int, lender: id }).strict().optional(),
    relatedParty: z.boolean().optional(),
  })
  .strict();

export const dialogue = z.object({ speaker: id, text: z.string().min(1) }).strict();

export const documentSchema = z
  .object({ kind: z.string(), title: z.string().optional(), rows: z.array(z.tuple([z.string(), z.string()])) })
  .strict();

export const eventSchema = z
  .object({
    id,
    date: dateStr,
    title: z.string().min(1),
    kind: z.enum(['normal', 'cit', 'closing']).default('normal'),
    speaker: id.optional(),
    narrative: z.string().min(1),
    documents: z.array(documentSchema).default([]),
    hint: z.string().optional(),
    explanation: z.string().min(1),
    attrs: attrs.default({}),
    answer,
    alternativeAnswers: z.array(entriesAnswer).default([]),
    substance: z.array(id).default([]),
    unusual: z.boolean().optional(),
  })
  .strict();

export const monthSchema = z
  .object({
    id,
    label: z.string(),
    intro: z.array(dialogue).default([]),
    outro: z.array(dialogue).default([]),
    events: z.array(eventSchema).min(1),
  })
  .strict();

export const characterSchema = z
  .object({ id, name: z.string(), role: z.string(), color: z.string(), mentor: z.boolean().optional(), sprite: z.string().optional() })
  .strict();

export const partnerSchema = z
  .object({
    id,
    name: z.string(),
    kind: z.enum(['customer', 'supplier', 'lender', 'employee', 'shareholder', 'state', 'other']),
    relatedParty: z.boolean().optional(),
    term: z.enum(['short', 'long']).optional(),
  })
  .strict();

export const caseSchema = z
  .object({
    id,
    order: z.number().int(),
    title: z.string(),
    type: z.string(),
    company: z.object({ name: z.string(), taxNote: z.string().optional(), description: z.string() }).strict(),
    fiscalYear: z.number().int(),
    regulationNote: z.string(),
    characters: z.array(characterSchema).min(3).max(6),
    partners: z.array(partnerSchema),
    items: z.array(z.object({ id, name: z.string(), unit: z.string() }).strict()).default([]),
    segments: z.array(z.object({ id, name: z.string() }).strict()).default([]),
    detailAccounts: z.record(z.array(z.enum(['partner', 'item', 'segment']))),
    months: z.array(z.object({ id, label: z.string(), openAccounts: z.array(id).min(2) }).strict()).min(1),
    tiers: z.object({ tier2: z.boolean(), tier3a: z.boolean(), tier3b: z.boolean(), tier3Note: z.string().optional() }).strict(),
    reportTemplate: id,
    intro: z.array(dialogue).default([]),
  })
  .strict();

export const fixedAssetSchema = z
  .object({
    id,
    name: z.string(),
    account: id,
    cost: int,
    accumulated: int,
    monthlyDepreciation: int,
    usefulLifeMonths: z.number().int().positive(),
    type: z.enum(['general', 'passenger-car']).default('general'),
    seats: z.number().int().optional(),
    businessUse: z.boolean().default(true),
    acquiredInYear: z.boolean().optional(),
  })
  .strict();

export const openingSchema = z
  .object({
    date: dateStr,
    balances: z.array(scenarioLine).min(2),
    priorYearRevenue: int,
    charterCapital: z.object({ registered: int, contributed: int }).strict(),
    priorYearIncomeStatement: z.record(z.number().int()),
    inventory: z.array(z.object({ account: id, item: id, qty: int, unitCost: int }).strict()).default([]),
    fixedAssets: z.array(fixedAssetSchema).default([]),
  })
  .strict();

const lineRef = z.object({ report: z.enum(['CĐKT', 'KQKD', 'LCTT', 'TM']), code: id }).strict();

export const noteTable = z
  .object({ id, title: z.string(), columns: z.array(z.string()), rows: z.array(z.object({ code: id, cells: z.array(z.string()) }).strict()) })
  .strict();

export const injection = z
  .object({ id, date: dateStr, memo: z.string(), lines: z.array(scenarioLine).min(2) })
  .strict();

export const anomaliesSchema = z
  .object({
    intro: z.string(),
    injections: z.array(injection).default([]),
    notes: z.array(noteTable).default([]),
    reasons: z.array(z.object({ id, text: z.string() }).strict()).min(4),
    anomalies: z
      .array(
        z
          .object({
            id,
            title: z.string(),
            lineRefs: z.array(lineRef).min(1),
            reportsTouched: z.array(z.enum(['CĐKT', 'KQKD', 'LCTT', 'TM'])).min(1),
            reasonId: id,
            explanation: z.string(),
            pattern: z.string(),
          })
          .strict(),
      )
      .min(3)
      .max(5),
  })
  .strict();

export const adjustmentsSchema = z
  .object({
    reconciliation: z.object({ intro: z.string() }).strict(),
    companyBook: z.object({ intro: z.string(), injections: z.array(injection).default([]) }).strict().optional(),
    items: z
      .array(
        z
          .object({
            id,
            category: id,
            title: z.string(),
            evidence: z.array(z.string()).min(1),
            answer: entriesAnswer,
            alternativeAnswers: z.array(entriesAnswer).default([]),
            explanation: z.string(),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

export type ScenarioLine = z.infer<typeof scenarioLine>;
export type ScenarioEntry = z.infer<typeof scenarioEntry>;
export type ScenarioEvent = z.infer<typeof eventSchema>;
export type ScenarioMonth = z.infer<typeof monthSchema>;
export type CaseMeta = z.infer<typeof caseSchema>;
export type Opening = z.infer<typeof openingSchema>;
export type Anomalies = z.infer<typeof anomaliesSchema>;
export type Adjustments = z.infer<typeof adjustmentsSchema>;
export type FixedAsset = z.infer<typeof fixedAssetSchema>;
export type Attrs = z.infer<typeof attrs>;

export const ruleSchema = z
  .object({
    id,
    kind: z.enum([
      'cit-rate',
      'vat-reduced-rate',
      'noncash-payment-threshold',
      'nondeductible-expense-type',
      'nonbusiness-depreciation',
      'passenger-car-depreciation-cap',
      'interest-uncontributed-capital',
      'invalid-invoice',
      'informational',
    ]),
    description: z.string(),
    params: z.record(z.unknown()),
    basis: z.string(),
    asOf: dateStr,
    status: z.enum(['verified-primary', 'verified-secondary', 'unverified']),
    effects: z.array(z.string()),
  })
  .strict();
export type RuleRecord = z.infer<typeof ruleSchema>;
