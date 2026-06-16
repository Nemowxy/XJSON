import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 检测当前是否运行在 Tauri 环境（否则降级为浏览器 mock） */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function truncate(s: string, n = 120): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}
