// Adventure Effects — the in-game buffs certain GO Fest 2026 raid Pokémon can
// activate for a fixed duration by spending Stardust + that species' Candy (NOT
// XL Candy). One "use" lasts `durationMinutes`; costs are per use. Values read
// directly from the in-game Adventure Effect panels.
// source: confirmed in-game (Jul 2026). Candy pools are shared across a species'
// formes (e.g. Black & White Kyurem both spend Kyurem Candy).

export interface AdventureEffect {
  id: string;
  /** The move/effect name shown in game (e.g. "Ice Burn"). */
  name: string;
  /** The Pokémon forme that casts it (display only). */
  species: string;
  /** Roster boss id whose base Candy pool this draws from — links the "candy on
   *  hand" field to what the user entered. Absent when the species isn't a
   *  planner target (e.g. Eternatus). */
  candyBossId?: string;
  /** Candy label shown in the UI. */
  candyLabel: string;
  /** Stardust per use. */
  stardust: number;
  /** Species Candy per use. */
  candy: number;
  /** Minutes one use stays active. */
  durationMinutes: number;
  description: string;
}

export const ADVENTURE_EFFECTS: AdventureEffect[] = [
  {
    id: "ice-burn",
    name: "Ice Burn",
    species: "Black Kyurem",
    candyBossId: "kyurem",
    candyLabel: "Kyurem",
    stardust: 5000,
    candy: 5,
    durationMinutes: 10,
    description:
      "Surrounds Pokémon with an ultracold, freezing wind. Slows the target ring (easier Excellent Throws) and makes Pokémon much easier to catch, including with connected accessory devices.",
  },
  {
    id: "freeze-shock",
    name: "Freeze Shock",
    species: "White Kyurem",
    candyBossId: "kyurem",
    candyLabel: "Kyurem",
    stardust: 5000,
    candy: 5,
    durationMinutes: 10,
    description:
      "Casts electrically charged ice, immobilizing Pokémon during encounters and making them easier to catch, including with connected accessory devices.",
  },
  {
    id: "spacial-rend",
    name: "Spacial Rend",
    species: "Origin Palkia",
    candyBossId: "palkia",
    candyLabel: "Palkia",
    stardust: 5000,
    candy: 5,
    durationMinutes: 10,
    description: "Manipulates space, letting you find and encounter Pokémon from farther away.",
  },
  {
    id: "roar-of-time",
    name: "Roar of Time",
    species: "Origin Dialga",
    candyBossId: "dialga",
    candyLabel: "Dialga",
    stardust: 5000,
    candy: 5,
    durationMinutes: 6,
    description:
      "Distorts time. Pauses the timers of Incense, Lucky Eggs, Star Pieces and Daily Adventure Incense, extending their duration.",
  },
  {
    id: "moongeist-beam",
    name: "Moongeist Beam",
    species: "Dawn Wings Necrozma",
    candyBossId: "necrozma",
    candyLabel: "Necrozma",
    stardust: 3000,
    candy: 3,
    durationMinutes: 10,
    description: "Emits a sinister ray. Attracts Pokémon found at night and allows nighttime Evolution during the day.",
  },
  {
    id: "sunsteel-strike",
    name: "Sunsteel Strike",
    species: "Dusk Mane Necrozma",
    candyBossId: "necrozma",
    candyLabel: "Necrozma",
    stardust: 3000,
    candy: 3,
    durationMinutes: 10,
    description:
      "Shines the light of a meteor. Attracts Pokémon found during the day and allows daytime Evolution at night.",
  },
  {
    id: "dynamax-cannon",
    name: "Dynamax Cannon",
    species: "Eternatus",
    candyLabel: "Eternatus",
    stardust: 5000,
    candy: 30,
    durationMinutes: 10,
    description:
      "A surge of power that adds a bonus to the Max Moves of your Max Pokémon and Eternatus. Moves at Max Level receive a significant bonus.",
  },
  {
    id: "behemoth-blade",
    name: "Behemoth Blade",
    species: "Crowned Sword Zacian",
    candyBossId: "zacian",
    candyLabel: "Zacian",
    stardust: 5000,
    candy: 5,
    durationMinutes: 6,
    description: "Zacian wields a large, powerful sword, strengthening your Pokémon's attacks in raids and Max Battles.",
  },
  {
    id: "behemoth-bash",
    name: "Behemoth Bash",
    species: "Crowned Shield Zamazenta",
    candyBossId: "zamazenta",
    candyLabel: "Zamazenta",
    stardust: 5000,
    candy: 5,
    durationMinutes: 6,
    description: "Zamazenta wields a large, powerful shield, strengthening your Pokémon's defense in raids and Max Battles.",
  },
];
