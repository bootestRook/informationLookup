import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowClockwise,
  CheckCircle,
  Database,
  FileMagnifyingGlass,
  FolderOpen,
  MagnifyingGlass,
  Rows,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import * as XLSX from "xlsx";
import "./styles.css";

type CellValue = string | number | boolean | null | undefined;
type SheetRows = CellValue[][];

type RequiredFileKey = "monster" | "spawn" | "level" | "text" | "gem" | "skin" | "skill" | "entry";

type MatchedFile = {
  key: RequiredFileKey;
  label: string;
  fileName: string;
  relativePath: string;
  file?: File;
};

type MonsterInfo = {
  monster_id: number;
  type: number;
  type_name: string;
  name_id: number | null;
  raw_name: string;
  name: string;
  description_id: number | null;
  raw_description: string;
  description: string;
  model_name: string;
  waves: Array<{ wave: number | null; wave_type: number | null; count: number | null }>;
  total_count: number;
};

type LevelRecord = {
  stage_no: number;
  level_id: number;
  level_label: string;
  level_name: string;
  level_label_name: string;
  raw_level_name: string;
  raw_level_label: string;
  source_remark: string;
  monsters: {
    small: MonsterInfo[];
    elite: MonsterInfo[];
    boss: MonsterInfo[];
  };
};

type LookupData = {
  byStage: Record<string, LevelRecord>;
  byLevelId: Record<string, LevelRecord>;
  duplicateStages: Record<string, number>;
};

type GemRecord = {
  item_id: number;
  name: string;
  part: string;
  part_id: number | string;
  quality: string;
  quality_id: number | string;
  season: string;
  season_id: number | string | null;
  gem_type: number | string;
  effect: string;
  refine_weight: number;
  refine_weight_source: string;
  refine_pool_total: number;
  refine_probability: number;
  attribute_id: number | string | null;
  attribute_type: number | string | null;
  attribute_value: number | string | null;
  power: number | string | null;
};

type GemLookup = {
  records: GemRecord[];
  parts: Array<{ id: string; name: string; pool_total: number; type_count: number; record_count: number }>;
  qualities: Array<{ id: string; name: string; record_count: number }>;
  seasons: Array<{ id: string; name: string; record_count: number }>;
};

type SkinCategoryKey = "person" | "core" | "wall" | "personChroma" | "coreChroma" | "wallChroma";

type SkinLevel = {
  level: number | string;
  effect_name: string;
  effect: string;
};

type SkinReference = {
  skin_id: number;
  category: SkinCategoryKey | null;
  name: string;
};

type SkinRecord = {
  category: SkinCategoryKey;
  name: string;
  skin_id: number;
  item_id: number | null;
  skill_name: string;
  prerequisite_skins: SkinReference[];
  levels: SkinLevel[];
};

type SkinLookupData = Record<SkinCategoryKey, SkinRecord[]>;

type EntryCondition = {
  type: number | string;
  target_id: number | string | null;
  count: number | string | null;
  text: string;
  alternatives?: EntryCondition[];
};

type EntryRecord = {
  group_id: number;
  entry_id: number;
  name_id: number | null;
  name: string;
  description_id: number | null;
  description: string;
  skill_id: number | null;
  skill_name: string;
  prerequisites: EntryCondition[];
  conflicts: EntryCondition[];
};

type EntryLookupData = {
  records: EntryRecord[];
};

type AppTab = "levels" | "gems" | "skins" | "entries";

type LoadState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "ready"; message: string }
  | { status: "error"; message: string };

const REQUIRED_FILES: Array<{ key: RequiredFileKey; label: string; fileName: string }> = [
  { key: "monster", label: "怪物配置", fileName: "怪物配置表.xlsx" },
  { key: "spawn", label: "主线刷怪", fileName: "T5怪物刷新配置表-2主线关卡.xlsx" },
  { key: "level", label: "关卡配置", fileName: "T5关卡配置表.xlsx" },
  { key: "text", label: "文本配置", fileName: "文本配置表-一般表格.xlsx" },
  { key: "gem", label: "宝石配置", fileName: "宝石配置表.xlsx" },
  { key: "skin", label: "皮肤配置", fileName: "T5皮肤配置表.xlsx" },
  { key: "skill", label: "源素配置", fileName: "源素表结构.xlsx" },
  { key: "entry", label: "局内词条", fileName: "随机词条库配置表.xlsx" },
];

const SKIN_CATEGORIES: Array<{ key: SkinCategoryKey; label: string; configSheet: string; levelSheet: string; withPrerequisite: boolean }> = [
  { key: "person", label: "人物皮肤", configSheet: "人物皮肤配置表", levelSheet: "人物皮肤升星配置", withPrerequisite: false },
  { key: "core", label: "核心皮肤", configSheet: "核心皮肤配置表", levelSheet: "核心皮肤升星配置", withPrerequisite: false },
  { key: "wall", label: "城墙皮肤", configSheet: "城墙皮肤配置表", levelSheet: "城墙皮肤升星配置", withPrerequisite: false },
  { key: "personChroma", label: "人物炫彩皮肤", configSheet: "时装炫彩配置表", levelSheet: "时装炫彩升星配置", withPrerequisite: true },
  { key: "coreChroma", label: "核心炫彩皮肤", configSheet: "核心炫彩配置表", levelSheet: "核心炫彩升星配置", withPrerequisite: true },
  { key: "wallChroma", label: "城墙炫彩皮肤", configSheet: "城墙炫彩配置表", levelSheet: "城墙炫彩升星配置表", withPrerequisite: true },
];

const SAVED_ROOT_PATH_KEY = "information-lookup.rootPath";
const partNameById = new Map<number, string>([
  [1, "头盔"],
  [2, "衣服"],
  [3, "足具"],
  [4, "护臂"],
  [5, "裤子"],
  [6, "手套"],
]);
const qualityNameById = new Map<number, string>([
  [1, "普通"],
  [2, "精良"],
  [3, "卓越"],
  [4, "完美"],
  [5, "传说"],
  [6, "绝世"],
  [7, "至尊"],
]);

function getStoredRootPath(): string | null {
  try {
    return window.localStorage.getItem(SAVED_ROOT_PATH_KEY);
  } catch {
    return null;
  }
}

function getInitialRootPath(): string {
  return getStoredRootPath() || "C:\\project\\T5game_data";
}

function saveRootPath(rootPath: string) {
  try {
    window.localStorage.setItem(SAVED_ROOT_PATH_KEY, rootPath);
  } catch {
    // Storage can be unavailable in restricted browser modes. The scan still works for the current session.
  }
}

function normalizeId(value: CellValue): number | string | null {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  const text = String(value).trim();
  if (!text) return null;
  const numberValue = Number(text);
  if (Number.isFinite(numberValue) && Number.isInteger(numberValue)) return numberValue;
  return text;
}

function toText(value: CellValue): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function stripRichText(value: CellValue): string {
  return toText(value).replace(/<[^>]+>/g, "").trim();
}

function stripLevelPrefix(value: CellValue): string {
  return stripRichText(value).replace(/^\s*\d+\s*[.。．、-]\s*/, "").trim();
}

function headerIndex(rows: SheetRows): Record<string, number> {
  const firstRow = rows[0] ?? [];
  return Object.fromEntries(firstRow.map((cell, index) => [toText(cell), index]).filter(([key]) => key));
}

function getSheetRows(workbook: XLSX.WorkBook, sheetName: string): SheetRows {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<CellValue[]>(sheet, { header: 1, defval: null, raw: true });
}

async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const data = await file.arrayBuffer();
  return XLSX.read(data, { type: "array" });
}

function buildTextMap(workbook: XLSX.WorkBook): Map<number, string> {
  const textMap = new Map<number, string>();
  for (const sheetName of ["表格文本", "深渊文本"]) {
    const rows = getSheetRows(workbook, sheetName);
    const index = headerIndex(rows);
    for (const row of rows.slice(1)) {
      const id = normalizeId(row[index["索引ID"]]);
      const text = toText(row[index["内容_简体"]]);
      if (typeof id === "number" && text) textMap.set(id, text);
    }
  }
  return textMap;
}

function asNumberValue(value: CellValue): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function displaySeason(value: CellValue): { season: string; season_id: number | string | null } {
  const seasonId = normalizeId(value);
  if (seasonId === null || seasonId === "") return { season: "全赛季", season_id: null };
  return { season: `赛季${seasonId}`, season_id: seasonId };
}

function fillTemplate(template: string, params: string[]): string {
  return stripRichText(template).replace(/\{(\d+)\}/g, (_match, index) => params[Number(index)] ?? "");
}

function activeRefineWeight(weights: { normal: number; season: number } | undefined): { weight: number; source: string } {
  if (!weights) return { weight: 0, source: "洗练权重" };
  if (weights.normal > 0) return { weight: weights.normal, source: "洗练权重" };
  return { weight: weights.season, source: "赛季洗练权重" };
}

function buildGemLookup(workbook: XLSX.WorkBook, textMap: Map<number, string>): GemLookup {
  const refreshRows = getSheetRows(workbook, "宝石刷新配置");
  const refreshIndex = headerIndex(refreshRows);
  const refineWeightByType = new Map<string, { normal: number; season: number }>();
  for (const row of refreshRows.slice(1)) {
    const gemType = normalizeId(row[refreshIndex["宝石类型"]]);
    if (gemType !== null) {
      refineWeightByType.set(String(gemType), {
        normal: asNumberValue(row[refreshIndex["洗练权重"]]),
        season: asNumberValue(row[refreshIndex["赛季洗练权重"]]),
      });
    }
  }

  const rows = getSheetRows(workbook, "宝石基础配置");
  const index = headerIndex(rows);
  const typePoolByPart = new Map<string, Map<string, number>>();
  for (const row of rows.slice(1)) {
    const itemId = normalizeId(row[index["道具ID"]]);
    if (typeof itemId !== "number") continue;
    const partId = normalizeId(row[index["绑定部位"]]);
    const gemType = normalizeId(row[index["宝石类型"]]);
    const { weight } = activeRefineWeight(refineWeightByType.get(String(gemType)));
    if (partId === null || gemType === null || weight <= 0) continue;
    const partKey = String(partId);
    if (!typePoolByPart.has(partKey)) typePoolByPart.set(partKey, new Map());
    typePoolByPart.get(partKey)!.set(String(gemType), weight);
  }

  const poolTotalByPart = new Map(
    [...typePoolByPart.entries()].map(([partId, typePool]) => [partId, [...typePool.values()].reduce((sum, weight) => sum + weight, 0)]),
  );
  const records: GemRecord[] = [];

  for (const row of rows.slice(1)) {
    const itemId = normalizeId(row[index["道具ID"]]);
    if (typeof itemId !== "number") continue;
    const partId = normalizeId(row[index["绑定部位"]]);
    const qualityId = normalizeId(row[index["宝石品质"]]);
    const gemType = normalizeId(row[index["宝石类型"]]);
    const { weight: refineWeight, source: refineWeightSource } = activeRefineWeight(refineWeightByType.get(String(gemType)));
    if (refineWeight <= 0) continue;

    const poolTotal = poolTotalByPart.get(String(partId)) ?? 0;
    const nameId = normalizeId(row[index["宝石名称"]]);
    const descriptionId = normalizeId(row[index["宝石描述"]]);
    const { season, season_id } = displaySeason(row[index["赛季"]]);

    records.push({
      item_id: itemId,
      name: stripRichText((typeof nameId === "number" ? textMap.get(nameId) : "") || row[index["宝石名称备注(40040001)"]]),
      part: typeof partId === "number" ? partNameById.get(partId) || `未知部位${partId}` : `未知部位${partId ?? ""}`,
      part_id: partId ?? "",
      quality: typeof qualityId === "number" ? qualityNameById.get(qualityId) || `未知品质${qualityId}` : `未知品质${qualityId ?? ""}`,
      quality_id: qualityId ?? "",
      season,
      season_id,
      gem_type: gemType ?? "",
      effect: fillTemplate((typeof descriptionId === "number" ? textMap.get(descriptionId) : "") || toText(row[index["宝石描述备注(40050001)"]]), [
        toText(row[index["宝石属性描述参数1"]]),
        toText(row[index["宝石属性描述参数2"]]),
        toText(row[index["宝石属性描述参数3"]]),
      ]),
      refine_weight: refineWeight,
      refine_weight_source: refineWeightSource,
      refine_pool_total: poolTotal,
      refine_probability: poolTotal > 0 ? refineWeight / poolTotal : 0,
      attribute_id: normalizeId(row[index["属性_ID"]]),
      attribute_type: normalizeId(row[index["属性_类型"]]),
      attribute_value: normalizeId(row[index["属性_数值"]]),
      power: normalizeId(row[index["固定战力"]]),
    });
  }

  records.sort((left, right) => Number(left.season_id ?? 0) - Number(right.season_id ?? 0) || Number(left.part_id) - Number(right.part_id) || Number(left.quality_id) - Number(right.quality_id) || left.item_id - right.item_id);

  return {
    records,
    parts: [...poolTotalByPart.entries()]
      .map(([id, poolTotal]) => ({
        id,
        name: partNameById.get(Number(id)) || `未知部位${id}`,
        pool_total: poolTotal,
        type_count: typePoolByPart.get(id)?.size ?? 0,
        record_count: records.filter((record) => String(record.part_id) === id).length,
      }))
      .sort((left, right) => Number(left.id) - Number(right.id)),
    qualities: [...new Map(records.map((record) => [String(record.quality_id), record.quality])).entries()]
      .map(([id, name]) => ({ id, name, record_count: records.filter((record) => String(record.quality_id) === id).length }))
      .sort((left, right) => Number(left.id) - Number(right.id)),
    seasons: [...new Map(records.map((record) => [String(record.season_id ?? ""), record.season])).entries()]
      .map(([id, name]) => ({ id, name, record_count: records.filter((record) => String(record.season_id ?? "") === id).length }))
      .sort((left, right) => Number(left.id || 0) - Number(right.id || 0)),
  };
}

function sheetObjects(workbook: XLSX.WorkBook, sheetName: string): Array<Record<string, CellValue>> {
  const rows = getSheetRows(workbook, sheetName);
  const headers = (rows[0] ?? []).map((cell) => toText(cell));
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null]).filter(([header]) => header)));
}

function textById(textMap: Map<number, string>, value: CellValue): string {
  const id = normalizeId(value);
  if (typeof id !== "number") return "";
  return stripRichText(textMap.get(id) || `[文本表未找到:${id}]`);
}

function buildEntryLookupData(entryWorkbook: XLSX.WorkBook, skillWorkbook: XLSX.WorkBook, textMap: Map<number, string>): EntryLookupData {
  const skillNameById = new Map<number, string>();
  for (const row of sheetObjects(skillWorkbook, "源素配置表")) {
    const skillId = normalizeId(row["技能ID"]);
    if (typeof skillId === "number") skillNameById.set(skillId, textById(textMap, row["源素名"]));
  }

  const entriesById = new Map<number, Omit<EntryRecord, "group_id" | "prerequisites" | "conflicts">>();
  for (const row of sheetObjects(entryWorkbook, "词条配置表")) {
    const entryId = normalizeId(row["词条ID"]);
    if (typeof entryId !== "number") continue;
    const nameId = normalizeId(row["词条名称"]);
    const descriptionId = normalizeId(row["词条描述"]);
    const skillId = normalizeId(row["技能ID"]);
    entriesById.set(entryId, {
      entry_id: entryId,
      name_id: typeof nameId === "number" ? nameId : null,
      name: textById(textMap, row["词条名称"]),
      description_id: typeof descriptionId === "number" ? descriptionId : null,
      description: textById(textMap, row["词条描述"]),
      skill_id: typeof skillId === "number" ? skillId : null,
      skill_name: typeof skillId === "number" ? skillNameById.get(skillId) || `[源素未找到:${skillId}]` : "",
    });
  }

  const groupedConditions = new Map<string, [CellValue, CellValue, CellValue]>();
  for (const row of sheetObjects(entryWorkbook, "词条组条件配置表")) {
    const id = normalizeId(row["条件ID"]);
    if (id !== null) groupedConditions.set(String(id), [row["条件_类型"], row["条件_参数1"], row["条件_参数2"]]);
  }

  function entryName(id: CellValue): string {
    const entryId = normalizeId(id);
    const entry = typeof entryId === "number" ? entriesById.get(entryId) : null;
    return entry ? `${entry.name}(${entry.entry_id})` : String(entryId ?? "");
  }

  function skillName(id: CellValue): string {
    const skillId = normalizeId(id);
    return typeof skillId === "number" ? `${skillNameById.get(skillId) || `[源素未找到:${skillId}]`}(${skillId})` : String(skillId ?? "");
  }

  function formatCondition(typeValue: CellValue, targetValue: CellValue, countValue: CellValue, depth = 0): EntryCondition | null {
    const type = normalizeId(typeValue);
    const target = normalizeId(targetValue);
    const count = normalizeId(countValue);
    if (type === null || type === 0) return null;

    let text = "";
    if (type === 1) text = `词条组:${target}${count ? ` x${count}` : ""}`;
    else if (type === 2) text = `词条:${entryName(target)}${count ? ` x${count}` : ""}`;
    else if (type === 3) text = `枪械技能等级:${target}`;
    else if (type === 4) text = `源素等级:${skillName(target)}${count ? ` Lv.${count}` : ""}`;
    else if (type === 10) text = `大技能局内等级:${skillName(target)}${count ? ` Lv.${count}` : ""}`;
    else if (type === 11 && depth < 3) {
      const left = groupedConditions.get(String(target));
      const right = groupedConditions.get(String(count));
      const alternatives = [left ? formatCondition(...left, depth + 1) : null, right ? formatCondition(...right, depth + 1) : null].filter((condition): condition is EntryCondition => Boolean(condition));
      text = `OR(${alternatives.map((condition) => condition.text).join(" / ") || `${target ?? ""}/${count ?? ""}`})`;
      return { type, target_id: target, count, text, alternatives };
    } else if (type === 12) text = `局外解锁技能:${skillName(target)}`;
    else if (type === 13) text = `技能点数:${skillName(target)} >= ${count}`;
    else text = `类型${type}:(${target ?? ""}${count ? `,${count}` : ""})`;

    return { type, target_id: target, count, text };
  }

  function collectConditions(row: Record<string, CellValue>, prefix: string, count: number): EntryCondition[] {
    return Array.from({ length: count }, (_, index) => index + 1)
      .map((index) => formatCondition(row[`${prefix}_${index}_类型`], row[`${prefix}_${index}_参数1`], row[`${prefix}_${index}_参数2`]))
      .filter((condition): condition is EntryCondition => Boolean(condition));
  }

  const records: EntryRecord[] = [];
  for (const row of sheetObjects(entryWorkbook, "词条组配置表")) {
    const groupId = normalizeId(row["词条组ID"]);
    const entryId = normalizeId(row["词条ID"]);
    if (groupId !== 2001 || typeof entryId !== "number") continue;
    const entry = entriesById.get(entryId);
    if (!entry) continue;
    records.push({
      group_id: groupId,
      ...entry,
      prerequisites: collectConditions(row, "前置条件", 5),
      conflicts: collectConditions(row, "冲突条件", 8),
    });
  }

  return { records };
}

function buildSkinLookupData(skinWorkbook: XLSX.WorkBook, skillWorkbook: XLSX.WorkBook, textMap: Map<number, string>): SkinLookupData {
  const skillNameById = new Map<number, string>();
  for (const row of sheetObjects(skillWorkbook, "源素配置表")) {
    const skillId = normalizeId(row["技能ID"]);
    if (typeof skillId === "number") skillNameById.set(skillId, textById(textMap, row["源素名"]));
  }

  const skinNameById = new Map<number, string>();
  const skinCategoryById = new Map<number, SkinCategoryKey>();
  for (const { configSheet } of SKIN_CATEGORIES) {
    for (const row of sheetObjects(skinWorkbook, configSheet)) {
      const skinId = normalizeId(row["时装ID"]);
      if (typeof skinId === "number") skinNameById.set(skinId, textById(textMap, row["时装名称"]));
    }
  }
  for (const category of SKIN_CATEGORIES) {
    for (const row of sheetObjects(skinWorkbook, category.configSheet)) {
      const skinId = normalizeId(row["时装ID"]);
      if (typeof skinId === "number") skinCategoryById.set(skinId, category.key);
    }
  }

  const result: SkinLookupData = { person: [], core: [], wall: [], personChroma: [], coreChroma: [], wallChroma: [] };
  for (const category of SKIN_CATEGORIES) {
    const levelsBySkinId = new Map<number, SkinLevel[]>();
    const skillIdBySkinId = new Map<number, number>();
    for (const row of sheetObjects(skinWorkbook, category.levelSheet)) {
      const skinId = normalizeId(row["时装ID"]);
      if (typeof skinId !== "number") continue;
      const levelSkillId = normalizeId(row["技能ID"]);
      if (typeof levelSkillId === "number" && !skillIdBySkinId.has(skinId)) skillIdBySkinId.set(skinId, levelSkillId);
      const effects = [textById(textMap, row["效果描述"]), textById(textMap, row["效果描述2"])].filter(Boolean);
      if (!levelsBySkinId.has(skinId)) levelsBySkinId.set(skinId, []);
      levelsBySkinId.get(skinId)!.push({
        level: normalizeId(row["时装星级"]) ?? "",
        effect_name: textById(textMap, row["效果名称描述"]),
        effect: effects.join("\n"),
      });
    }

    for (const row of sheetObjects(skinWorkbook, category.configSheet)) {
      const skinId = normalizeId(row["时装ID"]);
      if (typeof skinId !== "number") continue;
      const itemId = normalizeId(row["激活道具_1_道具ID"]);
      const sourceId = normalizeId(row["关联源素ID"]);
      const skillId = typeof sourceId === "number" ? sourceId : skillIdBySkinId.get(skinId);
      const levels = (levelsBySkinId.get(skinId) ?? []).sort((left, right) => Number(left.level) - Number(right.level));
      if (!levels.length) continue;
      result[category.key].push({
        category: category.key,
        name: skinNameById.get(skinId) || textById(textMap, row["时装名称"]),
        skin_id: skinId,
        item_id: typeof itemId === "number" ? itemId : null,
        skill_name: typeof skillId === "number" ? skillNameById.get(skillId) || `[技能未找到:${skillId}]` : "",
        prerequisite_skins: category.withPrerequisite
          ? [1, 2, 3, 4, 5]
              .map((index) => normalizeId(row[`激活前置皮肤ID_${index}`]))
              .filter((id): id is number => typeof id === "number")
              .map((id) => ({ skin_id: id, category: skinCategoryById.get(id) ?? null, name: skinNameById.get(id) || `[皮肤未找到:${id}]` }))
          : [],
        levels,
      });
    }
  }
  return result;
}

function buildMonsterMap(workbook: XLSX.WorkBook, textMap: Map<number, string>): Map<number, Omit<MonsterInfo, "waves" | "total_count">> {
  const rows = getSheetRows(workbook, "怪物配置表");
  const index = headerIndex(rows);
  const monsterMap = new Map<number, Omit<MonsterInfo, "waves" | "total_count">>();

  for (const row of rows.slice(1)) {
    const monsterId = normalizeId(row[index["ID"]]);
    if (typeof monsterId !== "number") continue;

    const nameId = normalizeId(row[index["怪物名称ID"]]);
    const descriptionId = normalizeId(row[index["怪物描述ID"]]);
    const type = normalizeId(row[index["类型"]]);
    const rawName = (typeof nameId === "number" ? textMap.get(nameId) : "") || toText(row[index["模型名称"]]);
    const rawDescription = (typeof descriptionId === "number" ? textMap.get(descriptionId) : "") || toText(row[index["怪物描述"]]);

    monsterMap.set(monsterId, {
      monster_id: monsterId,
      type: typeof type === "number" ? type : 0,
      type_name: type === 1 ? "小怪" : type === 6 ? "精英怪" : type === 2 ? "首领" : String(type ?? ""),
      name_id: typeof nameId === "number" ? nameId : null,
      raw_name: rawName,
      name: stripRichText(rawName),
      description_id: typeof descriptionId === "number" ? descriptionId : null,
      raw_description: rawDescription,
      description: stripRichText(rawDescription),
      model_name: toText(row[index["模型名称"]]),
    });
  }

  return monsterMap;
}

function buildLevelMonsters(
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

function extractStageNumber(...values: string[]): number | null {
  for (const value of values) {
    const stageMatch = value.match(/第\s*(\d+)\s*关/);
    if (stageMatch) return Number(stageMatch[1]);
    const prefixMatch = value.match(/^\s*(\d+)\s*[.。．、-]/);
    if (prefixMatch) return Number(prefixMatch[1]);
  }
  return null;
}

function mapMonsterList(group: Map<number, MonsterInfo> | undefined): MonsterInfo[] {
  return [...(group?.values() ?? [])].sort((left, right) => {
    const leftWave = Math.min(...left.waves.map((wave) => wave.wave ?? 9999));
    const rightWave = Math.min(...right.waves.map((wave) => wave.wave ?? 9999));
    return leftWave - rightWave || left.monster_id - right.monster_id;
  });
}

function buildLookupData(
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
    const stageNo = extractStageNumber(rawAuxRemark, rawLevelLabel, rawRemark, rawLevelName) ?? (levelId >= 1001 && levelId <= 9999 ? levelId - 1000 : null);
    if (stageNo === null) continue;

    const label = stripRichText(rawLevelLabel) || `第${stageNo}关`;
    const levelName = stripLevelPrefix(rawLevelName);
    const monsters = levelMonsters.get(levelId);
    const record: LevelRecord & { rank: [number, number, number] } = {
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
      rank: [rawAuxRemark.includes(`第${stageNo}关`) || rawLevelLabel.includes(`第${stageNo}关`) ? 1 : 0, levelId >= 1001 && levelId <= 1999 ? 1 : 0, -levelId],
    };

    byLevelId[String(levelId)] = record;
    duplicateCounter[String(stageNo)] = (duplicateCounter[String(stageNo)] ?? 0) + 1;
    candidates.push(record);
  }

  const byStage: Record<string, LevelRecord> = {};
  for (const candidate of candidates) {
    const key = String(candidate.stage_no);
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

function compareRank(left: [number, number, number], right: [number, number, number]): number {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

async function parseLookup(files: MatchedFile[]): Promise<LookupData> {
  const byKey = Object.fromEntries(files.map((file) => [file.key, file])) as Record<RequiredFileKey, MatchedFile>;
  for (const required of REQUIRED_FILES) {
    if (!byKey[required.key]?.file) {
      throw new Error(`缺少可读取文件：${required.fileName}`);
    }
  }
  const [textWorkbook, monsterWorkbook, spawnWorkbook, levelWorkbook] = await Promise.all([
    readWorkbook(byKey.text.file!),
    readWorkbook(byKey.monster.file!),
    readWorkbook(byKey.spawn.file!),
    readWorkbook(byKey.level.file!),
  ]);

  const textMap = buildTextMap(textWorkbook);
  const monsterMap = buildMonsterMap(monsterWorkbook, textMap);
  const levelMonsters = buildLevelMonsters(spawnWorkbook, monsterMap);
  return buildLookupData(levelWorkbook, textMap, levelMonsters);
}

async function parseGemLookup(files: MatchedFile[]): Promise<GemLookup> {
  const byKey = Object.fromEntries(files.map((file) => [file.key, file])) as Record<RequiredFileKey, MatchedFile>;
  if (!byKey.text?.file || !byKey.gem?.file) {
    throw new Error("缺少可读取文件：宝石配置表.xlsx 或 文本配置表-一般表格.xlsx");
  }
  const [textWorkbook, gemWorkbook] = await Promise.all([readWorkbook(byKey.text.file), readWorkbook(byKey.gem.file)]);
  return buildGemLookup(gemWorkbook, buildTextMap(textWorkbook));
}

async function parseSkinLookup(files: MatchedFile[]): Promise<SkinLookupData> {
  const byKey = Object.fromEntries(files.map((file) => [file.key, file])) as Record<RequiredFileKey, MatchedFile>;
  if (!byKey.text?.file || !byKey.skin?.file || !byKey.skill?.file) {
    throw new Error("缺少可读取文件：T5皮肤配置表.xlsx、源素表结构.xlsx 或 文本配置表-一般表格.xlsx");
  }
  const [textWorkbook, skinWorkbook, skillWorkbook] = await Promise.all([readWorkbook(byKey.text.file), readWorkbook(byKey.skin.file), readWorkbook(byKey.skill.file)]);
  return buildSkinLookupData(skinWorkbook, skillWorkbook, buildTextMap(textWorkbook));
}

async function parseEntryLookup(files: MatchedFile[]): Promise<EntryLookupData> {
  const byKey = Object.fromEntries(files.map((file) => [file.key, file])) as Record<RequiredFileKey, MatchedFile>;
  if (!byKey.text?.file || !byKey.entry?.file || !byKey.skill?.file) {
    throw new Error("缺少可读取文件：随机词条库配置表.xlsx、源素表结构.xlsx 或 文本配置表-一般表格.xlsx");
  }
  const [textWorkbook, entryWorkbook, skillWorkbook] = await Promise.all([readWorkbook(byKey.text.file), readWorkbook(byKey.entry.file), readWorkbook(byKey.skill.file)]);
  return buildEntryLookupData(entryWorkbook, skillWorkbook, buildTextMap(textWorkbook));
}

async function collectFilesFromDirectory(rootHandle: FileSystemDirectoryHandle): Promise<MatchedFile[]> {
  const matches = new Map<RequiredFileKey, MatchedFile>();
  const requiredByName = new Map(REQUIRED_FILES.map((file) => [file.fileName, file]));

  async function walk(handle: FileSystemDirectoryHandle, trail: string[]) {
    for await (const [name, child] of handle.entries()) {
      if (child.kind === "file") {
        const required = requiredByName.get(name);
        if (required && !matches.has(required.key)) {
          const file = await child.getFile();
          matches.set(required.key, {
            ...required,
            relativePath: [...trail, name].join("/"),
            file,
          });
        }
      }

      if (child.kind === "directory") {
        if (matches.size === REQUIRED_FILES.length) continue;
        await walk(child, [...trail, name]);
      }
    }
  }

  await walk(rootHandle, [rootHandle.name]);
  return REQUIRED_FILES.map((required) => matches.get(required.key)).filter(Boolean) as MatchedFile[];
}

function findRecord(data: LookupData | null, query: string): LevelRecord | null {
  if (!data) return null;
  const trimmed = query.trim();
  if (!trimmed) return null;
  const numericText = trimmed.replace(/[第关\s]/g, "");
  if (/^\d+$/.test(numericText)) {
    const value = Number(numericText);
    return data.byStage[String(value)] ?? data.byLevelId[String(value)] ?? null;
  }
  return (
    Object.values(data.byStage).find((record) => record.level_label_name.includes(trimmed) || record.level_name.includes(trimmed)) ?? null
  );
}

function monsterSummary(monsters: MonsterInfo[]): string {
  return monsters.length ? monsters.map((monster) => monster.name).join("、") : "无";
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(4)}%`;
}

function skinTotal(lookup: SkinLookupData | null): number {
  return lookup ? SKIN_CATEGORIES.reduce((sum, category) => sum + lookup[category.key].length, 0) : 0;
}

function tabLabel(tab: AppTab): string {
  if (tab === "levels") return "关卡信息";
  if (tab === "gems") return "宝石信息";
  if (tab === "skins") return "皮肤信息";
  return "局内词条";
}

function tabHeading(tab: AppTab): string {
  if (tab === "levels") return "快速查看第 X 关怪物配置";
  if (tab === "gems") return "检索宝石效果、部位、品质和洗练概率";
  if (tab === "skins") return "检索皮肤名称、道具ID、技能和升星效果";
  return "检索 2001 组局内词条的前置和互斥关系";
}

function searchPlaceholder(tab: AppTab): string {
  if (tab === "levels") return "输入第几关、关卡名或怪物名";
  if (tab === "gems") return "输入宝石效果、部位、品质、赛季或道具ID";
  if (tab === "skins") return "输入皮肤名称、技能或道具ID";
  return "输入词条名、描述、词条ID、前置或互斥条件";
}

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("levels");
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle", message: "绑定数据目录后自动解析关卡信息" });
  const [rootName, setRootName] = useState("");
  const [pathInput, setPathInput] = useState(getInitialRootPath);
  const [matchedFiles, setMatchedFiles] = useState<MatchedFile[]>([]);
  const [lookupData, setLookupData] = useState<LookupData | null>(null);
  const [gemLookup, setGemLookup] = useState<GemLookup | null>(null);
  const [skinLookup, setSkinLookup] = useState<SkinLookupData | null>(null);
  const [entryLookup, setEntryLookup] = useState<EntryLookupData | null>(null);
  const [query, setQuery] = useState("5");
  const [selectedStage, setSelectedStage] = useState("5");
  const [selectedGemId, setSelectedGemId] = useState<number | null>(null);
  const [skinCategory, setSkinCategory] = useState<SkinCategoryKey>("person");
  const [selectedSkinId, setSelectedSkinId] = useState<number | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const didAutoLoad = useRef(false);

  const currentRecord = useMemo(() => findRecord(lookupData, selectedStage || query), [lookupData, query, selectedStage]);
  const filteredRecords = useMemo(() => {
    if (!lookupData) return [];
    const value = query.trim();
    const records = Object.values(lookupData.byStage).sort((a, b) => a.stage_no - b.stage_no);
    if (!value) return records;
    const numberValue = Number(value.replace(/[第关\s]/g, ""));
    return records
      .filter((record) => {
        if (Number.isFinite(numberValue) && String(record.stage_no).includes(String(numberValue))) return true;
        return record.level_label_name.includes(value) || monsterSummary(record.monsters.small).includes(value) || monsterSummary(record.monsters.elite).includes(value) || monsterSummary(record.monsters.boss).includes(value);
      })
      .slice(0, 120);
  }, [lookupData, query]);
  const filteredGems = useMemo(() => {
    if (!gemLookup) return [];
    const value = query.trim();
    const records = gemLookup.records;
    if (!value) return records.slice(0, 240);
    return records
      .filter((record) => {
        const haystack = [
          record.item_id,
          record.name,
          record.part,
          record.quality,
          record.season,
          record.gem_type,
          record.effect,
          record.refine_weight,
          record.refine_weight_source,
          formatPercent(record.refine_probability),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(value.toLowerCase());
      })
      .slice(0, 240);
  }, [gemLookup, query]);
  const selectedGem = useMemo(() => {
    if (!gemLookup) return null;
    return gemLookup.records.find((record) => record.item_id === selectedGemId) ?? filteredGems[0] ?? null;
  }, [filteredGems, gemLookup, selectedGemId]);
  const filteredSkins = useMemo(() => {
    const records = skinLookup?.[skinCategory] ?? [];
    const value = query.trim();
    if (!value) return records.slice(0, 120);
    return records
      .filter((record) => [record.name, record.item_id, record.skill_name, record.prerequisite_skins.map((skin) => skin.name).join("、")].join(" ").includes(value))
      .slice(0, 120);
  }, [query, skinCategory, skinLookup]);
  const selectedSkin = useMemo(() => {
    if (!skinLookup) return null;
    return skinLookup[skinCategory].find((record) => record.skin_id === selectedSkinId) ?? filteredSkins[0] ?? null;
  }, [filteredSkins, selectedSkinId, skinCategory, skinLookup]);
  const filteredEntries = useMemo(() => {
    const records = entryLookup?.records ?? [];
    const value = query.trim();
    if (!value) return records;
    return records
      .filter((record) =>
        [
          record.entry_id,
          record.name,
          record.description,
          record.skill_name,
          record.prerequisites.map((condition) => condition.text).join("、"),
          record.conflicts.map((condition) => condition.text).join("、"),
        ]
          .join(" ")
          .includes(value),
      )
      .slice(0, 240);
  }, [entryLookup, query]);
  const selectedEntry = useMemo(() => {
    if (!entryLookup) return null;
    return entryLookup.records.find((record) => record.entry_id === selectedEntryId) ?? filteredEntries[0] ?? null;
  }, [entryLookup, filteredEntries, selectedEntryId]);

  useEffect(() => {
    async function loadSavedPath() {
      if (didAutoLoad.current) return;

      let savedPath = "";
      try {
        const response = await fetch("/api/level-info/settings");
        if (response.ok) {
          const payload = (await response.json()) as { rootPath?: string };
          savedPath = payload.rootPath?.trim() ?? "";
        }
      } catch {
        savedPath = "";
      }

      savedPath = savedPath || getStoredRootPath() || "";
      if (!savedPath || didAutoLoad.current) return;
      didAutoLoad.current = true;
      setPathInput(savedPath);
      await scanPath(savedPath, "正在读取上次绑定路径并刷新索引");
    }

    void loadSavedPath();
  }, []);

  async function scanPath(rootPath: string, loadingMessage = "正在扫描路径下的 xls 表格") {
    const trimmedPath = rootPath.trim();
    if (!trimmedPath) {
      setLoadState({ status: "error", message: "请先填写文件夹路径" });
      return;
    }

    try {
      setLoadState({ status: "loading", message: loadingMessage });
      const response = await fetch("/api/level-info/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rootPath: trimmedPath }),
      });
      const payload = (await response.json()) as { rootName?: string; files?: MatchedFile[]; lookup?: LookupData; gemLookup?: GemLookup; skinLookup?: SkinLookupData; entryLookup?: EntryLookupData; error?: string };
      if (!response.ok || payload.error || !payload.lookup || !payload.gemLookup || !payload.skinLookup || !payload.entryLookup || !payload.files) {
        throw new Error(payload.error ?? "扫描失败");
      }
      saveRootPath(trimmedPath);
      setPathInput(trimmedPath);
      setRootName(payload.rootName || trimmedPath);
      setMatchedFiles(payload.files);
      setLookupData(payload.lookup);
      setGemLookup(payload.gemLookup);
      setSkinLookup(payload.skinLookup);
      setEntryLookup(payload.entryLookup);
      setSelectedStage("5");
      setSelectedGemId(payload.gemLookup.records[0]?.item_id ?? null);
      setSelectedSkinId(payload.skinLookup.person[0]?.skin_id ?? null);
      setSelectedEntryId(payload.entryLookup.records[0]?.entry_id ?? null);
      setQuery("");
      setLoadState({ status: "ready", message: `已生成 ${Object.keys(payload.lookup.byStage).length} 个关卡索引，${payload.gemLookup.records.length} 条宝石索引，${skinTotal(payload.skinLookup)} 条皮肤索引，${payload.entryLookup.records.length} 条局内词条` });
    } catch (error) {
      setLookupData(null);
      setGemLookup(null);
      setSkinLookup(null);
      setEntryLookup(null);
      setLoadState({ status: "error", message: error instanceof Error ? error.message : "扫描失败" });
    }
  }

  async function bindPath() {
    await scanPath(pathInput);
  }

  async function refreshData() {
    await scanPath(pathInput, "正在刷新已绑定目录下的 xls 表格");
  }

  async function bindFolder() {
    const picker = (window as unknown as { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
    if (!picker) {
      setLoadState({ status: "error", message: "当前浏览器不支持目录绑定，请使用新版 Chrome 或 Edge 打开本页面" });
      return;
    }

    try {
      setLoadState({ status: "loading", message: "正在扫描目录下的 xls 表格" });
      const rootHandle = await picker();
      setRootName(rootHandle.name);
      const files = await collectFilesFromDirectory(rootHandle);
      setMatchedFiles(files);

      const missing = REQUIRED_FILES.filter((required) => !files.some((file) => file.key === required.key));
      if (missing.length) {
        setLookupData(null);
        setGemLookup(null);
        setSkinLookup(null);
        setEntryLookup(null);
        setLoadState({ status: "error", message: `缺少表格：${missing.map((file) => file.fileName).join("、")}` });
        return;
      }

      setLoadState({ status: "loading", message: "已找到表格，正在解析文本和怪物关联" });
      const [lookup, gems, skins, entries] = await Promise.all([parseLookup(files), parseGemLookup(files), parseSkinLookup(files), parseEntryLookup(files)]);
      setLookupData(lookup);
      setGemLookup(gems);
      setSkinLookup(skins);
      setEntryLookup(entries);
      setSelectedStage("5");
      setSelectedGemId(gems.records[0]?.item_id ?? null);
      setSelectedSkinId(skins.person[0]?.skin_id ?? null);
      setSelectedEntryId(entries.records[0]?.entry_id ?? null);
      setQuery("");
      setLoadState({ status: "ready", message: `已生成 ${Object.keys(lookup.byStage).length} 个关卡索引，${gems.records.length} 条宝石索引，${skinTotal(skins)} 条皮肤索引，${entries.records.length} 条局内词条` });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setLoadState({ status: "idle", message: "已取消目录绑定" });
        return;
      }
      setLoadState({ status: "error", message: error instanceof Error ? error.message : "解析失败" });
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <Database size={20} weight="duotone" />
          </div>
          <div>
            <h1>配置检索台</h1>
            <p>T5 表格本地索引</p>
          </div>
        </div>

        <nav className="tab-list" aria-label="功能页签">
          <button
            className={activeTab === "levels" ? "tab-button active" : "tab-button"}
            type="button"
            onClick={() => {
              setActiveTab("levels");
              setQuery("");
            }}
          >
            <Rows size={17} />
            关卡信息
          </button>
          <button
            className={activeTab === "gems" ? "tab-button active" : "tab-button"}
            type="button"
            onClick={() => {
              setActiveTab("gems");
              setQuery("");
            }}
          >
            <FileMagnifyingGlass size={17} />
            宝石信息
          </button>
          <button
            className={activeTab === "skins" ? "tab-button active" : "tab-button"}
            type="button"
            onClick={() => {
              setActiveTab("skins");
              setQuery("");
            }}
          >
            <FileMagnifyingGlass size={17} />
            皮肤信息
          </button>
          <button
            className={activeTab === "entries" ? "tab-button active" : "tab-button"}
            type="button"
            onClick={() => {
              setActiveTab("entries");
              setQuery("");
            }}
          >
            <FileMagnifyingGlass size={17} />
            局内词条
          </button>
        </nav>

        <div className="binding-panel">
          <div>
            <span className="panel-label">数据源</span>
            <strong>{rootName || "未绑定目录"}</strong>
          </div>
          <label className="path-input">
            <span>文件夹路径</span>
            <input value={pathInput} onChange={(event) => setPathInput(event.target.value)} placeholder="例如 C:\\project\\T5game_data" />
          </label>
          <button className="primary-action" type="button" onClick={bindPath}>
            {loadState.status === "loading" ? <ArrowClockwise size={18} className="spin" /> : <FolderOpen size={18} />}
            绑定路径
          </button>
          <button className="secondary-action refresh-action" type="button" onClick={refreshData} disabled={loadState.status === "loading"}>
            <ArrowClockwise size={17} className={loadState.status === "loading" ? "spin" : ""} />
            刷新数据
          </button>
          <button className="secondary-action" type="button" onClick={bindFolder}>
            <FolderOpen size={17} />
            选择目录
          </button>
        </div>

        <div className={`status-box ${loadState.status}`}>
          {loadState.status === "ready" ? <CheckCircle size={18} /> : loadState.status === "error" ? <WarningCircle size={18} /> : <FileMagnifyingGlass size={18} />}
          <span>{loadState.message}</span>
        </div>

        <div className="file-checklist">
          {REQUIRED_FILES.map((required) => {
            const matched = matchedFiles.find((file) => file.key === required.key);
            return (
              <div className="file-row" key={required.key}>
                <span className={matched ? "file-dot ok" : "file-dot"} />
                <div>
                  <strong>{required.label}</strong>
                  <p>{matched?.relativePath ?? required.fileName}</p>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="kicker">页签 · {tabLabel(activeTab)}</p>
            <h2>{tabHeading(activeTab)}</h2>
          </div>
          <div className="metric-strip">
            {activeTab === "levels" ? (
              <>
                <div>
                  <span>关卡索引</span>
                  <strong>{lookupData ? Object.keys(lookupData.byStage).length : 0}</strong>
                </div>
                <div>
                  <span>重复编号</span>
                  <strong>{lookupData ? Object.keys(lookupData.duplicateStages).length : 0}</strong>
                </div>
              </>
            ) : activeTab === "gems" ? (
              <>
                <div>
                  <span>宝石索引</span>
                  <strong>{gemLookup ? gemLookup.records.length : 0}</strong>
                </div>
                <div>
                  <span>部位池</span>
                  <strong>{gemLookup ? gemLookup.parts.length : 0}</strong>
                </div>
              </>
            ) : activeTab === "skins" ? (
              <>
                <div>
                  <span>皮肤索引</span>
                  <strong>{skinTotal(skinLookup)}</strong>
                </div>
                <div>
                  <span>当前分类</span>
                  <strong>{skinLookup ? skinLookup[skinCategory].length : 0}</strong>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span>词条索引</span>
                  <strong>{entryLookup ? entryLookup.records.length : 0}</strong>
                </div>
                <div>
                  <span>词条组</span>
                  <strong>2001</strong>
                </div>
              </>
            )}
          </div>
        </header>

        <section className="search-band">
          <div className="search-box">
            <MagnifyingGlass size={20} />
            <input
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                if (activeTab === "levels" && value.trim()) setSelectedStage(value);
              }}
              placeholder={searchPlaceholder(activeTab)}
            />
            <button className="clear-search" type="button" aria-label="清除搜索" title="清除搜索" onClick={() => setQuery("")} disabled={!query}>
              <X size={13} weight="bold" />
            </button>
          </div>
          <div className="quick-jumps">
            {activeTab === "levels"
              ? [5, 15, 30, 100, 278].map((stage) => (
                  <button
                    type="button"
                    key={stage}
                    onClick={() => {
                      setQuery(String(stage));
                      setSelectedStage(String(stage));
                    }}
                  >
                    第{stage}关
                  </button>
                ))
              : activeTab === "gems"
                ? ["头盔", "裤子", "至尊", "赛季3"].map((preset) => (
                  <button type="button" key={preset} onClick={() => setQuery(preset)}>
                    {preset}
                  </button>
                  ))
                : activeTab === "skins"
                  ? ["极影特工", "山海之约", "龙城飞将"].map((preset) => (
                    <button type="button" key={preset} onClick={() => setQuery(preset)}>
                      {preset}
                    </button>
                    ))
                  : ["分裂子弹四射", "超爆弹", "电磁裂变"].map((preset) => (
                      <button type="button" key={preset} onClick={() => setQuery(preset)}>
                        {preset}
                      </button>
                    ))}
          </div>
        </section>

        {activeTab === "levels" ? (
          <LevelWorkspace currentRecord={currentRecord} filteredRecords={filteredRecords} selectedStage={selectedStage} onSelectStage={setSelectedStage} />
        ) : activeTab === "gems" ? (
          <GemWorkspace gemLookup={gemLookup} filteredGems={filteredGems} selectedGem={selectedGem} onSelectGem={(record) => setSelectedGemId(record.item_id)} />
        ) : activeTab === "skins" ? (
          <SkinWorkspace
            skinCategory={skinCategory}
            onSkinCategoryChange={(category) => {
              setSkinCategory(category);
              setSelectedSkinId(skinLookup?.[category][0]?.skin_id ?? null);
            }}
            skinLookup={skinLookup}
            filteredSkins={filteredSkins}
            selectedSkin={selectedSkin}
            onSelectSkin={(record) => setSelectedSkinId(record.skin_id)}
            onOpenSkin={(reference) => {
              if (!reference.category) return;
              setSkinCategory(reference.category);
              setSelectedSkinId(reference.skin_id);
              setQuery("");
            }}
          />
        ) : (
          <EntryWorkspace
            entryLookup={entryLookup}
            filteredEntries={filteredEntries}
            selectedEntry={selectedEntry}
            onSelectEntry={(record) => setSelectedEntryId(record.entry_id)}
            onOpenEntry={(entryId) => {
              setSelectedEntryId(entryId);
              setQuery("");
            }}
          />
        )}
      </section>
    </main>
  );
}

function LevelWorkspace({
  currentRecord,
  filteredRecords,
  onSelectStage,
}: {
  currentRecord: LevelRecord | null;
  filteredRecords: LevelRecord[];
  selectedStage: string;
  onSelectStage: (stage: string) => void;
}) {
  return (
    <section className="content-grid">
      <div className="result-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-label">检索结果</span>
            <h3>{currentRecord ? currentRecord.level_label_name : "等待选择关卡"}</h3>
          </div>
          {currentRecord && <span className="level-chip">ID {currentRecord.level_id}</span>}
        </div>

        {currentRecord ? <LevelDetail record={currentRecord} /> : <EmptyState />}
      </div>

      <div className="list-panel">
        <div className="panel-heading compact">
          <div>
            <span className="panel-label">关卡列表</span>
            <h3>{filteredRecords.length} 条匹配</h3>
          </div>
        </div>
        <div className="level-list">
          {filteredRecords.map((record) => (
            <button
              type="button"
              key={record.level_id}
              className={currentRecord?.level_id === record.level_id ? "level-row selected" : "level-row"}
              onClick={() => onSelectStage(String(record.stage_no))}
            >
              <span>第{record.stage_no}关</span>
              <strong>{record.level_name}</strong>
              <small>{monsterSummary(record.monsters.small)}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function EntryWorkspace({
  entryLookup,
  filteredEntries,
  selectedEntry,
  onSelectEntry,
  onOpenEntry,
}: {
  entryLookup: EntryLookupData | null;
  filteredEntries: EntryRecord[];
  selectedEntry: EntryRecord | null;
  onSelectEntry: (record: EntryRecord) => void;
  onOpenEntry: (entryId: number) => void;
}) {
  const [activeSkillKey, setActiveSkillKey] = useState("");
  const availableEntryIds = new Set(entryLookup?.records.map((record) => record.entry_id) ?? []);
  const skillGroups = useMemo(() => buildEntrySkillGroups(entryLookup?.records ?? []), [entryLookup]);
  const activeGroup = skillGroups.find((group) => group.key === activeSkillKey) ?? skillGroups[0] ?? null;
  const groupEntries = activeGroup ? filteredEntries.filter((record) => entrySkillKey(record) === activeGroup.key) : [];

  useEffect(() => {
    if (!skillGroups.length) return;
    if (!activeSkillKey || !skillGroups.some((group) => group.key === activeSkillKey)) setActiveSkillKey(skillGroups[0].key);
  }, [activeSkillKey, skillGroups]);

  function openEntry(entryId: number) {
    const target = entryLookup?.records.find((record) => record.entry_id === entryId);
    if (target) setActiveSkillKey(entrySkillKey(target));
    onOpenEntry(entryId);
  }

  return (
    <section className="content-grid">
      <div className="result-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-label">技能关系图</span>
            <h3>{activeGroup ? activeGroup.label : "等待绑定数据"}</h3>
          </div>
          {activeGroup && <span className="level-chip">{activeGroup.records.length} 条</span>}
        </div>
        {activeGroup ? (
          <div className="detail-stack">
            <div className="subtab-list entry-skill-tabs" aria-label="源素分类">
              {skillGroups.map((group) => (
                <button key={group.key} type="button" className={group.key === activeGroup.key ? "subtab-button active" : "subtab-button"} onClick={() => setActiveSkillKey(group.key)}>
                  {group.label}
                </button>
              ))}
            </div>
            <EntrySkillGraph records={activeGroup.records} selectedEntryId={selectedEntry?.entry_id ?? null} availableEntryIds={availableEntryIds} onOpenEntry={openEntry} />
            {selectedEntry && entrySkillKey(selectedEntry) === activeGroup.key && <EntryDetail record={selectedEntry} availableEntryIds={availableEntryIds} onOpenEntry={openEntry} />}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      <div className="list-panel">
        <div className="panel-heading compact">
          <div>
            <span className="panel-label">当前技能词条</span>
            <h3>{entryLookup ? `${groupEntries.length} 条匹配` : "未加载"}</h3>
          </div>
        </div>
        <div className="level-list">
          {groupEntries.map((record) => (
            <button type="button" key={record.entry_id} className={selectedEntry?.entry_id === record.entry_id ? "level-row selected" : "level-row"} onClick={() => onSelectEntry(record)}>
              <span>{record.entry_id}</span>
              <strong>{record.name}</strong>
              <small>{record.description || record.skill_name || "-"}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function entrySkillKey(record: EntryRecord): string {
  return record.skill_id === null ? "common" : String(record.skill_id);
}

function buildEntrySkillGroups(records: EntryRecord[]): Array<{ key: string; label: string; records: EntryRecord[] }> {
  const groups = new Map<string, { key: string; label: string; records: EntryRecord[] }>();
  for (const record of records) {
    const key = entrySkillKey(record);
    const label = record.skill_id === null ? "通用/枪械" : record.skill_name || `源素${record.skill_id}`;
    if (!groups.has(key)) groups.set(key, { key, label, records: [] });
    groups.get(key)!.records.push(record);
  }
  return [...groups.values()].sort((left, right) => {
    if (left.key === "common") return 1;
    if (right.key === "common") return -1;
    return Number(left.key) - Number(right.key);
  });
}

function EntryDetail({ record, availableEntryIds, onOpenEntry }: { record: EntryRecord; availableEntryIds: Set<number>; onOpenEntry: (entryId: number) => void }) {
  return (
    <div className="entry-detail-inline">
      <div className="level-overview">
        <div>
          <span>词条组</span>
          <strong>{record.group_id}</strong>
        </div>
        <div>
          <span>所属源素</span>
          <strong>{record.skill_name || "-"}</strong>
        </div>
        <div>
          <span>文本ID</span>
          <strong>{record.name_id ?? "-"}</strong>
        </div>
      </div>
      <section className="monster-section">
        <div className="monster-section-title">
          <span>描述</span>
          <strong>{record.description_id ?? "-"}</strong>
        </div>
        <p className="none-text">{record.description || "文本表未配置描述"}</p>
      </section>
      <ConditionSection title="前置条件" conditions={record.prerequisites} availableEntryIds={availableEntryIds} onOpenEntry={onOpenEntry} />
      <ConditionSection title="互斥条件" conditions={record.conflicts} availableEntryIds={availableEntryIds} onOpenEntry={onOpenEntry} />
    </div>
  );
}

function conditionEntryId(condition: EntryCondition, availableEntryIds: Set<number>): number | null {
  return conditionEntryIds(condition, availableEntryIds)[0] ?? null;
}

function conditionEntryIds(condition: EntryCondition, availableEntryIds: Set<number>): number[] {
  if (condition.type === 2 && typeof condition.target_id === "number" && availableEntryIds.has(condition.target_id)) return [condition.target_id];
  return condition.alternatives?.flatMap((alternative) => conditionEntryIds(alternative, availableEntryIds)) ?? [];
}

function EntrySkillGraph({ records, selectedEntryId, availableEntryIds, onOpenEntry }: { records: EntryRecord[]; selectedEntryId: number | null; availableEntryIds: Set<number>; onOpenEntry: (entryId: number) => void }) {
  const [selectedEdge, setSelectedEdge] = useState<{ from: number; to: number; type: "pre" | "conflict" } | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<number, { x: number; y: number }>>({});
  const graphRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);
  const nodeDragRef = useRef<{ pointerId: number; entryId: number; x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null);
  const suppressCardClickRef = useRef<number | null>(null);
  const recordsById = new Map(records.map((record) => [record.entry_id, record]));
  const depthById = new Map<number, number>();
  const nodeWidth = 250;
  const nodeHeight = 162;
  const columnGap = 118;
  const rowGap = 28;
  const labelHeight = 34;

  function depth(record: EntryRecord, stack = new Set<number>()): number {
    const cached = depthById.get(record.entry_id);
    if (cached !== undefined) return cached;
    if (stack.has(record.entry_id)) return 0;
    stack.add(record.entry_id);
    const prereqDepths = record.prerequisites
      .flatMap((condition) => graphConditionEntryIds(condition))
      .map((entryId) => recordsById.get(entryId) ?? null)
      .filter((prereq): prereq is EntryRecord => Boolean(prereq))
      .map((prereq) => depth(prereq, new Set(stack)) + 1);
    const value = Math.min(Math.max(0, ...prereqDepths), 5);
    depthById.set(record.entry_id, value);
    return value;
  }

  const columns = new Map<number, EntryRecord[]>();
  for (const record of records) {
    const recordDepth = depth(record);
    if (!columns.has(recordDepth)) columns.set(recordDepth, []);
    columns.get(recordDepth)!.push(record);
  }
  const orderedColumns = [...columns.entries()]
    .sort(([left], [right]) => left - right)
    .map(([column, columnRecords]) => [column, columnRecords.sort((left, right) => left.entry_id - right.entry_id)] as const);
  const maxRows = Math.max(1, ...orderedColumns.map(([, columnRecords]) => columnRecords.length));
  const bodyHeight = maxRows * nodeHeight + Math.max(0, maxRows - 1) * rowGap;
  const columnIndexByDepth = new Map(orderedColumns.map(([column], index) => [column, index]));
  const nodeById = new Map<number, { record: EntryRecord; x: number; y: number }>();
  for (const [column, columnRecords] of orderedColumns) {
    const columnIndex = columnIndexByDepth.get(column) ?? 0;
    const columnHeight = columnRecords.length * nodeHeight + Math.max(0, columnRecords.length - 1) * rowGap;
    const columnOffset = column === 0 ? Math.max(0, (bodyHeight - columnHeight) / 2) : 0;
    columnRecords.forEach((record, rowIndex) => {
      const savedPosition = nodePositions[record.entry_id];
      nodeById.set(record.entry_id, {
        record,
        x: savedPosition?.x ?? columnIndex * (nodeWidth + columnGap),
        y: savedPosition?.y ?? labelHeight + columnOffset + rowIndex * (nodeHeight + rowGap),
      });
    });
  }

  const layoutWidth = Math.max(1, orderedColumns.length) * nodeWidth + Math.max(0, orderedColumns.length - 1) * columnGap;
  const canvasWidth = layoutWidth + 520;
  const canvasHeight = labelHeight + bodyHeight;
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  function graphConditionEntryIds(condition: EntryCondition): number[] {
    if (condition.type === 2 && typeof condition.target_id === "number" && recordsById.has(condition.target_id)) return [condition.target_id];
    return condition.alternatives?.flatMap(graphConditionEntryIds) ?? [];
  }

  const prerequisiteEdges = records.flatMap((record) =>
    record.prerequisites
      .flatMap((condition) => graphConditionEntryIds(condition).map((entryId) => ({ from: entryId, to: record.entry_id })))
      .filter((edge) => nodeById.has(edge.from) && nodeById.has(edge.to)),
  );
  const visualPrerequisiteEdges = records.flatMap((record) =>
    record.prerequisites
      .filter((condition) => !condition.alternatives?.length)
      .flatMap((condition) => graphConditionEntryIds(condition).map((entryId) => ({ from: entryId, to: record.entry_id })))
      .filter((edge) => nodeById.has(edge.from) && nodeById.has(edge.to)),
  );
  const orGroups = records.flatMap((record) =>
    record.prerequisites
      .filter((condition) => condition.alternatives?.length)
      .map((condition) => ({ to: record.entry_id, froms: graphConditionEntryIds(condition).filter((entryId) => nodeById.has(entryId)) }))
      .filter((group) => group.froms.length > 1 && nodeById.has(group.to)),
  );
  const conflictEdges = records.flatMap((record) =>
    record.conflicts
      .flatMap((condition) => graphConditionEntryIds(condition).map((entryId) => ({ from: entryId, to: record.entry_id })))
      .filter((edge) => nodeById.has(edge.from) && nodeById.has(edge.to)),
  );
  const allEdges = [...prerequisiteEdges, ...conflictEdges];
  const highlightedNodeIds = new Set<number>();
  if (selectedEdge) {
    highlightedNodeIds.add(selectedEdge.from);
    highlightedNodeIds.add(selectedEdge.to);
  } else if (selectedEntryId !== null) {
    for (const edge of allEdges) {
      if (edge.from === selectedEntryId || edge.to === selectedEntryId) {
        highlightedNodeIds.add(edge.from);
        highlightedNodeIds.add(edge.to);
      }
    }
  }

  function startGraphDrag(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".entry-graph-card, .entry-condition-chip, .entry-edge, .entry-edge-hit, .entry-or-node, button")) return;
    const graph = graphRef.current;
    if (!graph) return;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: graph.scrollLeft,
      top: graph.scrollTop,
    };
    graph.setPointerCapture(event.pointerId);
    graph.classList.add("dragging");
  }

  function moveGraphDrag(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    const graph = graphRef.current;
    if (!drag || !graph || drag.pointerId !== event.pointerId) return;
    graph.scrollLeft = drag.left - (event.clientX - drag.x);
    graph.scrollTop = drag.top - (event.clientY - drag.y);
  }

  function endGraphDrag(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    const graph = graphRef.current;
    if (!drag || !graph || drag.pointerId !== event.pointerId) return;
    if (graph.hasPointerCapture(event.pointerId)) graph.releasePointerCapture(event.pointerId);
    graph.classList.remove("dragging");
    dragRef.current = null;
  }

  function startNodeDrag(event: React.PointerEvent<HTMLDivElement>, entryId: number) {
    if (event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".entry-condition-chip, button")) return;
    const node = nodeById.get(entryId);
    if (!node) return;
    event.stopPropagation();
    nodeDragRef.current = {
      pointerId: event.pointerId,
      entryId,
      x: event.clientX,
      y: event.clientY,
      startX: node.x,
      startY: node.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add("dragging");
  }

  function moveNodeDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = nodeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    const nextX = clamp(drag.startX + dx, 0, Math.max(0, canvasWidth - nodeWidth));
    const nextY = clamp(drag.startY + dy, labelHeight, Math.max(labelHeight, canvasHeight - nodeHeight));
    setNodePositions((positions) => ({ ...positions, [drag.entryId]: { x: nextX, y: nextY } }));
  }

  function endNodeDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = nodeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    event.currentTarget.classList.remove("dragging");
    if (drag.moved) suppressCardClickRef.current = drag.entryId;
    nodeDragRef.current = null;
  }

  return (
    <section
      ref={graphRef}
      className="entry-skill-graph"
      aria-label="技能词条整图"
      onPointerDown={startGraphDrag}
      onPointerMove={moveGraphDrag}
      onPointerUp={endGraphDrag}
      onPointerCancel={endGraphDrag}
    >
      <div className="entry-skill-canvas" style={{ width: canvasWidth, height: canvasHeight }}>
        <svg className="entry-graph-lines" width={canvasWidth} height={canvasHeight} viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} aria-hidden="true">
          <defs>
            <marker id="entry-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L8,4 L0,8 Z" />
            </marker>
            <marker id="entry-arrow-conflict" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L8,4 L0,8 Z" />
            </marker>
          </defs>
          {visualPrerequisiteEdges.map((edge, index) => {
            const from = nodeById.get(edge.from)!;
            const to = nodeById.get(edge.to)!;
            const active = selectedEdge?.type === "pre" && selectedEdge.from === edge.from && selectedEdge.to === edge.to ? true : !selectedEdge && selectedEntryId !== null && (selectedEntryId === edge.from || selectedEntryId === edge.to);
            const startX = from.x + nodeWidth;
            const startY = from.y + nodeHeight / 2;
            const endX = to.x;
            const endY = to.y + nodeHeight / 2;
            const midX = startX + Math.max(24, (endX - startX) / 2);
            const d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX - 8} ${endY}`;
            return (
              <React.Fragment key={`pre-${index}-${edge.from}-${edge.to}`}>
                <path className="entry-edge-hit" d={d} onClick={() => setSelectedEdge({ ...edge, type: "pre" })} />
                <path className={active ? "entry-edge active selectable" : "entry-edge selectable"} d={d} markerEnd="url(#entry-arrow)" onClick={() => setSelectedEdge({ ...edge, type: "pre" })} />
              </React.Fragment>
            );
          })}
          {orGroups.map((group, groupIndex) => {
            const to = nodeById.get(group.to)!;
            const orX = to.x - Math.max(36, columnGap / 2);
            const orY = to.y + nodeHeight / 2;
            const active = !selectedEdge && selectedEntryId === group.to;
            return (
              <React.Fragment key={`or-${groupIndex}-${group.to}`}>
                {group.froms.map((fromId) => {
                  const from = nodeById.get(fromId)!;
                  const startX = from.x + nodeWidth;
                  const startY = from.y + nodeHeight / 2;
                  const midX = startX + Math.max(24, (orX - startX) / 2);
                  const d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${orY}, ${orX - 12} ${orY}`;
                  return (
                    <React.Fragment key={`or-in-${fromId}-${group.to}`}>
                      <path className="entry-edge-hit" d={d} onClick={() => setSelectedEdge({ from: fromId, to: group.to, type: "pre" })} />
                      <path className={active ? "entry-edge active selectable" : "entry-edge selectable"} d={d} onClick={() => setSelectedEdge({ from: fromId, to: group.to, type: "pre" })} />
                    </React.Fragment>
                  );
                })}
                <path
                  className={active ? "entry-edge active selectable" : "entry-edge selectable"}
                  d={`M ${orX + 12} ${orY} L ${to.x - 8} ${orY}`}
                  markerEnd="url(#entry-arrow)"
                  onClick={() => setSelectedEdge({ from: group.froms[0], to: group.to, type: "pre" })}
                />
              </React.Fragment>
            );
          })}
          {conflictEdges.map((edge, index) => {
            const from = nodeById.get(edge.from)!;
            const to = nodeById.get(edge.to)!;
            const active = selectedEdge?.type === "conflict" && selectedEdge.from === edge.from && selectedEdge.to === edge.to ? true : !selectedEdge && selectedEntryId !== null && (selectedEntryId === edge.from || selectedEntryId === edge.to);
            const startX = from.x + nodeWidth;
            const startY = from.y + nodeHeight / 2;
            const endX = to.x;
            const endY = to.y + nodeHeight / 2;
            const midX = startX + Math.max(24, (endX - startX) / 2);
            const d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX - 8} ${endY}`;
            return (
              <React.Fragment key={`conflict-${index}-${edge.from}-${edge.to}`}>
                <path className="entry-edge-hit" d={d} onClick={() => setSelectedEdge({ ...edge, type: "conflict" })} />
                <path className={active ? "entry-edge conflict active selectable" : "entry-edge conflict selectable"} d={d} markerEnd="url(#entry-arrow-conflict)" onClick={() => setSelectedEdge({ ...edge, type: "conflict" })} />
              </React.Fragment>
            );
          })}
        </svg>
        {orderedColumns.map(([column], index) => (
          <span key={`label-${column}`} className="entry-graph-label entry-column-label" style={{ left: index * (nodeWidth + columnGap), top: 0 }}>
            {column === 0 ? "基础" : `第${column + 1}层`}
          </span>
        ))}
        {orGroups.map((group, index) => {
          const to = nodeById.get(group.to)!;
          return (
            <span key={`or-label-${index}-${group.to}`} className="entry-or-node" style={{ left: to.x - Math.max(36, columnGap / 2) - 12, top: to.y + nodeHeight / 2 - 12 }}>
              或
            </span>
          );
        })}
        {[...nodeById.values()].map(({ record, x, y }) => (
          <div
            key={record.entry_id}
            className="entry-node-position"
            style={{ left: x, top: y, width: nodeWidth, height: nodeHeight }}
            onPointerDown={(event) => startNodeDrag(event, record.entry_id)}
            onPointerMove={moveNodeDrag}
            onPointerUp={endNodeDrag}
            onPointerCancel={endNodeDrag}
            onClickCapture={(event) => {
              if (suppressCardClickRef.current !== record.entry_id) return;
              suppressCardClickRef.current = null;
              event.stopPropagation();
            }}
          >
            <EntryGraphCard
              record={record}
              selected={record.entry_id === selectedEntryId}
              edgeSelected={highlightedNodeIds.has(record.entry_id) && record.entry_id !== selectedEntryId}
              availableEntryIds={availableEntryIds}
              onOpenEntry={(entryId) => {
                setSelectedEdge(null);
                onOpenEntry(entryId);
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function EntryGraphCard({
  record,
  selected,
  edgeSelected,
  availableEntryIds,
  onOpenEntry,
}: {
  record: EntryRecord;
  selected: boolean;
  edgeSelected?: boolean;
  availableEntryIds: Set<number>;
  onOpenEntry: (entryId: number) => void;
}) {
  const entryPrerequisites = record.prerequisites.filter((condition) => conditionEntryIds(condition, availableEntryIds).length > 0);
  const entryConflicts = record.conflicts.filter((condition) => conditionEntryIds(condition, availableEntryIds).length > 0);
  const className = selected ? "entry-graph-card selected" : edgeSelected ? "entry-graph-card edge-selected" : "entry-graph-card";
  return (
    <article
      className={className}
      role="button"
      tabIndex={0}
      onClick={() => onOpenEntry(record.entry_id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpenEntry(record.entry_id);
      }}
    >
      <div className="entry-graph-card-main">
        <strong>{record.name}</strong>
        <span>{record.entry_id}</span>
        <p>{record.description || "文本表未配置描述"}</p>
      </div>
      {(entryPrerequisites.length > 0 || entryConflicts.length > 0) && (
        <div className="entry-chip-list">
          {entryPrerequisites.map((condition, index) => (
            <ConditionChip key={`pre-${index}-${condition.text}`} condition={condition} availableEntryIds={availableEntryIds} onOpenEntry={onOpenEntry} />
          ))}
          {entryConflicts.map((condition, index) => (
            <ConditionChip key={`conflict-${index}-${condition.text}`} condition={condition} availableEntryIds={availableEntryIds} onOpenEntry={onOpenEntry} tone="conflict" />
          ))}
        </div>
      )}
    </article>
  );
}

function ConditionChip({ condition, availableEntryIds, onOpenEntry, tone = "normal" }: { condition: EntryCondition; availableEntryIds: Set<number>; onOpenEntry: (entryId: number) => void; tone?: "normal" | "conflict" }) {
  const entryIds = conditionEntryIds(condition, availableEntryIds);
  const className = tone === "conflict" ? "entry-condition-chip conflict" : "entry-condition-chip";
  const labelPrefix = tone === "conflict" ? "互斥" : "前置";
  return entryIds.length === 1 ? (
    <button
      type="button"
      className={className}
      onClick={(event) => {
        event.stopPropagation();
        onOpenEntry(entryIds[0]);
      }}
    >
      {labelPrefix} {entryIds[0]}
    </button>
  ) : entryIds.length > 1 ? (
    <span className={`${className} or-chip`} onClick={(event) => event.stopPropagation()}>
      <span>{labelPrefix}</span>
      {entryIds.map((entryId, index) => (
        <React.Fragment key={entryId}>
          {index > 0 && <em>或</em>}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenEntry(entryId);
            }}
          >
            {entryId}
          </button>
        </React.Fragment>
      ))}
    </span>
  ) : (
    <span className={className}>
      {labelPrefix} {condition.target_id ?? "-"}
    </span>
  );
}

function ConditionSection({ title, conditions, availableEntryIds, onOpenEntry }: { title: string; conditions: EntryCondition[]; availableEntryIds: Set<number>; onOpenEntry: (entryId: number) => void }) {
  return (
    <section className="monster-section">
      <div className="monster-section-title">
        <span>{title}</span>
        <strong>{conditions.length ? `${conditions.length} 条` : "无"}</strong>
      </div>
      {conditions.length ? (
        <div className="skin-level-list">
          {conditions.map((condition, index) => {
            const entryIds = conditionEntryIds(condition, availableEntryIds);
            const entryId = entryIds.length === 1 ? entryIds[0] : null;
            const content = (
              <>
                <strong>{condition.text}</strong>
                <p>
                  类型 {condition.type} · 参数 {condition.target_id ?? "-"} · 次数/等级 {condition.count ?? "-"}
                </p>
              </>
            );
            return entryId ? (
              <button type="button" className="skin-level-item condition-link" key={`${title}-${index}-${condition.text}`} onClick={() => onOpenEntry(entryId)}>
                {content}
              </button>
            ) : (
              <article className="skin-level-item" key={`${title}-${index}-${condition.text}`}>
                {content}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="none-text">无{title}。</p>
      )}
    </section>
  );
}

function GemWorkspace({
  gemLookup,
  filteredGems,
  selectedGem,
  onSelectGem,
}: {
  gemLookup: GemLookup | null;
  filteredGems: GemRecord[];
  selectedGem: GemRecord | null;
  onSelectGem: (record: GemRecord) => void;
}) {
  if (!gemLookup) {
    return (
      <section className="content-grid gem-content-grid">
        <div className="result-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-label">宝石结果</span>
              <h3>等待绑定数据</h3>
            </div>
          </div>
          <EmptyState />
        </div>
      </section>
    );
  }

  return (
    <section className="content-grid gem-content-grid">
      <div className="result-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-label">宝石列表</span>
            <h3>{filteredGems.length} 条匹配</h3>
          </div>
          <span className="level-chip">已忽略 0 权重</span>
        </div>
        <div className="gem-table">
          {filteredGems.map((record) => (
            <button
              type="button"
              className={selectedGem?.item_id === record.item_id ? "gem-row selected" : "gem-row"}
              key={record.item_id}
              onClick={() => onSelectGem(record)}
            >
              <span className="gem-id">{record.item_id}</span>
              <strong>{record.effect}</strong>
              <span>{record.part}</span>
              <span>{record.quality}</span>
              <span>{record.season}</span>
              <span>{formatPercent(record.refine_probability)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="list-panel gem-side-panel">
        <div className="panel-heading compact">
          <div>
            <span className="panel-label">当前宝石</span>
            <h3>{selectedGem ? selectedGem.name : "无结果"}</h3>
          </div>
        </div>
        {selectedGem ? <GemDetail record={selectedGem} /> : <EmptyState />}
      </div>
    </section>
  );
}

function GemDetail({ record }: { record: GemRecord }) {
  return (
    <div className="gem-detail">
      <div className="gem-detail-card">
        <span>道具ID</span>
        <strong>{record.item_id}</strong>
      </div>
      <div className="gem-detail-card">
        <span>宝石类型</span>
        <strong>{record.gem_type}</strong>
      </div>
      <div className="gem-tags">
        <span>{record.part}</span>
        <span>{record.quality}</span>
        <span>{record.season}</span>
      </div>
      <section className="gem-effect-card">
        <span>效果</span>
        <p>{record.effect}</p>
      </section>
      <div className="gem-stat-grid">
        <div>
          <span>{record.refine_weight_source}</span>
          <strong>{record.refine_weight}</strong>
        </div>
        <div>
          <span>池总权重</span>
          <strong>{record.refine_pool_total}</strong>
        </div>
        <div>
          <span>洗练概率</span>
          <strong>{formatPercent(record.refine_probability)}</strong>
        </div>
      </div>
      <section className="gem-raw-card">
        <span>属性</span>
        <p>
          属性ID {record.attribute_id ?? "-"} · 类型 {record.attribute_type ?? "-"} · 数值 {record.attribute_value ?? "-"}
        </p>
      </section>
    </div>
  );
}

function SkinWorkspace({
  skinCategory,
  onSkinCategoryChange,
  skinLookup,
  filteredSkins,
  selectedSkin,
  onSelectSkin,
  onOpenSkin,
}: {
  skinCategory: SkinCategoryKey;
  onSkinCategoryChange: (category: SkinCategoryKey) => void;
  skinLookup: SkinLookupData | null;
  filteredSkins: SkinRecord[];
  selectedSkin: SkinRecord | null;
  onSelectSkin: (record: SkinRecord) => void;
  onOpenSkin: (reference: SkinReference) => void;
}) {
  const category = SKIN_CATEGORIES.find((item) => item.key === skinCategory)!;
  return (
    <section className="skin-workspace">
      <div className="subtab-list" aria-label="皮肤子页签">
        {SKIN_CATEGORIES.map((item) => (
          <button key={item.key} type="button" className={item.key === skinCategory ? "subtab-button active" : "subtab-button"} onClick={() => onSkinCategoryChange(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      <section className="content-grid">
        <div className="result-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-label">{category.label}</span>
              <h3>{selectedSkin ? selectedSkin.name : "等待选择皮肤"}</h3>
            </div>
            {selectedSkin?.item_id && <span className="level-chip">道具ID {selectedSkin.item_id}</span>}
          </div>
          {selectedSkin ? <SkinDetail record={selectedSkin} onOpenSkin={onOpenSkin} /> : <EmptyState />}
        </div>

        <div className="list-panel">
          <div className="panel-heading compact">
            <div>
              <span className="panel-label">皮肤列表</span>
              <h3>{skinLookup ? `${filteredSkins.length} 条匹配` : "未加载"}</h3>
            </div>
          </div>
          <div className="level-list">
            {filteredSkins.map((record) => (
              <button type="button" key={record.skin_id} className={selectedSkin?.skin_id === record.skin_id ? "level-row selected" : "level-row"} onClick={() => onSelectSkin(record)}>
                <span>{record.item_id ?? "-"}</span>
                <strong>{record.name}</strong>
                <small>{record.skill_name}</small>
              </button>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}

function SkinDetail({ record, onOpenSkin }: { record: SkinRecord; onOpenSkin: (reference: SkinReference) => void }) {
  return (
    <div className="detail-stack">
      <div className="level-overview">
        <div>
          <span>道具ID</span>
          <strong>{record.item_id ?? "-"}</strong>
        </div>
        <div>
          <span>对应技能</span>
          <strong>{record.skill_name || "-"}</strong>
        </div>
        <div>
          <span>等级数量</span>
          <strong>{record.levels.length}</strong>
        </div>
      </div>
      {record.prerequisite_skins.length > 0 && (
        <section className="monster-section">
          <div className="monster-section-title">
            <span>前置皮肤</span>
            <strong>{record.prerequisite_skins.length} 个</strong>
          </div>
          <div className="skin-reference-list">
            {record.prerequisite_skins.map((skin) => (
              <button key={skin.skin_id} type="button" className="skin-reference-button" disabled={!skin.category} onClick={() => onOpenSkin(skin)}>
                {skin.name}
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="monster-section">
        <div className="monster-section-title">
          <span>技能效果</span>
          <strong>{record.levels.length} 级</strong>
        </div>
        <div className="skin-level-list">
          {record.levels.map((level) => (
            <article className="skin-level-item" key={`${record.skin_id}-${level.level}`}>
              <strong>Lv{level.level} {level.effect_name}</strong>
              <p>{level.effect}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <FileMagnifyingGlass size={42} weight="duotone" />
      <h3>先绑定数据目录</h3>
      <p>选择包含 xls 文件夹的根目录，系统会自动找到关卡、刷怪、怪物和文本配置表。</p>
    </div>
  );
}

function LevelDetail({ record }: { record: LevelRecord }) {
  return (
    <div className="detail-stack">
      <div className="level-overview">
        <div>
          <span>关卡ID</span>
          <strong>{record.level_id}</strong>
        </div>
        <div>
          <span>关卡名称</span>
          <strong>{record.level_name}</strong>
        </div>
        <div>
          <span>怪物种类</span>
          <strong>{record.monsters.small.length + record.monsters.elite.length + record.monsters.boss.length}</strong>
        </div>
      </div>

      <MonsterSection title="小怪" tone="small" monsters={record.monsters.small} />
      <MonsterSection title="精英怪" tone="elite" monsters={record.monsters.elite} />
      <MonsterSection title="首领" tone="boss" monsters={record.monsters.boss} />
    </div>
  );
}

function MonsterSection({ title, tone, monsters }: { title: string; tone: "small" | "elite" | "boss"; monsters: MonsterInfo[] }) {
  return (
    <section className={`monster-section ${tone}`}>
      <div className="monster-section-title">
        <span>{title}</span>
        <strong>{monsters.length ? `${monsters.length} 种` : "无"}</strong>
      </div>
      {monsters.length ? (
        <div className="monster-list">
          {monsters.map((monster) => (
            <article className="monster-item" key={`${tone}-${monster.monster_id}`}>
              <div className="monster-title">
                <div>
                  <strong>{monster.name}</strong>
                  <span>ID {monster.monster_id}</span>
                </div>
                <em>总数 {monster.total_count}</em>
              </div>
              <p>{monster.description || "无描述"}</p>
              <div className="wave-line">
                {monster.waves.slice(0, 12).map((wave, index) => (
                  <span key={`${monster.monster_id}-${index}`}>W{wave.wave ?? "?"}:{wave.count ?? "-"}</span>
                ))}
                {monster.waves.length > 12 && <span>更多 {monster.waves.length - 12}</span>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="none-text">这一关没有配置{title}。</p>
      )}
    </section>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
