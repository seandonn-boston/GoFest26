"use client";

import type { ReactNode } from "react";
import type { Explanation, Token } from "@/domain";
import { MathTooltip } from "./MathTooltip";

/**
 * Wraps any derived number in a tap-to-open popover that shows how it was
 * calculated. Unlike ExplainEquation (the per-boss card, with editable inputs),
 * this renders a read-only Explanation — used for the dashboard's aggregate
 * numbers, which have no single source field to edit.
 */
export function ExplainValue({
  trigger,
  explanation,
  label,
}: {
  trigger: ReactNode;
  explanation: Explanation;
  label?: string;
}) {
  return (
    <MathTooltip label={label ?? explanation.title} trigger={trigger}>
      <div className="mb-1.5 font-semibold text-slate-100">{explanation.title}</div>
      <div className="space-y-1 font-mono leading-relaxed">
        {explanation.lines.map((line, i) => (
          <div key={i} className="flex flex-wrap items-center gap-x-1">
            {line.tokens.map((tk, j) => (
              <ReadToken key={j} token={tk} />
            ))}
          </div>
        ))}
      </div>
      {explanation.note ? <p className="mt-1.5 text-[10px] text-amber-300/80">{explanation.note}</p> : null}
    </MathTooltip>
  );
}

function ReadToken({ token }: { token: Token }) {
  switch (token.t) {
    case "text":
      return <span className="text-slate-400">{token.s}</span>;
    case "const":
      return (
        <span className="text-slate-200" title={token.title}>
          {token.n}
        </span>
      );
    case "out":
      return <span className="font-semibold text-slate-100">{token.s}</span>;
    case "edit":
      // Read-only context: show the value without the inline editor.
      return <span className="font-semibold text-gofest-accent2">{token.n}</span>;
  }
}
