import { LevelRecord } from '../../types';
import { MonsterSection } from './MonsterSection';

export function LevelDetail({ record, clientRootPath }: { record: LevelRecord; clientRootPath: string }) {
  return (
    <div className="detail-stack">
      <div className="level-overview">
        <div>
          <span>关卡ID</span>
          <strong>{record.level_id}</strong>
        </div>
        <div>
          <span>关卡名称</span>
          <strong>{record.level_name}</strong>
        </div>
        <div>
          <span>怪物种类</span>
          <strong>{record.monsters.small.length + record.monsters.elite.length + record.monsters.boss.length}</strong>
        </div>
      </div>

      <MonsterSection title="小怪" tone="small" monsters={record.monsters.small} clientRootPath={clientRootPath} />
      <MonsterSection title="精英怪" tone="elite" monsters={record.monsters.elite} clientRootPath={clientRootPath} />
      <MonsterSection title="首领" tone="boss" monsters={record.monsters.boss} clientRootPath={clientRootPath} />
    </div>
  );
}
