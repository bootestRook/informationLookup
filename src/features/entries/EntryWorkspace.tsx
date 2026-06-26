import { EmptyState } from '../../components/EmptyState';
import { EntryLookupData, EntryRecord } from '../../types';
import { EntryDetail } from './EntryDetail';
import { EntrySkillGraph } from './EntrySkillGraph';
import { buildEntrySkillGroups, entrySkillKey } from './entrySkillGroups';
import { useEffect, useMemo, useState } from 'react';

export function EntryWorkspace({
  entryLookup,
  filteredEntries,
  selectedEntry,
  onSelectEntry,
  onOpenEntry,
}: {
  entryLookup: EntryLookupData | null;
  filteredEntries: EntryRecord[];
  selectedEntry: EntryRecord | null;
  onSelectEntry: (record: EntryRecord) => void;
  onOpenEntry: (entryId: number) => void;
}) {
  const [activeSkillKey, setActiveSkillKey] = useState("");
  const availableEntryIds = new Set(entryLookup?.records.map((record) => record.entry_id) ?? []);
  const skillGroups = useMemo(() => buildEntrySkillGroups(entryLookup?.records ?? []), [entryLookup]);
  const activeGroup = skillGroups.find((group) => group.key === activeSkillKey) ?? skillGroups[0] ?? null;
  const groupEntries = activeGroup ? filteredEntries.filter((record) => entrySkillKey(record) === activeGroup.key) : [];

  useEffect(() => {
    if (!skillGroups.length) return;
    if (!activeSkillKey || !skillGroups.some((group) => group.key === activeSkillKey)) setActiveSkillKey(skillGroups[0].key);
  }, [activeSkillKey, skillGroups]);

  function openEntry(entryId: number) {
    const target = entryLookup?.records.find((record) => record.entry_id === entryId);
    if (target) setActiveSkillKey(entrySkillKey(target));
    onOpenEntry(entryId);
  }

  return (
    <section className="content-grid">
      <div className="result-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-label">技能关系图</span>
            <h3>{activeGroup ? activeGroup.label : "等待绑定数据"}</h3>
          </div>
          {activeGroup && <span className="level-chip">{activeGroup.records.length} 条</span>}
        </div>
        {activeGroup ? (
          <div className="detail-stack">
            <div className="subtab-list entry-skill-tabs" aria-label="源素分类">
              {skillGroups.map((group) => (
                <button key={group.key} type="button" className={group.key === activeGroup.key ? "subtab-button active" : "subtab-button"} onClick={() => setActiveSkillKey(group.key)}>
                  {group.label}
                </button>
              ))}
            </div>
            <EntrySkillGraph records={activeGroup.records} selectedEntryId={selectedEntry?.entry_id ?? null} availableEntryIds={availableEntryIds} onOpenEntry={openEntry} />
            {selectedEntry && entrySkillKey(selectedEntry) === activeGroup.key && <EntryDetail record={selectedEntry} availableEntryIds={availableEntryIds} onOpenEntry={openEntry} />}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      <div className="list-panel">
        <div className="panel-heading compact">
          <div>
            <span className="panel-label">当前技能词条</span>
            <h3>{entryLookup ? `${groupEntries.length} 条匹配` : "未加载"}</h3>
          </div>
        </div>
        <div className="level-list">
          {groupEntries.map((record) => (
            <button type="button" key={record.entry_id} className={selectedEntry?.entry_id === record.entry_id ? "level-row selected" : "level-row"} onClick={() => onSelectEntry(record)}>
              <span>{record.entry_id}</span>
              <strong>{record.name}</strong>
              <small>{record.description || record.skill_name || "-"}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
