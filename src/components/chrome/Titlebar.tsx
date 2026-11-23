import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";
import { useEditorStore } from "@/stores/editorStore";
import { useAppStore } from "@/stores/appStore";
import { isMacOS } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { Hint } from "@/components/ui/tooltip";
import { Logo } from "./Logo";

const MODULE_TITLES: Record<string, string> = {
  editor: "JSON 编辑器",
  decoder: "String → JSON 解码器",
  diff: "JSON Diff",
};

export function Titlebar() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const activeModule = useAppStore((s) => s.activeModule);
  const activeTab = useEditorStore((s) => s.activeTab());

  const subtitle =
    activeModule === "editor" && activeTab ? activeTab.fileName : MODULE_TITLES[activeModule];
  // macOS：Overlay 标题栏，左侧留给交通灯。Windows / Linux 使用系统标题栏，不再留空。
  const macOverlay = isMacOS();

  return (
    <div
      data-tauri-drag-region
      className="drag-region flex h-11 shrink-0 items-center border-b border-border-subtle bg-sidebar px-4"
    >
      <div data-tauri-drag-region className={cn("shrink-0", macOverlay ? "w-[72px]" : "w-7")} />

      {/* 标题（带 logo） */}
      <div className="pointer-events-none flex flex-1 items-center justify-center gap-2 text-xs">
        <Logo size={18} />
        <span className="font-semibold text-text-primary">XJSON</span>
        <span className="text-text-tertiary">—</span>
        <span className="text-text-secondary">{subtitle}</span>
      </div>

      {/* 主题切换 */}
      <div className={cn("no-drag flex items-center justify-end", macOverlay ? "w-[72px]" : "w-7")}>
        <Hint label={theme === "dark" ? "切换到浅色阅读模式" : "切换到深色模式"}>
          <button
            onClick={toggleTheme}
            aria-label="切换主题"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition hover:bg-surface hover:text-text-primary"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </Hint>
      </div>
    </div>
  );
}
