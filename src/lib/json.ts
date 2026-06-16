import type { JsonNode, JsonValueType } from "@/types";
import {
  format as jsoncFormat,
  parseTree,
  findNodeAtLocation,
  applyEdits,
} from "jsonc-parser";

/** 校验 + 解析；返回错误位置信息 */
export interface ParseResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  errorLine?: number;
  errorColumn?: number;
}

export function parseJson(text: string): ParseResult {
  // 支持 JSONC：剥离 // 行注释与 /* */ 块注释（保留位置，便于错误定位）
  const sanitized = stripJsonComments(text);
  if (sanitized.trim() === "") return { ok: false, error: "空内容" };
  try {
    const value = JSON.parse(sanitized);
    return { ok: true, value };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const { line, column } = locateError(sanitized, msg);
    return { ok: false, error: msg, errorLine: line, errorColumn: column };
  }
}

/**
 * 剥离 JSON 文本中的注释（// 行注释、/* *\/ 块注释）。
 * - 字符串内部的 // 或 /* 不会被误删（如 URL "http://..."）。
 * - 注释替换为等长空格、保留换行，使后续解析报错的行列号仍对齐原文。
 */
export function stripJsonComments(text: string): string {
  let result = "";
  let i = 0;
  const n = text.length;
  let inString = false;

  while (i < n) {
    const ch = text[i];
    const next = i + 1 < n ? text[i + 1] : "";

    if (inString) {
      result += ch;
      // 转义字符整体复制，避免把 \" 当作字符串结束
      if (ch === "\\" && i + 1 < n) {
        result += text[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"') inString = false;
      i++;
      continue;
    }

    if (ch === '"') {
      inString = true;
      result += ch;
      i++;
      continue;
    }

    // 行注释 // ... 到行末
    if (ch === "/" && next === "/") {
      while (i < n && text[i] !== "\n") {
        result += " ";
        i++;
      }
      continue;
    }

    // 块注释 /* ... */
    if (ch === "/" && next === "*") {
      const start = i;
      i += 2;
      while (i < n && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i = Math.min(i + 2, n); // 跳过结尾的 */
      for (let j = start; j < i; j++) {
        result += text[j] === "\n" ? "\n" : " ";
      }
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

/** 从 JSON.parse 报错信息里抽出位置（V8 风格 "at position N"） */
function locateError(
  text: string,
  msg: string,
): { line?: number; column?: number } {
  const posMatch = msg.match(/position (\d+)/);
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    let line = 1;
    let column = 1;
    for (let i = 0; i < pos && i < text.length; i++) {
      if (text[i] === "\n") {
        line++;
        column = 1;
      } else {
        column++;
      }
    }
    return { line, column };
  }
  const lineMatch = msg.match(/line (\d+) column (\d+)/);
  if (lineMatch) {
    return { line: parseInt(lineMatch[1], 10), column: parseInt(lineMatch[2], 10) };
  }
  return {};
}

/** 文本是否包含注释（剥离后与原文不同则说明有注释） */
export function hasComments(text: string): boolean {
  return stripJsonComments(text) !== text;
}

export function formatJson(text: string, indent = 2): string {
  const r = parseJson(text);
  if (!r.ok) return text;
  // 含注释时用 jsonc-parser 重新缩进并保留注释；否则用标准序列化
  if (hasComments(text)) {
    const edits = jsoncFormat(text, undefined, {
      tabSize: indent,
      insertSpaces: true,
      eol: "\n",
    });
    return applyEdits(text, edits);
  }
  return JSON.stringify(r.value, null, indent);
}

export function minifyJson(text: string): string {
  const r = parseJson(text);
  if (!r.ok) return text;
  // 压缩为标准 JSON，注释不保留
  return JSON.stringify(r.value);
}

export function valueType(v: unknown): JsonValueType {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  const t = typeof v;
  if (t === "object") return "object";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  return "string";
}

/** 节点类型标记符号 */
export function typeBadge(t: JsonValueType): string {
  switch (t) {
    case "object":
      return "{}";
    case "array":
      return "[]";
    case "string":
      return '"';
    case "number":
      return "#";
    case "boolean":
      return "T/F";
    case "null":
      return "∅";
  }
}

/** 计算最大层级深度 */
export function maxDepth(v: unknown, current = 0): number {
  if (v === null || typeof v !== "object") return current;
  let max = current;
  for (const key in v as Record<string, unknown>) {
    max = Math.max(max, maxDepth((v as Record<string, unknown>)[key], current + 1));
  }
  return max;
}

/** 把已解析的值构造成 JsonNode 树 */
export function buildTree(value: unknown): JsonNode {
  return makeNode(value, null, "$", []);
}

function escapeKey(key: string): string {
  // 合法 JS 标识符直接 .key，否则用 ['key']
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? `.${key}` : `['${key}']`;
}

function makeNode(
  value: unknown,
  key: string | null,
  path: string,
  keys: (string | number)[],
): JsonNode {
  const type = valueType(value);
  const node: JsonNode = { id: path, key, path, keys, type };

  if (type === "object") {
    const obj = value as Record<string, unknown>;
    node.children = Object.keys(obj).map((k) =>
      makeNode(obj[k], k, `${path}${escapeKey(k)}`, [...keys, k]),
    );
  } else if (type === "array") {
    const arr = value as unknown[];
    node.children = arr.map((item, i) =>
      makeNode(item, String(i), `${path}[${i}]`, [...keys, i]),
    );
  } else {
    node.value = value as string | number | boolean | null;
  }
  return node;
}

/** 按键序列读取嵌套值；路径不存在返回 { ok: false } */
export function getAtPath(
  root: unknown,
  keys: (string | number)[],
): { ok: boolean; value?: unknown } {
  let cur: unknown = root;
  for (const k of keys) {
    if (cur === null || typeof cur !== "object") return { ok: false };
    if (typeof k === "number") {
      if (!Array.isArray(cur) || k < 0 || k >= cur.length) return { ok: false };
      cur = cur[k];
    } else {
      if (!Object.prototype.hasOwnProperty.call(cur, k)) return { ok: false };
      cur = (cur as Record<string, unknown>)[k];
    }
  }
  return { ok: true, value: cur };
}

/** 在键序列处写入新值，返回更新后的根（不可变更新）；路径不存在返回 { ok: false } */
export function setAtPath(
  root: unknown,
  keys: (string | number)[],
  newValue: unknown,
): { ok: boolean; value?: unknown } {
  if (keys.length === 0) return { ok: true, value: newValue };

  const [head, ...rest] = keys;
  if (root === null || typeof root !== "object") return { ok: false };

  if (typeof head === "number") {
    if (!Array.isArray(root) || head < 0 || head >= root.length)
      return { ok: false };
    const child = setAtPath(root[head], rest, newValue);
    if (!child.ok) return { ok: false };
    const next = [...root];
    next[head] = child.value;
    return { ok: true, value: next };
  }

  if (!Object.prototype.hasOwnProperty.call(root, head)) return { ok: false };
  const obj = root as Record<string, unknown>;
  const child = setAtPath(obj[head], rest, newValue);
  if (!child.ok) return { ok: false };
  return { ok: true, value: { ...obj, [head]: child.value } };
}

/**
 * 读取指定路径节点对应的原文片段（含其内部注释），并规整为顶格缩进显示。
 * 根路径（keys 为空）返回整篇文档。路径不存在返回 null。
 */
export function readNodeText(
  text: string,
  keys: (string | number)[],
  indent = 2,
): string | null {
  if (keys.length === 0) return text;
  const tree = parseTreeSafe(text);
  if (!tree) return null;
  const node = findNodeAtLocation(tree, keys);
  if (!node) return null;
  const slice = text.slice(node.offset, node.offset + node.length);
  // 顶格重排：把片段当作独立文档格式化，去掉其在原文中的缩进偏移
  const edits = jsoncFormat(slice, undefined, {
    tabSize: indent,
    insertSpaces: true,
    eol: "\n",
  });
  return applyEdits(slice, edits);
}

/**
 * 把编辑后的节点文本写回原文对应区间，保留其内部及周围的注释。
 * - 根路径（keys 为空）：直接以新文本替换整篇文档。
 * - 子路径：替换目标区间后，对受影响范围做一次缩进修正。
 * 路径不存在返回 null。
 */
export function writeNodeText(
  text: string,
  keys: (string | number)[],
  nodeText: string,
  indent = 2,
): string | null {
  if (keys.length === 0) return nodeText;
  const tree = parseTreeSafe(text);
  if (!tree) return null;
  const node = findNodeAtLocation(tree, keys);
  if (!node) return null;

  const spliced =
    text.slice(0, node.offset) + nodeText + text.slice(node.offset + node.length);
  // 仅对替换区间做缩进修正，保留全文其余注释/格式
  const edits = jsoncFormat(
    spliced,
    { offset: node.offset, length: nodeText.length },
    { tabSize: indent, insertSpaces: true, eol: "\n" },
  );
  return applyEdits(spliced, edits);
}

function parseTreeSafe(text: string): ReturnType<typeof parseTree> {
  try {
    return parseTree(text);
  } catch {
    return undefined;
  }
}

/** 节点匹配搜索词（key 或 value） */
export function nodeMatches(node: JsonNode, query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase();
  if (node.key && node.key.toLowerCase().includes(q)) return true;
  if (node.value != null && String(node.value).toLowerCase().includes(q)) return true;
  return false;
}
