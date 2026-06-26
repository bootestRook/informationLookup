import { SKIN_CATEGORIES } from '../../config/skinCategories';
import { CellValue, SkinCategoryKey, SkinImageAsset, SkinLevel, SkinLookupData } from '../../types';
import { normalizeId, sheetObjects, textById, toText } from '../../utils/excel';
import * as XLSX from 'xlsx';

export function pushImageAsset(images: SkinImageAsset[], seen: Set<string>, label: string, value: CellValue) {
  const name = toText(value);
  if (!name || seen.has(name)) return;
  seen.add(name);
  images.push({ label, name });
}

export function collectSkinImages(row: Record<string, CellValue>, category: SkinCategoryKey): SkinImageAsset[] {
  const images: SkinImageAsset[] = [];
  const seen = new Set<string>();
  if (category === "wall" || category === "wallChroma") {
    pushImageAsset(images, seen, "展示", row["展示图片"]);
    pushImageAsset(images, seen, "图标", row["时装图标"]);
    return images.slice(0, 2);
  }
  pushImageAsset(images, seen, "男", row["展示图标_男"] || row["时装图标"]);
  pushImageAsset(images, seen, "女", row["展示图标_女"] || row["时装图标_女"]);
  return images;
}

export function buildSkinLookupData(skinWorkbook: XLSX.WorkBook, skillWorkbook: XLSX.WorkBook, textMap: Map<number, string>): SkinLookupData {
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
        image_assets: collectSkinImages(row, category.key),
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
