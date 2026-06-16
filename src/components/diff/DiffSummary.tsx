import { useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useDiffStore } from "@/stores/diffStore";
import type { DiffItem } from "@/types";
import { cn, isTauri } from "@/lib/utils";

export function DiffSummary() {
  const summary = useDiffStore((s) => s.summary);
  const error = useDiffStore((s) => s.error);

  const total =
    summary.added.length + summary.removed.length + summary.changed.length;

  return (
    <div className="flex w-72 shrink-0 flex-col border-l border-border-subtle bg-sidebar">
      <div className="shrink-0 border-b border-border-subtle px-3 py-2.5">
        <div className="text-2xs font-semibold uppercase tracking-wide text-text-tertiary">
          差异摘要
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs">
          <Stat n={summary.added.length} label="新增" color="text-success" />
          <Stat n={summary.removed.length} label="删除" color="text-danger" />
          <Stat n={summary.changed.length} label="变更" color="text-warning" />
        </div>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2">
        {error ? (
          <div className="p-2 text-xs text-danger">{error}</div>
        ) : total === 0 ? (
          <div className="p-2 text-xs text-text-tertiary">
            两侧输入合法 JSON 后显示差异
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {summary.added.map((it) => (
              <Item key={`a-${it.path}`} item={it} />
            ))}
            {summary.removed.map((it) => (
              <Item key={`r-${it.path}`} item={it} />
            ))}
            {summary.changed.map((it) => (
              <Item key={`c-${it.path}`} item={it} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <span className={cn("flex items-baseline gap-1", color)}>
      <span className="font-semibold">{n}</span>
      <span className="text-text-tertiary">{label}</span>
    </span>
  );
}

const TYPE_STYLE = {
  added: { dot: "bg-success", label: "+" },
  removed: { dot: "bg-danger", label: "−" },
  changed: { dot: "bg-warning", label: "~" },
} as const;

function Item({ item }: { item: DiffItem }) {
  const [copied, setCopied] = useState(false);
  const style = TYPE_STYLE[item.type];

  const copyPath = async () => {
    if (isTauri()) await writeText(item.path);
    else await navigator.clipboard.writeText(item.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 800);
  };

  return (
    <button
      onClick={copyPath}
      className="group flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition hover:bg-surface"
      title="点击复制路径"
    >
      <div className="flex items-center gap-1.5">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
        <span className="truncate font-mono text-xs text-text-primary">
          {item.path}
        </span>
        {copied && <span className="ml-auto text-[10px] text-success">已复制</span>}
      </div>
      {item.type === "changed" && (
        <div className="pl-3 font-mono text-[10px]">
          <span className="text-danger line-through">{item.oldValue}</span>
          <span className="mx-1 text-text-tertiary">→</span>
          <span className="text-success">{item.newValue}</span>
        </div>
      )}
      {item.type === "added" && (
        <div className="truncate pl-3 font-mono text-[10px] text-success">
          {item.newValue}
        </div>
      )}
      {item.type === "removed" && (
        <div className="truncate pl-3 font-mono text-[10px] text-danger">
          {item.oldValue}
        </div>
      )}
    </button>
  );
}
