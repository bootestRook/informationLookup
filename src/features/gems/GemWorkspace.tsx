import { EmptyState } from '../../components/EmptyState';
import { GemLookup, GemRecord } from '../../types';
import { formatPercent } from '../../utils/format';
import { GemDetail } from './GemDetail';

export function GemWorkspace({
  gemLookup,
  filteredGems,
  selectedGem,
  onSelectGem,
}: {
  gemLookup: GemLookup | null;
  filteredGems: GemRecord[];
  selectedGem: GemRecord | null;
  onSelectGem: (record: GemRecord) => void;
}) {
  if (!gemLookup) {
    return (
      <section className="content-grid gem-content-grid">
        <div className="result-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-label">宝石结果</span>
              <h3>等待绑定数据</h3>
            </div>
          </div>
          <EmptyState />
        </div>
      </section>
    );
  }

  return (
    <section className="content-grid gem-content-grid">
      <div className="result-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-label">宝石列表</span>
            <h3>{filteredGems.length} 条匹配</h3>
          </div>
          <span className="level-chip">已忽略 0 权重</span>
        </div>
        <div className="gem-table">
          {filteredGems.map((record) => (
            <button
              type="button"
              className={selectedGem?.item_id === record.item_id ? "gem-row selected" : "gem-row"}
              key={record.item_id}
              onClick={() => onSelectGem(record)}
            >
              <span className="gem-id">{record.item_id}</span>
              <strong>{record.effect}</strong>
              <span>{record.part}</span>
              <span>{record.quality}</span>
              <span>{record.season}</span>
              <span>{formatPercent(record.refine_probability)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="list-panel gem-side-panel">
        <div className="panel-heading compact">
          <div>
            <span className="panel-label">当前宝石</span>
            <h3>{selectedGem ? selectedGem.name : "无结果"}</h3>
          </div>
        </div>
        {selectedGem ? <GemDetail record={selectedGem} /> : <EmptyState />}
      </div>
    </section>
  );
}
