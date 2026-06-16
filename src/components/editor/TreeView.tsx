import { useMemo, useState } from "react";
import { Tree, type NodeRendererProps } from "react-arborist";
import { ChevronRight, ChevronDown } from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { JsonNode } from "@/types";
import { buildTree, parseJson, typeBadge, nodeMatches } from "@/lib/json";
import { cn, isTauri } from "@/lib/utils";
import { useEditorStore } from "@/stores/editorStore";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

interface TreeViewProps {
  content: string;
  query: string;
  height: number;
  width: number;
  tabId: string;
}

const badgeColor: Record<string, string> = {
  object: "text-syntax-punct",
  array: "text-syntax-punct",
  string: "text-syntax-string",
  number: "text-syntax-number",
  boolean: "text-syntax-bool",
  null: "text-syntax-null",
};

export function TreeView({ content, query, height, width, tabId }: TreeViewProps) {
  const parsed = useMemo(() => parseJson(content), [content]);
  const root = useMemo(
    () => (parsed.ok ? buildTree(parsed.value) : null),
    [parsed],
  );

  if (!parsed.ok) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-danger">
        JSON 无法解析：{parsed.error}
      </div>
    );
  }
  if (!root) return null;

  // 始终以 $ 根节点作为树的根，便于查看完整文档 / 恢复默认显示
  const data = [root];

  return (
    <Tree<JsonNode>
      data={data}
      idAccessor="id"
      childrenAccessor={(n) => n.children ?? null}
      openByDefault={false}
      initialOpenState={{ $: true }}
      width={width}
      height={height}
      indent={16}
      rowHeight={26}
      searchTerm={query}
      searchMatch={(node, term) => nodeMatches(node.data, term)}
    >
      {(props) => <Row {...props} query={query} tabId={tabId} />}
    </Tree>
  );
}

function Row({
  node,
  style,
  query,
  tabId,
}: NodeRendererProps<JsonNode> & { query: string; tabId: string }) {
  const data = node.data;
  const isBranch = data.type === "object" || data.type === "array";
  const matched = query ? nodeMatches(data, query) : false;
  const [copied, setCopied] = useState(false);
  const selectNode = useEditorStore((s) => s.selectNode);
  const isSelected = useEditorStore(
    (s) => s.selectedNode?.tabId === tabId && s.selectedNode?.path === data.path,
  );

  const copy = async (text: string) => {
    if (isTauri()) await writeText(text);
    else await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 800);
  };

  const handleClick = () => {
    if (isBranch) node.toggle();
    selectNode({
      tabId,
      path: data.path,
      keys: data.keys,
      key: data.key,
    });
  };

  const valueText =
    data.type === "string"
      ? String(data.value)  // 不添加额外引号，JSON 已包含
      : data.value === null
        ? "null"
        : String(data.value);

  const count = data.children?.length ?? 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          style={style}
          className={cn(
            "flex items-center gap-1.5 rounded px-1 font-mono text-xs hover:bg-surface/60",
            matched && "bg-warning-soft",
            isSelected && "bg-accent/15 ring-1 ring-inset ring-accent/40",
          )}
          onClick={handleClick}
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-text-tertiary">
            {isBranch ? (
              node.isOpen ? (
                <ChevronDown size={13} />
              ) : (
                <ChevronRight size={13} />
              )
            ) : null}
          </span>
          <span className={cn("shrink-0 text-[10px]", badgeColor[data.type])}>
            {typeBadge(data.type)}
          </span>
          {data.key !== null ? (
            <span className="shrink-0 text-syntax-key">{data.key}:</span>
          ) : (
            <span className="shrink-0 text-syntax-key">$</span>
          )}
          {isBranch ? (
            <span className="text-text-tertiary">
              {data.type === "array" ? `[${count}]` : `{${count}}`}
            </span>
          ) : (
            <span
              className={cn("truncate", badgeColor[data.type])}
              title={valueText}
            >
              {valueText}
            </span>
          )}
          {copied && <span className="ml-2 text-[10px] text-success">已复制</span>}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {!isBranch && (
          <ContextMenuItem onSelect={() => copy(String(data.value))}>
            复制值
          </ContextMenuItem>
        )}
        <ContextMenuItem onSelect={() => copy(data.path)}>
          复制路径
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => copy(data.path)}>
          {data.path}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
