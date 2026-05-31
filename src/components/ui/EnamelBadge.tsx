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
      className={`badge-stage ${stageClassName}`}
    >
      <div
        className={`badge h-full w-full transition ${
          selected
            ? "outline outline-[3px] outline-gofest-accent2 outline-offset-2"
            : "hover:outline hover:outline-2 hover:outline-white/40 hover:outline-offset-2"
        }`}
      >
        <div className="badge-face h-full w-full" style={typeBackgroundStyle(types)}>
          {children}
        </div>
      </div>
    </button>
  );
}
