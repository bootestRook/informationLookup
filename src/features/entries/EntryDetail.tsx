import { EntryRecord } from '../../types';
import { ConditionSection } from './ConditionSection';

export function EntryDetail({ record, availableEntryIds, onOpenEntry }: { record: EntryRecord; availableEntryIds: Set<number>; onOpenEntry: (entryId: number) => void }) {
  return (
    <div className="entry-detail-inline">
      <div className="level-overview">
        <div>
          <span>词条组</span>
          <strong>{record.group_id}</strong>
        </div>
        <div>
          <span>所属源素</span>
          <strong>{record.skill_name || "-"}</strong>
        </div>
        <div>
          <span>文本ID</span>
          <strong>{record.name_id ?? "-"}</strong>
        </div>
      </div>
      <section className="monster-section">
        <div className="monster-section-title">
          <span>描述</span>
          <strong>{record.description_id ?? "-"}</strong>
        </div>
        <p className="none-text">{record.description || "文本表未配置描述"}</p>
      </section>
      <ConditionSection title="前置条件" conditions={record.prerequisites} availableEntryIds={availableEntryIds} onOpenEntry={onOpenEntry} />
      <ConditionSection title="互斥条件" conditions={record.conflicts} availableEntryIds={availableEntryIds} onOpenEntry={onOpenEntry} />
    </div>
  );
}
