import type { DecodeStep, DecodeKind } from "@/types";

// 浏览器降级版解码流水线（与 Rust 端 decode.rs 逻辑对齐）。
// Tauri 环境下走 Rust；纯浏览器开发时用此实现。

const MAX_STEPS = 8;

function isStructuredJson(s: string): boolean {
  const t = s.trim();
  const struct =
    (t.startsWith("{") && t.endsWith("}")) ||
    (t.startsWith("[") && t.endsWith("]"));
  if (!struct) return false;
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}

function tryJsonUnescape(s: string): string | null {
  const t = s.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    try {
      const v = JSON.parse(t);
      if (typeof v === "string") return v;
    } catch {
      /* ignore */
    }
  }
  if (
    t.includes('\\"') ||
    t.includes("\\\\") ||
    t.includes("\\n") ||
    t.includes("\\t")
  ) {
    try {
      const v = JSON.parse(`"${t}"`);
      if (typeof v === "string") return v;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function tryUrlDecode(s: string): string | null {
  const t = s.trim();
  if (!t.includes("%")) return null;
  try {
    const out = decodeURIComponent(t);
    return out !== t ? out : null;
  } catch {
    return null;
  }
}

function tryBase64(s: string): string | null {
  const t = s.trim();
  if (t.length < 8 || t.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/]+=*$/.test(t)) return null;
  try {
    const bin = atob(t);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const out = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return out !== t ? out : null;
  } catch {
    return null;
  }
}

function tryUnicode(s: string): string | null {
  if (!s.includes("\\u")) return null;
  let changed = false;
  const out = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
    changed = true;
    return String.fromCharCode(parseInt(hex, 16));
  });
  return changed ? out : null;
}

function decodeOnce(s: string): { kind: DecodeKind; output: string } | null {
  let o = tryJsonUnescape(s);
  if (o !== null) return { kind: "jsonUnescape", output: o };
  o = tryUrlDecode(s);
  if (o !== null) return { kind: "urlDecode", output: o };
  o = tryBase64(s);
  if (o !== null) return { kind: "base64", output: o };
  o = tryUnicode(s);
  if (o !== null) return { kind: "unicode", output: o };
  return null;
}

export function decodeStringJs(input: string): DecodeStep[] {
  const steps: DecodeStep[] = [];
  let current = input;
  let index = 0;

  if (isStructuredJson(current)) return steps;

  while (index < MAX_STEPS) {
    const res = decodeOnce(current);
    if (res) {
      const isJson = isStructuredJson(res.output);
      steps.push({
        index,
        kind: res.kind,
        input: current,
        output: res.output,
        success: true,
        isJson,
        note: null,
      });
      current = res.output;
      index++;
      if (isJson) break;
    } else {
      if (steps.length === 0) {
        let parsed = false;
        try {
          JSON.parse(current.trim());
          parsed = true;
        } catch {
          parsed = false;
        }
        steps.push({
          index,
          kind: "jsonUnescape",
          input: current,
          output: current,
          success: false,
          isJson: parsed,
          note: "未检测到可解码的编码层",
        });
      }
      break;
    }
  }

  if (index >= MAX_STEPS && steps.length > 0) {
    steps[steps.length - 1].note = `已达最大解码层数 ${MAX_STEPS}，停止`;
  }

  return steps;
}
