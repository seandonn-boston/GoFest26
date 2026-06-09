"use client";

import { LOCATION_PRESETS } from "@/data/locations";
import type { Continent, UserRegion } from "@/domain/types";
import { usePlannerStore } from "@/store/usePlannerStore";

const SELECT_CLASS =
  "rounded-sm border border-white/10 bg-gofest-bg/60 px-3 py-2 text-sm outline-none focus:border-gofest-accent2";

const CONTINENTS: { id: Continent; label: string }[] = [
  { id: "americas", label: "Americas & Greenland" },
  { id: "emea", label: "Europe / M.East / Africa / India" },
  { id: "apac", label: "Asia-Pacific" },
];

/** Location controls (shared by the action dock). */
export function LocationControls() {
  const region = usePlannerStore((s) => s.settings.region);
  const setSettings = usePlannerStore((s) => s.setSettings);

  const matched = LOCATION_PRESETS.find(
    (p) => p.label === region.label && p.ns === region.ns && p.ew === region.ew && p.continent === region.continent,
  );

  function applyPreset(label: string) {
    const preset = LOCATION_PRESETS.find((p) => p.label === label);
    if (preset) setSettings({ region: preset });
  }

  function setAxis(patch: Partial<UserRegion>) {
    setSettings({ region: { ...region, ...patch, label: "Custom location" } });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        Sets which region-locked raids are local. Ones you can&apos;t reach are flagged{" "}
        <span className="text-gofest-accent">Remote only</span> and planned with a Remote Raid Pass.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Quick pick</span>
          <select className={SELECT_CLASS} value={matched?.label ?? ""} onChange={(e) => applyPreset(e.target.value)}>
            {!matched ? <option value="">Custom…</option> : null}
            {LOCATION_PRESETS.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Hemisphere</span>
          <select className={SELECT_CLASS} value={region.ns} onChange={(e) => setAxis({ ns: e.target.value as "N" | "S" })}>
            <option value="N">Northern</option>
            <option value="S">Southern</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">East / West</span>
          <select className={SELECT_CLASS} value={region.ew} onChange={(e) => setAxis({ ew: e.target.value as "E" | "W" })}>
            <option value="E">Eastern</option>
            <option value="W">Western</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Region</span>
          <select
            className={SELECT_CLASS}
            value={region.continent}
            onChange={(e) => setAxis({ continent: e.target.value as Continent })}
          >
            {CONTINENTS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
