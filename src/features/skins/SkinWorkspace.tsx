import { EmptyState } from '../../components/EmptyState';
import { SKIN_CATEGORIES } from '../../config/skinCategories';
import { SkinCategoryKey, SkinLookupData, SkinRecord, SkinReference } from '../../types';
import { SkinDetail } from './SkinDetail';

export function SkinWorkspace({
  skinCategory,
  onSkinCategoryChange,
  skinLookup,
  filteredSkins,
  selectedSkin,
  clientRootPath,
  onSelectSkin,
  onOpenSkin,
}: {
  skinCategory: SkinCategoryKey;
  onSkinCategoryChange: (category: SkinCategoryKey) => void;
  skinLookup: SkinLookupData | null;
  filteredSkins: SkinRecord[];
  selectedSkin: SkinRecord | null;
  clientRootPath: string;
  onSelectSkin: (record: SkinRecord) => void;
  onOpenSkin: (reference: SkinReference) => void;
}) {
  const category = SKIN_CATEGORIES.find((item) => item.key === skinCategory)!;
  return (
    <section className="skin-workspace">
      <div className="subtab-list" aria-label="皮肤子页签">
        {SKIN_CATEGORIES.map((item) => (
          <button key={item.key} type="button" className={item.key === skinCategory ? "subtab-button active" : "subtab-button"} onClick={() => onSkinCategoryChange(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      <section className="content-grid">
        <div className="result-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-label">{category.label}</span>
              <h3>{selectedSkin ? selectedSkin.name : "等待选择皮肤"}</h3>
            </div>
            {selectedSkin?.item_id && <span className="level-chip">道具ID {selectedSkin.item_id}</span>}
          </div>
          {selectedSkin ? <SkinDetail record={selectedSkin} clientRootPath={clientRootPath} onOpenSkin={onOpenSkin} /> : <EmptyState />}
        </div>

        <div className="list-panel">
          <div className="panel-heading compact">
            <div>
              <span className="panel-label">皮肤列表</span>
              <h3>{skinLookup ? `${filteredSkins.length} 条匹配` : "未加载"}</h3>
            </div>
          </div>
          <div className="level-list">
            {filteredSkins.map((record) => (
              <button type="button" key={record.skin_id} className={selectedSkin?.skin_id === record.skin_id ? "level-row selected" : "level-row"} onClick={() => onSelectSkin(record)}>
                <span>{record.item_id ?? "-"}</span>
                <strong>{record.name}</strong>
                <small>{record.skill_name}</small>
              </button>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
