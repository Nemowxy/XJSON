---
type: Note
status: Active
relationships:
  Type:
    - "[[note]]"
---

# Mac JSON

Mac + Windows 双平台 JSON 工具，基于 Tauri 2.x 构建。三个核心模块：可视化编辑器、String→JSON 解码器、JSON Diff。

---

## 产品定位

面向开发者的本地工具，无网络依赖，数据不离本机。

---

## 模块一：JSON 查看器 / 编辑器

**布局：** 左树右编辑器，可折叠任意一侧变为单栏。

**Tree View**
- 每个节点显示类型标记（`{}` `[]` `"` `#` `T/F` `∅`）
- 点击值直接 inline 编辑
- 右键菜单：复制值、复制路径（`$.users[0].name`）、添加兄弟节点、添加子节点、删除
- 折叠 / 展开全部快捷键

**Raw Editor**
- 语法高亮，错误行红色下划线 + 具体错误提示
- Format / Minify 按钮
- 字符计数、层级深度提示

**工具栏**
- 导入 `.json` 文件（支持拖拽）
- 粘贴自动解析
- 复制全部（格式化 or 压缩）
- 搜索：按 key 或 value 过滤树节点，高亮匹配项

---

## 模块二：String → JSON 解码器

处理多层转义的核心差异化功能。

**输入区**
- 粘贴任意字符串（含 `\"` 转义、URL 编码、Base64、unicode `\uXXXX`）

**解码流水线（逐层可视化）**
```
输入 → [检测类型] → [第一层解码] → [检测类型] → [第二层解码] → ... → 最终 JSON
```
每一步作为独立卡片展开，展示"剥洋葱"过程。

**解码策略**（自动检测 + 手动覆盖）
- JSON string unescape
- URL decode
- Base64 decode → 再尝试 JSON 解析
- Unicode unescape

**输出：** 格式化 JSON，一键送入编辑器模块继续操作。

---

## 模块三：JSON Diff

**布局：** 左右两栏输入，底部差异摘要。

**差异渲染**
- 绿色：新增的 key/value
- 红色：删除的 key/value
- 黄色：value 变更（同时显示旧值 → 新值）
- 灰色：无变化部分可折叠隐藏

**差异摘要列表**（右侧面板）
- 按路径列出所有差异，点击跳转到对应节点
- 统计：N 处新增 / N 处删除 / N 处变更

**两种 Diff 模式**
- 结构化 diff（基于 JSON path，忽略 key 顺序）—— 默认
- 文本 diff（逐行对比，适合看格式变化）

---

## 整体 UX

- Sidebar 三个模块切换，各模块状态独立保留
- 剪贴板监听开关：检测到剪贴板是合法 JSON 时角标提示
- 最近使用的 JSON 片段（本地缓存，限 20 条）

---

## 标签栏

**位置：** Sidebar 下方 / 主内容区顶部，横向排列。

**Tab 显示**
- 显示文件名（含扩展名），如 `config.json`、`settings.cfg`
- 未保存的 Tab 右上角显示圆点（`●`）
- 超出宽度时水平滚动，不换行折叠

**Tab 交互**
- 点击切换到对应文件
- 中键点击 / 点击 `×` 关闭；有未保存内容时弹确认
- 右键菜单：关闭、关闭其他、关闭全部、在文件管理器中显示、复制文件路径
- 支持拖拽排序

**文件打开方式**
- 工具栏"打开文件"按钮，支持多选
- 拖拽文件到窗口
- 系统"打开方式"关联（需在 `tauri.conf.json` 注册文件关联）

**支持的扩展名**（在 `tauri.conf.json` 的 `fileAssociations` 注册）
- `.json`、`.jsonc`、`.json5`
- `.cfg`、`.conf`、`.config`
- `.lock`（`package-lock.json`、`Cargo.lock` 等）
- 其他文本文件按内容尝试 JSON 解析，解析失败则以纯文本展示

**状态管理**
- `editorStore` 扩展 `tabs: Tab[]` 和 `activeTabId`
- 每个 `Tab` 携带：`id`、`filePath`、`fileName`、`content`、`isDirty`、`isNew`（粘贴进来的未命名内容）
- 关闭最后一个 Tab 后显示空状态引导页（拖拽或打开文件）

---

## 技术栈

| 层 | 选型 |
|---|---|
| 壳 | Tauri 2.x |
| UI 框架 | React + TypeScript |
| 样式 | Tailwind CSS + shadcn/ui |
| 状态管理 | Zustand |
| 构建 | Vite |

### 各模块核心依赖

- **编辑器**：`@monaco-editor/react`（Raw 编辑器）+ 虚拟化树组件
- **解码器**：Rust 端处理（Base64/Unicode，避免 JS 的 `atob` 限制）
- **Diff**：`jsondiffpatch`（结构化）+ `diff`（文本）

---

## 项目结构

```
json-tool/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   └── commands/
│   │       ├── decode.rs      # String→JSON 解码 pipeline
│   │       └── file.rs        # 文件读写
│   └── tauri.conf.json
└── src/
    ├── stores/
    │   ├── editorStore.ts
    │   ├── decoderStore.ts
    │   └── diffStore.ts
    ├── modules/
    │   ├── editor/
    │   ├── decoder/
    │   └── diff/
    ├── components/
    └── App.tsx
```

### Rust 端职责

只放 JS 做不好或不安全的部分：

```rust
// 多层 unescape，Rust 处理 Base64/Unicode 更可靠
#[tauri::command]
fn decode_string(input: String) -> Vec<DecodeStep> { ... }

// 文件读写（绕过浏览器沙箱限制）
#[tauri::command]
async fn read_json_file(path: String) -> Result<String, String> { ... }
```

---

## 跨平台注意点

- **文件拖拽**：Tauri 2 的 `drag-drop` 事件 Mac/Windows 行为一致
- **快捷键**：使用 `CmdOrCtrl` 写法自动适配 Mac/Windows
- **窗口标题栏**：Mac 可用 `hidden-title` 做沉浸式，Windows 保留标准标题栏
- **打包**：`tauri build` 自动输出 `.dmg`（Mac）和 `.msi`/`.exe`（Windows），签名证书可后期配置
