"use client";

import { CyberTitle } from "@/components/ui/CyberTitle";

/** Small uppercase pre-title (e.g. "Mega", "Hero & Crowned"), echoing the Mewtwo
 *  hero title. Long forme lists tighten their tracking so they stay on one line. */
function Pretitle({ text }: { text: string }) {
  const tight = text.length > 20;
  return (
    <span
      className={`font-extrabold uppercase text-slate-300 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)] ${
        tight ? "text-[12px] tracking-[0.12em]" : "text-[13px] tracking-[0.3em]"
      }`}
    >
      {text}
    </span>
  );
}

/**
 * The card title — the species name (and its forme pre-title) CENTERED. The boss
 * sprites are no longer drawn here; they live in `CardSpriteBackdrop`, behind the
 * whole card. Mega bosses get a "Mega" pre-title unless one is supplied.
 */
export function CardTitle({
  name,
  types,
  isMega,
  pretitle: pretitleProp,
}: {
  name: string;
  types?: string[];
  isMega?: boolean;
  /** Overrides the small pre-title (e.g. "Altered & Origin" for a forme group). */
  pretitle?: string;
}) {
  const displayName = name.replace(/^Mega\s+/, "");
  const pretitle = pretitleProp ?? (isMega ? "Mega" : null);

  return (
    <div className="relative z-10 mx-auto flex max-w-[350px] flex-col items-center text-center">
      {pretitle ? <Pretitle text={pretitle} /> : null}
      {/* Pinned to the design size (was text-2xl): the species title is exempt
          from the app-wide ~20% font bump, like the masthead. */}
      <CyberTitle name={displayName} types={types} className="text-[24px]" />
    </div>
  );
}
