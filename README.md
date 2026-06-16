<div align="center">
  <img src="docs/xjson-logo-256.png" width="128" height="128" alt="XJSON logo" />

  # XJSON

  **Mac + Windows 双平台 JSON 工具**，基于 Tauri 2.x 构建。三个核心模块：可视化编辑器、String→JSON 解码器、JSON Diff。
</div>

---

## 功能特性

### 1. JSON 编辑器
- 🌳 **树视图** + 原始编辑器双栏布局，任一侧可折叠
- 🎨 类型标记（`{} [] " # T/F ∅`），节点 path 复制
- ✏️ 语法高亮、错误标记、实时校验
- 🔍 按 key / value 搜索过滤
- 📁 多标签页、拖拽排序、文件关联（`.json` `.jsonc` `.json5` `.cfg` `.conf` `.lock`）
- 💾 格式化 / 压缩 / 导入导出

### 2. String → JSON 解码器
- 🧅 **多层转义"剥洋葱"**：自动检测并逐层解码
- 🔓 支持 JSON unescape、URL decode、Base64、Unicode `\uXXXX`
- 📊 可视化流水线，每一步独立展示
- ⚡ 一键送入编辑器继续操作

### 3. JSON Diff
- 🔀 **结构化 Diff**（忽略 key 顺序，按 JSON path）+ 文本 Diff
- 🎨 彩色渲染：绿=新增、红=删除、黄=变更
- 📋 差异摘要面板，点击路径跳转
- 📈 统计：N 处新增 / N 处删除 / N 处变更

### 通用 UX
- 🌗 **双主题**：Dark（macOS 原生）+ Editorial（浅色阅读）
- 🪟 macOS 风格交通灯、自定义 Tab Bar、icon rail 导航
- 📋 剪贴板监听（可选），检测到 JSON 时角标提示
- 🕒 最近使用片段缓存（限 20 条）
- 🔒 **数据不离本机**，无网络依赖

---

## 技术栈

| 层 | 技术 |
|---|---|
| 壳 | Tauri 2.x |
| UI | React 18 + TypeScript 5 |
| 样式 | Tailwind CSS + shadcn/ui |
| 状态 | Zustand 4 |
| 编辑器 | Monaco Editor |
| Diff | jsondiffpatch + diff |
| 图标 | Lucide React |
| 构建 | Vite 5 |

**Rust 端**：Base64 / Unicode 解码流水线，文件 I/O（`base64` `urlencoding` `encoding_rs`）

---

## 开发指南

### 环境要求
- Node.js ≥ 18
- Rust ≥ 1.70
- Tauri CLI: `npm install -g @tauri-apps/cli@next`

### 克隆 & 安装
```bash
git clone <repo>
cd XJSON
npm install --include=dev  # 重要：环境默认 production
```

### 开发模式
```bash
npm run tauri:dev
```
热重载前端 + Rust 后端；访问 `http://localhost:1420`（Vite dev server）

### 构建
```bash
# 类型检查
npx tsc --noEmit

# 前端构建
npm run build

# Rust 检查
cd src-tauri && cargo check

# Tauri 打包（生成 .dmg / .msi）
npm run tauri:build
```

产物在 `src-tauri/target/release/bundle/`

### 项目结构
```
src/
  App.tsx                  # 根组件，模块路由
  components/
    chrome/                # Titlebar, Sidebar, TabBar, EmptyState
    editor/                # EditorModule, TreeView, RawEditor, Toolbar
    decoder/               # DecoderModule, InputBox, PipelineView
    diff/                  # DiffModule, DiffColumns, DiffSummary
    ui/                    # shadcn 基座（button, dialog, tooltip, context-menu）
  stores/                  # Zustand：app, theme, editor, decoder, diff
  lib/                     # json, monaco, files, decode-detect, utils
  types/                   # TypeScript 类型
  styles/                  # tokens.css（两套主题 CSS 变量）+ globals.css

src-tauri/src/
  commands/
    decode.rs              # 多层解码流水线（最多 8 层）
    file.rs                # read_json_file / write_json_file / reveal_in_finder
```

---

## 设计系统

完整设计 token 见 [`PLAN.md`](./PLAN.md) 附录。

**Dark 主题关键色**：
- 窗口 `#1C1C1E` · 边框 `#3A3A3C` · 强调 `#0A84FF`
- 成功 `#30D158` · 危险 `#FF453A` · 警告 `#FFD60A`
- 语法：key `#79C0FF` · string `#7EE787` · number `#FFA657`

**Editorial 主题**：纸面 `#FCFAF7` · 墨水 `#1C1814` · 强调 `#C2410C`（burnt orange）

字体：Inter（UI）/ JetBrains Mono（Dark 代码）/ IBM Plex Mono（ED 代码）/ Newsreader（ED 标题）

---

## 跨平台支持

- macOS：Overlay 标题栏（交通灯）+ 沉浸式 UI
- Windows：标准标题栏
- 快捷键：`CmdOrCtrl` 自动适配
- 文件拖拽：Tauri 2 `drag-drop` 事件，Mac/Win 行为一致
- 打包：`tauri build` → `.dmg`（Mac）/ `.msi` + `.exe`（Win）

---

## Roadmap

- [x] P0: 脚手架（Tauri + Vite + React + TS）
- [x] P1: 应用外框（Titlebar / Sidebar / TabBar）
- [x] P2: JSON 编辑器（Monaco + TreeView + 文件读写）
- [x] P3: 解码器（Rust pipeline + UI）
- [x] P4: Diff（jsondiffpatch + 双模式）
- [ ] P5: 剪贴板监听、最近片段、文件关联注册
- [ ] 打包脚本与签名配置
- [ ] Windows 测试与适配

---

## License

MIT

---

**文档**：[`PLAN.md`](./PLAN.md) 完整实施计划 · [`docs/mac-json.md`](./docs/mac-json.md) 产品规格
