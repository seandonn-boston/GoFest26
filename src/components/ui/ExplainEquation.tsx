"use client";

import { usePlannerStore } from "@/store/usePlannerStore";
import type { CurrencyExplanation, EditField, Token } from "@/domain";
import { EditableNumber } from "./EditableNumber";

const CURRENCY_TITLE: Record<string, string> = {
  xlCandy: "XL Candy",
  megaEnergy: "Mega Energy",
  candy: "Candy",
};

const raidsStr = (r: { min: number; max: number }) => (r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`);

/**
 * Renders a CurrencyExplanation as a live equation. Editable tokens become
 * inline inputs wired to the SAME store setters the card uses — so an edit here
 * overwrites the card's field and recomputes the whole plan. It never touches
 * the screenshot/import store (the raw scans), only the planning inputs.
 */
export function ExplainEquation({ bossId, explanation }: { bossId: string; explanation: CurrencyExplanation }) {
  const setCurrent = usePlannerStore((s) => s.setCurrent);
  const setTargetLevel = usePlannerStore((s) => s.setTargetLevel);
  const setTargetMegaLevel = usePlannerStore((s) => s.setTargetMegaLevel);
  const setQuantity = usePlannerStore((s) => s.setQuantity);

  const commit = (field: EditField, v: number) => {
    switch (field) {
      case "current.level":
        return setCurrent(bossId, "level", v);
      case "current.xlCandy":
        return setCurrent(bossId, "xlCandy", v);
      case "current.megaEnergy":
        return setCurrent(bossId, "megaEnergy", v);
      case "current.candy":
        return setCurrent(bossId, "candy", v);
      case "current.megaLevel":
        return setCurrent(bossId, "megaLevel", v);
      case "target.level":
        return setTargetLevel(bossId, v);
      case "target.megaLevel":
        return setTargetMegaLevel(bossId, v);
      case "quantity":
        return setQuantity(bossId, v);
    }
  };

  return (
    <div>
      <div className="mb-1.5 font-semibold text-slate-100">
        {CURRENCY_TITLE[explanation.currency] ?? explanation.currency} — {raidsStr(explanation.raids)} raids
      </div>
      <div className="space-y-1 font-mono leading-relaxed">
        {explanation.lines.map((line, i) => (
          <div key={i} className="flex flex-wrap items-center gap-x-1">
            {line.tokens.map((tk, j) => (
              <TokenView key={j} token={tk} commit={commit} />
            ))}
          </div>
        ))}
      </div>
      {explanation.note ? <p className="mt-1.5 text-[10px] text-amber-300/80">{explanation.note}</p> : null}
      <p className="mt-1.5 text-[10px] text-slate-500">
        Click a <span className="text-gofest-accent2">dotted value</span> to edit it — overwrites the card and
        recalculates. Scan results aren’t changed.
      </p>
    </div>
  );
}

function TokenView({ token, commit }: { token: Token; commit: (f: EditField, v: number) => void }) {
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
      return <EditableNumber value={token.n} min={token.min} max={token.max} onCommit={(v) => commit(token.field, v)} />;
  }
}
