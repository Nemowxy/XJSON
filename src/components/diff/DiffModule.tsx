import { DiffModeToggle } from "./DiffModeToggle";
import { DiffColumns } from "./DiffColumns";
import { DiffSummary } from "./DiffSummary";

export function DiffModule() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border-subtle bg-window px-3">
        <div>
          <h2 className="font-serif text-sm font-semibold text-text-primary">JSON Diff</h2>
          <p className="text-2xs text-text-secondary">比较两份 JSON 的差异</p>
        </div>
        <DiffModeToggle />
      </div>
      <div className="flex min-h-0 flex-1">
        <DiffColumns />
        <DiffSummary />
      </div>
    </div>
  );
}
