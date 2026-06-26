import { GemRecord } from '../../types';
import { formatPercent } from '../../utils/format';

export function GemDetail({ record }: { record: GemRecord }) {
  return (
    <div className="gem-detail">
      <div className="gem-detail-card">
        <span>道具ID</span>
        <strong>{record.item_id}</strong>
      </div>
      <div className="gem-detail-card">
        <span>宝石类型</span>
        <strong>{record.gem_type}</strong>
      </div>
      <div className="gem-tags">
        <span>{record.part}</span>
        <span>{record.quality}</span>
        <span>{record.season}</span>
      </div>
      <section className="gem-effect-card">
        <span>效果</span>
        <p>{record.effect}</p>
      </section>
      <div className="gem-stat-grid">
        <div>
          <span>{record.refine_weight_source}</span>
          <strong>{record.refine_weight}</strong>
        </div>
        <div>
          <span>池总权重</span>
          <strong>{record.refine_pool_total}</strong>
        </div>
        <div>
          <span>洗练概率</span>
          <strong>{formatPercent(record.refine_probability)}</strong>
        </div>
      </div>
      <section className="gem-raw-card">
        <span>属性</span>
        <p>
          属性ID {record.attribute_id ?? "-"} · 类型 {record.attribute_type ?? "-"} · 数值 {record.attribute_value ?? "-"}
        </p>
      </section>
    </div>
  );
}
