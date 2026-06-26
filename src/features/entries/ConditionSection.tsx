import { EntryCondition } from '../../types';
import { conditionEntryIds } from './entryConditions';

export function ConditionSection({ title, conditions, availableEntryIds, onOpenEntry }: { title: string; conditions: EntryCondition[]; availableEntryIds: Set<number>; onOpenEntry: (entryId: number) => void }) {
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
