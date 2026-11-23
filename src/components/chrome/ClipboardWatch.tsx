import { Clipboard } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useDecoderStore } from "@/stores/decoderStore";
import { useEditorStore } from "@/stores/editorStore";
import { formatJson } from "@/lib/json";
import { cn, isTauri, truncate } from "@/lib/utils";
import { Hint } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export function ClipboardWatchButton({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const watch = useAppStore((s) => s.clipboardWatch);
  const toggle = useAppStore((s) => s.toggleClipboardWatch);
  const hasJson = useAppStore((s) => s.clipboardHasJson);
  const text = useAppStore((s) => s.clipboardText);
  const setModule = useAppStore((s) => s.setModule);

  const closeAfter = (action: () => void) => {
    action();
    if (open) onToggle();
  };

  const sendToDecoder = () => {
    if (!text) return;
    closeAfter(() => {
      useDecoderStore.getState().setInput(text);
      setModule("decoder");
      void useDecoderStore.getState().decode();
    });
  };

  const sendToEditor = () => {
    if (!text) return;
    closeAfter(() => {
      useEditorStore.getState().newScratchTab(formatJson(text));
      setModule("editor");
    });
  };

  const hint = !watch
    ? "剪贴板监听"
    : hasJson
      ? "剪贴板里有 JSON"
      : "剪贴板监听已开启";

  // 高亮只表示浮层开着，和模块选中态分开。监听开着只靠开关；绿点只表示剪贴板里有合法 JSON。
  const railButton = (
    <button
      type="button"
      aria-label="剪贴板监听"
      aria-expanded={open}
      onClick={onToggle}
      className={cn(
        "relative flex h-12 w-12 items-center justify-center rounded-md transition-colors",
        open
          ? "bg-surface text-text-primary"
          : "text-text-tertiary hover:bg-surface hover:text-text-secondary",
      )}
    >
      <Clipboard size={20} strokeWidth={1.8} />
      {hasJson && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-success ring-2 ring-sidebar" />
      )}
    </button>
  );

  return (
    <div className="relative">
      {/* 浮层打开时不再挂 tooltip，避免贴在窗口底边被裁切后叠到卡片上 */}
      {open ? railButton : <Hint label={hint}>{railButton}</Hint>}
      {open && (
        <div className="absolute bottom-0 left-full z-40 ml-2 max-h-[min(420px,calc(100vh-1.5rem))] w-[300px] overflow-y-auto rounded-md border border-border-subtle bg-elevated p-3 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-text-primary">监听剪贴板</div>
              <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                {isTauri()
                  ? "发现合法 JSON 时只在图标上显示绿点，不会自动跳转或改写内容。"
                  : "读取系统剪贴板只在桌面版可用。"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={watch}
              aria-label={watch ? "关闭剪贴板监听" : "开启剪贴板监听"}
              onClick={toggle}
              className={cn(
                "relative mt-0.5 h-5 w-9 shrink-0 appearance-none rounded-full p-0 transition-colors",
                watch ? "bg-accent" : "bg-border-strong",
              )}
            >
              <span
                className={cn(
                  "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-text-primary transition-transform",
                  watch ? "translate-x-4" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {hasJson && text ? (
            <div className="mt-3 flex flex-col gap-2">
              <pre className="scrollbar-thin max-h-24 overflow-auto whitespace-pre-wrap break-all rounded-md bg-inset p-2 font-mono text-2xs text-text-secondary">
                {truncate(text.replace(/\s+/g, " "), 180)}
              </pre>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="soft" onClick={sendToDecoder}>
                  送入解码器
                </Button>
                <Button type="button" size="sm" variant="surface" onClick={sendToEditor}>
                  在编辑器打开
                </Button>
              </div>
            </div>
          ) : watch ? (
            <p className="mt-3 text-xs text-text-secondary">
              正在监听，剪贴板里还没有合法 JSON。
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
