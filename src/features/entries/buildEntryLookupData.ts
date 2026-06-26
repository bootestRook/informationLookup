import { CellValue, EntryCondition, EntryLookupData, EntryRecord } from '../../types';
import { normalizeId, sheetObjects, textById } from '../../utils/excel';
import * as XLSX from 'xlsx';

export function buildEntryLookupData(entryWorkbook: XLSX.WorkBook, skillWorkbook: XLSX.WorkBook, textMap: Map<number, string>): EntryLookupData {
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
