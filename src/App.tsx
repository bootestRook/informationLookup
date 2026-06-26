import { REQUIRED_FILES } from './config/requiredFiles';
import { filterEntryRecords, filterGemRecords, filterLevelRecords, filterSkinRecords, selectEntryRecord, selectGemRecord, selectLevelRecord, selectSkinRecord } from './app/lookupFilters';
import { AppSidebar } from './components/layout/AppSidebar';
import { SearchBand } from './components/layout/SearchBand';
import { WorkspaceHeader } from './components/layout/WorkspaceHeader';
import { WorkspacePanel } from './components/layout/WorkspacePanel';
import { skinTotal } from './features/skins/selectors';
import { collectFilesFromDirectory } from './services/fileCollection';
import { parseEntryLookup, parseGemLookup, parseLookup, parseSkinLookup } from './services/lookupParsers';
import { pickFolder } from './services/pathPicker';
import { getInitialClientRootPath, getInitialRootPath, getStoredRootPath, saveClientRootPath, saveRootPath } from './services/storage';
import { AppTab, EntryLookupData, GemLookup, LoadState, LookupData, MatchedFile, SkinCategoryKey, SkinLookupData } from './types';
import { useEffect, useMemo, useRef, useState } from 'react';

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("levels");
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle", message: "绑定数据目录后自动解析关卡信息" });
  const [rootName, setRootName] = useState("");
  const [pathInput, setPathInput] = useState(getInitialRootPath);
  const [clientPathInput, setClientPathInput] = useState(getInitialClientRootPath);
  const [matchedFiles, setMatchedFiles] = useState<MatchedFile[]>([]);
  const [lookupData, setLookupData] = useState<LookupData | null>(null);
  const [gemLookup, setGemLookup] = useState<GemLookup | null>(null);
  const [skinLookup, setSkinLookup] = useState<SkinLookupData | null>(null);
  const [entryLookup, setEntryLookup] = useState<EntryLookupData | null>(null);
  const [query, setQuery] = useState("5");
  const [selectedStage, setSelectedStage] = useState("5");
  const [selectedGemId, setSelectedGemId] = useState<number | null>(null);
  const [skinCategory, setSkinCategory] = useState<SkinCategoryKey>("person");
  const [selectedSkinId, setSelectedSkinId] = useState<number | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const didAutoLoad = useRef(false);

  const currentRecord = useMemo(() => selectLevelRecord(lookupData, selectedStage, query), [lookupData, query, selectedStage]);
  const filteredRecords = useMemo(() => filterLevelRecords(lookupData, query), [lookupData, query]);
  const filteredGems = useMemo(() => filterGemRecords(gemLookup, query), [gemLookup, query]);
  const selectedGem = useMemo(() => selectGemRecord(gemLookup, selectedGemId, filteredGems), [filteredGems, gemLookup, selectedGemId]);
  const filteredSkins = useMemo(() => filterSkinRecords(skinLookup, skinCategory, query), [query, skinCategory, skinLookup]);
  const selectedSkin = useMemo(() => selectSkinRecord(skinLookup, skinCategory, selectedSkinId, filteredSkins), [filteredSkins, selectedSkinId, skinCategory, skinLookup]);
  const filteredEntries = useMemo(() => filterEntryRecords(entryLookup, query), [entryLookup, query]);
  const selectedEntry = useMemo(() => selectEntryRecord(entryLookup, selectedEntryId, filteredEntries), [entryLookup, filteredEntries, selectedEntryId]);

  useEffect(() => {
    async function loadSavedPath() {
      if (didAutoLoad.current) return;

      let savedPath = "";
      let savedClientPath = "";
      try {
        const response = await fetch("/api/level-info/settings");
        if (response.ok) {
          const payload = (await response.json()) as { rootPath?: string; clientRootPath?: string };
          savedPath = payload.rootPath?.trim() ?? "";
          savedClientPath = payload.clientRootPath?.trim() ?? "";
        }
      } catch {
        savedPath = "";
      }

      savedPath = savedPath || getStoredRootPath() || "";
      savedClientPath = savedClientPath || getInitialClientRootPath();
      if (!savedPath || didAutoLoad.current) return;
      didAutoLoad.current = true;
      setPathInput(savedPath);
      setClientPathInput(savedClientPath);
      await scanPath(savedPath, "正在读取上次绑定路径并刷新索引", savedClientPath);
    }

    void loadSavedPath();
  }, []);

  async function scanPath(rootPath: string, loadingMessage = "正在扫描路径下的 xls 表格", clientRootPath = clientPathInput) {
    const trimmedPath = rootPath.trim();
    if (!trimmedPath) {
      setLoadState({ status: "error", message: "请先填写文件夹路径" });
      return;
    }

    try {
      setLoadState({ status: "loading", message: loadingMessage });
      const response = await fetch("/api/level-info/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rootPath: trimmedPath, clientRootPath: clientRootPath.trim() }),
      });
      const payload = (await response.json()) as { rootName?: string; files?: MatchedFile[]; lookup?: LookupData; gemLookup?: GemLookup; skinLookup?: SkinLookupData; entryLookup?: EntryLookupData; error?: string };
      if (!response.ok || payload.error || !payload.lookup || !payload.gemLookup || !payload.skinLookup || !payload.entryLookup || !payload.files) {
        throw new Error(payload.error ?? "扫描失败");
      }
      saveRootPath(trimmedPath);
      saveClientRootPath(clientRootPath.trim());
      setPathInput(trimmedPath);
      setRootName(payload.rootName || trimmedPath);
      setMatchedFiles(payload.files);
      setLookupData(payload.lookup);
      setGemLookup(payload.gemLookup);
      setSkinLookup(payload.skinLookup);
      setEntryLookup(payload.entryLookup);
      setSelectedStage("5");
      setSelectedGemId(payload.gemLookup.records[0]?.item_id ?? null);
      setSelectedSkinId(payload.skinLookup.person[0]?.skin_id ?? null);
      setSelectedEntryId(payload.entryLookup.records[0]?.entry_id ?? null);
      setQuery("");
      setLoadState({ status: "ready", message: `已生成 ${Object.keys(payload.lookup.byStage).length} 个关卡索引，${payload.gemLookup.records.length} 条宝石索引，${skinTotal(payload.skinLookup)} 条皮肤索引，${payload.entryLookup.records.length} 条局内词条` });
    } catch (error) {
      setLookupData(null);
      setGemLookup(null);
      setSkinLookup(null);
      setEntryLookup(null);
      setLoadState({ status: "error", message: error instanceof Error ? error.message : "扫描失败" });
    }
  }

  async function bindPath() {
    await scanPath(pathInput);
  }

  async function refreshData() {
    await scanPath(pathInput, "正在刷新已绑定目录下的 xls 表格");
  }

  async function browseDataPath() {
    try {
      const selected = await pickFolder(pathInput);
      if (selected) setPathInput(selected);
    } catch (error) {
      setLoadState({ status: "error", message: error instanceof Error ? error.message : "选择目录失败" });
    }
  }

  async function browseClientPath() {
    try {
      const selected = await pickFolder(clientPathInput);
      if (selected) setClientPathInput(selected);
    } catch (error) {
      setLoadState({ status: "error", message: error instanceof Error ? error.message : "选择目录失败" });
    }
  }

  async function bindFolder() {
    const picker = (window as unknown as { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
    if (!picker) {
      setLoadState({ status: "error", message: "当前浏览器不支持目录绑定，请使用新版 Chrome 或 Edge 打开本页面" });
      return;
    }

    try {
      setLoadState({ status: "loading", message: "正在扫描目录下的 xls 表格" });
      const rootHandle = await picker();
      setRootName(rootHandle.name);
      const files = await collectFilesFromDirectory(rootHandle);
      setMatchedFiles(files);

      const missing = REQUIRED_FILES.filter((required) => !files.some((file) => file.key === required.key));
      if (missing.length) {
        setLookupData(null);
        setGemLookup(null);
        setSkinLookup(null);
        setEntryLookup(null);
        setLoadState({ status: "error", message: `缺少表格：${missing.map((file) => file.fileName).join("、")}` });
        return;
      }

      setLoadState({ status: "loading", message: "已找到表格，正在解析文本和怪物关联" });
      const [lookup, gems, skins, entries] = await Promise.all([parseLookup(files), parseGemLookup(files), parseSkinLookup(files), parseEntryLookup(files)]);
      setLookupData(lookup);
      setGemLookup(gems);
      setSkinLookup(skins);
      setEntryLookup(entries);
      setSelectedStage("5");
      setSelectedGemId(gems.records[0]?.item_id ?? null);
      setSelectedSkinId(skins.person[0]?.skin_id ?? null);
      setSelectedEntryId(entries.records[0]?.entry_id ?? null);
      saveClientRootPath(clientPathInput.trim());
      setQuery("");
      setLoadState({ status: "ready", message: `已生成 ${Object.keys(lookup.byStage).length} 个关卡索引，${gems.records.length} 条宝石索引，${skinTotal(skins)} 条皮肤索引，${entries.records.length} 条局内词条` });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setLoadState({ status: "idle", message: "已取消目录绑定" });
        return;
      }
      setLoadState({ status: "error", message: error instanceof Error ? error.message : "解析失败" });
    }
  }

  return (
    <main className="app-shell">
      <AppSidebar
        activeTab={activeTab}
        clientPathInput={clientPathInput}
        loadState={loadState}
        matchedFiles={matchedFiles}
        pathInput={pathInput}
        rootName={rootName}
        onBindPath={bindPath}
        onBrowseClientPath={browseClientPath}
        onBrowseDataPath={browseDataPath}
        onClientPathInputChange={setClientPathInput}
        onPathInputChange={setPathInput}
        onRefreshData={refreshData}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setQuery("");
        }}
      />

      <section className="workspace">
        <WorkspaceHeader activeTab={activeTab} entryLookup={entryLookup} gemLookup={gemLookup} lookupData={lookupData} skinCategory={skinCategory} skinLookup={skinLookup} />
        <SearchBand activeTab={activeTab} query={query} onQueryChange={setQuery} onStageChange={setSelectedStage} />
        <WorkspacePanel
          activeTab={activeTab}
          clientRootPath={clientPathInput}
          currentRecord={currentRecord}
          entryLookup={entryLookup}
          filteredEntries={filteredEntries}
          filteredGems={filteredGems}
          filteredRecords={filteredRecords}
          filteredSkins={filteredSkins}
          gemLookup={gemLookup}
          selectedEntry={selectedEntry}
          selectedGem={selectedGem}
          selectedSkin={selectedSkin}
          selectedStage={selectedStage}
          skinCategory={skinCategory}
          skinLookup={skinLookup}
          onOpenEntry={(entryId) => {
            setSelectedEntryId(entryId);
            setQuery("");
          }}
          onOpenSkin={(skinId, category) => {
            if (!category) return;
            setSkinCategory(category);
            setSelectedSkinId(skinId);
            setQuery("");
          }}
          onSelectEntry={(record) => setSelectedEntryId(record.entry_id)}
          onSelectGem={(record) => setSelectedGemId(record.item_id)}
          onSelectSkin={(record) => setSelectedSkinId(record.skin_id)}
          onSelectStage={setSelectedStage}
          onSkinCategoryChange={(category) => {
            setSkinCategory(category);
            setSelectedSkinId(skinLookup?.[category][0]?.skin_id ?? null);
          }}
        />
      </section>
    </main>
  );
}
