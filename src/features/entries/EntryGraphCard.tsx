import { EntryRecord } from '../../types';
import { ConditionChip } from './ConditionChip';
import { conditionEntryIds } from './entryConditions';

export function EntryGraphCard({
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
