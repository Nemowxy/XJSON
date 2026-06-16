import { useRef } from "react";
import Editor, { type Monaco, type OnMount, loader } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useThemeStore } from "@/stores/themeStore";
import { registerMonacoThemes, monacoThemeFor } from "@/lib/monaco";
import { parseJson } from "@/lib/json";

// 配置 Monaco 使用本地文件（避免 CSP 阻止 CDN）
loader.config({ paths: { vs: '/vs' } });

interface RawEditorProps {
  value: string;
  onChange: (v: string) => void;
}

export function RawEditor({ value, onChange }: RawEditorProps) {
  const theme = useThemeStore((s) => s.theme);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const beforeMount = (monaco: Monaco) => {
    registerMonacoThemes(monaco);
  };

  const onMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
    monaco.editor.setTheme(monacoThemeFor(theme));
    validate(value);
  };

  const validate = (text: string) => {
    const monaco = monacoRef.current;
    const ed = editorRef.current;
    if (!monaco || !ed) return;
    const model = ed.getModel();
    if (!model) return;

    const result = parseJson(text);
    const markers: editor.IMarkerData[] = [];
    if (!result.ok && text.trim() !== "") {
      const line = result.errorLine ?? 1;
      const col = result.errorColumn ?? 1;
      markers.push({
        severity: monaco.MarkerSeverity.Error,
        message: result.error ?? "JSON 解析错误",
        startLineNumber: line,
        startColumn: Math.max(1, col - 1),
        endLineNumber: line,
        endColumn: col + 1,
      });
    }
    monaco.editor.setModelMarkers(model, "xjson", markers);
  };

  // 主题切换时实时应用
  if (monacoRef.current) {
    monacoRef.current.editor.setTheme(monacoThemeFor(theme));
  }

  return (
    <Editor
      language="json"
      value={value}
      beforeMount={beforeMount}
      onMount={onMount}
      onChange={(v) => {
        const next = v ?? "";
        onChange(next);
        validate(next);
      }}
      options={{
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        tabSize: 2,
        wordWrap: "on",
        renderLineHighlight: "line",
        padding: { top: 12, bottom: 12 },
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        largeFileOptimizations: true,
        automaticLayout: true,
      }}
    />
  );
}
