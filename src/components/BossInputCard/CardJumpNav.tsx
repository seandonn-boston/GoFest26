"use client";

import type { RaidBoss } from "@/domain/types";
import { getBoss, MEWTWO_X_ID } from "@/data";
import { groupDisplayName } from "@/domain/forms";
import { Sprite } from "@/components/ui/Sprite";

/**
 * Jump-to-boss strip for the card stack: one sprite per selected target, tap to
 * scroll straight to that card. With a big selection the stack runs many screens
 * long — this is the difference between "scroll and hunt" and one tap. The
 * cards carry `id="card-<bossId>"` (+ scroll-mt for the sticky step nav).
 */
export function CardJumpNav({ bosses, mewtwoSelected }: { bosses: RaidBoss[]; mewtwoSelected: boolean }) {
  if (bosses.length + (mewtwoSelected ? 1 : 0) < 4) return null; // short stacks don't need a map

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <nav
      aria-label="Jump to a Pokémon's card"
      // Docks just below the sticky step nav (top-0, ~60px tall) and follows the
      // scroll for the whole card stack — the map stays in reach from anywhere.
      className="sticky top-[60px] z-20 flex gap-1 overflow-x-auto rounded-lg border border-white/10 bg-gofest-bg/90 px-2 py-1.5 backdrop-blur-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {mewtwoSelected ? (
        <button
          type="button"
          onClick={() => jump("card-mewtwo")}
          title="Mega Mewtwo"
          className="shrink-0 rounded-md p-1 transition hover:bg-white/10"
        >
          <Sprite src={getBoss(MEWTWO_X_ID)?.sprite} alt="Mega Mewtwo" size={30} />
        </button>
      ) : null}
      {bosses.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => jump(`card-${b.id}`)}
          title={groupDisplayName(b)}
          className="shrink-0 rounded-md p-1 transition hover:bg-white/10"
        >
          <Sprite src={b.sprite} alt={groupDisplayName(b)} size={30} />
        </button>
      ))}
    </nav>
  );
}
