import { useEffect, useRef, useState } from "react";
import { X, AlertCircle, Check } from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";
import { RawEditor } from "./RawEditor";
import { parseJson, readNodeText, writeNodeText } from "@/lib/json";
import { Hint } from "@/components/ui/tooltip";

/**
 * 聚焦编辑器：显示当前选中树节点对应的 value。
 * - value 为对象/数组时格式化展示（保留其内部注释）；标量直接显示值。
 * - 编辑后按路径回写到完整文档，保留该子树内部及全文其余位置的注释。
 * - 根节点 $ 等价于编辑整篇文档。
 */
export function NodeEditor() {
  const selectedNode = useEditorStore((s) => s.selectedNode);
  const activeTab = useEditorStore((s) => s.activeTab());
  const updateContent = useEditorStore((s) => s.updateContent);
  const selectNode = useEditorStore((s) => s.selectNode);

  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  // 仅在选中节点变化时重新初始化草稿
  const lastPathRef = useRef<string | null>(null);

  // 从当前文档读取选中路径处的原文片段（含注释）
  const currentText =
    selectedNode && activeTab
      ? readNodeText(activeTab.content, selectedNode.keys)
      : null;

  useEffect(() => {
    if (!selectedNode) return;
    if (lastPathRef.current === selectedNode.path) return;
    lastPathRef.current = selectedNode.path;
    setDraft(currentText ?? "");
    setError(null);
  }, [selectedNode, currentText]);

  if (!selectedNode || !activeTab) return null;

  const isRoot = selectedNode.keys.length === 0;
  const label = isRoot ? "根节点 $（整篇文档）" : selectedNode.path;

  const close = () => selectNode(null);

  const handleChange = (text: string) => {
    setDraft(text);
    // 校验节点内容是否为合法 JSON/JSONC
    const valueParsed = parseJson(text);
    if (!valueParsed.ok) {
      setError(valueParsed.error ?? "无效 JSON");
      return;
    }
    setError(null);
    const next = writeNodeText(activeTab.content, selectedNode.keys, text);
    if (next === null) {
      setError("路径已失效，无法回写");
      return;
    }
    updateContent(activeTab.id, next);
  };

  // 路径在当前文档中已不存在
  if (currentText === null) {
    return (
      <div className="flex h-full flex-col">
        <NodeHeader label={label} onClose={close} status="missing" />
        <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-text-tertiary">
          该路径在当前文档中已不存在
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <NodeHeader
        label={label}
        onClose={close}
        status={error ? "error" : "ok"}
        error={error}
      />
      <div className="min-h-0 flex-1">
        <RawEditor value={draft} onChange={handleChange} />
      </div>
    </div>
  );
}

function NodeHeader({
  label,
  onClose,
  status,
  error,
}: {
  label: string;
  onClose: () => void;
  status: "ok" | "error" | "missing";
  error?: string | null;
}) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border-subtle bg-window px-3">
      <span className="text-2xs text-text-tertiary">节点</span>
      <span
        className="truncate font-mono text-xs text-text-secondary"
        title={label}
      >
        {label}
      </span>
      {status === "ok" && (
        <Check size={13} className="shrink-0 text-success" />
      )}
      {status === "error" && (
        <span className="flex shrink-0 items-center gap-1 text-2xs text-danger">
          <AlertCircle size={12} />
          {error}
        </span>
      )}
      <Hint label="返回完整文档">
        <button
          onClick={onClose}
          aria-label="返回完整文档"
          className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-tertiary transition hover:bg-surface hover:text-text-primary"
        >
          <X size={14} />
        </button>
      </Hint>
    </div>
  );
}
