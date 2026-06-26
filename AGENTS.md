# Project Structure Rules

## 分层边界

- `src/main.tsx` 只允许做 React 挂载和全局样式入口导入，不写业务逻辑、解析逻辑或组件实现。
- `src/App.tsx` 只做应用级状态编排、加载动作和页面模块调用；大段 JSX 必须放到 `src/components/layout/` 或对应 `src/features/<domain>/`。
- `src/services/` 放 I/O 边界：浏览器目录选择、文件扫描、工作簿读取、解析入口、后端 API 调用。
- `src/features/<domain>/` 放领域代码：解析构建、筛选选择器、工作区组件、详情组件和领域内小组件。
- `src/components/` 只放跨领域组件；不依赖具体 Excel 表结构。
- `src/utils/` 只放无副作用的小函数；不能读取文件、访问网络或操作 React 状态。
- `src/config/` 放静态配置和映射表；不要把配置散落进组件。
- `src/types/` 放共享类型。领域私有类型优先和领域文件放一起，只有跨模块复用时再提升到这里。

## 文件大小

- 新增或修改文件接近 200 行时先拆分；超过 300 行必须拆，除非是生成文件或外部资源。
- 不允许把新功能继续堆进 `main.tsx`、`App.tsx` 或单个全局 CSS 文件。
- 新增功能优先新增小文件并通过接口调用，不为了“省 import”合并不相关逻辑。

## 样式

- `src/styles/index.css` 只做 `@import` 聚合。
- 新样式按布局、领域或组件拆到独立 CSS 文件，保持 import 顺序稳定。
- 不把多个领域的大段样式追加到同一个 CSS 文件。

## 依赖方向

- UI 组件调用 `services/` 或 `features/` 暴露的函数，不直接写 `xlsx` 解析细节。
- `features/` 可以依赖 `types/`、`utils/`、`config/`；不要依赖 `App.tsx`。
- `services/` 可以调用领域构建函数；领域组件不要反向调用 services 做 I/O。
