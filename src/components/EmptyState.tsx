import { FileMagnifyingGlass } from '@phosphor-icons/react';

export function EmptyState() {
  return (
    <div className="empty-state">
      <FileMagnifyingGlass size={42} weight="duotone" />
      <h3>先绑定数据目录</h3>
      <p>选择包含 xls 文件夹的根目录，系统会自动找到关卡、刷怪、怪物和文本配置表。</p>
    </div>
  );
}
