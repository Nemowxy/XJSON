import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { FileContent } from "@/types";
import { useEditorStore } from "@/stores/editorStore";
import { isTauri } from "@/lib/utils";

const ACCEPT_EXT = ["json", "jsonc", "json5", "cfg", "conf", "config", "lock", "txt"];

/** 通过对话框打开文件（支持多选），读入编辑器 tab */
export async function openFileDialog() {
  if (!isTauri()) {
    // 浏览器降级：input file
    return openViaBrowser();
  }
  const selected = await open({
    multiple: true,
    filters: [{ name: "JSON / 文本", extensions: ACCEPT_EXT }],
  });
  if (!selected) return;
  const paths = Array.isArray(selected) ? selected : [selected];
  for (const path of paths) {
    await openPath(path);
  }
}

/** 读取指定路径并打开为 tab */
export async function openPath(path: string) {
  const store = useEditorStore.getState();
  try {
    const fc = await invoke<FileContent>("read_json_file", { path });
    store.openFromFile(fc.filePath, fc.fileName, fc.content);
  } catch (e) {
    console.error("打开文件失败", e);
  }
}

async function openViaBrowser() {
  return new Promise<void>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ACCEPT_EXT.map((e) => `.${e}`).join(",");
    input.onchange = async () => {
      const store = useEditorStore.getState();
      const files = Array.from(input.files ?? []);
      for (const file of files) {
        const content = await file.text();
        store.openFromFile(file.name, file.name, content);
      }
      resolve();
    };
    input.click();
  });
}

/**
 * 保存指定 tab 到磁盘。
 * - 已有 filePath 直接写回；否则触发另存为对话框。
 * - 浏览器环境降级为下载文件。
 * @returns 是否真正完成写入（用户取消另存为时返回 false）
 */
export async function saveTab(tabId: string): Promise<boolean> {
  const store = useEditorStore.getState();
  const tab = store.tabs.find((t) => t.id === tabId);
  if (!tab) return false;

  if (!isTauri()) {
    return saveViaBrowser(tab.fileName, tab.content);
  }

  if (tab.filePath) {
    try {
      await invoke("write_json_file", { path: tab.filePath, content: tab.content });
      store.markSaved(tab.id);
      return true;
    } catch (e) {
      console.error("保存失败", e);
      return false;
    }
  }
  return saveTabAs(tabId);
}

/** 始终弹出对话框选择路径后保存 */
export async function saveTabAs(tabId: string): Promise<boolean> {
  const store = useEditorStore.getState();
  const tab = store.tabs.find((t) => t.id === tabId);
  if (!tab) return false;

  if (!isTauri()) {
    return saveViaBrowser(tab.fileName, tab.content);
  }

  const path = await save({
    defaultPath: tab.filePath ?? tab.fileName,
    filters: [{ name: "JSON / 文本", extensions: ACCEPT_EXT }],
  });
  if (!path) return false;

  try {
    await invoke("write_json_file", { path, content: tab.content });
    const fileName = path.split(/[\\/]/).pop() ?? tab.fileName;
    store.markSaved(tab.id, path, fileName);
    return true;
  } catch (e) {
    console.error("另存为失败", e);
    return false;
  }
}

/** 浏览器降级：触发下载 */
function saveViaBrowser(fileName: string, content: string): boolean {
  try {
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    // 浏览器无法确认文件最终落盘位置，乐观地标记为已保存
    const store = useEditorStore.getState();
    const tab = store.tabs.find((t) => t.fileName === fileName);
    if (tab) store.markSaved(tab.id);
    return true;
  } catch (e) {
    console.error("下载失败", e);
    return false;
  }
}
