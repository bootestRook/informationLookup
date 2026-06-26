import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { AppTab } from '../../types';
import { searchPlaceholder } from '../../utils/tabs';

const presets: Record<AppTab, Array<number | string>> = {
  levels: [5, 15, 30, 100, 278],
  gems: ['头盔', '裤子', '至尊', '赛季3'],
  skins: ['极影特工', '山海之约', '龙城飞将'],
  entries: ['分裂子弹四射', '超爆弹', '电磁裂变'],
};

type SearchBandProps = {
  activeTab: AppTab;
  query: string;
  onQueryChange: (value: string) => void;
  onStageChange: (value: string) => void;
};

export function SearchBand({ activeTab, query, onQueryChange, onStageChange }: SearchBandProps) {
  function applyQuery(value: string) {
    onQueryChange(value);
    if (activeTab === 'levels' && value.trim()) onStageChange(value);
  }

  return (
    <section className="search-band">
      <div className="search-box">
        <MagnifyingGlass size={20} />
        <input value={query} onChange={(event) => applyQuery(event.target.value)} placeholder={searchPlaceholder(activeTab)} />
        <button className="clear-search" type="button" aria-label="清除搜索" title="清除搜索" onClick={() => onQueryChange('')} disabled={!query}>
          <X size={13} weight="bold" />
        </button>
      </div>
      <div className="quick-jumps">
        {presets[activeTab].map((preset) => (
          <button type="button" key={preset} onClick={() => applyQuery(String(preset))}>
            {activeTab === 'levels' ? `第${preset}关` : preset}
          </button>
        ))}
      </div>
    </section>
  );
}
