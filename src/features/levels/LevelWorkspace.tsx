import { EmptyState } from '../../components/EmptyState';
import { LevelRecord } from '../../types';
import { LevelDetail } from './LevelDetail';
import { monsterSummary } from './selectors';

export function LevelWorkspace({
  currentRecord,
  filteredRecords,
  clientRootPath,
  onSelectStage,
}: {
  currentRecord: LevelRecord | null;
  filteredRecords: LevelRecord[];
  selectedStage: string;
  clientRootPath: string;
  onSelectStage: (stage: string) => void;
}) {
  return (
    <section className="content-grid">
      <div className="result-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-label">检索结果</span>
            <h3>{currentRecord ? currentRecord.level_label_name : "等待选择关卡"}</h3>
          </div>
          {currentRecord && <span className="level-chip">ID {currentRecord.level_id}</span>}
        </div>

        {currentRecord ? <LevelDetail record={currentRecord} clientRootPath={clientRootPath} /> : <EmptyState />}
      </div>

      <div className="list-panel">
        <div className="panel-heading compact">
          <div>
            <span className="panel-label">关卡列表</span>
            <h3>{filteredRecords.length} 条匹配</h3>
          </div>
        </div>
        <div className="level-list">
          {filteredRecords.map((record) => (
            <button
              type="button"
              key={record.level_id}
              className={currentRecord?.level_id === record.level_id ? "level-row selected" : "level-row"}
              onClick={() => onSelectStage(record.stage_key)}
            >
              <span>{record.level_label}</span>
              <strong>{record.level_name}</strong>
              <small>{monsterSummary(record.monsters.small)}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
