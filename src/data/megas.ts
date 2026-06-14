/**
 * MEGAS — every Mega / Primal Evolution in the attacker pool, with the data the
 * candy-boost engine needs that the raw ATTACKERS list doesn't carry:
 *
 *   - `types`:  the mega's OWN (defensive) typing. Mega-Evolving grants a same-
 *               type Candy / Candy XL bonus on every raid completed and wild
 *               Pokémon caught of a type the mega shares — so this, not its
 *               attacking types, decides which bosses it boosts.
 *   - `sprite`: the mega's icon (Leek Duck / PokeMiners assets), for the boost
 *               suggestion rows and the "& mega3" search string.
 *
 * Attacking eDPS is reused from ATTACKERS (single source of truth) so a mega
 * that ALSO happens to be super-effective can be ranked as an attacker too.
 */
import { ATTACKERS, type PType } from "./attackers";
import { SPRITE_BASE } from "./bosses";

export interface MegaForm {
  /** Display name, e.g. "Mega Rayquaza", "Primal Kyogre". */
  name: string;
  /** Final-evolution species term (search bar / dedup), e.g. "Rayquaza". */
  species: string;
  /** The mega's own typing — what the same-type candy bonus keys off. */
  types: PType[];
  /** Icon URL. */
  sprite: string;
  /** Attacking type → eDPS (from ATTACKERS) for the "also an attacker" tier. */
  attacks: Partial<Record<PType, number>>;
  /**
   * True when this species can reach Mega Level 4 ("Super Max"). Level-4 megas
   * grant an even higher same-type Candy XL raid-loot chance than Level 3, so the
   * boost engine floats them above level-3 megas regardless of matchup.
   */
  superMax: boolean;
}

// Mega species that can be taken to Mega Level 4 ("Super Max Level"). Keyed by
// the final-evolution species term. Keep in sync with the in-game Super Max list.
const SUPER_MAX_SPECIES = new Set<string>(["Mewtwo"]);

// The mega's own (defensive) typing.
const MEGA_TYPES: Record<string, PType[]> = {
  "Mega Charizard Y": ["Fire", "Flying"],
  "Mega Charizard X": ["Fire", "Dragon"],
  "Mega Blaziken": ["Fire", "Fighting"],
  "Mega Houndoom": ["Dark", "Fire"],
  "Mega Camerupt": ["Fire", "Ground"],
  "Primal Kyogre": ["Water"],
  "Mega Swampert": ["Water", "Ground"],
  "Mega Gyarados": ["Water", "Dark"],
  "Mega Blastoise": ["Water"],
  "Mega Sceptile": ["Grass", "Dragon"],
  "Mega Venusaur": ["Grass", "Poison"],
  "Mega Abomasnow": ["Grass", "Ice"],
  "Mega Manectric": ["Electric"],
  "Mega Ampharos": ["Electric", "Dragon"],
  "Mega Glalie": ["Ice"],
  "Mega Lucario": ["Fighting", "Steel"],
  "Mega Heracross": ["Bug", "Fighting"],
  "Mega Gallade": ["Psychic", "Fighting"],
  "Mega Gengar": ["Ghost", "Poison"],
  "Mega Beedrill": ["Bug", "Poison"],
  "Primal Groudon": ["Ground", "Fire"],
  "Mega Garchomp": ["Dragon", "Ground"],
  "Mega Rayquaza": ["Dragon", "Flying"],
  "Mega Salamence": ["Dragon", "Flying"],
  "Mega Pinsir": ["Bug", "Flying"],
  "Mega Pidgeot": ["Normal", "Flying"],
  "Mega Aerodactyl": ["Rock", "Flying"],
  "Mega Mewtwo Y": ["Psychic"],
  "Mega Mewtwo X": ["Psychic", "Fighting"],
  "Mega Alakazam": ["Psychic"],
  "Mega Gardevoir": ["Psychic", "Fairy"],
  "Mega Latios": ["Dragon", "Psychic"],
  "Mega Metagross": ["Steel", "Psychic"],
  "Mega Scizor": ["Bug", "Steel"],
  "Mega Aggron": ["Steel"],
  "Mega Tyranitar": ["Rock", "Dark"],
  "Mega Diancie": ["Rock", "Fairy"],
  "Mega Absol": ["Dark"],
  "Mega Banette": ["Ghost"],
};

// Icon filenames (Leek Duck CDN). Reuses the exact known-good filenames from the
// roster where a mega is also a raid boss; the rest follow the PokeMiners
// `pm{dex}.fMEGA` / `fPRIMAL` / `fMEGA_X|Y` addressable-asset convention.
const MEGA_SPRITE: Record<string, string> = {
  "Mega Charizard Y": "pm6.fMEGA_Y.icon.png",
  "Mega Charizard X": "pm6.fMEGA_X.icon.png",
  "Mega Blaziken": "pm257.fMEGA.icon.png",
  "Mega Houndoom": "pm229.fMEGA.icon.png",
  "Mega Camerupt": "pm323.fMEGA.icon.png",
  "Primal Kyogre": "pm382.fPRIMAL.icon.png",
  "Mega Swampert": "pm260.fMEGA.icon.png",
  "Mega Gyarados": "pm130.fMEGA.icon.png",
  "Mega Blastoise": "pm9.fMEGA.icon.png",
  "Mega Sceptile": "pm254.fMEGA.icon.png",
  "Mega Venusaur": "pm3.fMEGA.icon.png",
  "Mega Abomasnow": "pokemon_icon_460_51.png",
  "Mega Manectric": "pm310.fMEGA.icon.png",
  "Mega Ampharos": "pokemon_icon_181_51.png",
  "Mega Glalie": "pm362.fMEGA.icon.png",
  "Mega Lucario": "pm448.fMEGA.icon.png",
  "Mega Heracross": "pm214.fMEGA.icon.png",
  "Mega Gallade": "pm475.fMEGA.icon.png",
  "Mega Gengar": "pokemon_icon_094_51.png",
  "Mega Beedrill": "pokemon_icon_015_51.png",
  "Primal Groudon": "pm383.fPRIMAL.icon.png",
  "Mega Garchomp": "pm445.fMEGA.icon.png",
  "Mega Rayquaza": "pm384.fMEGA.icon.png",
  "Mega Salamence": "pm373.fMEGA.icon.png",
  "Mega Pinsir": "pm127.fMEGA.icon.png",
  "Mega Pidgeot": "pokemon_icon_018_51.png",
  "Mega Aerodactyl": "pm142.fMEGA.icon.png",
  "Mega Mewtwo Y": "pm150.fMEGA_Y.icon.png",
  "Mega Mewtwo X": "pm150.fMEGA_X.icon.png",
  "Mega Alakazam": "pokemon_icon_065_51.png",
  "Mega Gardevoir": "pm282.fMEGA.icon.png",
  "Mega Latios": "pm381.fMEGA.icon.png",
  "Mega Metagross": "pm376.fMEGA.icon.png",
  "Mega Scizor": "pm212.fMEGA.icon.png",
  "Mega Aggron": "pm306.fMEGA.icon.png",
  "Mega Tyranitar": "pm248.fMEGA.icon.png",
  "Mega Diancie": "pm719.fMEGA.icon.png",
  "Mega Absol": "pm359.fMEGA.icon.png",
  "Mega Banette": "pm354.fMEGA.icon.png",
};

export const MEGAS: MegaForm[] = ATTACKERS.filter((a) => a.category === "mega").map((a) => {
  const types = MEGA_TYPES[a.name];
  const file = MEGA_SPRITE[a.name];
  if (process.env.NODE_ENV !== "production" && (!types || !file)) {
    throw new Error(`megas.ts: missing ${!types ? "types" : "sprite"} for "${a.name}"`);
  }
  return {
    name: a.name,
    species: a.species,
    types: types ?? [],
    sprite: SPRITE_BASE + (file ?? ""),
    attacks: a.attacks,
    superMax: SUPER_MAX_SPECIES.has(a.species),
  };
});
