"use client";

import { useState } from "react";
import { usePlannerStore } from "@/store/usePlannerStore";
import { PlusToggle } from "@/components/ui/PlusToggle";
import { ScreenshotImporter } from "./ScreenshotImporter";

/**
 * Collapsible shell around the screenshot importer. Once a user has bulk-loaded
 * and reviewed a pile of screenshots, they can fold this away to get the images
 * off the page. Collapsing unmounts the importer UI entirely — the uploads
 * themselves live in the persisted store, so nothing is deleted; re-expanding
 * rebuilds the view from that data. A count badge shows how many are held.
 */
export function BulkImportSection() {
  const [open, setOpen] = useState(true);
  const count = usePlannerStore((s) => s.imports.length);

  return (
    <div className="brutal rounded-xl bg-gofest-panel/80 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-gofest-acid">
          Bulk import from screenshots
          {count ? (
            <span className="ml-2 rounded-sm border border-gofest-acid/40 px-1 text-[9px] tracking-normal text-gofest-acid">
              {count} loaded
            </span>
          ) : null}
        </span>
        <PlusToggle open={open} size={16} className="shrink-0 text-gofest-acid" />
      </button>
      {/* Unmounted when collapsed; the uploads persist in the store, so the
          view rebuilds from that data on re-expand — nothing is deleted. */}
      {open ? (
        <div className="mt-2">
          <ScreenshotImporter />
        </div>
      ) : null}
    </div>
  );
}
