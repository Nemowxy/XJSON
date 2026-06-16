import { FolderOpen, FilePlus2 } from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";
import { openFileDialog } from "@/lib/files";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

const SAMPLE = JSON.stringify(
  {
    app: "XJSON",
    version: "0.1.0",
    features: ["editor", "decoder", "diff"],
    settings: { theme: "dark", autoFormat: true, indent: 2 },
    nested: { users: [{ id: 1, name: "Ada" }, { id: 2, name: "Linus" }] },
  },
  null,
  2,
);

export function EmptyState() {
  const newScratchTab = useEditorStore((s) => s.newScratchTab);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
      <Logo size={72} className="drop-shadow-lg" />
      <div className="text-center">
        <h2 className="text-base font-semibold text-text-primary">还没有打开的文件</h2>
        <p className="mt-1.5 text-xs text-text-secondary">
          打开文件、拖拽到窗口，或新建一个空白标签开始编辑
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="default" size="md" onClick={openFileDialog}>
          <FolderOpen size={15} />
          打开文件
        </Button>
        <Button variant="surface" size="md" onClick={() => newScratchTab()}>
          <FilePlus2 size={15} />
          新建空白
        </Button>
        <Button variant="ghost" size="md" onClick={() => newScratchTab(SAMPLE)}>
          载入示例
        </Button>
      </div>
      <p className="text-2xs text-text-tertiary">
        支持 .json / .jsonc / .json5 / .cfg / .conf / .config / .lock
      </p>
    </div>
  );
}
