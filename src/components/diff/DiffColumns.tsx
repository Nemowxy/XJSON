import { useMemo } from "react";
import { diffLines, type Change } from "diff";
import { useDiffStore } from "@/stores/diffStore";
import { formatJson, parseJson } from "@/lib/json";
import { cn } from "@/lib/utils";

export function DiffColumns() {
  const left = useDiffStore((s) => s.left);
  const right = useDiffStore((s) => s.right);
  const mode = useDiffStore((s) => s.mode);
  const setLeft = useDiffStore((s) => s.setLeft);
  const setRight = useDiffStore((s) => s.setRight);
  const compute = useDiffStore((s) => s.compute);

  const hasInput = left.trim() && right.trim();
  const lp = parseJson(left);
  const rp = parseJson(right);
  const bothValid = lp.ok && rp.ok;

  if (!hasInput || !bothValid || mode === "text") {
    return (
      <TextDiffOrInput
        left={left}
        right={right}
        setLeft={setLeft}
        setRight={setRight}
        compute={compute}
        showTextDiff={Boolean(hasInput && mode === "text")}
      />
    );
  }

  return (
    <StructuralView leftFormatted={formatJson(left)} rightFormatted={formatJson(right)} />
  );
}

function TextDiffOrInput({
  left,
  right,
  setLeft,
  setRight,
  compute,
  showTextDiff,
}: {
  left: string;
  right: string;
  setLeft: (v: string) => void;
  setRight: (v: string) => void;
  compute: () => void;
  showTextDiff: boolean;
}) {
  const changes = useMemo<Change[]>(
    () => (showTextDiff ? diffLines(left, right) : []),
    [left, right, showTextDiff],
  );

  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-px bg-border-subtle">
      <Pane title="ORIGINAL">
        <textarea
          value={left}
          onChange={(e) => setLeft(e.target.value)}
          onBlur={compute}
          placeholder="粘贴左侧 JSON…"
          spellCheck={false}
          className="scrollbar-thin h-full w-full resize-none bg-inset p-3 font-mono text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none"
        />
      </Pane>
      <Pane title="MODIFIED">
        <textarea
          value={right}
          onChange={(e) => setRight(e.target.value)}
          onBlur={compute}
          placeholder="粘贴右侧 JSON…"
          spellCheck={false}
          className="scrollbar-thin h-full w-full resize-none bg-inset p-3 font-mono text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none"
        />
      </Pane>
      {showTextDiff && (
        <div className="col-span-2 bg-window">
          <TextDiffResult changes={changes} />
        </div>
      )}
    </div>
  );
}

function TextDiffResult({ changes }: { changes: Change[] }) {
  return (
    <div className="scrollbar-thin max-h-full overflow-auto p-2 font-mono text-xs">
      {changes.map((c, i) => {
        const cls = c.added
          ? "bg-success-soft text-success"
          : c.removed
            ? "bg-danger-soft text-danger"
            : "text-text-secondary";
        const prefix = c.added ? "+" : c.removed ? "-" : " ";
        return c.value
          .replace(/\n$/, "")
          .split("\n")
          .map((line, j) => (
            <div key={`${i}-${j}`} className={cn("whitespace-pre-wrap px-2", cls)}>
              {prefix} {line}
            </div>
          ));
      })}
    </div>
  );
}

function StructuralView({
  leftFormatted,
  rightFormatted,
}: {
  leftFormatted: string;
  rightFormatted: string;
}) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-px bg-border-subtle">
      <Pane title="ORIGINAL">
        <pre className="scrollbar-thin h-full overflow-auto bg-inset p-3 font-mono text-xs text-text-secondary">
          {leftFormatted}
        </pre>
      </Pane>
      <Pane title="MODIFIED">
        <pre className="scrollbar-thin h-full overflow-auto bg-inset p-3 font-mono text-xs text-text-secondary">
          {rightFormatted}
        </pre>
      </Pane>
    </div>
  );
}

function Pane({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-col bg-window">
      <div className="shrink-0 border-b border-border-subtle px-3 py-1.5 text-2xs font-semibold uppercase tracking-wide text-text-tertiary">
        {title}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
