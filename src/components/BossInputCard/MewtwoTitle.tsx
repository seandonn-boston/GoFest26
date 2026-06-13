import type { CSSProperties } from "react";
import { TYPE_COLORS } from "@/data/typeVisuals";

const FIGHTING = TYPE_COLORS.fighting; // Mewtwo X
const PSYCHIC = TYPE_COLORS.psychic; // Mewtwo Y

/**
 * The Super Mega Mewtwo hero title: a giant italic X (Fighting red, left) and Y
 * (Psychic pink, right) fall into the background as a neon backdrop, with
 * SUPER / MEGA / MEWTWO stacked across their middle — MEWTWO in the chromatic
 * card-title treatment tinted to both forms' types.
 */
export function MewtwoTitle() {
  return (
    <div className="relative mx-auto flex h-[5.5rem] w-full max-w-[20rem] select-none items-center justify-center">
      <span aria-hidden className="mewtwo-xy pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-[5rem]" style={{ color: FIGHTING }}>
        X
      </span>
      <span aria-hidden className="mewtwo-xy pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[5rem]" style={{ color: PSYCHIC }}>
        Y
      </span>

      <div className="relative z-10 flex flex-col items-center leading-none [filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.85))]">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-amber-200/90">Super</span>
        <span className="text-sm font-extrabold uppercase tracking-[0.35em] text-slate-100">Mega</span>
        <span className="cyber-title text-3xl" style={{ "--c1": FIGHTING, "--c2": PSYCHIC } as CSSProperties}>
          Mewtwo
        </span>
      </div>
    </div>
  );
}
