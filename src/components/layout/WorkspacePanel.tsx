import { EntryWorkspace } from '../../features/entries/EntryWorkspace';
import { GemWorkspace } from '../../features/gems/GemWorkspace';
import { LevelWorkspace } from '../../features/levels/LevelWorkspace';
import { SkinWorkspace } from '../../features/skins/SkinWorkspace';
import { AppTab, EntryLookupData, EntryRecord, GemLookup, GemRecord, LevelRecord, SkinCategoryKey, SkinLookupData, SkinRecord } from '../../types';

type WorkspacePanelProps = {
  activeTab: AppTab;
  clientRootPath: string;
  currentRecord: LevelRecord | null;
  entryLookup: EntryLookupData | null;
  filteredEntries: EntryRecord[];
  filteredGems: GemRecord[];
  filteredRecords: LevelRecord[];
  filteredSkins: SkinRecord[];
  gemLookup: GemLookup | null;
  selectedEntry: EntryRecord | null;
  selectedGem: GemRecord | null;
  selectedSkin: SkinRecord | null;
  selectedStage: string;
  skinCategory: SkinCategoryKey;
  skinLookup: SkinLookupData | null;
  onOpenEntry: (entryId: number) => void;
  onOpenSkin: (skinId: number, category: SkinCategoryKey | null) => void;
  onSelectEntry: (record: EntryRecord) => void;
  onSelectGem: (record: GemRecord) => void;
  onSelectSkin: (record: SkinRecord) => void;
  onSelectStage: (stage: string) => void;
  onSkinCategoryChange: (category: SkinCategoryKey) => void;
};

export function WorkspacePanel({
  activeTab,
  clientRootPath,
  currentRecord,
  entryLookup,
  filteredEntries,
  filteredGems,
  filteredRecords,
  filteredSkins,
  gemLookup,
  selectedEntry,
  selectedGem,
  selectedSkin,
  selectedStage,
  skinCategory,
  skinLookup,
  onOpenEntry,
  onOpenSkin,
  onSelectEntry,
  onSelectGem,
  onSelectSkin,
  onSelectStage,
  onSkinCategoryChange,
}: WorkspacePanelProps) {
  if (activeTab === 'levels') {
    return <LevelWorkspace currentRecord={currentRecord} filteredRecords={filteredRecords} selectedStage={selectedStage} clientRootPath={clientRootPath} onSelectStage={onSelectStage} />;
  }
  if (activeTab === 'gems') {
    return <GemWorkspace gemLookup={gemLookup} filteredGems={filteredGems} selectedGem={selectedGem} onSelectGem={onSelectGem} />;
  }
  if (activeTab === 'skins') {
    return (
      <SkinWorkspace
        skinCategory={skinCategory}
        onSkinCategoryChange={onSkinCategoryChange}
        skinLookup={skinLookup}
        filteredSkins={filteredSkins}
        selectedSkin={selectedSkin}
        clientRootPath={clientRootPath}
        onSelectSkin={onSelectSkin}
        onOpenSkin={(reference) => onOpenSkin(reference.skin_id, reference.category)}
      />
    );
  }
  return <EntryWorkspace entryLookup={entryLookup} filteredEntries={filteredEntries} selectedEntry={selectedEntry} onSelectEntry={onSelectEntry} onOpenEntry={onOpenEntry} />;
}
