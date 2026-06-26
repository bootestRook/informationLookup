import { LevelRecord, LookupData, MonsterInfo } from '../../types';
import { getSheetRows, headerIndex, normalizeId, stripLevelPrefix, stripRichText, toText } from '../../utils/excel';
import * as XLSX from 'xlsx';

export function buildMonsterMap(workbook: XLSX.WorkBook, textMap: Map<number, string>): Map<number, Omit<MonsterInfo, "waves" | "total_count">> {
  const rows = getSheetRows(workbook, "怪物配置表");
  const index = headerIndex(rows);
  const monsterMap = new Map<number, Omit<MonsterInfo, "waves" | "total_count">>();

  for (const row of rows.slice(1)) {
    const monsterId = normalizeId(row[index["ID"]]);
    if (typeof monsterId !== "number") continue;

    const modelId = normalizeId(row[index["模型ID"]]);
    const nameId = normalizeId(row[index["怪物名称ID"]]);
    const descriptionId = normalizeId(row[index["怪物描述ID"]]);
    const type = normalizeId(row[index["类型"]]);
    const rawName = (typeof nameId === "number" ? textMap.get(nameId) : "") || toText(row[index["模型名称"]]);
    const rawDescription = (typeof descriptionId === "number" ? textMap.get(descriptionId) : "") || toText(row[index["怪物描述"]]);

    monsterMap.set(monsterId, {
      monster_id: monsterId,
      model_id: typeof modelId === "number" ? modelId : null,
      type: typeof type === "number" ? type : 0,
      type_name: type === 1 ? "小怪" : type === 6 ? "精英怪" : type === 2 ? "首领" : String(type ?? ""),
      name_id: typeof nameId === "number" ? nameId : null,
      raw_name: rawName,
      name: stripRichText(rawName),
      description_id: typeof descriptionId === "number" ? descriptionId : null,
      raw_description: rawDescription,
      description: stripRichText(rawDescription),
      model_name: toText(row[index["模型名称"]]),
      frame_resource: "",
    });
  }

  return monsterMap;
}

export function buildLevelMonsters(
  workbook: XLSX.WorkBook,
  monsterMap: Map<number, Omit<MonsterInfo, "waves" | "total_count">>,
): Map<number, { small: Map<number, MonsterInfo>; elite: Map<number, MonsterInfo>; boss: Map<number, MonsterInfo> }> {
  const rows = getSheetRows(workbook, "关卡波次配置-2主线关卡");
  const index = headerIndex(rows);
  const levelMonsters = new Map<number, { small: Map<number, MonsterInfo>; elite: Map<number, MonsterInfo>; boss: Map<number, MonsterInfo> }>();

  const roleByType: Record<number, "small" | "elite" | "boss" | undefined> = {
    1: "small",
    6: "elite",
    2: "boss",
  };

  for (const row of rows.slice(1)) {
    const levelId = normalizeId(row[index["关卡ID"]]);
    const monsterId = normalizeId(row[index["怪物ID"]]);
    if (typeof levelId !== "number" || typeof monsterId !== "number") continue;

    const baseMonster = monsterMap.get(monsterId);
    if (!baseMonster) continue;

    const role = roleByType[baseMonster.type];
    if (!role) continue;

    if (!levelMonsters.has(levelId)) {
      levelMonsters.set(levelId, { small: new Map(), elite: new Map(), boss: new Map() });
    }

    const group = levelMonsters.get(levelId)![role];
    if (!group.has(monsterId)) {
      group.set(monsterId, { ...baseMonster, waves: [], total_count: 0 });
    }

    const monster = group.get(monsterId)!;
    const count = normalizeId(row[index["怪物数量"]]);
    monster.waves.push({
      wave: typeof normalizeId(row[index["波次"]]) === "number" ? (normalizeId(row[index["波次"]]) as number) : null,
      wave_type: typeof normalizeId(row[index["波次类型"]]) === "number" ? (normalizeId(row[index["波次类型"]]) as number) : null,
      count: typeof count === "number" ? count : null,
    });
    if (typeof count === "number") monster.total_count += count;
  }

  return levelMonsters;
}

export function extractStageKey(...values: string[]): string | null {
  for (const value of values) {
    const stageMatch = value.match(/第\s*(\d+(?:-\d+)?)\s*关/);
    if (stageMatch) return stageMatch[1];
    const prefixMatch = value.match(/^\s*(\d+(?:-\d+)?)\s*[.。．、]/);
    if (prefixMatch) return prefixMatch[1];
  }
  return null;
}

export function mapMonsterList(group: Map<number, MonsterInfo> | undefined): MonsterInfo[] {
  return [...(group?.values() ?? [])].sort((left, right) => {
    const leftWave = Math.min(...left.waves.map((wave) => wave.wave ?? 9999));
    const rightWave = Math.min(...right.waves.map((wave) => wave.wave ?? 9999));
    return leftWave - rightWave || left.monster_id - right.monster_id;
  });
}

export function buildLookupData(
  levelWorkbook: XLSX.WorkBook,
  textMap: Map<number, string>,
  levelMonsters: Map<number, { small: Map<number, MonsterInfo>; elite: Map<number, MonsterInfo>; boss: Map<number, MonsterInfo> }>,
): LookupData {
  const rows = getSheetRows(levelWorkbook, "关卡基础配置表");
  const index = headerIndex(rows);
  const byLevelId: Record<string, LevelRecord> = {};
  const candidates: Array<LevelRecord & { rank: [number, number, number] }> = [];
  const duplicateCounter: Record<string, number> = {};

  for (const row of rows.slice(1)) {
    const levelId = normalizeId(row[index["关卡ID"]]);
    if (typeof levelId !== "number") continue;

    if (normalizeId(row[index["关卡类型"]]) !== 1 || normalizeId(row[index["玩法类型"]]) !== 1) continue;

    const rawRemark = toText(row[index["备注"]]);
    const rawAuxRemark = toText(row[index["关卡辅助名称备注(40430001)"]]);
    const levelNameId = normalizeId(row[index["关卡名称"]]);
    const labelId = normalizeId(row[index["关卡辅助名称"]]);
    const rawLevelName = (typeof levelNameId === "number" ? textMap.get(levelNameId) : "") || rawRemark;
    const rawLevelLabel = (typeof labelId === "number" ? textMap.get(labelId) : "") || rawAuxRemark;
    const stageKey = extractStageKey(rawAuxRemark, rawLevelLabel, rawRemark, rawLevelName) ?? (levelId >= 1001 && levelId <= 9999 ? String(levelId - 1000) : null);
    if (stageKey === null) continue;
    const stageNo = Number(stageKey.split("-")[0]);

    const label = stripRichText(rawLevelLabel) || `第${stageKey}关`;
    const levelName = stripLevelPrefix(rawLevelName);
    const monsters = levelMonsters.get(levelId);
    const record: LevelRecord & { rank: [number, number, number] } = {
      stage_key: stageKey,
      stage_no: stageNo,
      level_id: levelId,
      level_label: label,
      level_name: levelName,
      level_label_name: label && levelName ? `${label}-${levelName}` : levelName || label,
      raw_level_name: rawLevelName,
      raw_level_label: rawLevelLabel,
      source_remark: rawRemark,
      monsters: {
        small: mapMonsterList(monsters?.small),
        elite: mapMonsterList(monsters?.elite),
        boss: mapMonsterList(monsters?.boss),
      },
      rank: [rawAuxRemark.includes(`第${stageKey}关`) || rawLevelLabel.includes(`第${stageKey}关`) ? 1 : 0, levelId >= 1001 && levelId <= 1999 ? 1 : 0, -levelId],
    };

    byLevelId[String(levelId)] = record;
    duplicateCounter[stageKey] = (duplicateCounter[stageKey] ?? 0) + 1;
    candidates.push(record);
  }

  const byStage: Record<string, LevelRecord> = {};
  for (const candidate of candidates) {
    const key = candidate.stage_key;
    const current = byStage[key] as (LevelRecord & { rank?: [number, number, number] }) | undefined;
    if (!current || compareRank(candidate.rank, current.rank ?? [0, 0, -Infinity]) > 0) {
      byStage[key] = candidate;
    }
  }

  for (const record of Object.values(byStage) as Array<LevelRecord & { rank?: [number, number, number] }>) {
    delete record.rank;
  }

  return {
    byStage,
    byLevelId,
    duplicateStages: Object.fromEntries(Object.entries(duplicateCounter).filter(([, count]) => count > 1)),
  };
}

export function compareRank(left: [number, number, number], right: [number, number, number]): number {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}
