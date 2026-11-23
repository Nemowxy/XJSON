import { History, X } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useEditorStore } from "@/stores/editorStore";
import type { RecentItem } from "@/types";
import { cn } from "@/lib/utils";
import { Hint } from "@/components/ui/tooltip";

export function openRecent(item: RecentItem) {
  useEditorStore.getState().newScratchTab(item.content);
  useAppStore.getState().setModule("editor");
}

function formatWhen(at: number): string {
  const diff = Date.now() - at;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return new Date(at).toLocaleDateString();
}

export function RecentsList({
  onLoaded,
  limit,
}: {
  onLoaded?: () => void;
  limit?: number;
}) {
  const recents = useAppStore((s) => s.recents);
  const removeRecent = useAppStore((s) => s.removeRecent);
  const items = typeof limit === "number" ? recents.slice(0, limit) : recents;

  if (items.length === 0) {
    return <p className="px-2 py-3 text-xs text-text-tertiary">还没有最近片段</p>;
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => (
        <li key={item.id} className="group flex items-stretch">
          <button
            type="button"
            onClick={() => {
              openRecent(item);
              onLoaded?.();
            }}
            className="flex min-w-0 flex-1 flex-col items-start rounded-md px-2 py-1.5 text-left hover:bg-surface"
          >
            <span className="w-full truncate font-mono text-xs text-text-primary">
              {item.preview}
            </span>
            <span className="text-2xs text-text-tertiary">{formatWhen(item.at)}</span>
          </button>
          <button
            type="button"
            aria-label="移除这条最近片段"
            onClick={() => removeRecent(item.id)}
            className="flex w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary opacity-0 hover:bg-danger-soft hover:text-danger group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <X size={12} />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function RecentsButton({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const count = useAppStore((s) => s.recents.length);
  const clearRecents = useAppStore((s) => s.clearRecents);

  return (
    <div className="relative">
      <Hint label={count > 0 ? `最近片段 · ${count}` : "最近片段"}>
        <button
          type="button"
          aria-label="最近片段"
          aria-expanded={open}
          onClick={onToggle}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-md transition-colors",
            open
              ? "bg-surface text-text-primary"
              : "text-text-tertiary hover:bg-surface hover:text-text-secondary",
          )}
        >
          <History size={20} strokeWidth={1.8} />
        </button>
      </Hint>
      {open && (
        <div className="absolute bottom-0 left-full z-40 ml-2 flex max-h-[min(420px,70vh)] w-[300px] flex-col rounded-md border border-border-subtle bg-elevated p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-2xs font-semibold uppercase tracking-wide text-text-tertiary">
              最近片段
            </span>
            {count > 0 && (
              <button
                type="button"
                onClick={clearRecents}
                className="text-2xs text-text-tertiary hover:text-text-secondary"
              >
                清空
              </button>
            )}
          </div>
          <p className="px-2 pb-1 text-2xs text-text-tertiary">
            打开文件、粘贴或解码成功后会记在这里，最多 20 条。
          </p>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            <RecentsList onLoaded={onToggle} />
          </div>
        </div>
      )}
    </div>
  );
}
