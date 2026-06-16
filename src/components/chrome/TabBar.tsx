import { useState, type MouseEvent } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, Plus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useEditorStore } from "@/stores/editorStore";
import type { Tab } from "@/types";
import { cn, isTauri } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function TabBar() {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const setActive = useEditorStore((s) => s.setActive);
  const closeTab = useEditorStore((s) => s.closeTab);
  const closeOthers = useEditorStore((s) => s.closeOthers);
  const closeAll = useEditorStore((s) => s.closeAll);
  const newScratchTab = useEditorStore((s) => s.newScratchTab);
  const reorderTabs = useEditorStore((s) => s.reorderTabs);

  const [confirmClose, setConfirmClose] = useState<Tab | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = tabs.findIndex((t) => t.id === active.id);
    const to = tabs.findIndex((t) => t.id === over.id);
    if (from !== -1 && to !== -1) reorderTabs(from, to);
  };

  const requestClose = (tab: Tab) => {
    if (tab.isDirty) setConfirmClose(tab);
    else closeTab(tab.id);
  };

  if (tabs.length === 0) return null;

  return (
    <>
      <div className="scrollbar-none flex h-10 shrink-0 items-stretch overflow-x-auto border-b border-border-subtle bg-sidebar">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={tabs.map((t) => t.id)}
            strategy={horizontalListSortingStrategy}
          >
            {tabs.map((tab) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                active={tab.id === activeTabId}
                onSelect={() => setActive(tab.id)}
                onClose={() => requestClose(tab)}
                onCloseOthers={() => closeOthers(tab.id)}
                onCloseAll={closeAll}
              />
            ))}
          </SortableContext>
        </DndContext>
        <button
          onClick={() => newScratchTab()}
          aria-label="新建标签"
          className="flex w-9 shrink-0 items-center justify-center border-l border-border-subtle text-text-tertiary transition hover:bg-surface hover:text-text-primary"
        >
          <Plus size={15} />
        </button>
      </div>

      <Dialog open={!!confirmClose} onOpenChange={(o) => !o && setConfirmClose(null)}>
        <DialogContent>
          <DialogTitle>关闭未保存的标签？</DialogTitle>
          <DialogDescription>
            "{confirmClose?.fileName}" 有未保存的修改，关闭后将丢失。
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmClose(null)}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmClose) closeTab(confirmClose.id);
                setConfirmClose(null);
              }}
            >
              放弃并关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface SortableTabProps {
  tab: Tab;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
}

function SortableTab({
  tab,
  active,
  onSelect,
  onClose,
  onCloseOthers,
  onCloseAll,
}: SortableTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tab.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      onClose();
    }
  };

  const copyPath = async () => {
    if (!tab.filePath) return;
    if (isTauri()) await writeText(tab.filePath);
    else await navigator.clipboard.writeText(tab.filePath);
  };

  const reveal = async () => {
    if (tab.filePath && isTauri()) await invoke("reveal_in_finder", { path: tab.filePath });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          onClick={onSelect}
          onMouseDown={onMouseDown}
          className={cn(
            "group relative flex min-w-[120px] max-w-[220px] cursor-pointer items-center gap-2 border-r border-border-subtle px-3 text-xs transition-colors",
            active
              ? "bg-window text-text-primary"
              : "text-text-secondary hover:bg-surface/60",
          )}
        >
          {active && <span className="absolute inset-x-0 top-0 h-0.5 bg-accent" />}
          <span className="truncate">{tab.fileName}</span>
          <span className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center">
            {tab.isDirty ? (
              <span className="h-1.5 w-1.5 rounded-full bg-text-secondary group-hover:hidden" />
            ) : null}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="关闭标签"
              className={cn(
                "hidden h-4 w-4 items-center justify-center rounded text-text-tertiary hover:bg-elevated hover:text-text-primary group-hover:flex",
                !tab.isDirty && "group-hover:flex",
              )}
            >
              <X size={12} />
            </button>
          </span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onClose}>关闭</ContextMenuItem>
        <ContextMenuItem onSelect={onCloseOthers}>关闭其他</ContextMenuItem>
        <ContextMenuItem onSelect={onCloseAll}>关闭全部</ContextMenuItem>
        {tab.filePath && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={reveal}>在文件管理器中显示</ContextMenuItem>
            <ContextMenuItem onSelect={copyPath}>复制文件路径</ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
