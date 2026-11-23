import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ModuleKey, RecentItem } from "@/types";
import { parseJson } from "@/lib/json";
import { uid, truncate } from "@/lib/utils";

/** localStorage quota is shared with the rest of the app. Skip huge lockfiles. */
const MAX_RECENT_CHARS = 100_000;

interface AppState {
  activeModule: ModuleKey;
  setModule: (m: ModuleKey) => void;

  // 剪贴板监听
  clipboardWatch: boolean;
  toggleClipboardWatch: () => void;
  clipboardHasJson: boolean; // 角标提示
  clipboardText: string | null; // 最近一次检测到的合法 JSON，不持久化
  setClipboardStatus: (text: string | null) => void;

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
        set((s) => ({
          clipboardWatch: !s.clipboardWatch,
          clipboardHasJson: false,
          clipboardText: null,
        })),
      clipboardHasJson: false,
      clipboardText: null,
      setClipboardStatus: (clipboardText) =>
        set({ clipboardText, clipboardHasJson: clipboardText !== null }),

      recents: [],
      addRecent: (content) => {
        const trimmed = content.trim();
        // 只记录成功解析的 JSON。超长文件（例如 lockfile）不写入，避免撑满 localStorage。
        if (!trimmed || trimmed.length > MAX_RECENT_CHARS) return;
        if (!parseJson(trimmed).ok) return;
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
