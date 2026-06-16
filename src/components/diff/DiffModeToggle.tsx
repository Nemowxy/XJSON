import { useDiffStore } from "@/stores/diffStore";
import type { DiffMode } from "@/types";
import { cn } from "@/lib/utils";

const MODES: { key: DiffMode; label: string }[] = [
  { key: "structural", label: "结构化" },
  { key: "text", label: "文本" },
];

export function DiffModeToggle() {
  const mode = useDiffStore((s) => s.mode);
  const setMode = useDiffStore((s) => s.setMode);

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border-subtle bg-inset p-0.5">
      {MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => setMode(m.key)}
          className={cn(
            "rounded px-2.5 py-1 text-xs transition",
            mode === m.key
              ? "bg-accent text-white"
              : "text-text-tertiary hover:text-text-secondary",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
