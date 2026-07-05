"use client";

import { useState } from "react";
import type { PlanSummary } from "@/domain/types";
import type { RoadPlan, WeekendBlockPlan } from "@/domain";
import { exportPlanToXlsx } from "@/export/exportXlsx";
import { downloadJsonBackup } from "@/export/backupFile";
import { buildShareUrl } from "@/lib/sharePlan";
import { usePlannerStore } from "@/store/usePlannerStore";
import { PixelIcon } from "@/components/ui/PixelIcon";

/**
 * The three ways to take your plan with you, given equal visual weight: an Excel
 * workbook (the chronological Week Plan tracker — built from the SAME computed
 * plan the app displays), a copyable share link (opens as a copy of this plan on
 * any device), and a JSON backup (re-importable). Sits at the foot of the
 * Results step. Each button owns its own busy / error / success feedback so one
 * failing never blocks the others.
 */
export function ExportGroup({
  summary,
  blockPlan,
  roadPlan,
}: {
  summary: PlanSummary;
  blockPlan: WeekendBlockPlan;
  roadPlan: RoadPlan;
}) {
  const inputs = usePlannerStore((s) => s.inputs);
  const settings = usePlannerStore((s) => s.settings);
  const remoteAllocations = usePlannerStore((s) => s.remoteAllocations);
  const playDays = usePlannerStore((s) => s.playDays);
  const hasPlan = summary.totalRaids.max > 0;
  const [busy, setBusy] = useState<null | "xlsx" | "link" | "json">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  async function doXlsx() {
    setBusy("xlsx");
    setMsg(null);
    setShareUrl(null);
    try {
      await exportPlanToXlsx({
        summary,
        inputs: Object.values(inputs),
        weekend: blockPlan,
        road: roadPlan,
        settings,
        remoteAllocations,
        playDays,
      });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Export failed." });
    } finally {
      setBusy(null);
    }
  }

  async function doLink() {
    setMsg(null);
    setShareUrl(null);
    try {
      // Building the URL gzips the plan (async). On iOS Safari any `await` before
      // clipboard.writeText expires the tap's transient activation, so pass a
      // Promise to a ClipboardItem to keep the write inside the gesture. Fall
      // back to writeText where ClipboardItem isn't supported (older Firefox).
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const text = buildShareUrl().then((url) => new Blob([url], { type: "text/plain" }));
        await navigator.clipboard.write([new ClipboardItem({ "text/plain": text })]);
      } else {
        await navigator.clipboard.writeText(await buildShareUrl());
      }
      setMsg({ ok: true, text: "Share link copied — anyone who opens it gets a copy of this plan." });
    } catch (e) {
      try {
        setShareUrl(await buildShareUrl());
      } catch {
        /* couldn't even build the URL — leave the manual box empty */
      }
      const why = e instanceof Error && e.name ? ` (${e.name})` : "";
      setMsg({ ok: false, text: `Couldn't copy automatically${why}. Select the link below and copy it.` });
    }
  }

  function doJson() {
    setMsg(null);
    setShareUrl(null);
    try {
      downloadJsonBackup();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Backup failed." });
    }
  }

  if (!hasPlan) {
    return (
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-slate-200">Take your plan with you</h3>
        <span className="text-xs text-slate-500">Select bosses and enter your currencies first.</span>
      </section>
    );
  }

  const tile =
    "flex flex-1 basis-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-black/40 px-3 py-3 text-center text-sm font-semibold shadow-brutal transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-slate-200">Take your plan with you</h3>
      <div className="flex gap-2">
        <button type="button" onClick={doXlsx} disabled={busy !== null} className={`${tile} bg-gofest-accent text-white`}>
          <PixelIcon name="download" size={18} />
          <span>{busy === "xlsx" ? "Building…" : "Excel"}</span>
          <span className="text-[11px] font-normal opacity-80">.xlsx plan</span>
        </button>
        <button type="button" onClick={doLink} disabled={busy !== null} className={`${tile} bg-gofest-accent2 text-black`}>
          <PixelIcon name="link" size={18} />
          <span>Share link</span>
          <span className="text-[11px] font-normal opacity-80">copy URL</span>
        </button>
        <button type="button" onClick={doJson} disabled={busy !== null} className={`${tile} bg-gofest-bone text-black`}>
          <PixelIcon name="floppy" size={18} />
          <span>Backup</span>
          <span className="text-[11px] font-normal opacity-80">.json file</span>
        </button>
      </div>
      {msg ? <p className={`text-[13px] ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p> : null}
      {shareUrl ? (
        <input
          readOnly
          value={shareUrl}
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => e.currentTarget.select()}
          aria-label="Share link — tap to select, then copy"
          className="w-full select-all rounded-md border border-gofest-accent2/40 bg-gofest-bg/60 px-2 py-1.5 font-mono text-[11px] text-slate-200"
        />
      ) : null}
    </section>
  );
}
