import type { JsonNode, JsonValueType } from "@/types";

/** 校验 + 解析；返回错误位置信息 */
export interface ParseResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  errorLine?: number;
  errorColumn?: number;
}

export function parseJson(text: string): ParseResult {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: false, error: "空内容" };
  try {
    const value = JSON.parse(trimmed);
    return { ok: true, value };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const { line, column } = locateError(text, msg);
    return { ok: false, error: msg, errorLine: line, errorColumn: column };
  }
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

export function formatJson(text: string, indent = 2): string {
  const r = parseJson(text);
  if (!r.ok) return text;
  return JSON.stringify(r.value, null, indent);
}

export function minifyJson(text: string): string {
  const r = parseJson(text);
  if (!r.ok) return text;
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
  return makeNode(value, null, "$");
}

function escapeKey(key: string): string {
  // 合法 JS 标识符直接 .key，否则用 ['key']
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? `.${key}` : `['${key}']`;
}

function makeNode(value: unknown, key: string | null, path: string): JsonNode {
  const type = valueType(value);
  const node: JsonNode = { id: path, key, path, type };

  if (type === "object") {
    const obj = value as Record<string, unknown>;
    node.children = Object.keys(obj).map((k) =>
      makeNode(obj[k], k, `${path}${escapeKey(k)}`),
    );
  } else if (type === "array") {
    const arr = value as unknown[];
    node.children = arr.map((item, i) => makeNode(item, String(i), `${path}[${i}]`));
  } else {
    node.value = value as string | number | boolean | null;
  }
  return node;
}

/** 节点匹配搜索词（key 或 value） */
export function nodeMatches(node: JsonNode, query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase();
  if (node.key && node.key.toLowerCase().includes(q)) return true;
  if (node.value != null && String(node.value).toLowerCase().includes(q)) return true;
  return false;
}
