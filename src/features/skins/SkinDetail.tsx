import { IndexedImage } from '../../components/IndexedImage';
import { SkinRecord, SkinReference } from '../../types';

export function SkinDetail({ record, clientRootPath, onOpenSkin }: { record: SkinRecord; clientRootPath: string; onOpenSkin: (reference: SkinReference) => void }) {
  const imageAssets = record.image_assets ?? [];
  return (
    <div className="detail-stack">
      <div className="level-overview">
        <div>
          <span>道具ID</span>
          <strong>{record.item_id ?? "-"}</strong>
        </div>
        <div>
          <span>对应技能</span>
          <strong>{record.skill_name || "-"}</strong>
        </div>
        <div>
          <span>等级数量</span>
          <strong>{record.levels.length}</strong>
        </div>
      </div>
      {imageAssets.length > 0 && (
        <section className="monster-section">
          <div className="monster-section-title">
            <span>皮肤图片</span>
            <strong>{imageAssets.length} 张</strong>
          </div>
          <div className="skin-image-list">
            {imageAssets.map((image) => (
              <figure className="skin-image-card" key={image.name}>
                <IndexedImage clientRootPath={clientRootPath} name={image.name} kind="skin" alt={`${record.name}${image.label}`} />
                <figcaption>{image.label} · {image.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      {record.prerequisite_skins.length > 0 && (
        <section className="monster-section">
          <div className="monster-section-title">
            <span>前置皮肤</span>
            <strong>{record.prerequisite_skins.length} 个</strong>
          </div>
          <div className="skin-reference-list">
            {record.prerequisite_skins.map((skin) => (
              <button key={skin.skin_id} type="button" className="skin-reference-button" disabled={!skin.category} onClick={() => onOpenSkin(skin)}>
                {skin.name}
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="monster-section">
        <div className="monster-section-title">
          <span>技能效果</span>
          <strong>{record.levels.length} 级</strong>
        </div>
        <div className="skin-level-list">
          {record.levels.map((level) => (
            <article className="skin-level-item" key={`${record.skin_id}-${level.level}`}>
              <strong>Lv{level.level} {level.effect_name}</strong>
              <p>{level.effect}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
