import { WandSparkles, RotateCcw } from "lucide-react";
import { useDecoderStore } from "@/stores/decoderStore";
import { Button } from "@/components/ui/button";

export function InputBox() {
  const input = useDecoderStore((s) => s.input);
  const setInput = useDecoderStore((s) => s.setInput);
  const decode = useDecoderStore((s) => s.decode);
  const reset = useDecoderStore((s) => s.reset);
  const running = useDecoderStore((s) => s.running);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-2xs font-semibold uppercase tracking-wide text-text-tertiary">
          输入字符串
        </label>
        <span className="text-2xs text-text-tertiary">
          {input.length.toLocaleString()} 字符
        </span>
      </div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='粘贴含 \" 转义、URL 编码、Base64、\uXXXX 的字符串…'
        spellCheck={false}
        className="scrollbar-thin h-40 w-full resize-none rounded-md border border-border-subtle bg-inset p-3 font-mono text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <Button variant="default" onClick={decode} disabled={running}>
          <WandSparkles size={15} />
          {running ? "解码中…" : "解码"}
        </Button>
        <Button variant="ghost" onClick={reset}>
          <RotateCcw size={14} />
          清空
        </Button>
      </div>
    </div>
  );
}
