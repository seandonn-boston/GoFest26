import { GAME_CONFIG } from "@/data/config";
import type { Variant } from "@/domain/types";

/**
 * XL Candy still needed to max a Pokémon to level 50, per variant, given the
 * current level and XL Candy on hand. XL is only spent across the 40→50 band, so
 * levels below 40 cost the full band; clamped at 0.
 */
export function xlToMaxRemaining(currentLevel: number, currentXl: number): Record<Variant, number> {
  const from = Math.max(40, Math.min(50, currentLevel));
  const fraction = (50 - from) / 10; // 1.0 at level 40, 0 at level 50
  const held = Math.max(0, currentXl);
  const xl = GAME_CONFIG.xlToLevel50;
  const remaining = (cost: number) => Math.max(0, Math.round(cost * fraction) - held);
  return {
    standard: remaining(xl.standard),
    shadow: remaining(xl.shadow),
    purified: remaining(xl.purified),
  };
}
