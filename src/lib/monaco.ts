import type { Monaco } from "@monaco-editor/react";

let registered = false;

/** 注册两套与 design.pen 对齐的 Monaco 主题 */
export function registerMonacoThemes(monaco: Monaco) {
  if (registered) return;
  registered = true;

  monaco.editor.defineTheme("xjson-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "string.key.json", foreground: "79C0FF" },
      { token: "string.value.json", foreground: "7EE787" },
      { token: "string", foreground: "7EE787" },
      { token: "number", foreground: "FFA657" },
      { token: "keyword.json", foreground: "D2A8FF" },
      { token: "keyword", foreground: "D2A8FF" },
      { token: "delimiter", foreground: "8B949E" },
      { token: "delimiter.bracket", foreground: "8B949E" },
    ],
    colors: {
      "editor.background": "#141416",
      "editor.foreground": "#F5F5F7",
      "editorLineNumber.foreground": "#636366",
      "editorLineNumber.activeForeground": "#9A9AA0",
      "editor.selectionBackground": "#0A84FF40",
      "editor.lineHighlightBackground": "#FFFFFF08",
      "editorCursor.foreground": "#0A84FF",
      "editorIndentGuide.background1": "#2A2A2C",
      "editorError.foreground": "#FF453A",
    },
  });

  monaco.editor.defineTheme("xjson-editorial", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "string.key.json", foreground: "2A5A55" },
      { token: "string.value.json", foreground: "4D6B2F" },
      { token: "string", foreground: "4D6B2F" },
      { token: "number", foreground: "B45309" },
      { token: "keyword.json", foreground: "7C3A6B" },
      { token: "keyword", foreground: "7C3A6B" },
      { token: "delimiter", foreground: "9C9385" },
      { token: "delimiter.bracket", foreground: "9C9385" },
    ],
    colors: {
      "editor.background": "#EFE8DC",
      "editor.foreground": "#1C1814",
      "editorLineNumber.foreground": "#9C9385",
      "editorLineNumber.activeForeground": "#6B6357",
      "editor.selectionBackground": "#C2410C1F",
      "editor.lineHighlightBackground": "#1C181410",
      "editorCursor.foreground": "#C2410C",
      "editorIndentGuide.background1": "#E7E0D6",
      "editorError.foreground": "#A13D2D",
    },
  });
}

/** 根据 app 主题取对应 Monaco 主题名 */
export function monacoThemeFor(theme: "dark" | "editorial"): string {
  return theme === "dark" ? "xjson-dark" : "xjson-editorial";
}
