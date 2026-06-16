import { create } from "zustand";
import * as jsondiffpatch from "jsondiffpatch";
import type { DiffMode, DiffSummary } from "@/types";
import { parseJson } from "@/lib/json";

const differ = jsondiffpatch.create({
  objectHash: (obj: unknown, index?: number) => {
    const o = obj as Record<string, unknown>;
    return (o?.id ?? o?._id ?? o?.key ?? `$index:${index}`) as string;
  },
  arrays: { detectMove: true, includeValueOnMove: false },
});

interface DiffState {
  left: string;
  right: string;
  mode: DiffMode;
  delta: jsondiffpatch.Delta | undefined;
  summary: DiffSummary;
  error: string | null;

  setLeft: (v: string) => void;
  setRight: (v: string) => void;
  setMode: (m: DiffMode) => void;
  compute: () => void;
}

const emptySummary = (): DiffSummary => ({ added: [], removed: [], changed: [] });

export const useDiffStore = create<DiffState>((set, get) => ({
  left: "",
  right: "",
  mode: "structural",
  delta: undefined,
  summary: emptySummary(),
  error: null,

  setLeft: (left) => set({ left }),
  setRight: (right) => set({ right }),
  setMode: (mode) => {
    set({ mode });
    get().compute();
  },

  compute: () => {
    const { left, right } = get();
    if (!left.trim() || !right.trim()) {
      set({ delta: undefined, summary: emptySummary(), error: null });
      return;
    }
    const lp = parseJson(left);
    const rp = parseJson(right);
    if (!lp.ok) {
      set({ error: `左侧 JSON 无效: ${lp.error}` });
      return;
    }
    if (!rp.ok) {
      set({ error: `右侧 JSON 无效: ${rp.error}` });
      return;
    }
    const delta = differ.diff(lp.value, rp.value);
    const summary = buildSummary(lp.value, rp.value);
    set({ delta, summary, error: null });
  },
}));

/** 递归比较两个值，按 JSONPath 收集差异 */
function buildSummary(left: unknown, right: unknown): DiffSummary {
  const summary = emptySummary();
  walk(left, right, "$", summary);
  return summary;
}

function escapeKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? `.${key}` : `['${key}']`;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function repr(v: unknown): string {
  return JSON.stringify(v);
}

function walk(a: unknown, b: unknown, path: string, out: DiffSummary) {
  if (isObject(a) && isObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const p = `${path}${escapeKey(k)}`;
      const inA = k in a;
      const inB = k in b;
      if (inA && !inB) out.removed.push({ path: p, type: "removed", oldValue: repr(a[k]) });
      else if (!inA && inB) out.added.push({ path: p, type: "added", newValue: repr(b[k]) });
      else walk(a[k], b[k], p, out);
    }
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const p = `${path}[${i}]`;
      if (i >= b.length) out.removed.push({ path: p, type: "removed", oldValue: repr(a[i]) });
      else if (i >= a.length) out.added.push({ path: p, type: "added", newValue: repr(b[i]) });
      else walk(a[i], b[i], p, out);
    }
    return;
  }
  // 标量或类型不同
  if (repr(a) !== repr(b)) {
    out.changed.push({ path, type: "changed", oldValue: repr(a), newValue: repr(b) });
  }
}

export { differ };
