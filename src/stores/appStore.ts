import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ModuleKey, RecentItem } from "@/types";
import { uid, truncate } from "@/lib/utils";

interface AppState {
  activeModule: ModuleKey;
  setModule: (m: ModuleKey) => void;

  // 剪贴板监听
  clipboardWatch: boolean;
  toggleClipboardWatch: () => void;
  clipboardHasJson: boolean; // 角标提示
  setClipboardHasJson: (v: boolean) => void;

  // 最近片段（限 20）
  recents: RecentItem[];
  addRecent: (content: string) => void;
  removeRecent: (id: string) => void;
  clearRecents: () => void;
}

const MAX_RECENTS = 20;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeModule: "editor",
      setModule: (activeModule) => set({ activeModule }),

      clipboardWatch: false,
      toggleClipboardWatch: () =>
        set((s) => ({ clipboardWatch: !s.clipboardWatch, clipboardHasJson: false })),
      clipboardHasJson: false,
      setClipboardHasJson: (clipboardHasJson) => set({ clipboardHasJson }),

      recents: [],
      addRecent: (content) => {
        const trimmed = content.trim();
        if (!trimmed) return;
        const existing = get().recents.filter((r) => r.content !== trimmed);
        const item: RecentItem = {
          id: uid(),
          preview: truncate(trimmed.replace(/\s+/g, " "), 80),
          content: trimmed,
          at: Date.now(),
        };
        set({ recents: [item, ...existing].slice(0, MAX_RECENTS) });
      },
      removeRecent: (id) =>
        set((s) => ({ recents: s.recents.filter((r) => r.id !== id) })),
      clearRecents: () => set({ recents: [] }),
    }),
    {
      name: "xjson-app",
      partialize: (s) => ({
        activeModule: s.activeModule,
        clipboardWatch: s.clipboardWatch,
        recents: s.recents,
      }),
    },
  ),
);
