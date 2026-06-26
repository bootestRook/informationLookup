import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

type CellValue = string | number | boolean | null | undefined;
type SheetRows = CellValue[][];
type RequiredFileKey = "monster" | "spawn" | "level" | "text" | "gem" | "skin" | "skill" | "entry";

type MatchedFileInfo = {
  key: RequiredFileKey;
  label: string;
  fileName: string;
  relativePath: string;
};

type FoundFileInfo = MatchedFileInfo & {
  absolutePath: string;
};

type CachedFileInfo = FoundFileInfo & {
  size: number;
  mtimeMs: number;
};

type ScanResult = {
  rootPath: string;
  rootName: string;
  files: MatchedFileInfo[];
  lookup: {
    byStage: Record<string, LevelRecord>;
    byLevelId: Record<string, LevelRecord>;
    duplicateStages: Record<string, number>;
  };
  gemLookup: GemLookup;
  skinLookup: SkinLookupData;
  entryLookup: EntryLookupData;
};

type CachedScanResult = Omit<ScanResult, "files"> & {
  files: CachedFileInfo[];
  cachedAt: string;
  cacheVersion?: number;
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

type SavedSettings = {
  rootPath?: string;
};

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

const settingsPath = path.resolve(process.cwd(), ".local", "level-info-settings.json");
const cachePath = path.resolve(process.cwd(), ".local", "level-info-cache.json");
const cacheVersion = 3;
const tagPattern = /<[^>]+>/g;
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

export async function scanLevelLookup(rootPath: string): Promise<ScanResult> {
  const rootText = rootPath.trim().replace(/^"+|"+$/g, "");
  if (!rootText) throw new Error("请填写文件夹路径");
  const normalizedRoot = path.resolve(rootText);

  const stat = await fs.stat(normalizedRoot).catch(() => null);
  if (!stat?.isDirectory()) throw new Error(`文件夹不存在：${normalizedRoot}`);

  const cached = await readCachedScan(normalizedRoot);
  const cachedFiles = cached ? await statCachedFiles(cached.files) : null;
  if (cached && cachedFiles && areFilesUnchanged(cached.files, cachedFiles)) {
    return toScanResult(cached);
  }

  const found = cachedFiles ? filesToMap(cachedFiles) : await findRequiredFiles(normalizedRoot);
  const missing = REQUIRED_FILES.filter((file) => !found.has(file.key));
  if (missing.length) {
    throw new Error(`缺少表格：${missing.map((file) => file.fileName).join("、")}`);
  }

  const foundWithStats = await attachFileStats(found);
  const textWorkbook = await readWorkbook(foundWithStats.get("text")!.absolutePath);
  const monsterWorkbook = await readWorkbook(foundWithStats.get("monster")!.absolutePath);
  const spawnWorkbook = await readWorkbook(foundWithStats.get("spawn")!.absolutePath);
  const levelWorkbook = await readWorkbook(foundWithStats.get("level")!.absolutePath);
  const gemWorkbook = await readWorkbook(foundWithStats.get("gem")!.absolutePath);
  const skinWorkbook = await readWorkbook(foundWithStats.get("skin")!.absolutePath);
  const skillWorkbook = await readWorkbook(foundWithStats.get("skill")!.absolutePath);
  const entryWorkbook = await readWorkbook(foundWithStats.get("entry")!.absolutePath);
  const textMap = buildTextMap(textWorkbook);
  const monsterMap = buildMonsterMap(monsterWorkbook, textMap);
  const levelMonsters = buildLevelMonsters(spawnWorkbook, monsterMap);

  const result: ScanResult = {
    rootPath: normalizedRoot,
    rootName: path.basename(normalizedRoot),
    files: REQUIRED_FILES.map((file) => foundWithStats.get(file.key)!).map(({ absolutePath: _absolutePath, size: _size, mtimeMs: _mtimeMs, ...file }) => file),
    lookup: buildLookupData(levelWorkbook, textMap, levelMonsters),
    gemLookup: buildGemLookup(gemWorkbook, textMap),
    skinLookup: buildSkinLookupData(skinWorkbook, skillWorkbook, textMap),
    entryLookup: buildEntryLookupData(entryWorkbook, skillWorkbook, textMap),
  };
  await writeCachedScan({ ...result, files: REQUIRED_FILES.map((file) => foundWithStats.get(file.key)!), cachedAt: new Date().toISOString(), cacheVersion });
  return result;
}

export async function readSavedRootPath(): Promise<string> {
  try {
    const raw = await fs.readFile(settingsPath, "utf-8");
    const settings = JSON.parse(raw) as SavedSettings;
    return typeof settings.rootPath === "string" ? settings.rootPath : "";
  } catch {
    return "";
  }
}

export async function saveSavedRootPath(rootPath: string): Promise<void> {
  const normalizedRoot = rootPath.trim().replace(/^"+|"+$/g, "");
  if (!normalizedRoot) return;
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, `${JSON.stringify({ rootPath: normalizedRoot }, null, 2)}\n`, "utf-8");
}

async function readWorkbook(filePath: string): Promise<XLSX.WorkBook> {
  const buffer = await fs.readFile(filePath);
  return XLSX.read(buffer, { type: "buffer" });
}

async function findRequiredFiles(rootPath: string) {
  const requiredByName = new Map(REQUIRED_FILES.map((file) => [file.fileName, file]));
  const found = new Map<RequiredFileKey, FoundFileInfo>();

  async function walk(currentPath: string) {
    if (found.size === REQUIRED_FILES.length) return;
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (found.size === REQUIRED_FILES.length) return;
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isFile()) {
        const required = requiredByName.get(entry.name);
        if (required && !found.has(required.key)) {
          found.set(required.key, {
            ...required,
            absolutePath,
            relativePath: path.relative(rootPath, absolutePath).split(path.sep).join("/"),
          });
        }
      }
      if (entry.isDirectory()) await walk(absolutePath);
    }
  }

  await walk(rootPath);
  return found;
}

async function readCachedScan(rootPath: string): Promise<CachedScanResult | null> {
  try {
    const raw = await fs.readFile(cachePath, "utf-8");
    const cached = JSON.parse(raw) as CachedScanResult;
    if (cached.cacheVersion !== cacheVersion) return null;
    if (path.resolve(cached.rootPath) !== rootPath) return null;
    if (!Array.isArray(cached.files) || REQUIRED_FILES.some((file) => !cached.files.some((cachedFile) => cachedFile.key === file.key))) return null;
    if (!cached.skinLookup?.wall || !cached.skinLookup?.wallChroma) return null;
    if (cached.skinLookup.personChroma?.some((record) => typeof record.prerequisite_skins?.[0] === "string")) return null;
    return cached;
  } catch {
    return null;
  }
}

async function writeCachedScan(result: CachedScanResult): Promise<void> {
  try {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, `${JSON.stringify(result)}\n`, "utf-8");
  } catch {
    // Cache writes are only a startup-speed optimization. The current scan result is still valid.
  }
}

async function statCachedFiles(files: CachedFileInfo[]): Promise<CachedFileInfo[] | null> {
  const currentFiles: CachedFileInfo[] = [];
  for (const file of files) {
    const stat = await fs.stat(file.absolutePath).catch(() => null);
    if (!stat?.isFile()) return null;
    currentFiles.push({ ...file, size: stat.size, mtimeMs: stat.mtimeMs });
  }
  return currentFiles;
}

function areFilesUnchanged(previousFiles: CachedFileInfo[], currentFiles: CachedFileInfo[]): boolean {
  const currentByKey = filesToMap(currentFiles);
  return previousFiles.every((previousFile) => {
    const currentFile = currentByKey.get(previousFile.key);
    return currentFile?.absolutePath === previousFile.absolutePath && currentFile.size === previousFile.size && currentFile.mtimeMs === previousFile.mtimeMs;
  });
}

function filesToMap<T extends FoundFileInfo>(files: T[]): Map<RequiredFileKey, T> {
  return new Map(files.map((file) => [file.key, file]));
}

async function attachFileStats(files: Map<RequiredFileKey, FoundFileInfo>): Promise<Map<RequiredFileKey, CachedFileInfo>> {
  const withStats = new Map<RequiredFileKey, CachedFileInfo>();
  for (const required of REQUIRED_FILES) {
    const file = files.get(required.key)!;
    const stat = await fs.stat(file.absolutePath);
    withStats.set(required.key, { ...file, size: stat.size, mtimeMs: stat.mtimeMs });
  }
  return withStats;
}

function toScanResult(cached: CachedScanResult): ScanResult {
  return {
    rootPath: cached.rootPath,
    rootName: cached.rootName,
    files: cached.files.map(({ absolutePath: _absolutePath, size: _size, mtimeMs: _mtimeMs, ...file }) => file),
    lookup: cached.lookup,
    gemLookup: cached.gemLookup,
    skinLookup: cached.skinLookup,
    entryLookup: cached.entryLookup,
  };
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
  return toText(value).replace(tagPattern, "").trim();
}

function stripLevelPrefix(value: CellValue): string {
  return stripRichText(value).replace(/^\s*\d+\s*[.。．、-]\s*/, "").trim();
}

function headerIndex(rows: SheetRows): Record<string, number> {
  return Object.fromEntries((rows[0] ?? []).map((cell, index) => [toText(cell), index]).filter(([key]) => key));
}

function getSheetRows(workbook: XLSX.WorkBook, sheetName: string): SheetRows {
  const sheet = workbook.Sheets[sheetName];
  return sheet ? XLSX.utils.sheet_to_json<CellValue[]>(sheet, { header: 1, defval: null, raw: true }) : [];
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
    const descriptionTemplate = (typeof descriptionId === "number" ? textMap.get(descriptionId) : "") || toText(row[index["宝石描述备注(40050001)"]]);
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
      effect: fillTemplate(descriptionTemplate, [
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

  records.sort((left, right) => {
    const leftSeason = Number(left.season_id ?? 0);
    const rightSeason = Number(right.season_id ?? 0);
    return leftSeason - rightSeason || Number(left.part_id) - Number(right.part_id) || Number(left.quality_id) - Number(right.quality_id) || left.item_id - right.item_id;
  });

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
  const categories: Array<{ key: SkinCategoryKey; configSheet: string; levelSheet: string; withPrerequisite: boolean }> = [
    { key: "person", configSheet: "人物皮肤配置表", levelSheet: "人物皮肤升星配置", withPrerequisite: false },
    { key: "core", configSheet: "核心皮肤配置表", levelSheet: "核心皮肤升星配置", withPrerequisite: false },
    { key: "wall", configSheet: "城墙皮肤配置表", levelSheet: "城墙皮肤升星配置", withPrerequisite: false },
    { key: "personChroma", configSheet: "时装炫彩配置表", levelSheet: "时装炫彩升星配置", withPrerequisite: true },
    { key: "coreChroma", configSheet: "核心炫彩配置表", levelSheet: "核心炫彩升星配置", withPrerequisite: true },
    { key: "wallChroma", configSheet: "城墙炫彩配置表", levelSheet: "城墙炫彩升星配置表", withPrerequisite: true },
  ];
  const skillNameById = new Map<number, string>();
  for (const row of sheetObjects(skillWorkbook, "源素配置表")) {
    const skillId = normalizeId(row["技能ID"]);
    if (typeof skillId === "number") skillNameById.set(skillId, textById(textMap, row["源素名"]));
  }

  const skinNameById = new Map<number, string>();
  const skinCategoryById = new Map<number, SkinCategoryKey>();
  for (const { configSheet } of categories) {
    for (const row of sheetObjects(skinWorkbook, configSheet)) {
      const skinId = normalizeId(row["时装ID"]);
      if (typeof skinId === "number") {
        skinNameById.set(skinId, textById(textMap, row["时装名称"]));
      }
    }
  }
  for (const category of categories) {
    for (const row of sheetObjects(skinWorkbook, category.configSheet)) {
      const skinId = normalizeId(row["时装ID"]);
      if (typeof skinId === "number") skinCategoryById.set(skinId, category.key);
    }
  }

  const result: SkinLookupData = { person: [], core: [], wall: [], personChroma: [], coreChroma: [], wallChroma: [] };
  for (const category of categories) {
    const levelsBySkinId = new Map<number, SkinLevel[]>();
    const skillIdBySkinId = new Map<number, number>();
    for (const row of sheetObjects(skinWorkbook, category.levelSheet)) {
      const skinId = normalizeId(row["时装ID"]);
      if (typeof skinId !== "number") continue;
      const levelSkillId = normalizeId(row["技能ID"]);
      if (typeof levelSkillId === "number" && !skillIdBySkinId.has(skinId)) skillIdBySkinId.set(skinId, levelSkillId);
      const level = normalizeId(row["时装星级"]) ?? "";
      const effects = [textById(textMap, row["效果描述"]), textById(textMap, row["效果描述2"])].filter(Boolean);
      if (!levelsBySkinId.has(skinId)) levelsBySkinId.set(skinId, []);
      levelsBySkinId.get(skinId)!.push({
        level,
        effect_name: textById(textMap, row["效果名称描述"]),
        effect: effects.join("\n"),
      });
    }

    for (const row of sheetObjects(skinWorkbook, category.configSheet)) {
      const skinId = normalizeId(row["时装ID"]);
      if (typeof skinId !== "number") continue;
      const sourceId = normalizeId(row["关联源素ID"]);
      const skillId = typeof sourceId === "number" ? sourceId : skillIdBySkinId.get(skinId);
      const itemId = normalizeId(row["激活道具_1_道具ID"]);
      const prerequisite_skins = category.withPrerequisite
        ? [1, 2, 3, 4, 5]
            .map((index) => normalizeId(row[`激活前置皮肤ID_${index}`]))
            .filter((id): id is number => typeof id === "number")
            .map((id) => ({ skin_id: id, category: skinCategoryById.get(id) ?? null, name: skinNameById.get(id) || `[皮肤未找到:${id}]` }))
        : [];
      const levels = (levelsBySkinId.get(skinId) ?? []).sort((left, right) => Number(left.level) - Number(right.level));
      if (!levels.length) continue;

      result[category.key].push({
        category: category.key,
        name: skinNameById.get(skinId) || textById(textMap, row["时装名称"]),
        skin_id: skinId,
        item_id: typeof itemId === "number" ? itemId : null,
        skill_name: typeof skillId === "number" ? skillNameById.get(skillId) || `[技能未找到:${skillId}]` : "",
        prerequisite_skins,
        levels,
      });
    }
  }

  return result;
}

function buildMonsterMap(workbook: XLSX.WorkBook, textMap: Map<number, string>) {
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

function buildLevelMonsters(workbook: XLSX.WorkBook, monsterMap: Map<number, Omit<MonsterInfo, "waves" | "total_count">>) {
  const rows = getSheetRows(workbook, "关卡波次配置-2主线关卡");
  const index = headerIndex(rows);
  const levelMonsters = new Map<number, { small: Map<number, MonsterInfo>; elite: Map<number, MonsterInfo>; boss: Map<number, MonsterInfo> }>();
  const roleByType: Record<number, "small" | "elite" | "boss" | undefined> = { 1: "small", 6: "elite", 2: "boss" };

  for (const row of rows.slice(1)) {
    const levelId = normalizeId(row[index["关卡ID"]]);
    const monsterId = normalizeId(row[index["怪物ID"]]);
    if (typeof levelId !== "number" || typeof monsterId !== "number") continue;
    const baseMonster = monsterMap.get(monsterId);
    const role = baseMonster ? roleByType[baseMonster.type] : undefined;
    if (!baseMonster || !role) continue;

    if (!levelMonsters.has(levelId)) levelMonsters.set(levelId, { small: new Map(), elite: new Map(), boss: new Map() });
    const group = levelMonsters.get(levelId)![role];
    if (!group.has(monsterId)) group.set(monsterId, { ...baseMonster, waves: [], total_count: 0 });
    const monster = group.get(monsterId)!;
    const count = normalizeId(row[index["怪物数量"]]);
    monster.waves.push({
      wave: asNumber(normalizeId(row[index["波次"]])),
      wave_type: asNumber(normalizeId(row[index["波次类型"]])),
      count: asNumber(count),
    });
    if (typeof count === "number") monster.total_count += count;
  }

  return levelMonsters;
}

function asNumber(value: number | string | null): number | null {
  return typeof value === "number" ? value : null;
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

function compareRank(left: [number, number, number], right: [number, number, number]): number {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function buildLookupData(
  levelWorkbook: XLSX.WorkBook,
  textMap: Map<number, string>,
  levelMonsters: Map<number, { small: Map<number, MonsterInfo>; elite: Map<number, MonsterInfo>; boss: Map<number, MonsterInfo> }>,
) {
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

    const monsters = levelMonsters.get(levelId);
    const label = stripRichText(rawLevelLabel) || `第${stageNo}关`;
    const levelName = stripLevelPrefix(rawLevelName);
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
  const rankByStage = new Map<string, [number, number, number]>();
  for (const candidate of candidates) {
    const key = String(candidate.stage_no);
    const currentRank = rankByStage.get(key);
    if (!currentRank || compareRank(candidate.rank, currentRank) > 0) {
      const { rank: _rank, ...record } = candidate;
      byStage[key] = record;
      rankByStage.set(key, candidate.rank);
    }
  }

  return {
    byStage,
    byLevelId,
    duplicateStages: Object.fromEntries(Object.entries(duplicateCounter).filter(([, count]) => count > 1)),
  };
}
