import type { BossInput } from "@/domain/types";
import type { PlannerSettings } from "@/domain/settings";
import { usePlannerStore } from "./usePlannerStore";

/** A portable snapshot of everything needed to rebuild a plan — the planning
 *  inputs + tuning, minus the heavy/transient bits (screenshots, OCR imports). */
export interface StateBackup {
  app: "gofest2026-raid-planner";
  version: number;
  savedAt: string;
  inputs: Record<string, BossInput>;
  settings: PlannerSettings;
  research: Record<string, boolean>;
  blockPriority: Record<string, string[]>;
  /** Canonical global priority order (may be absent in old backups). */
  globalPriority?: string[];
  /** Flat per-individual rank for the interleaved priority view (may be absent). */
  individualPriority?: string[];
  quickCatchBlocks: Record<string, boolean>;
  remoteAllocations: Record<string, number>;
  remoteAuto: boolean;
  raidsDone: Record<string, number>;
  /** Road of Legends weekdays the player will raid (may be absent in old backups). */
  playDays?: Record<string, boolean>;
  /** Per Road of Legends day, the ordered pre-farm targets (may be absent). */
  roadTargets?: Record<string, string[]>;
}

export const BACKUP_APP = "gofest2026-raid-planner";
export const BACKUP_VERSION = 1;

/** Snapshot the current store into a portable backup object. */
export function serializeState(): StateBackup {
  const s = usePlannerStore.getState();
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    savedAt: new Date().toISOString(),
    inputs: s.inputs,
    settings: s.settings,
    research: s.research,
    blockPriority: s.blockPriority,
    globalPriority: s.globalPriority,
    individualPriority: s.individualPriority,
    quickCatchBlocks: s.quickCatchBlocks,
    remoteAllocations: s.remoteAllocations,
    remoteAuto: s.remoteAuto,
    raidsDone: s.raidsDone,
    playDays: s.playDays,
    roadTargets: s.roadTargets,
  };
}

/** Loose shape check so we reject random files with a clear message. */
export function isStateBackup(o: unknown): o is StateBackup {
  if (!o || typeof o !== "object") return false;
  const b = o as Record<string, unknown>;
  return b.app === BACKUP_APP && typeof b.inputs === "object" && b.inputs !== null;
}
