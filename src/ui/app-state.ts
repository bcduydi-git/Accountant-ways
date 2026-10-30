import { loadRuleRecords } from '../data/registry';
import { loadSave, writeSave, emptyCaseProgress, type CaseProgress, type SaveData } from '../game/save';
import { RuleSet } from '../tax/rules';

/** Trạng thái toàn cục của game (một người chơi, một file lưu). */
export const app = {
  save: loadSave() as SaveData,
  rules: new RuleSet(loadRuleRecords()),
  persisted: true,
};

export function rebuildRules() {
  app.rules = new RuleSet(loadRuleRecords(), { enableUnverified: app.save.settings.enableUnverified });
}
rebuildRules();

export function persist() {
  app.persisted = writeSave(app.save);
}

export function caseProgress(caseId: string): CaseProgress {
  app.save.cases[caseId] ??= emptyCaseProgress();
  return app.save.cases[caseId]!;
}

export function replaceSave(data: SaveData) {
  app.save = data;
  rebuildRules();
  persist();
}
