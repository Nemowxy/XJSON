import { Braces, WandSparkles, GitCompare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import type { ModuleKey } from "@/types";
import { cn } from "@/lib/utils";
import { Hint } from "@/components/ui/tooltip";

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

export function Sidebar() {
  const activeModule = useAppStore((s) => s.activeModule);
  const setModule = useAppStore((s) => s.setModule);
  const clipboardHasJson = useAppStore((s) => s.clipboardHasJson);

  return (
    <nav className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 border-r border-border-subtle bg-sidebar pt-4 pb-3">
      {NAV.map(({ key, icon: Icon, label }) => {
        const active = activeModule === key;
        const showBadge = key === "decoder" && clipboardHasJson;
        return (
          <Hint key={key} label={label}>
            <button
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
              {showBadge && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-success ring-2 ring-sidebar" />
              )}
            </button>
          </Hint>
        );
      })}
    </nav>
  );
}
