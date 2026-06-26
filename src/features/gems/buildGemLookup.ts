import { partNameById, qualityNameById } from '../../config/gemLabels';
import { GemLookup, GemRecord } from '../../types';
import { activeRefineWeight, asNumberValue, displaySeason, fillTemplate, getSheetRows, headerIndex, normalizeId, stripRichText, toText } from '../../utils/excel';
import * as XLSX from 'xlsx';

export function buildGemLookup(workbook: XLSX.WorkBook, textMap: Map<number, string>): GemLookup {
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
