import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { useAppStore } from "@/stores/appStore";
import { useThemeStore, applyThemeToDom } from "@/stores/themeStore";
import { useEditorStore } from "@/stores/editorStore";
import { parseJson } from "@/lib/json";
import { openPath, saveTab, saveTabAs } from "@/lib/files";
import { isTauri } from "@/lib/utils";
import { Titlebar } from "@/components/chrome/Titlebar";
import { Sidebar } from "@/components/chrome/Sidebar";
import { TabBar } from "@/components/chrome/TabBar";
import { EditorModule } from "@/components/editor/EditorModule";
import { DecoderModule } from "@/components/decoder/DecoderModule";
import { DiffModule } from "@/components/diff/DiffModule";
import { TooltipProvider } from "@/components/ui/tooltip";

const OPEN_FILES_EVENT = "xjson://open-files";

async function openPathsInEditor(paths: string[]) {
  if (paths.length === 0) return;
  useAppStore.getState().setModule("editor");
  for (const path of paths) {
    await openPath(path);
  }
}

function App() {
  const activeModule = useAppStore((s) => s.activeModule);
  const clipboardWatch = useAppStore((s) => s.clipboardWatch);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  // 剪贴板监听（轮询）。空剪贴板也会清掉角标。
  useEffect(() => {
    if (!clipboardWatch || !isTauri()) return;
    let last: string | null = null;
    let cancelled = false;
    const check = async () => {
      try {
        const text = (await readText()) ?? "";
        if (cancelled || text === last) return;
        last = text;
        const ok = text.trim().length > 0 && parseJson(text).ok;
        useAppStore.getState().setClipboardStatus(ok ? text : null);
      } catch {
        /* 剪贴板暂时不可读 */
      }
    };
    void check();
    const timer = setInterval(() => void check(), 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [clipboardWatch]);

  // 拖入文件。Tauri 2 的 drop 载荷是 { paths, position }，不能当成 string[]。
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type !== "drop") return;
        void openPathsInEditor(event.payload.paths);
      })
      .then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      })
      .catch((err) => console.error("监听拖拽失败", err));
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  // 系统「打开方式」/ 启动时带入的文件。先订阅再取队列，避免冷启动事件被丢掉。
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    const drain = async () => {
      try {
        const paths = await invoke<string[]>("take_pending_opens");
        if (!cancelled) await openPathsInEditor(paths);
      } catch (err) {
        console.error("读取启动文件失败", err);
      }
    };
    listen(OPEN_FILES_EVENT, () => {
      void drain();
    })
      .then((fn) => {
        if (cancelled) {
          fn();
          return;
        }
        unlisten = fn;
        void drain();
      })
      .catch((err) => {
        console.error("监听打开文件失败", err);
        void drain();
      });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  // 全局快捷键：Cmd/Ctrl+S 保存，Cmd/Ctrl+Shift+S 另存为
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        const activeTabId = useEditorStore.getState().activeTabId;
        if (activeModule === "editor" && activeTabId) {
          if (e.shiftKey) saveTabAs(activeTabId);
          else saveTab(activeTabId);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeModule]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen flex-col overflow-hidden bg-window text-text-primary">
        <Titlebar />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <div className="flex min-h-0 flex-1 flex-col">
            {activeModule === "editor" && <TabBar />}
            <div className="min-h-0 flex-1">
              {activeModule === "editor" && <EditorModule />}
              {activeModule === "decoder" && <DecoderModule />}
              {activeModule === "diff" && <DiffModule />}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
