import type { CSSProperties } from "react";
import { TYPE_COLORS } from "@/data/typeVisuals";
import { Sprite } from "@/components/ui/Sprite";

const FIGHTING = TYPE_COLORS.fighting; // Mewtwo X
const PSYCHIC = TYPE_COLORS.psychic; // Mewtwo Y

/**
 * The Super Mega Mewtwo hero title (centered, ≤350px): a giant italic X
 * (Fighting red) and Y (Psychic pink) fall into the background as a neon
 * backdrop, with SUPER / MEGA / MEWTWO stacked across their middle. The two
 * distinct Mega Mewtwo sprites flank the title and slightly overlap it — X on
 * the left, Y on the right.
 */
export function MewtwoTitle({ spriteX, spriteY }: { spriteX?: string; spriteY?: string }) {
  return (
    <div className="mx-auto flex max-w-[350px] items-center justify-center">
      <span className="relative z-20 -mr-3 shrink-0 [filter:drop-shadow(0_2px_5px_rgba(0,0,0,0.6))]">
        <Sprite src={spriteX} alt="Mega Mewtwo X" size={54} />
      </span>

      <div className="relative flex h-[5.5rem] min-w-0 flex-1 select-none items-center justify-center">
        <span aria-hidden className="mewtwo-xy pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[4.75rem]" style={{ color: FIGHTING }}>
          X
        </span>
        <span aria-hidden className="mewtwo-xy pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[4.75rem]" style={{ color: PSYCHIC }}>
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

      <span className="relative z-20 -ml-3 shrink-0 [filter:drop-shadow(0_2px_5px_rgba(0,0,0,0.6))]">
        <Sprite src={spriteY} alt="Mega Mewtwo Y" size={54} />
      </span>
    </div>
  );
}
