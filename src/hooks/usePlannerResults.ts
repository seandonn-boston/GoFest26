import { useMemo } from "react";
import { computePlanSummary } from "@/domain";
import type { PlanSummary } from "@/domain/types";
import { usePlannerStore } from "@/store/usePlannerStore";

/** Recomputes the full plan summary whenever inputs or settings change. */
export function usePlannerResults(): PlanSummary {
  const inputs = usePlannerStore((s) => s.inputs);
  const settings = usePlannerStore((s) => s.settings);
  return useMemo(
    () => computePlanSummary(Object.values(inputs), settings),
    [inputs, settings],
  );
}
