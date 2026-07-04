/**
 * In-game Pokémon GO *item* artwork — the same PokeMiners mined-asset CDN the
 * boss sprites already load from (see bosses.ts). Used wherever the UI used to
 * show a food/pass emoji: real game artifacts instead of pictographs.
 */
const ITEMS_BASE = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Items/";

export const ITEM_ICONS = {
  /** Rare Candy (Item_1301) — stands in for any species candy count. */
  rareCandy: `${ITEMS_BASE}Item_1301.png`,
  /** Stardust vial (the game's painted stardust icon). */
  stardust: `${ITEMS_BASE}stardust_painted.png`,
  /** In-person (orange) Raid Pass, Item_1401. */
  raidPass: `${ITEMS_BASE}Item_1401.png`,
  /** Premium Battle Pass, Item_1402. */
  premiumPass: `${ITEMS_BASE}Item_1402.png`,
  /** Remote Raid Pass, Item_1408. */
  remotePass: `${ITEMS_BASE}Item_1408.png`,
} as const;

export type ItemIconName = keyof typeof ITEM_ICONS;
