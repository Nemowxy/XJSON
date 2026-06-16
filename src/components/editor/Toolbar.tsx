import { useState } from "react";
import {
  Search,
  Download,
  AlignLeft,
  Minimize2,
  Copy,
  PanelLeft,
  PanelRight,
  Columns2,
  Check,
} from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useEditorStore } from "@/stores/editorStore";
import { formatJson, minifyJson, parseJson, maxDepth } from "@/lib/json";
import { openFileDialog } from "@/lib/files";
import { cn, isTauri } from "@/lib/utils";
import { Hint } from "@/components/ui/tooltip";

export function Toolbar() {
  const activeTab = useEditorStore((s) => s.activeTab());
  const updateContent = useEditorStore((s) => s.updateContent);
  const searchQuery = useEditorStore((s) => s.searchQuery);
  const setSearchQuery = useEditorStore((s) => s.setSearchQuery);
  const panelLayout = useEditorStore((s) => s.panelLayout);
  const setPanelLayout = useEditorStore((s) => s.setPanelLayout);
  const [copied, setCopied] = useState(false);

  if (!activeTab) return null;

  const content = activeTab.content;
  const parsed = parseJson(content);
  const charCount = content.length;
  const depth = parsed.ok ? maxDepth(parsed.value) : 0;

  const doFormat = () => updateContent(activeTab.id, formatJson(content));
  const doMinify = () => updateContent(activeTab.id, minifyJson(content));

  const doCopy = async () => {
    const text = parsed.ok ? formatJson(content) : content;
    if (isTauri()) await writeText(text);
    else await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-border-subtle bg-window px-3">
      {/* 搜索 */}
      <div className="relative flex items-center">
        <Search
          size={14}
          className="pointer-events-none absolute left-2.5 text-text-tertiary"
        />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="按 key 或 value 过滤…"
          className="h-8 w-56 rounded-md border border-border-subtle bg-inset pl-8 pr-2.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
        />
      </div>

      <div className="mx-1 h-5 w-px bg-border-subtle" />

      <ToolButton label="打开文件" onClick={openFileDialog} icon={<Download size={15} />} />
      <ToolButton label="格式化" onClick={doFormat} icon={<AlignLeft size={15} />} />
      <ToolButton label="压缩" onClick={doMinify} icon={<Minimize2 size={15} />} />
      <ToolButton
        label="复制全部"
        onClick={doCopy}
        icon={copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
      />

      <div className="ml-auto flex items-center gap-3">
        {/* 字符 / 深度 */}
        <span className="text-2xs text-text-tertiary">
          {charCount.toLocaleString()} 字符 · 深度 {depth}
          {!parsed.ok && content.trim() !== "" && (
            <span className="ml-2 text-danger">● 无效 JSON</span>
          )}
        </span>

        {/* 布局切换 */}
        <div className="flex items-center gap-0.5 rounded-md border border-border-subtle bg-inset p-0.5">
          <LayoutButton
            active={panelLayout === "tree-only"}
            onClick={() => setPanelLayout("tree-only")}
            label="仅树视图"
            icon={<PanelLeft size={14} />}
          />
          <LayoutButton
            active={panelLayout === "split"}
            onClick={() => setPanelLayout("split")}
            label="分栏"
            icon={<Columns2 size={14} />}
          />
          <LayoutButton
            active={panelLayout === "raw-only"}
            onClick={() => setPanelLayout("raw-only")}
            label="仅编辑器"
            icon={<PanelRight size={14} />}
          />
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Hint label={label}>
      <button
        onClick={onClick}
        aria-label={label}
        className="flex h-8 items-center gap-1.5 rounded-md border border-border-subtle bg-surface px-2.5 text-xs text-text-secondary transition hover:bg-elevated hover:text-text-primary"
      >
        {icon}
      </button>
    </Hint>
  );
}

function LayoutButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Hint label={label}>
      <button
        onClick={onClick}
        aria-label={label}
        className={cn(
          "flex h-6 w-7 items-center justify-center rounded transition",
          active
            ? "bg-accent text-white"
            : "text-text-tertiary hover:text-text-secondary",
        )}
      >
        {icon}
      </button>
    </Hint>
  );
}
