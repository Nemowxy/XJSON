import { FileInput, Copy, Check } from "lucide-react";
import { useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useDecoderStore } from "@/stores/decoderStore";
import { useEditorStore } from "@/stores/editorStore";
import { useAppStore } from "@/stores/appStore";
import { formatJson, parseJson } from "@/lib/json";
import { isTauri } from "@/lib/utils";
import { InputBox } from "./InputBox";
import { PipelineView } from "./PipelineView";
import { Button } from "@/components/ui/button";

export function DecoderModule() {
  const steps = useDecoderStore((s) => s.steps);
  const error = useDecoderStore((s) => s.error);
  const finalOutput = useDecoderStore((s) => s.finalOutput());
  const newScratchTab = useEditorStore((s) => s.newScratchTab);
  const setModule = useAppStore((s) => s.setModule);
  const [copied, setCopied] = useState(false);

  const hasResult = steps.length > 0;
  const finalParsed = parseJson(finalOutput);
  const formatted = finalParsed.ok ? formatJson(finalOutput) : finalOutput;

  const sendToEditor = () => {
    newScratchTab(formatted);
    setModule("editor");
  };

  const copyResult = async () => {
    if (isTauri()) await writeText(formatted);
    else await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <div className="scrollbar-thin flex h-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
        <div>
          <h1 className="text-base font-semibold text-text-primary">
            String → JSON 解码器
          </h1>
          <p className="mt-1 text-xs text-text-secondary">
            自动检测并逐层解码多重转义，展示“剥洋葱”过程
          </p>
        </div>

        <InputBox />

        {error && (
          <div className="rounded-md border border-danger/40 bg-danger-soft p-3 text-xs text-danger">
            {error}
          </div>
        )}

        {hasResult && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-2xs font-semibold uppercase tracking-wide text-text-tertiary">
                解码流水线 · {steps.length} 层
              </span>
              <div className="h-px flex-1 bg-border-subtle" />
            </div>
            <PipelineView steps={steps} />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold uppercase tracking-wide text-text-tertiary">
                  最终结果
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={copyResult}>
                    {copied ? (
                      <Check size={13} className="text-success" />
                    ) : (
                      <Copy size={13} />
                    )}
                    复制
                  </Button>
                  <Button variant="soft" size="sm" onClick={sendToEditor}>
                    <FileInput size={13} />
                    送入编辑器
                  </Button>
                </div>
              </div>
              <pre className="scrollbar-thin max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border-subtle bg-inset p-3 font-mono text-xs text-text-primary">
                {formatted}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
