import { EntryCondition } from '../../types';

export function conditionEntryId(condition: EntryCondition, availableEntryIds: Set<number>): number | null {
  return conditionEntryIds(condition, availableEntryIds)[0] ?? null;
}

export function conditionEntryIds(condition: EntryCondition, availableEntryIds: Set<number>): number[] {
  if (condition.type === 2 && typeof condition.target_id === "number" && availableEntryIds.has(condition.target_id)) return [condition.target_id];
  return condition.alternatives?.flatMap((alternative) => conditionEntryIds(alternative, availableEntryIds)) ?? [];
}
