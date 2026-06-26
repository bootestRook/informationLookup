import { compareStage, findRecord, monsterSummary } from '../features/levels/selectors';
import { EntryLookupData, EntryRecord, GemLookup, GemRecord, LevelRecord, LookupData, SkinCategoryKey, SkinLookupData, SkinRecord } from '../types';
import { formatPercent } from '../utils/format';

export function selectLevelRecord(lookupData: LookupData | null, selectedStage: string, query: string): LevelRecord | null {
  return findRecord(lookupData, selectedStage || query);
}

export function filterLevelRecords(lookupData: LookupData | null, query: string): LevelRecord[] {
  if (!lookupData) return [];
  const value = query.trim();
  const records = Object.values(lookupData.byStage).sort(compareStage);
  if (!value) return records;
  const stageValue = value.replace(/[第关\s]/g, "");
  return records
    .filter((record) => {
      if (/^\d+(?:-\d+)?$/.test(stageValue) && record.stage_key.includes(stageValue)) return true;
      return record.level_label_name.includes(value) || monsterSummary(record.monsters.small).includes(value) || monsterSummary(record.monsters.elite).includes(value) || monsterSummary(record.monsters.boss).includes(value);
    })
    .slice(0, 120);
}

export function filterGemRecords(gemLookup: GemLookup | null, query: string): GemRecord[] {
  if (!gemLookup) return [];
  const value = query.trim();
  const records = gemLookup.records;
  if (!value) return records;
  return records.filter((record) => {
    if (/^[123]$/.test(value)) return String(record.season_id ?? "") === value;
    const haystack = [record.item_id, record.name, record.part, record.quality, record.season, record.gem_type, record.effect, record.refine_weight, record.refine_weight_source, formatPercent(record.refine_probability)]
      .join(" ")
      .toLowerCase();
    return haystack.includes(value.toLowerCase());
  });
}

export function selectGemRecord(gemLookup: GemLookup | null, selectedGemId: number | null, filteredGems: GemRecord[]): GemRecord | null {
  if (!gemLookup) return null;
  return gemLookup.records.find((record) => record.item_id === selectedGemId) ?? filteredGems[0] ?? null;
}

export function filterSkinRecords(skinLookup: SkinLookupData | null, skinCategory: SkinCategoryKey, query: string): SkinRecord[] {
  const records = skinLookup?.[skinCategory] ?? [];
  const value = query.trim();
  if (!value) return records.slice(0, 120);
  return records
    .filter((record) => [record.name, record.item_id, record.skill_name, record.prerequisite_skins.map((skin) => skin.name).join("、")].join(" ").includes(value))
    .slice(0, 120);
}

export function selectSkinRecord(skinLookup: SkinLookupData | null, skinCategory: SkinCategoryKey, selectedSkinId: number | null, filteredSkins: SkinRecord[]): SkinRecord | null {
  if (!skinLookup) return null;
  return skinLookup[skinCategory].find((record) => record.skin_id === selectedSkinId) ?? filteredSkins[0] ?? null;
}

export function filterEntryRecords(entryLookup: EntryLookupData | null, query: string): EntryRecord[] {
  const records = entryLookup?.records ?? [];
  const value = query.trim();
  if (!value) return records;
  return records
    .filter((record) =>
      [record.entry_id, record.name, record.description, record.skill_name, record.prerequisites.map((condition) => condition.text).join("、"), record.conflicts.map((condition) => condition.text).join("、")]
        .join(" ")
        .includes(value),
    )
    .slice(0, 240);
}

export function selectEntryRecord(entryLookup: EntryLookupData | null, selectedEntryId: number | null, filteredEntries: EntryRecord[]): EntryRecord | null {
  if (!entryLookup) return null;
  return entryLookup.records.find((record) => record.entry_id === selectedEntryId) ?? filteredEntries[0] ?? null;
}
