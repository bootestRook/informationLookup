import { EntryCondition } from '../../types';
import { conditionEntryIds } from './entryConditions';
import React from 'react';

export function ConditionChip({ condition, availableEntryIds, onOpenEntry, tone = "normal" }: { condition: EntryCondition; availableEntryIds: Set<number>; onOpenEntry: (entryId: number) => void; tone?: "normal" | "conflict" }) {
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
