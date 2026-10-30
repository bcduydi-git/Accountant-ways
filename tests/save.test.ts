import { describe, expect, it } from 'vitest';
import { emptySave, exportSave, loadSave, parseSave, SAVE_KEY, writeSave, type KeyValueStore } from '../src/game/save';

class MemStore implements KeyValueStore {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

class BrokenStore implements KeyValueStore {
  getItem(): string | null {
    throw new Error('blocked');
  }
  setItem() {
    throw new Error('blocked');
  }
  removeItem() {}
}

describe('Lưu, xuất, nhập tiến độ', () => {
  it('ghi rồi đọc lại từ localStorage', () => {
    const s = new MemStore();
    const d = emptySave();
    d.cases['ho-so-1'] = {
      events: { e1: { status: 'first', attempts: 1, entries: [{ lines: [{ account: '111', debit: 1 }, { account: '112', credit: 1 }] }] } },
      closedMonths: ['month-01'],
    };
    expect(writeSave(d, s)).toBe(true);
    expect(loadSave(s).cases['ho-so-1']!.closedMonths).toEqual(['month-01']);
  });

  it('xuất file rồi nhập lại cho cùng dữ liệu', () => {
    const d = emptySave();
    d.settings.enableUnverified = true;
    const r = parseSave(exportSave(d));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.settings.enableUnverified).toBe(true);
  });

  it('file hỏng hoặc sai định dạng bị từ chối, không làm sập game', () => {
    expect(parseSave('{không phải json').ok).toBe(false);
    expect(parseSave('{"version":2}').ok).toBe(false);
    const s = new MemStore();
    s.setItem(SAVE_KEY, 'rác');
    expect(loadSave(s)).toEqual(emptySave());
  });

  it('localStorage bị chặn: try/catch, game vẫn chạy', () => {
    expect(loadSave(new BrokenStore())).toEqual(emptySave());
    expect(writeSave(emptySave(), new BrokenStore())).toBe(false);
  });
});
