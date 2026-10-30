// Kiểu dữ liệu dùng chung của engine kế toán.

export type DetailField = 'partner' | 'item' | 'segment';

/** Dòng bút toán do người chơi hoặc kịch bản nhập. Chỉ một trong debit/credit > 0. */
export interface LineInput {
  account: string;
  debit?: number;
  credit?: number;
  partner?: string;
  item?: string;
  segment?: string;
  /** Ghi đè nhãn dòng tiền (chỉ áp cho dòng tiền 111/112/113 khi bút toán có đúng một dòng tiền). */
  cashFlow?: { activity: CashActivity; code: string };
}

export type EntryKind = 'opening' | 'normal' | 'closing';

export interface EntryInput {
  id?: string;
  date: string;
  memo?: string;
  eventId?: string;
  kind?: EntryKind;
  /** Nguồn bút toán (để hiển thị): người chơi, đáp án, chèn bất thường... */
  source?: string;
  lines: LineInput[];
}

export interface Line {
  account: string;
  debit: number;
  credit: number;
  partner?: string;
  item?: string;
  segment?: string;
  cashFlow?: { activity: CashActivity; code: string };
}

export type CashActivity = 'KD' | 'DT' | 'TC';

export interface CashFlowItem {
  activity: CashActivity;
  code: string;
  /** Dương = tiền vào, âm = tiền ra. */
  amount: number;
  account: string;
}

export interface PostedEntry {
  id: string;
  seq: number;
  date: string;
  memo?: string;
  eventId?: string;
  kind: EntryKind;
  source?: string;
  lines: Line[];
  cashFlows: CashFlowItem[];
}

export interface Account {
  code: string;
  name: string;
  parent: string | null;
  needsCheck: boolean;
}

export type Term = 'short' | 'long';

// ---- Mẫu báo cáo (data/report-templates) ----

export interface BsSource {
  prefix: string;
  split?: boolean;
  term?: Term;
}

export interface BsLineDef {
  code: string;
  label: string;
  level: number;
  nature?: 'debit' | 'credit';
  src?: BsSource[];
  sum?: string[];
  total?: boolean;
}

export interface IsLineDef {
  code: string;
  label: string;
  src?: { prefix: string; measure: 'debit' | 'credit' }[];
  formula?: [string, number][];
  bold?: boolean;
}

export interface CfMapping {
  prefix: string;
  activity: CashActivity;
  direct: string | { in: string; out: string };
  indirect?: string;
}

export interface CfDirectLineDef {
  code: string;
  label: string;
  activity?: CashActivity;
  header?: boolean;
  total?: CashActivity;
}

export interface CfIndirectLineDef {
  code: string;
  label: string;
  special?: 'profitBeforeTax' | 'nonOperating' | 'incomeTaxPaid';
  group?: 'adjust' | 'wc';
  subtotal?: string[];
}

export interface ReportTemplate {
  id: string;
  label: string;
  status: 'temp' | 'official';
  note?: string;
  config: {
    cashAccounts: string[];
    closingAccount: string;
    retainedEarningsCurrent: string;
    profitAndLossPrefixes: string[];
    incomeTaxExpenseLine: string;
    ownerCapitalPrefix: string;
  };
  balanceSheet: { totalAssets: string; totalSources: string; lines: BsLineDef[] };
  incomeStatement: { lines: IsLineDef[]; productionAccounts?: string[]; productionLabel?: string };
  cashFlow: { mapping: CfMapping[]; direct: CfDirectLineDef[]; indirect: CfIndirectLineDef[] };
}

/** Ngữ cảnh engine: danh mục TK, mẫu báo cáo, kỳ hạn của đối tượng vay. */
export interface EngineContext {
  accounts: Map<string, Account>;
  postable: Set<string>;
  template: ReportTemplate;
  partnerTerms: Record<string, Term>;
}
