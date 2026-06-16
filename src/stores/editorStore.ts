import { create } from "zustand";
import type { Tab } from "@/types";
import { uid } from "@/lib/utils";

export type PanelLayout = "split" | "tree-only" | "raw-only";

interface EditorState {
  tabs: Tab[];
  activeTabId: string | null;
  panelLayout: PanelLayout;
  searchQuery: string;

  // 派生
  activeTab: () => Tab | undefined;

  // tab 生命周期
  openTab: (tab: Omit<Tab, "id">) => string;
  openFromFile: (filePath: string, fileName: string, content: string) => string;
  newScratchTab: (content?: string) => string;
  setActive: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  markSaved: (id: string, filePath?: string, fileName?: string) => void;
  closeTab: (id: string) => void;
  closeOthers: (id: string) => void;
  closeAll: () => void;
  reorderTabs: (from: number, to: number) => void;

  setPanelLayout: (l: PanelLayout) => void;
  setSearchQuery: (q: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  panelLayout: "split",
  searchQuery: "",

  activeTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId);
  },

  openTab: (tab) => {
    const id = uid();
    const newTab = { ...tab, id };
    set((s) => {
      // 插入到当前激活 tab 右侧，没有激活则插入末尾
      if (s.activeTabId) {
        const activeIdx = s.tabs.findIndex((t) => t.id === s.activeTabId);
        if (activeIdx !== -1) {
          const tabs = [...s.tabs];
          tabs.splice(activeIdx + 1, 0, newTab);
          return { tabs, activeTabId: id };
        }
      }
      // 默认添加到末尾
      return { tabs: [...s.tabs, newTab], activeTabId: id };
    });
    return id;
  },

  openFromFile: (filePath, fileName, content) => {
    // 已打开同一文件则切过去
    const existing = get().tabs.find((t) => t.filePath === filePath);
    if (existing) {
      set({ activeTabId: existing.id });
      return existing.id;
    }
    return get().openTab({ filePath, fileName, content, isDirty: false, isNew: false });
  },

  newScratchTab: (content = "") => {
    const n =
      get().tabs.filter((t) => t.isNew).length + 1;
    return get().openTab({
      fileName: `untitled-${n}.json`,
      content,
      isDirty: content.trim().length > 0,
      isNew: true,
    });
  },

  setActive: (activeTabId) => set({ activeTabId }),

  updateContent: (id, content) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, content, isDirty: true } : t,
      ),
    })),

  markSaved: (id, filePath, fileName) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              isDirty: false,
              isNew: false,
              filePath: filePath ?? t.filePath,
              fileName: fileName ?? t.fileName,
            }
          : t,
      ),
    })),

  closeTab: (id) =>
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id);
      const tabs = s.tabs.filter((t) => t.id !== id);
      let activeTabId = s.activeTabId;
      if (s.activeTabId === id) {
        const next = tabs[idx] ?? tabs[idx - 1] ?? tabs[0];
        activeTabId = next?.id ?? null;
      }
      return { tabs, activeTabId };
    }),

  closeOthers: (id) =>
    set((s) => ({
      tabs: s.tabs.filter((t) => t.id === id),
      activeTabId: id,
    })),

  closeAll: () => set({ tabs: [], activeTabId: null }),

  reorderTabs: (from, to) =>
    set((s) => {
      const tabs = [...s.tabs];
      const [moved] = tabs.splice(from, 1);
      tabs.splice(to, 0, moved);
      return { tabs };
    }),

  setPanelLayout: (panelLayout) => set({ panelLayout }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
