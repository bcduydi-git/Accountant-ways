import { accountLabel } from '../engine/coa';
import { formatVND, parseVND } from '../engine/format';
import type { KeySpec } from '../engine/scoring';
import type { DetailField, EngineContext, LineInput } from '../engine/types';
import { button, h } from './dom';

export interface DetailOptions {
  partner: { id: string; name: string }[];
  item: { id: string; name: string }[];
  segment: { id: string; name: string }[];
}

export interface EntryFormOptions {
  ctx: EngineContext;
  accounts: string[];
  spec: KeySpec;
  details: DetailOptions;
  onChange?: () => void;
}

interface RowState {
  account: string;
  debit: number | null;
  credit: number | null;
  partner?: string;
  item?: string;
  segment?: string;
}

export interface FormResult {
  entries: { lines: LineInput[] }[];
  errors: string[];
}

const FIELD_LABEL: Record<DetailField, string> = { partner: 'Đối tượng', item: 'Mặt hàng', segment: 'Mảng' };
let formSeq = 0;

/** Form nhập bút toán: nhiều bút toán, mỗi bút toán nhiều dòng; ô TK tìm theo số hoặc tên. */
export function entryForm(o: EntryFormOptions) {
  const listId = `acc-list-${++formSeq}`;
  const datalist = h('datalist', { attrs: { id: listId } }, ...o.accounts.map((a) => h('option', { attrs: { value: accountLabel(o.ctx, a) } })));
  let entries: RowState[][] = [[blank(), blank()]];
  const body = h('div', { class: 'entry-body' });
  const root = h('div', { class: 'entry-form' }, datalist, body);

  function blank(): RowState {
    return { account: '', debit: null, credit: null };
  }

  const parseAccount = (text: string): string => {
    const code = text.trim().split(/\s|–|-/)[0] ?? '';
    return code;
  };

  function amountInput(row: RowState, side: 'debit' | 'credit', label: string) {
    const input = h('input', {
      class: 'num amount',
      attrs: { inputmode: 'numeric', placeholder: '0', 'aria-label': label, value: row[side] ? formatVND(row[side]!) : '' },
    });
    input.addEventListener('input', () => {
      row[side] = parseVND(input.value);
      if (row[side]) row[side === 'debit' ? 'credit' : 'debit'] = null;
      o.onChange?.();
      updateTotals();
    });
    input.addEventListener('blur', () => {
      input.value = row[side] ? formatVND(row[side]!) : '';
      const other = input.parentElement?.querySelectorAll<HTMLInputElement>('input.amount')[side === 'debit' ? 1 : 0];
      if (other && row[side]) other.value = '';
    });
    return input;
  }

  let totalsEls: HTMLElement[] = [];
  function updateTotals() {
    entries.forEach((rows, i) => {
      const dr = rows.reduce((s, r) => s + (r.debit ?? 0), 0);
      const cr = rows.reduce((s, r) => s + (r.credit ?? 0), 0);
      const el = totalsEls[i];
      if (!el) return;
      el.textContent = `Tổng Nợ ${formatVND(dr)} · Tổng Có ${formatVND(cr)}${dr !== cr ? ` · Chênh ${formatVND(Math.abs(dr - cr))}` : ' · Cân'}`;
      el.className = `entry-totals ${dr === cr && dr > 0 ? 'ok' : 'bad'}`;
    });
  }

  function detailSelect(row: RowState, field: DetailField) {
    const opts = o.details[field];
    const sel = h(
      'select',
      { attrs: { 'aria-label': FIELD_LABEL[field] } },
      h('option', { text: `— ${FIELD_LABEL[field]} —`, attrs: { value: '' } }),
      ...opts.map((x) => h('option', { text: x.name, attrs: { value: x.id, selected: row[field] === x.id } })),
    );
    sel.addEventListener('change', () => {
      row[field] = sel.value || undefined;
      o.onChange?.();
    });
    return sel;
  }

  function render() {
    body.replaceChildren();
    totalsEls = [];
    entries.forEach((rows, ei) => {
      const rowEls = rows.map((row, ri) => {
        const acc = h('input', {
          class: 'acc',
          attrs: { list: listId, placeholder: 'Số hoặc tên TK…', 'aria-label': 'Tài khoản', value: row.account ? accountLabel(o.ctx, row.account) : '' },
        });
        const details = h('div', { class: 'details' }, ...o.spec(row.account).map((f) => detailSelect(row, f)));
        acc.addEventListener('change', () => {
          row.account = parseAccount(acc.value);
          if (o.accounts.includes(row.account)) acc.value = accountLabel(o.ctx, row.account);
          for (const f of ['partner', 'item', 'segment'] as const) if (!o.spec(row.account).includes(f)) delete row[f];
          details.replaceChildren(...o.spec(row.account).map((f) => detailSelect(row, f)));
          o.onChange?.();
        });
        return h(
          'div',
          { class: 'entry-row' },
          acc,
          details,
          amountInput(row, 'debit', 'Nợ'),
          amountInput(row, 'credit', 'Có'),
          button('×', () => { rows.splice(ri, 1); if (!rows.length) rows.push(blank()); render(); o.onChange?.(); }, 'btn-icon', 'Xóa dòng'),
        );
      });
      const totals = h('div', { class: 'entry-totals' });
      totalsEls.push(totals);
      body.append(
        h(
          'fieldset',
          { class: 'entry' },
          h('legend', { text: `Bút toán ${ei + 1}` }),
          h('div', { class: 'entry-row head' }, h('span', { text: 'Tài khoản' }), h('span', { text: 'Chi tiết' }), h('span', { class: 'num', text: 'Nợ' }), h('span', { class: 'num', text: 'Có' }), h('span')),
          ...rowEls,
          h(
            'div',
            { class: 'entry-actions' },
            button('+ Thêm dòng', () => { rows.push(blank()); render(); }, 'btn-small'),
            entries.length > 1 ? button('Xóa bút toán', () => { entries.splice(ei, 1); render(); o.onChange?.(); }, 'btn-small') : null,
            totals,
          ),
        ),
      );
    });
    body.append(button('+ Thêm bút toán', () => { entries.push([blank(), blank()]); render(); }, 'btn-small'));
    updateTotals();
  }
  render();

  return {
    el: root,
    reset() {
      entries = [[blank(), blank()]];
      render();
    },
    setEntries(es: { lines: LineInput[] }[]) {
      entries = es.map((e) => e.lines.map((l) => ({ account: l.account, debit: l.debit ?? null, credit: l.credit ?? null, partner: l.partner, item: l.item, segment: l.segment })));
      if (!entries.length) entries = [[blank(), blank()]];
      render();
    },
    /** Đọc bút toán; kiểm tra hình thức (TK mở, đủ chi tiết, cân) trước khi chấm. */
    read(): FormResult {
      const errors: string[] = [];
      const out: { lines: LineInput[] }[] = [];
      entries.forEach((rows, ei) => {
        const used = rows.filter((r) => r.account || r.debit || r.credit);
        if (!used.length) return;
        const lines: LineInput[] = [];
        used.forEach((r, ri) => {
          const where = `Bút toán ${ei + 1}, dòng ${ri + 1}`;
          if (!r.account) return errors.push(`${where}: chưa chọn tài khoản.`);
          if (!o.accounts.includes(r.account)) return errors.push(`${where}: TK ${r.account} không có trong danh mục mở của tháng này.`);
          if (!r.debit && !r.credit) return errors.push(`${where}: chưa nhập số tiền.`);
          for (const f of o.spec(r.account)) if (!r[f]) errors.push(`${where}: TK ${r.account} cần chọn ${FIELD_LABEL[f].toLowerCase()}.`);
          const l: LineInput = { account: r.account };
          if (r.debit) l.debit = r.debit;
          if (r.credit) l.credit = r.credit;
          if (r.partner) l.partner = r.partner;
          if (r.item) l.item = r.item;
          if (r.segment) l.segment = r.segment;
          lines.push(l);
        });
        const dr = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
        const cr = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
        if (lines.length < 2) errors.push(`Bút toán ${ei + 1}: cần ít nhất hai dòng.`);
        else if (dr !== cr) errors.push(`Bút toán ${ei + 1}: không cân (Nợ ${formatVND(dr)} ≠ Có ${formatVND(cr)}).`);
        out.push({ lines });
      });
      if (!out.length) errors.push('Chưa nhập bút toán nào.');
      return { entries: out, errors };
    },
  };
}

export type EntryForm = ReturnType<typeof entryForm>;
