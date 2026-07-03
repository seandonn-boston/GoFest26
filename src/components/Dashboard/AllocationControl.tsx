"use client";

import type { AllocationMode, BlockAllocation } from "@/domain/types";

/**
 * A compact per-target allocation control: a mode chip + (for non-priority modes)
 * a small number field. It says how this target claims its window's time:
 *   Priority (default) · Share % of leftover time · Goal % of its own need ·
 *   Fixed N · Floor ≥N · Ceiling ≤N.
 * Emits `null` for Priority (clears the pin) so a default target carries no state.
 */

const MODES: { id: AllocationMode; label: string; title: string }[] = [
  { id: "priority", label: "Priority", title: "Fill in drag order (default)" },
  { id: "share", label: "Share", title: "A weighted share of the time left after fixed/goal reservations" },
  { id: "goal", label: "% goal", title: "A percentage of THIS target's own required raids" },
  { id: "fixed", label: "Exactly", title: "An exact raid count, reserved off the top" },
  { id: "floor", label: "At least", title: "A guaranteed minimum, then it competes for more" },
  { id: "ceiling", label: "At most", title: "A cap — the rest of its need spills to other windows" },
];

/** The unit shown after the number field for each mode. */
const UNIT: Partial<Record<AllocationMode, string>> = { share: "wt", goal: "%", fixed: "×", floor: "≥", ceiling: "≤" };

function valueOf(a: BlockAllocation): number {
  if (a.mode === "share") return a.weight ?? 1;
  if (a.mode === "goal") return a.percent ?? 50;
  return a.count ?? 0;
}

export function AllocationControl({
  alloc,
  need,
  onChange,
}: {
  alloc: BlockAllocation | undefined;
  /** This target's raids needed in the window — seeds a sensible default count. */
  need: number;
  onChange: (a: BlockAllocation | null) => void;
}) {
  const mode: AllocationMode = alloc?.mode ?? "priority";
  const pinned = mode !== "priority";

  const pickMode = (m: AllocationMode) => {
    if (m === "priority") return onChange(null);
    if (m === "share") return onChange({ mode: "share", weight: alloc?.weight ?? 1 });
    if (m === "goal") return onChange({ mode: "goal", percent: alloc?.percent ?? 50 });
    const seed = alloc?.count ?? Math.max(1, Math.min(need || 5, Math.round((need || 10) / 2)));
    return onChange({ mode: m, count: seed });
  };

  const setValue = (raw: string) => {
    const v = Number(raw.replace(/[^\d.]/g, "")) || 0;
    if (mode === "share") onChange({ mode: "share", weight: Math.max(0, v) });
    else if (mode === "goal") onChange({ mode: "goal", percent: Math.min(100, Math.max(0, Math.round(v))) });
    else if (mode === "fixed" || mode === "floor" || mode === "ceiling")
      onChange({ mode, count: Math.max(0, Math.round(v)) });
  };

  return (
    <div className="flex items-center gap-1">
      <select
        value={mode}
        onChange={(e) => pickMode(e.target.value as AllocationMode)}
        aria-label="How this target claims the block's time"
        title={MODES.find((m) => m.id === mode)?.title}
        className={`h-6 rounded border bg-gofest-bg/70 px-1 text-[11px] outline-none focus:border-gofest-accent2 ${
          pinned ? "border-gofest-accent2/50 text-gofest-accent2" : "border-white/15 text-slate-400"
        }`}
      >
        {MODES.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      {pinned ? (
        <div className="flex items-center gap-0.5">
          {(mode === "floor" || mode === "ceiling") && <span className="text-[11px] text-slate-500">{UNIT[mode]}</span>}
          <input
            type="text"
            inputMode="numeric"
            value={String(valueOf(alloc!))}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setValue(e.target.value)}
            aria-label={`${MODES.find((m) => m.id === mode)?.label} value`}
            className="h-6 w-10 rounded border border-white/15 bg-gofest-bg/70 px-1 text-center text-[11px] text-slate-100 outline-none focus:border-gofest-accent2"
          />
          {(mode === "share" || mode === "goal" || mode === "fixed") && (
            <span className="text-[11px] text-slate-500">{UNIT[mode]}</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Distinct segment colours for the per-block split bar (cycled by row order). */
const SEG_COLORS = ["#38bdf8", "#f472b6", "#a3e635", "#fbbf24", "#c084fc", "#2dd4bf", "#fb7185", "#60a5fa"] as const;

/**
 * A live stacked bar of how a block's fitted raids split across its targets —
 * the visual read on a 50/40/10 (etc.) allocation. Widths are proportional to
 * each target's fitted count; any unused capacity shows as a faint tail.
 */
export function AllocationBar({
  segments,
  capacityMax,
}: {
  segments: { bossId: string; label: string; fitted: number }[];
  capacityMax: number;
}) {
  const used = segments.reduce((s, x) => s + x.fitted, 0);
  const total = Math.max(used, capacityMax, 1);
  const active = segments.filter((s) => s.fitted > 0);
  if (active.length === 0) return null;
  return (
    <div className="mt-1.5">
      <div className="flex h-2.5 w-full overflow-hidden rounded-sm bg-white/[0.04]">
        {active.map((s, i) => (
          <div
            key={s.bossId}
            title={`${s.label}: ${s.fitted} raid${s.fitted === 1 ? "" : "s"} (${Math.round((s.fitted / total) * 100)}%)`}
            style={{ width: `${(s.fitted / total) * 100}%`, backgroundColor: SEG_COLORS[i % SEG_COLORS.length] }}
          />
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
        {active.map((s, i) => (
          <span key={s.bossId} className="inline-flex items-center gap-1 text-[10px] text-slate-400">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: SEG_COLORS[i % SEG_COLORS.length] }}
            />
            {s.label} {s.fitted}
          </span>
        ))}
      </div>
    </div>
  );
}
