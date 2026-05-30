/**
 * Goal presets. Selecting one prefills a boss's target level / mega level.
 * `appliesTo` narrows which kind of boss a preset is relevant for.
 */
export interface Preset {
  id: string;
  label: string;
  description: string;
  /** "mega" presets set a target mega level; "level" presets set a target level. */
  kind: "mega" | "level";
  target: { level?: number; megaLevel?: number };
}

export const PRESETS: Preset[] = [
  {
    id: "lvl40to50",
    label: "Level 40 → 50",
    description: "Max out a Pokémon to level 50 (296 XL for a standard species).",
    kind: "level",
    target: { level: 50 },
  },
  {
    id: "lvl45to50",
    label: "Level 45 → 50",
    description: "Already half-way — finish the climb to level 50.",
    kind: "level",
    target: { level: 50 },
  },
  {
    id: "megaL3",
    label: "Reach Mega Level 3 (Max)",
    description: "Take a mega to Max Level (Mega Level 3).",
    kind: "mega",
    target: { megaLevel: 3 },
  },
  {
    id: "megaL4",
    label: "Reach Mega Level 4 (Super Max)",
    description: "Fully max a mega to Super Max Level (Mega Level 4).",
    kind: "mega",
    target: { megaLevel: 4 },
  },
];
