"use client";

import type { ReactNode } from "react";
import { typeBackgroundStyle } from "@/data/typeVisuals";

/**
 * Apple-Fitness-style 3D enamel badge: a metallic bezel that tilts to the
 * gyroscope over a type-colored enamel face. `children` are the badge contents
 * (sprite, label, mega relief), rendered above the tilt-tracking specular.
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
          <span className="badge-fill" style={{ ...typeBackgroundStyle(types), opacity: selected ? 1 : 0.45 }} />
          {children}
        </div>
      </div>
    </button>
  );
}
