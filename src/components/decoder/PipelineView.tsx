import { ArrowDown, Check, AlertTriangle } from "lucide-react";
import type { DecodeStep, DecodeKind } from "@/types";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<DecodeKind, string> = {
  jsonUnescape: "JSON Unescape",
  urlDecode: "URL Decode",
  base64: "Base64 Decode",
  unicode: "Unicode Unescape",
};

export function PipelineView({ steps }: { steps: DecodeStep[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, i) => (
        <div key={step.index} className="flex flex-col">
          <StepCard step={step} index={i} />
          {i < steps.length - 1 && (
            <div className="flex justify-center py-1.5 text-text-tertiary">
              <ArrowDown size={16} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StepCard({ step, index }: { step: DecodeStep; index: number }) {
  return (
    <div
      className={cn(
        "rounded-md border bg-surface p-3",
        step.success ? "border-border-subtle" : "border-warning/40",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
          {index + 1}
        </span>
        <span className="text-xs font-semibold text-text-primary">
          {KIND_LABEL[step.kind]}
        </span>
        {step.isJson && (
          <span className="flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] text-success">
            <Check size={10} />
            JSON
          </span>
        )}
        {!step.success && (
          <span className="flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] text-warning">
            <AlertTriangle size={10} />
            停止
          </span>
        )}
      </div>
      <pre className="scrollbar-thin max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-inset p-2.5 font-mono text-xs text-text-secondary">
        {step.output}
      </pre>
      {step.note && (
        <p className="mt-1.5 text-2xs text-text-tertiary">{step.note}</p>
      )}
    </div>
  );
}
