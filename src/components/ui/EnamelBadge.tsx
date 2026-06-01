"use client";

import type { ReactNode } from "react";
import { typeBackgroundStyle } from "@/data/typeVisuals";
import { TypeIcon } from "./TypeIcon";

/**
 * Apple-Fitness-style 3D enamel badge: a metallic gold bezel that tilts to the
 * gyroscope over a type-colored enamel face. The face is split diagonally
 * top-left → bottom-right; the matching type symbol sits in each corner over
 * its own color (bottom-left = first type, top-right = second). A dark scrim
 * fades in/out to show selection so no blended layer ever animates.
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
  const cornerTypes = (types ?? []).filter(Boolean);
  const blType = cornerTypes[0]; // bottom-left triangle's color (first type)
  const trType = cornerTypes[cornerTypes.length - 1]; // top-right triangle's color (last type)

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
          {trType ? (
            <span className="pointer-events-none absolute right-1 top-1 z-20 inline-flex rounded-full shadow ring-1 ring-white/45">
              <TypeIcon type={trType} size={15} />
            </span>
          ) : null}
          {blType ? (
            <span className="pointer-events-none absolute bottom-1 left-1 z-20 inline-flex rounded-full shadow ring-1 ring-white/45">
              <TypeIcon type={blType} size={15} />
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
