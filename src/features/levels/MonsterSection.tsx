import { IndexedImage } from '../../components/IndexedImage';
import { MonsterInfo } from '../../types';

export function MonsterSection({ title, tone, monsters, clientRootPath }: { title: string; tone: "small" | "elite" | "boss"; monsters: MonsterInfo[]; clientRootPath: string }) {
  return (
    <section className={`monster-section ${tone}`}>
      <div className="monster-section-title">
        <span>{title}</span>
        <strong>{monsters.length ? `${monsters.length} 种` : "无"}</strong>
      </div>
      {monsters.length ? (
        <div className="monster-list">
          {monsters.map((monster) => (
            <article className="monster-item" key={`${tone}-${monster.monster_id}`}>
              <div className="monster-card-main">
                {monster.frame_resource && <IndexedImage className="monster-image" clientRootPath={clientRootPath} name={monster.frame_resource} kind="monster" alt={monster.name} />}
                <div className="monster-card-copy">
                  <div className="monster-title">
                    <div>
                      <strong>{monster.name}</strong>
                      <span>ID {monster.monster_id}{monster.model_id !== null ? ` · 模型ID ${monster.model_id}` : ""}</span>
                    </div>
                    <em>总数 {monster.total_count}</em>
                  </div>
                  {monster.frame_resource && <span className="monster-resource">{monster.frame_resource}</span>}
                  <p>{monster.description || "无描述"}</p>
                  <div className="wave-line">
                    {monster.waves.slice(0, 12).map((wave, index) => (
                      <span key={`${monster.monster_id}-${index}`}>W{wave.wave ?? "?"}:{wave.count ?? "-"}</span>
                    ))}
                    {monster.waves.length > 12 && <span>更多 {monster.waves.length - 12}</span>}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="none-text">这一关没有配置{title}。</p>
      )}
    </section>
  );
}
