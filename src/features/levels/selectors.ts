import { LevelRecord, LookupData, MonsterInfo } from '../../types';

export function findRecord(data: LookupData | null, query: string): LevelRecord | null {
  if (!data) return null;
  const trimmed = query.trim();
  if (!trimmed) return null;
  const stageText = trimmed.replace(/[第关\s]/g, "");
  if (/^\d+(?:-\d+)?$/.test(stageText)) {
    return data.byStage[stageText] ?? data.byLevelId[stageText] ?? Object.values(data.byStage).find((record) => record.stage_key.startsWith(`${stageText}-`)) ?? null;
  }
  return (
    Object.values(data.byStage).find((record) => record.level_label_name.includes(trimmed) || record.level_name.includes(trimmed)) ?? null
  );
}

export function monsterSummary(monsters: MonsterInfo[]): string {
  return monsters.length ? monsters.map((monster) => monster.name).join("、") : "无";
}

export function compareStage(left: LevelRecord, right: LevelRecord): number {
  const [leftMain, leftSub = "0"] = left.stage_key.split("-");
  const [rightMain, rightSub = "0"] = right.stage_key.split("-");
  return Number(leftMain) - Number(rightMain) || Number(leftSub) - Number(rightSub) || left.level_id - right.level_id;
}
