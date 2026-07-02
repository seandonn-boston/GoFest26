"use client";

import { useState } from "react";
import { RAID_BOSSES, HABITATS, MEWTWO_X_ID, MEWTWO_Y_ID, getBoss, GAME_CONFIG } from "@/data";
import type { EventDay } from "@/domain/types";
import { bossIsLocal } from "@/domain/region";
import { hourLabel } from "@/lib/format";
import { usePlannerStore } from "@/store/usePlannerStore";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { BossSelectChip } from "./BossSelectChip";
import { MewtwoSelectTile } from "./MewtwoSelectTile";
import { RoadOfLegendsSection } from "./RoadOfLegendsSection";

const DAY_LONG: Record<EventDay, string> = { sat: "Saturday", sun: "Sunday" };

// Static — depends only on constants, so compute once at module load rather
// than on every render.
const MEWTWO_X = getBoss(MEWTWO_X_ID)!;
const MEWTWO_Y = getBoss(MEWTWO_Y_ID)!;
const GROUPS = HABITATS.map((h) => ({
  habitat: h,
  bosses: RAID_BOSSES.filter(
    (b) =>
      b.id !== MEWTWO_X_ID &&
      b.id !== MEWTWO_Y_ID &&
      b.windows.some((w) => w.day === h.day && w.startHour === h.startHour && w.endHour === h.endHour),
  ),
}));

export function BossList() {
  // Select a primitive count (not the whole inputs map) so editing a card's
  // currency doesn't re-render the list — only selecting/deselecting does.
  const selectedCount = usePlannerStore((s) => {
    let n = 0;
    for (const id in s.inputs) if (s.inputs[id].selected) n++;
    return n;
  });
  const region = usePlannerStore((s) => s.settings.region);
  const resetAll = usePlannerStore((s) => s.resetAll);
  const selectAll = usePlannerStore((s) => s.selectAll);
  const start = GAME_CONFIG.event.hourStartLocal;

  // Type-to-find across the whole roster — with ~50 bosses over six habitat
  // sections, scrolling is not a search strategy. A non-empty query swaps the
  // sections for one flat row of matches (same tiles, same toggle behavior).
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q ? RAID_BOSSES.filter((b) => b.name.toLowerCase().includes(q)) : [];

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Pick your raid targets</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={selectAll}
            className="shrink-0 rounded-md border border-emerald-500/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
          >
            Select all
          </button>
          <span className="shrink-0 text-sm text-slate-400">{selectedCount} selected</span>
          <button
            type="button"
            onClick={resetAll}
            className="shrink-0 rounded-md border border-rose-500/50 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/25"
          >
            Reset all
          </button>
        </div>
      </div>
      <p className="mb-3 font-mono text-[12px] uppercase tracking-wider text-slate-500">
        <span className="rounded-sm bg-gofest-accent px-1 py-[1px] font-extrabold text-black">Remote</span> = not raidable in{" "}
        {region.label}; needs a Remote Raid Pass (capped per day).
      </p>

      <div className="relative mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔎 Find a boss — try “kyu”…"
          aria-label="Search the raid roster by name"
          className="w-full rounded-lg border border-white/15 bg-gofest-bg/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-gofest-accent2/60 focus:outline-none"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm px-1.5 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        ) : null}
      </div>

      {q ? (
        <div className="mb-5">
          <div className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
            {matches.length} match{matches.length === 1 ? "" : "es"}
            <span className="ml-2 normal-case text-slate-500">tap to select · clear to see the full schedule</span>
          </div>
          {matches.length ? (
            <div className="flex flex-wrap justify-center gap-2">
              {matches.map((boss) => (
                <BossSelectChip key={boss.id} boss={boss} remoteOnly={!bossIsLocal(boss, region)} />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-slate-500">Nothing in the roster matches “{query.trim()}”.</p>
          )}
        </div>
      ) : (
        <>
          {/* Headliners — Mega Mewtwo X (Sat) left, Y (Sun) right */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            <MewtwoSelectTile boss={MEWTWO_X} dayLabel="Saturday" />
            <MewtwoSelectTile boss={MEWTWO_Y} dayLabel="Sunday" />
          </div>

          <RoadOfLegendsSection />
        </>
      )}

      <div className={q ? "hidden" : "space-y-4"}>
        {GROUPS.map(({ habitat, bosses }) => (
          <div key={`${habitat.day}-${habitat.startHour}`}>
            <div className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
              {DAY_LONG[habitat.day]} · {hourLabel(habitat.startHour, start)}–{hourLabel(habitat.endHour, start)}
              <span className="ml-2 normal-case text-gofest-accent2">{habitat.name}</span>
              <span
                className="ml-1.5 inline-flex translate-y-[2px] items-center gap-0.5"
                title={`Featured wild spawns: ${habitat.types.join(", ")}`}
              >
                <span aria-hidden className="text-slate-600">
                  –
                </span>
                {habitat.types.map((t) => (
                  <TypeIcon key={t} type={t} size={14} />
                ))}
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {bosses.map((boss) => (
                <BossSelectChip key={boss.id} boss={boss} remoteOnly={!bossIsLocal(boss, region)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
