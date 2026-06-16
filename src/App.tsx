import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
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

function App() {
  const activeModule = useAppStore((s) => s.activeModule);
  const clipboardWatch = useAppStore((s) => s.clipboardWatch);
  const setClipboardHasJson = useAppStore((s) => s.setClipboardHasJson);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  // 剪贴板监听（轮询）
  useEffect(() => {
    if (!clipboardWatch || !isTauri()) return;
    let last = "";
    const check = async () => {
      try {
        const text = await readText();
        if (!text || text === last) return;
        last = text;
        const r = parseJson(text);
        setClipboardHasJson(r.ok);
      } catch {
        /* ignore */
      }
    };
    check();
    const timer = setInterval(check, 1500);
    return () => clearInterval(timer);
  }, [clipboardWatch, setClipboardHasJson]);

  // 文件拖拽 + 打开方式关联
  useEffect(() => {
    if (!isTauri()) return;
    const unlisten = listen<string[]>("tauri://drag-drop", (e) => {
      e.payload.forEach((path) => openPath(path));
    });
    return () => {
      unlisten.then((fn) => fn());
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
