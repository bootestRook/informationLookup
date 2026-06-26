import { EntryRecord } from '../../types';

export function entrySkillKey(record: EntryRecord): string {
  return record.skill_id === null ? "common" : String(record.skill_id);
}

export function buildEntrySkillGroups(records: EntryRecord[]): Array<{ key: string; label: string; records: EntryRecord[] }> {
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
