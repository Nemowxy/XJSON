// 共享类型定义

export type ModuleKey = "editor" | "decoder" | "diff";

export type ThemeKey = "dark" | "editorial";

/** 编辑器标签页 */
export interface Tab {
  id: string;
  filePath?: string;
  fileName: string;
  content: string;
  isDirty: boolean;
  isNew: boolean; // 粘贴进来的未命名内容
}

export type JsonValueType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "null";

/** 解析后的 JSON 树节点 */
export interface JsonNode {
  id: string; // 稳定 id（基于 path）
  key: string | null; // 根为 null；数组项为索引字符串
  path: string; // JSONPath，如 $.users[0].name
  keys: (string | number)[]; // 从根到当前节点的访问键序列，根为 []
  type: JsonValueType;
  value?: string | number | boolean | null; // 标量值
  children?: JsonNode[];
}

/** Rust 解码步骤（与 src-tauri/commands/decode.rs 对齐） */
export type DecodeKind = "jsonUnescape" | "urlDecode" | "base64" | "unicode";

export interface DecodeStep {
  index: number;
  kind: DecodeKind;
  input: string;
  output: string;
  success: boolean;
  isJson: boolean;
  note: string | null;
}

/** Rust 文件读取结果 */
export interface FileContent {
  content: string;
  fileName: string;
  filePath: string;
  parsedOk: boolean;
}

export type DiffMode = "structural" | "text";
export type DiffChangeType = "added" | "removed" | "changed";

export interface DiffItem {
  path: string;
  type: DiffChangeType;
  oldValue?: string;
  newValue?: string;
}

export interface DiffSummary {
  added: DiffItem[];
  removed: DiffItem[];
  changed: DiffItem[];
}

/** 最近使用片段 */
export interface RecentItem {
  id: string;
  preview: string; // 截断的内容预览
  content: string;
  at: number; // 时间戳
}
