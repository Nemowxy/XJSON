import { useEffect, useRef, useState } from "react";
import { Braces, WandSparkles, GitCompare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import type { ModuleKey } from "@/types";
import { cn } from "@/lib/utils";
import { Hint } from "@/components/ui/tooltip";
import { ClipboardWatchButton } from "./ClipboardWatch";
import { RecentsButton } from "./RecentsPanel";

interface NavDef {
  key: ModuleKey;
  icon: LucideIcon;
  label: string;
}

const NAV: NavDef[] = [
  { key: "editor", icon: Braces, label: "JSON 编辑器" },
  { key: "decoder", icon: WandSparkles, label: "String 解码器" },
  { key: "diff", icon: GitCompare, label: "JSON Diff" },
];

type RailPanel = "clipboard" | "recents";

export function Sidebar() {
  const activeModule = useAppStore((s) => s.activeModule);
  const setModule = useAppStore((s) => s.setModule);
  const clipboardHasJson = useAppStore((s) => s.clipboardHasJson);
  const [panel, setPanel] = useState<RailPanel | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!panel) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setPanel(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [panel]);

  const togglePanel = (next: RailPanel) =>
    setPanel((current) => (current === next ? null : next));

  return (
    <nav
      ref={rootRef}
      className="relative flex w-[72px] shrink-0 flex-col items-center gap-1.5 border-r border-border-subtle bg-sidebar pt-4 pb-3"
    >
      {NAV.map(({ key, icon: Icon, label }) => {
        const active = activeModule === key;
        const showBadge = key === "decoder" && clipboardHasJson;
        return (
          <div key={key} className="relative">
            <Hint label={label}>
              <button
                type="button"
                onClick={() => setModule(key)}
                aria-label={label}
                aria-current={active}
                className={cn(
                  "relative flex h-12 w-12 flex-col items-center justify-center rounded-md transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-text-tertiary hover:bg-surface hover:text-text-secondary",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
                )}
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              </button>
            </Hint>
            {showBadge && (
              <button
                type="button"
                aria-label="剪贴板中有 JSON，点击处理"
                onClick={() => setPanel("clipboard")}
                className="absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center"
              >
                <span className="h-2 w-2 rounded-full bg-success ring-2 ring-sidebar" />
              </button>
            )}
          </div>
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-1.5">
        <RecentsButton
          open={panel === "recents"}
          onToggle={() => togglePanel("recents")}
        />
        <ClipboardWatchButton
          open={panel === "clipboard"}
          onToggle={() => togglePanel("clipboard")}
        />
      </div>
    </nav>
  );
}
