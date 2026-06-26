import { skinTotal } from '../../features/skins/selectors';
import { AppTab, EntryLookupData, GemLookup, LookupData, SkinCategoryKey, SkinLookupData } from '../../types';
import { tabHeading, tabLabel } from '../../utils/tabs';

type WorkspaceHeaderProps = {
  activeTab: AppTab;
  entryLookup: EntryLookupData | null;
  gemLookup: GemLookup | null;
  lookupData: LookupData | null;
  skinCategory: SkinCategoryKey;
  skinLookup: SkinLookupData | null;
};

export function WorkspaceHeader({ activeTab, entryLookup, gemLookup, lookupData, skinCategory, skinLookup }: WorkspaceHeaderProps) {
  return (
    <header className="topbar">
      <div>
        <p className="kicker">页签 · {tabLabel(activeTab)}</p>
        <h2>{tabHeading(activeTab)}</h2>
      </div>
      <div className="metric-strip">
        {activeTab === 'levels' ? (
          <>
            <div>
              <span>关卡索引</span>
              <strong>{lookupData ? Object.keys(lookupData.byStage).length : 0}</strong>
            </div>
            <div>
              <span>重复编号</span>
              <strong>{lookupData ? Object.keys(lookupData.duplicateStages).length : 0}</strong>
            </div>
          </>
        ) : activeTab === 'gems' ? (
          <>
            <div>
              <span>宝石索引</span>
              <strong>{gemLookup ? gemLookup.records.length : 0}</strong>
            </div>
            <div>
              <span>部位池</span>
              <strong>{gemLookup ? gemLookup.parts.length : 0}</strong>
            </div>
          </>
        ) : activeTab === 'skins' ? (
          <>
            <div>
              <span>皮肤索引</span>
              <strong>{skinTotal(skinLookup)}</strong>
            </div>
            <div>
              <span>当前分类</span>
              <strong>{skinLookup ? skinLookup[skinCategory].length : 0}</strong>
            </div>
          </>
        ) : (
          <>
            <div>
              <span>词条索引</span>
              <strong>{entryLookup ? entryLookup.records.length : 0}</strong>
            </div>
            <div>
              <span>词条组</span>
              <strong>2001</strong>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
