"use client";

import { useState } from "react";
import { usePlannerStore } from "@/store/usePlannerStore";
import { ScreenshotImporter } from "./ScreenshotImporter";

/**
 * Collapsible shell around the screenshot importer. Once a user has bulk-loaded
 * and reviewed a pile of screenshots, they can fold this away to get the images
 * off the page — without clearing them. The importer stays mounted (hidden via
 * CSS) and the uploads live in the store, so collapsing never drops anything;
 * a count badge shows how many are still loaded.
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
        <span
          aria-hidden
          className={`shrink-0 text-gofest-acid transition-transform ${open ? "" : "-rotate-90"}`}
        >
          ▾
        </span>
      </button>
      {/* Kept mounted (not unmounted) so nothing is lost when folded away. */}
      <div className={open ? "mt-2" : "hidden"}>
        <ScreenshotImporter />
      </div>
    </div>
  );
}
