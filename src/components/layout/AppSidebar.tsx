import { ArrowClockwise, CheckCircle, Database, FileMagnifyingGlass, FolderOpen, Rows, WarningCircle } from '@phosphor-icons/react';
import { REQUIRED_FILES } from '../../config/requiredFiles';
import { AppTab, LoadState, MatchedFile } from '../../types';

type AppSidebarProps = {
  activeTab: AppTab;
  clientPathInput: string;
  loadState: LoadState;
  matchedFiles: MatchedFile[];
  pathInput: string;
  rootName: string;
  onBindPath: () => void;
  onBrowseClientPath: () => void;
  onBrowseDataPath: () => void;
  onClientPathInputChange: (value: string) => void;
  onPathInputChange: (value: string) => void;
  onRefreshData: () => void;
  onTabChange: (tab: AppTab) => void;
};

const tabs: Array<{ tab: AppTab; label: string; icon: 'rows' | 'file' }> = [
  { tab: 'levels', label: '关卡信息', icon: 'rows' },
  { tab: 'gems', label: '宝石信息', icon: 'file' },
  { tab: 'skins', label: '皮肤信息', icon: 'file' },
  { tab: 'entries', label: '局内词条', icon: 'file' },
];

export function AppSidebar({
  activeTab,
  clientPathInput,
  loadState,
  matchedFiles,
  pathInput,
  rootName,
  onBindPath,
  onBrowseClientPath,
  onBrowseDataPath,
  onClientPathInputChange,
  onPathInputChange,
  onRefreshData,
  onTabChange,
}: AppSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">
          <Database size={20} weight="duotone" />
        </div>
        <div>
          <h1>配置检索台</h1>
          <p>T5 表格本地索引</p>
        </div>
      </div>

      <nav className="tab-list" aria-label="功能页签">
        {tabs.map(({ tab, label, icon }) => (
          <button className={activeTab === tab ? 'tab-button active' : 'tab-button'} type="button" key={tab} onClick={() => onTabChange(tab)}>
            {icon === 'rows' ? <Rows size={17} /> : <FileMagnifyingGlass size={17} />}
            {label}
          </button>
        ))}
      </nav>

      <div className="binding-panel">
        <div>
          <span className="panel-label">数据源</span>
          <strong>{rootName || '未绑定目录'}</strong>
        </div>
        <label className="path-input">
          <span>文件夹路径</span>
          <div className="path-field">
            <input value={pathInput} onChange={(event) => onPathInputChange(event.target.value)} placeholder="例如 C:\\project\\T5game_data" />
            <button type="button" aria-label="浏览数据路径" title="浏览数据路径" onClick={onBrowseDataPath}>
              <FolderOpen size={16} />
            </button>
          </div>
        </label>
        <label className="path-input">
          <span>客户端资源根路径</span>
          <div className="path-field">
            <input value={clientPathInput} onChange={(event) => onClientPathInputChange(event.target.value)} placeholder="例如 C:\\project\\T5game_client" />
            <button type="button" aria-label="浏览客户端资源路径" title="浏览客户端资源路径" onClick={onBrowseClientPath}>
              <FolderOpen size={16} />
            </button>
          </div>
        </label>
        <button className="primary-action" type="button" onClick={onBindPath}>
          {loadState.status === 'loading' ? <ArrowClockwise size={18} className="spin" /> : <FolderOpen size={18} />}
          绑定路径
        </button>
        <button className="secondary-action refresh-action" type="button" onClick={onRefreshData} disabled={loadState.status === 'loading'}>
          <ArrowClockwise size={17} className={loadState.status === 'loading' ? 'spin' : ''} />
          刷新数据
        </button>
      </div>

      <div className={`status-box ${loadState.status}`}>
        {loadState.status === 'ready' ? <CheckCircle size={18} /> : loadState.status === 'error' ? <WarningCircle size={18} /> : <FileMagnifyingGlass size={18} />}
        <span>{loadState.message}</span>
      </div>

      <div className="file-checklist">
        {REQUIRED_FILES.map((required) => {
          const matched = matchedFiles.find((file) => file.key === required.key);
          return (
            <div className="file-row" key={required.key}>
              <span className={matched ? 'file-dot ok' : 'file-dot'} />
              <div>
                <strong>{required.label}</strong>
                <p>{matched?.relativePath ?? required.fileName}</p>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
