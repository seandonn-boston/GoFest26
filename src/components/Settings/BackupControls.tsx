"use client";

import { useRef, useState } from "react";
import { usePlannerStore } from "@/store/usePlannerStore";
import type { StateBackup } from "@/store/stateBackup";
import { downloadJsonBackup, readJsonBackup, readXlsxBackup } from "@/export/backupFile";
import { buildShareUrl } from "@/lib/sharePlan";

/**
 * Save / restore the whole plan to a file, so a user who's lost their browser
 * state can get everything back. Two formats:
 *  - .json — tiny and instant (the upload-optimized format).
 *  - .xlsx — re-imports the exported spreadsheet (carries a hidden backup sheet).
 */
export function BackupControls() {
  const loadState = usePlannerStore((s) => s.loadState);
  const hasState = usePlannerStore((s) => Object.values(s.inputs).some((i) => i.selected));
  const jsonRef = useRef<HTMLInputElement>(null);
  const xlsxRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function restore(file: File | undefined, read: (f: File) => Promise<StateBackup>) {
    if (!file) return;
    setMsg(null);
    try {
      const backup = await read(file);
      if (hasState && !window.confirm("Replace your current plan with this backup? This can't be undone.")) return;
      loadState(backup);
      setMsg({ ok: true, text: "Plan restored from your backup." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't read that file." });
    } finally {
      if (jsonRef.current) jsonRef.current.value = "";
      if (xlsxRef.current) xlsxRef.current.value = "";
    }
  }

  async function copyShareLink() {
    setMsg(null);
    try {
      await navigator.clipboard.writeText(buildShareUrl());
      setMsg({ ok: true, text: "Share link copied — anyone who opens it gets a copy of this plan." });
    } catch {
      setMsg({ ok: false, text: "Couldn't copy automatically — check clipboard permissions." });
    }
  }

  const btn =
    "rounded-lg border border-white/15 bg-gofest-bg/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-gofest-accent2/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-2">
      <p className="text-[13px] text-slate-500">
        Lost your plan (cleared browser / new device)? Save a backup, then restore it here. JSON is the quickest; the
        exported <span className="font-mono">.xlsx</span> can also be re-imported. Or copy a share link to send the whole
        plan to a friend.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copyShareLink} disabled={!hasState} className={btn}>
          🔗 Copy share link
        </button>
        <button type="button" onClick={() => downloadJsonBackup()} className={btn}>
          ⬇ Save backup (.json)
        </button>
        <button type="button" onClick={() => jsonRef.current?.click()} className={btn}>
          ⬆ Restore (.json)
        </button>
        <button type="button" onClick={() => xlsxRef.current?.click()} className={btn}>
          ⬆ Import (.xlsx)
        </button>
      </div>
      <input
        ref={jsonRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => restore(e.target.files?.[0], readJsonBackup)}
      />
      <input
        ref={xlsxRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => restore(e.target.files?.[0], readXlsxBackup)}
      />
      {msg ? <p className={`text-[13px] ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p> : null}
    </div>
  );
}
