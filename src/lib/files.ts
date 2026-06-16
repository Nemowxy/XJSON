import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
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
