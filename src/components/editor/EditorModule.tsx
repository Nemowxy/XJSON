import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { Toolbar } from "./Toolbar";
import { TreeView } from "./TreeView";
import { RawEditor } from "./RawEditor";
import { EmptyState } from "@/components/chrome/EmptyState";
import { cn } from "@/lib/utils";

export function EditorModule() {
  const activeTab = useEditorStore((s) => s.activeTab());
  const updateContent = useEditorStore((s) => s.updateContent);
  const panelLayout = useEditorStore((s) => s.panelLayout);
  const searchQuery = useEditorStore((s) => s.searchQuery);

  const treeWrapRef = useRef<HTMLDivElement>(null);
  const [treeSize, setTreeSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = treeWrapRef.current;
    if (!el) return;
    
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTreeSize({ w: rect.width, h: rect.height });
      }
    };
    
    // 立即测量
    measure();
    
    // 监听尺寸变化
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    
    return () => ro.disconnect();
  }, [activeTab?.id]); // 只在 tab 切换时重新订阅，panelLayout 变化由 ResizeObserver 自动捕获

  if (!activeTab) return <EmptyState />;

  const showTree = panelLayout !== "raw-only";
  const showRaw = panelLayout !== "tree-only";

  return (
    <div className="flex h-full flex-col">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        {showTree && (
          <div
            ref={treeWrapRef}
            className={cn(
              "scrollbar-thin flex-shrink-0 overflow-hidden bg-window py-1.5",
              showRaw ? "w-1/2 border-r border-border-subtle" : "flex-1",
            )}
          >
            <TreeView
              content={activeTab.content}
              query={searchQuery}
              width={treeSize.w}
              height={treeSize.h}
            />
          </div>
        )}
        {showRaw && (
          <div className={cn("min-h-0 flex-shrink-0", showTree ? "w-1/2" : "flex-1")}>
            <RawEditor
              value={activeTab.content}
              onChange={(v) => updateContent(activeTab.id, v)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
