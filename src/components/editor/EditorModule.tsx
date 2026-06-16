import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { Toolbar } from "./Toolbar";
import { TreeView } from "./TreeView";
import { RawEditor } from "./RawEditor";
import { NodeEditor } from "./NodeEditor";
import { EmptyState } from "@/components/chrome/EmptyState";
import { cn } from "@/lib/utils";

export function EditorModule() {
  const activeTab = useEditorStore((s) => s.activeTab());
  const updateContent = useEditorStore((s) => s.updateContent);
  const panelLayout = useEditorStore((s) => s.panelLayout);
  const searchQuery = useEditorStore((s) => s.searchQuery);
  const selectedNode = useEditorStore((s) => s.selectedNode);
  const splitRatio = useEditorStore((s) => s.splitRatio);
  const setSplitRatio = useEditorStore((s) => s.setSplitRatio);

  const containerRef = useRef<HTMLDivElement>(null);
  const treeWrapRef = useRef<HTMLDivElement>(null);
  const [treeSize, setTreeSize] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);

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

  // 分隔条拖拽：根据鼠标在容器内的位置换算占比
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      setSplitRatio((e.clientX - rect.left) / rect.width);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging, setSplitRatio]);

  if (!activeTab) return <EmptyState />;

  const nodeActive = !!selectedNode && selectedNode.tabId === activeTab.id;
  const showTree = panelLayout !== "raw-only";
  // 选中节点时强制显示右侧面板（即便处于「仅树视图」布局）
  const showRaw = panelLayout !== "tree-only" || nodeActive;
  const isSplit = showTree && showRaw;

  return (
    <div className="flex h-full flex-col">
      <Toolbar />
      <div ref={containerRef} className="flex min-h-0 flex-1">
        {showTree && (
          <div
            ref={treeWrapRef}
            style={isSplit ? { width: `${splitRatio * 100}%` } : undefined}
            className={cn(
              "scrollbar-thin overflow-hidden bg-window py-1.5",
              isSplit ? "flex-shrink-0" : "flex-1",
            )}
          >
            <TreeView
              content={activeTab.content}
              query={searchQuery}
              width={treeSize.w}
              height={treeSize.h}
              tabId={activeTab.id}
            />
          </div>
        )}
        {isSplit && (
          <div
            onMouseDown={() => setDragging(true)}
            onDoubleClick={() => setSplitRatio(0.5)}
            role="separator"
            aria-orientation="vertical"
            title="拖拽调整宽度 · 双击复位"
            className={cn(
              "group relative w-px shrink-0 cursor-col-resize bg-border-subtle",
              dragging && "bg-accent",
            )}
          >
            {/* 加宽热区，便于命中 */}
            <span className="absolute inset-y-0 -left-1.5 -right-1.5 z-10" />
            <span
              className={cn(
                "absolute inset-y-0 left-0 w-px transition-colors group-hover:bg-accent",
                dragging && "bg-accent",
              )}
            />
          </div>
        )}
        {showRaw && (
          <div className="min-h-0 min-w-0 flex-1">
            {nodeActive ? (
              <NodeEditor />
            ) : (
              <RawEditor
                value={activeTab.content}
                onChange={(v) => updateContent(activeTab.id, v)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
