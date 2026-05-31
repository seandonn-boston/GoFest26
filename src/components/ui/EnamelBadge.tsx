"use client";

import type { ReactNode } from "react";
import { typeBackgroundStyle } from "@/data/typeVisuals";

/**
 * Apple-Fitness-style 3D enamel badge: a metallic gold bezel that tilts to the
 * gyroscope over a type-colored enamel face. The fill stays fully opaque; a dark
 * scrim fades in/out to show selection so no blended layer ever animates.
 */
export function EnamelBadge({
  types,
  selected,
  onToggle,
  title,
  stageClassName = "",
  children,
}: {
  types?: string[];
  selected: boolean;
  onToggle: () => void;
  title?: string;
  stageClassName?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      title={title}
      className={`badge-stage outline-none focus:outline-none focus-visible:outline-none ${stageClassName}`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="badge h-full w-full">
        <div className="badge-face h-full w-full">
          <span className="badge-fill" style={typeBackgroundStyle(types)} />
          {children}
          <span className="badge-dim" aria-hidden="true" style={{ opacity: selected ? 0 : 0.55 }} />
        </div>
      </div>
    </button>
  );
}
