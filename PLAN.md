# XJSON 实施计划

> 本文档根据 [`docs/mac-json.md`](./docs/mac-json.md)（产品规格）与 [`docs/design.pen`](./docs/design.pen)（Penpot UI 稿，已提取完整设计系统）产出，是 XJSON 的**完整实施蓝图**。

---

## 0. 范围确认（已拍板）

| 决策项 | 选择 |
|---|---|
| **主题** | **Dark（默认）+ Editorial（ED 浅色阅读）** 两套；Blueprint（bp）保留 token，本次不实现 |
| **UI 组件** | **shadcn/ui 基座 + 大量自定义**（Tab Bar / Titlebar / Tree / Toolbar 等定制 macOS 外观走纯 Tailwind） |
| **Raw 编辑器** | **Monaco**（`@monaco-editor/react`，遵循 spec） |

**功能范围**：三大模块（编辑器 / 解码器 / Diff）+ Tab 栏 + 文件关联 + 剪贴板监听 + 最近片段，全部按"完整 MVP"规划，执行时按阶段切分。

---

## 1. 技术栈与版本基线

| 层 | 选型 | 备注 |
|---|---|---|
| 壳 | **Tauri 2.x** | `npm create tauri-app@latest`，模板选 React + TS + Vite |
| UI | **React 18 + TypeScript 5** | strict mode |
| 样式 | **Tailwind CSS v3** + **shadcn/ui**（New York 风格） | CSS 变量驱动主题切换 |
| 状态 | **Zustand 4** + `zustand/middleware`（persist） | 多套 store |
| 构建 | **Vite 5** | Tauri 自带 |
| 编辑器 | **@monaco-editor/react 4** + `monaco-editor` | JSON language、错误标记 |
| Diff | **jsondiffpatch 0.6**（结构化）+ **diff 5**（文本） | |
| 图标 | **lucide-react** | 设计稿用的是 Lucide 集 |
| 树虚拟化 | **react-arborist** | 大 JSON 的可折叠树 |
| 拖拽排序 | **@dnd-kit/core** + **@dnd-kit/sortable** | Tab 排序 |

**Rust crate**（`src-tauri/Cargo.toml`）：
- `base64`、`urlencoding`、`encoding_rs`（Unicode/CJK 处理）
- `serde`、`serde_json`
- `tauri = "2"` + `tauri-build = "2"`
- 插件：`tauri-plugin-fs`、`tauri-plugin-dialog`、`tauri-plugin-clipboard-manager`、`tauri-plugin-opener`

---

## 2. 设计系统（从 design.pen 提取）

> 完整 token 清单见 [附录 A](#附录-a设计-token-清单)。此处只列落地策略。

### 2.1 主题架构

**两套主题 = 两套 CSS 变量集合**，挂在不同 `data-theme` 属性的根元素上。Tailwind 通过自定义颜色引用 `var(--xxx)`，shadcn 组件走标准 CSS 变量映射。

```
:root, [data-theme="dark"]       { --bg-window:#1C1C1E; --text-primary:#F5F5F7; … }
[data-theme="editorial"]         { --bg-window:#FCFAF7; --text-primary:#1C1814; … }
```

- **Dark**（默认）：macOS 原生外观，交通灯、icon rail 72px、JetBrains Mono
- **Editorial**（ED）：浅色阅读模式，Newsreader 衬线标题、IBM Plex Mono 数据、burnt-orange accent `#C2410C`、Outline Panel 452px
- 主题切换走 `themeStore`（Zustand + localStorage 持久化），App 根节点动态设 `data-theme`

### 2.2 设计 token 分层

```
design tokens (design.pen)
    ↓ 落到
src/styles/tokens.css        ← CSS 变量定义（两套主题）
    ↓ 映射到
tailwind.config.ts           ← colors 引用 var(--xxx)
    ↓ 暴露给
shadcn components + 自定义组件
```

### 2.3 关键尺寸

| Frame | 值 |
|---|---|
| 窗口（设计稿） | 1320 × 860 |
| Titlebar 高 | 44 |
| Sidebar（icon rail，Dark） | 72 宽 |
| Sidebar（text，Decoder） | 200 宽 |
| Toolbar 高 | 52 |
| Tab Bar 高 | 40，Tab 高 38 |
| Outline Panel（ED） | 452 宽 |
| 圆角 | sm=6 / md=10 / lg=14 / pill=9999 |
| 间距基准 | 4 的倍数；常用 4/8/12/16 |

### 2.4 字体

- UI：**Inter**（400/500/600）
- Dark 代码：**JetBrains Mono**
- Editorial 代码：**IBM Plex Mono**
- Editorial 标题：**Newsreader**（衬线）
- 字体通过 `index.html` 的 `@font-face` 本地打包（离线可用，符合"无网络依赖"）

---

## 3. 项目结构（落地版）

在 spec 给出结构基础上，补充 components 与 lib 的细分：

```
XJSON/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json          # 窗口配置、fileAssociations、hiddenTitle
│   ├── build.rs
│   ├── capabilities/
│   │   └── default.json         # Tauri 2 权限：fs、clipboard、dialog、drag-drop
│   ├── icons/
│   └── src/
│       ├── main.rs              # 注册 commands、plugin
│       ├── lib.rs
│       └── commands/
│           ├── mod.rs
│           ├── decode.rs        # decode_string → Vec<DecodeStep>
│           └── file.rs          # read_json_file / write_json_file
└── src/
    ├── main.tsx
    ├── App.tsx                  # 顶层布局：Titlebar + Body(模块路由)
    ├── styles/
    │   ├── globals.css          # Tailwind 指令 + base 样式
    │   └── tokens.css           # 两套主题 CSS 变量
    ├── lib/
    │   ├── utils.ts             # cn() 等工具
    │   ├── json.ts              # JSON 校验/格式化/path 生成
    │   ├── decode-detect.ts     # 前端解码类型检测（调 Rust 之前预判）
    │   └── monaco.ts            # Monaco theme/language 注册
    ├── components/
    │   ├── ui/                  # shadcn 基座（button/dialog/dropdown-menu/tooltip/context-menu/tabs）
    │   ├── chrome/              # 应用外框（定制）
    │   │   ├── Titlebar.tsx     # 交通灯 + 窗口标题 + drag region
    │   │   ├── Sidebar.tsx      # icon rail（Editor/Decoder/Diff 三入口）
    │   │   ├── TabBar.tsx       # 定制 Tab Bar（含拖拽排序、dirty dot、右键菜单）
    │   │   └── EmptyState.tsx   # 无 Tab 时的引导页
    │   ├── editor/
    │   │   ├── EditorModule.tsx # 左树右编辑器 + 折叠
    │   │   ├── TreeView.tsx     # react-arborist 虚拟树
    │   │   ├── TreeNode.tsx     # 类型标记 + inline 编辑 + 右键菜单
    │   │   ├── RawEditor.tsx    # Monaco 包装
    │   │   ├── Toolbar.tsx      # Search/Import/Format/Minify/Copy
    │   │   └── SearchFilter.tsx
    │   ├── decoder/
    │   │   ├── DecoderModule.tsx
    │   │   ├── InputBox.tsx
    │   │   └── PipelineView.tsx # 逐层卡片（剥洋葱）
    │   └── diff/
    │       ├── DiffModule.tsx
    │       ├── DiffColumns.tsx  # ORIGINAL vs MODIFIED
    │       ├── DiffSummary.tsx  # 右侧差异列表（点击跳转）
    │       └── DiffModeToggle.tsx # Structural / Text
    ├── stores/
    │   ├── editorStore.ts       # tabs + activeTabId + content + dirty
    │   ├── decoderStore.ts      # input + steps + finalJson
    │   ├── diffStore.ts         # left/right/mode/summary
    │   ├── themeStore.ts        # dark | editorial
    │   └── appStore.ts          # 模块路由 + 剪贴板监听 + 最近片段
    └── types/
        └── index.ts             # Tab / DecodeStep / DiffItem 等共享类型
```

---

## 4. Rust 端设计

### 4.1 `commands/decode.rs`

```rust
#[derive(Serialize)]
pub enum DecodeKind { JsonUnescape, UrlDecode, Base64, Unicode }

#[derive(Serialize)]
pub struct DecodeStep {
    pub index: u32,
    pub kind: DecodeKind,
    pub input: String,
    pub output: String,
    pub success: bool,
    pub note: Option<String>,       // 失败原因或说明
}

#[tauri::command]
pub fn decode_string(input: String) -> Vec<DecodeStep> { ... }
```

**pipeline 算法**（循环直到无法继续解码或达到 JSON）：

1. trim 输入；若已是合法 JSON → 直接返回（0 步）。
2. 检测当前字符串形态：
   - 含 `\"` / `\\` 且首尾是引号 → **JSON unescape**
   - 含 `%XX` → **URL decode**
   - 全是 Base64 字符集且长度 %4==0 → **Base64 decode**（再尝试 UTF-8 解析）
   - 含 `\uXXXX` → **Unicode unescape**
3. 每解码一层 push 一个 `DecodeStep`，循环上限 **8 层**（防死循环）。
4. 任一步失败 → 记录 `note` 并停止。

Rust 端优势：`base64` / `encoding_rs` 处理 UTF-8 与 CJK 比 JS `atob` 可靠；避免大字符串在 JS 侧重复拷贝。

### 4.2 `commands/file.rs`

```rust
#[derive(Serialize)]
pub struct FileContent { pub content: String, pub file_name: String, pub parsed_ok: bool }

#[tauri::command]
pub async fn read_json_file(path: String) -> Result<FileContent, String> { ... }

#[tauri::command]
pub async fn write_json_file(path: String, content: String) -> Result<(), String> { ... }

#[tauri::command]
pub fn reveal_in_finder(path: String) -> Result<(), String> { ... }  // Mac/Win 适配
```

解析失败的文本文件也返回（`parsed_ok=false`，前端按纯文本展示，符合 spec）。

### 4.3 `main.rs`

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())     // reveal in finder
        .invoke_handler(tauri::generate_handler![
            commands::decode::decode_string,
            commands::file::read_json_file,
            commands::file::write_json_file,
            commands::file::reveal_in_finder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running XJSON");
}
```

### 4.4 `tauri.conf.json` 关键项

```jsonc
{
  "productName": "XJSON",
  "app": {
    "windows": [{
      "title": "XJSON",
      "width": 1320, "height": 860,
      "minWidth": 900, "minHeight": 600,
      "titleBarStyle": "Overlay",     // macOS 交通灯叠加在自定义 titlebar
      "hiddenTitle": true,
      "dragDropEnabled": true
    }],
    "fileAssociations": [
      { "ext": ["json", "jsonc", "json5"], "name": "JSON", "role": "Editor" },
      { "ext": ["cfg", "conf", "config"], "name": "Config", "role": "Editor" },
      { "ext": ["lock"], "name": "Lockfile", "role": "Editor" }
    ]
  }
}
```

`capabilities/default.json` 授予 `fs`（限定 scope）、`dialog`、`clipboard`、`opener` 权限。

---

## 5. 前端模块设计

### 5.1 状态管理（Zustand）

**`appStore`**
- `module: 'editor' | 'decoder' | 'diff'`（模块路由）
- `clipboardEnabled: boolean`、`clipboardBadge: boolean`
- `recents: RecentItem[]`（限 20，persist 到 localStorage）
- 切换模块时**各 store 状态独立保留**（天然满足，因为多套 store 独立）

**`editorStore`**（spec 指定的字段）
```ts
interface Tab { id: string; filePath?: string; fileName: string; content: string; isDirty: boolean; isNew: boolean; }
interface EditorState {
  tabs: Tab[];
  activeTabId: string | null;
  rawContent: string;          // 同步给 Monaco 的当前文本
  tree: JsonNode | null;       // 解析后的树
  parseError: { line: number; msg: string } | null;
  panelLayout: 'both' | 'tree' | 'raw';  // 折叠任一侧
  // 动作
  openFile(path): Promise<void>;
  newTabFromPaste(content: string): void;
  closeTab(id, force?): void;
  setActive(id): void;
  reorderTabs(fromId, toId): void;
  setContent(id, content): void;
  saveTab(id): Promise<void>;
}
```

**`decoderStore`**
```ts
interface DecoderState {
  input: string;
  steps: DecodeStep[];         // 来自 Rust
  finalJson: string;
  loading: boolean;
  runDecode(): Promise<void>;  // invoke('decode_string')
  sendToEditor(): void;        // 调 editorStore.newTabFromPaste(finalJson) + 切模块
}
```

**`diffStore`**
```ts
interface DiffState {
  left: string; right: string;
  mode: 'structural' | 'text';
  delta: Delta | null;
  summary: { added: DiffItem[]; removed: DiffItem[]; changed: DiffItem[] };
  compute(): void;             // jsondiffpatch / diff
}
```

### 5.2 模块一：JSON 编辑器

**布局**：`Split`（左 Tree + 右 Monaco），任意一侧可折叠为单栏；`panelLayout` 控制。

**TreeView**（react-arborist）
- 每节点：类型标记（`{} [] " # T/F ∅`）+ key + value
- inline 编辑：双击 value 进入 `<input>`，失焦提交，触发 `setContent` → 重新构建树 → `isDirty=true`
- 右键菜单（shadcn `context-menu`）：复制值 / 复制路径（生成 `$.users[0].name`）/ 添加兄弟 / 添加子 / 删除
- 折叠全部 / 展开全部：快捷键 `CmdOrCtrl+Shift+-` / `+`

**RawEditor**（Monaco）
- 注册自定义 theme（`xjson-dark` / `xjson-editorial`）映射 spec 的 syntax token
- 错误标记：监听 Monaco `onDidChangeMarkers`，错误行加红色波浪下划线，hover 显示具体错误
- Toolbar：Format（2 空格缩进）/ Minify；字符计数与层级深度显示在状态栏

**Toolbar**
- Import：`@tauri-apps/plugin-dialog` 的 `open({ multiple: true })`
- 粘贴自动解析：监听粘贴事件 → `newTabFromPaste`
- Copy 全部：格式化 or 压缩，写剪贴板
- Search：输入 → 过滤树节点（key/value 匹配高亮）

**路径生成** `lib/json.ts`：递归构建 `JsonNode` 时记录 path 片段，序列化为 JSONPath 字符串。

### 5.3 模块二：String → JSON 解码器

- InputBox（textarea，h≈120）：粘贴任意字符串
- 点 **Decode** → `invoke('decode_string')` → `steps`
- PipelineView：每步一张卡片，竖向堆叠，展示 `index / kind / input(截断) → output(截断) / note`，可展开看完整内容
- 末尾 Final Result 卡片：格式化 JSON + "送入编辑器"按钮（调 `decoderStore.sendToEditor`）

### 5.4 模块三：JSON Diff

- 左右两栏输入（各一个 Monaco read+write 或 textarea，先用 textarea，后续可换 Monaco diff editor）
- 底部 Diff Summary 面板：右侧列表，按路径列出差异，点击跳转高亮
- DiffModeToggle：`Structural`（jsondiffpatch，默认）/ `Text`（diff 库逐行）
- 渲染色板：`--success/--danger/--warning` + soft 背景对应新增/删除/变更，无变化部分可折叠

### 5.5 Tab Bar（spec 重点，高度定制）

- 位置：Sidebar 下方 / 主内容区顶部
- 每个 Tab：文件名（含扩展名）+ dirty 圆点 `●` + 关闭 `×`
- 交互：
  - 点击切换 / 中键关闭 / 点 × 关闭（dirty 弹确认）
  - 右键菜单（shadcn context-menu）：关闭 / 关闭其他 / 关闭全部 / 在文件管理器显示（`reveal_in_finder`）/ 复制文件路径
  - `@dnd-kit/sortable` 拖拽排序
- 横向溢出滚动，不换行
- 关闭最后一个 Tab → `EmptyState`（拖拽 / 打开文件引导）

### 5.6 文件打开与拖拽

- **拖拽**：`getCurrent().listen('tauri://drag-drop')`，Mac/Win 一致
- **打开方式关联**：`tauri.conf.json` 的 `fileAssociations` 注册；启动时通过 `RunEvent::Opened` 接收文件路径，转发前端 `openFile`
- 工具栏"打开文件"：`dialog.open({ multiple: true, filters: [{ extensions: ['json','jsonc','json5','cfg','conf','config','lock'] }] })`
- 非法 JSON 文本文件 → 纯文本展示（`parsed_ok=false`）

### 5.7 剪贴板监听 + 最近片段

- `appStore.clipboardEnabled` 开关；开启后定时（1.5s）`readText` 检测合法 JSON → 设 `clipboardBadge`（Sidebar 角标）
- 最近片段：每次成功解析写入 `recents`（限 20，persist localStorage），Sidebar 底部或独立面板可快速载入

### 5.8 跨平台

- 快捷键统一 `CmdOrCtrl`（Monaco 与全局都遵循）
- 标题栏：Mac `Overlay` + `hiddenTitle`；Windows 保留标准标题栏（`tauri.conf` 按平台配置）
- 打包：`tauri build` → `.dmg`（Mac）/ `.msi` `.exe`（Win），签名证书后期配

---

## 6. 分阶段执行路线图

| 阶段 | 目标 | 产出 |
|---|---|---|
| **P0 脚手架** | `create-tauri-app` + Tailwind + shadcn init + tokens.css + 两套主题变量 + 字体打包 | 能跑的空壳，主题可切 |
| **P1 应用外框** | Titlebar（交通灯 + drag region）、Sidebar（三入口 icon rail）、TabBar、EmptyState、appStore/themeStore | 三模块可路由切换，Tab CRUD 可用 |
| **P2 编辑器模块** | Monaco 接入 + TreeView（react-arborist）+ Toolbar + 文件读写 + 拖拽 + path 生成 | 核心编辑体验闭环 |
| **P3 Rust 解码器** | `decode.rs` pipeline + `decode_string` command + DecoderModule UI（PipelineView） | 剥洋葱可视化，送入编辑器 |
| **P4 Diff 模块** | jsondiffpatch + diff 双模式 + DiffColumns + Summary + 跳转 | Diff 闭环 |
| **P5 收尾** | 剪贴板监听、最近片段、文件关联注册、跨平台标题栏、打包脚本（`.dmg`/`.msi`） | 可分发 MVP |

每个阶段结束做一次手动冒烟测试：打开大 JSON、粘贴多层转义串、跑两份 JSON diff、切换主题、Mac+Win 各跑一遍。

---

## 7. 风险与注意事项

1. **Monaco 在 Tauri webview 的 worker 加载**：需配 `loader.config({ paths: { vs } })` 指向本地资源，避免 CDN（离线原则）。打包时确认 `monaco-editor` 的 workers 被正确打入。
2. **大 JSON 性能**：树用 `react-arborist` 虚拟化；Monaco 设 `largeFileOptimizations`；超过阈值（如 5MB）提示切换只读。
3. **Tauri 2 权限模型**：`fs` scope 必须显式声明可访问路径（`$HOME`、`$APPCONFIG` 等），否则读写被拒。
4. **文件关联（macOS）**：`.app` bundle 的 `Info.plist` 需 `CFBundleDocumentTypes`，Tauri 2 的 `fileAssociations` 会自动生成；需实测"打开方式"是否生效。
5. **主题切换与 Monaco**：切主题时需手动 `monaco.editor.setTheme('xjson-editorial')`，CSS 变量不会自动传导到 Monaco 内部。
6. **拖拽 vs 文本粘贴**：Tauri 的 `drag-drop` 事件与 HTML5 `drop` 冲突时，禁用浏览器默认 `dragover` 防止窗口内打开文件。
7. **Rust decode 循环上限**：8 层兜底，避免恶意输入导致死循环或栈溢出。

---

## 附录 A：设计 Token 清单

### A.1 Dark 主题

| Token | Hex | 用途 |
|---|---|---|
| `$bg-window` | `#1C1C1E` | 窗口背景 |
| `$bg-sidebar` | `#161618` | Sidebar / Titlebar |
| `$bg-surface` | `#2A2A2C` | 卡片 |
| `$bg-elevated` | `#323234` | 提升面板 |
| `$bg-inset` | `#141416` | 输入框/代码区 |
| `$border-subtle` | `#3A3A3C` | 细分割线 |
| `$border-strong` | `#48484A` | 强调边框 |
| `$text-primary` | `#F5F5F7` | 主文本 |
| `$text-secondary` | `#9A9AA0` | 次文本/窗口标题 |
| `$text-tertiary` | `#636366` | 弱化文本 |
| `$accent` | `#0A84FF` | 品牌强调（激活 Tab bg 等） |
| `$accent-soft` | `#0A84FF26` | 激活导航底色（~15%） |
| `$success` / `-soft` | `#30D158` / `#30D15826` | Diff 新增 / 校验通过 |
| `$danger` / `-soft` | `#FF453A` / `#FF453A26` | Diff 删除 |
| `$warning` / `-soft` | `#FFD60A` / `#FFD60A26` | Diff 变更 |

**Dark 代码语法**：key `#79C0FF` · string `#7EE787` · number `#FFA657` · bool `#D2A8FF` · null `#FF7B72` · punct `#8B949E`

**交通灯**：red `#FF5F57` · yellow `#FEBC2E` · green `#28C840`

### A.2 Editorial 主题

| Token | Hex |
|---|---|
| `$ed-paper` / `-2` / `-3` | `#FCFAF7` / `#F5F0E8` / `#EFE8DC` |
| `$ed-ink` / `-2` / `-3` | `#1C1814` / `#6B6357` / `#9C9385` |
| `$ed-hairline` | `#E7E0D6` |
| `$ed-accent` / `-soft` / `-sel` | `#C2410C` / `#C2410C14` / `#C2410C1F` |
| `$ed-add` / `-soft` | `#4D6B2F` / `#4D6B2F14` |
| `$ed-del` / `-soft` | `#A13D2D` / `#A13D2D14` |
| `$ed-chg` / `-soft` | `#B45309` / `#B4530914` |

**ED 代码语法**：key `#2A5A55` · string `#4D6B2F` · number `#B45309` · bool `#7C3A6B` · null `#A13D2D`

### A.3 Blueprint 主题（保留，本次不实现）

`$bp-surface #FFFFFF` `$bp-surface-2 #F7F8FA` `$bp-paper #FBFCFD` `$bp-ink #1A1A1A` `$bp-ink-2 #666666` `$bp-muted #888888` `$bp-line #1A1A1A` `$bp-hairline #EEF0F2` `$bp-grid #E4E8EC` `$bp-accent #4A9FD8` `$bp-accent-soft #4A9FD81F` `$bp-add #2E9E6B` `$bp-del #D1495B` `$bp-chg #C98A1A` · 语法 key `#2C6E9B` str `#2E7D55` num `#A85416` bool `#7A3DAF`

### A.4 字体

- UI / Sans：**Inter**（400/500/600）
- Dark 代码：**JetBrains Mono**
- ED 代码：**IBM Plex Mono**
- ED 标题：**Newsreader**（衬线，34/24/23/18）

### A.5 尺寸速查

- 圆角：sm=6 / md=10 / lg=14 / pill=9999
- 描边：1px hairline；选中行左侧 2px accent bar
- 间距：4 / 8 / 12 / 16（12 最常用）
- Titlebar 44 · Sidebar 72（rail）/ 200（text）· Toolbar 52 · Tab Bar 40（Tab 高 38） · Outline Panel 452

### A.6 图标（Lucide）

| 图标 | 用途 |
|---|---|
| `braces` | Editor 入口 |
| `wand-sparkles` | Decoder 入口 |
| `git-compare` | Diff 入口 |
| `search` | 工具栏搜索 |
| `copy` | 复制 |
| `download` | 导入 |
| `minimize-2` | Minify / Format |
| `list-tree` | Outline 切换 |
| `circle-check` | 校验通过 |
| `chevron-down` / `chevron-right` | 树折叠箭头 |
| `chevrons-down-up` / `chevrons-up-down` | 折叠/展开全部 |
| `plus` | 新建 Tab |
| `x` | 关闭 |
| `folder` | 打开文件 |
| `code` / `binary` / `file-text` / `file-pen-line` | 各类辅助 |
| `git-compare-arrows` / `arrow-down` | Diff / 流向 |

---

**下一步**：按 §6 路线图从 **P0 脚手架** 开始执行。
