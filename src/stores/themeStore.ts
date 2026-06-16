import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeKey } from "@/types";

interface ThemeState {
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => {
        set({ theme });
        applyThemeToDom(theme);
      },
      toggleTheme: () => {
        const next = get().theme === "dark" ? "editorial" : "dark";
        set({ theme: next });
        applyThemeToDom(next);
      },
    }),
    {
      name: "xjson-theme",
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeToDom(state.theme);
      },
    },
  ),
);

export function applyThemeToDom(theme: ThemeKey) {
  document.documentElement.setAttribute("data-theme", theme);
}
