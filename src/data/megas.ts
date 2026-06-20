/**
 * MEGAS — every released Mega / Primal Evolution, with the data the candy-boost
 * engine needs that the raw ATTACKERS list doesn't carry:
 *
 *   - `types`:  the mega's OWN (defensive) typing. Mega-Evolving grants a same-
 *               type Candy / Candy XL bonus on every raid completed and wild
 *               Pokémon caught of a type the mega shares — so this, not its
 *               attacking types, decides which bosses it boosts.
 *   - `sprite`: the mega's icon (Leek Duck / PokeMiners assets), for the boost
 *               suggestion rows and the "& mega3" search string.
 *
 * The list is the union of the attacker-pool megas AND candy-boost-only megas
 * (e.g. Mega Audino, Lopunny, Kangaskhan) that aren't strong attackers but are
 * still valid same-type boosts — because for the candy bonus only the type
 * matters, not combat power. Attacking eDPS is reused from ATTACKERS (single
 * source of truth) so a mega that ALSO happens to be super-effective ranks as an
 * attacker too; the rest carry no attacks and surface in the candy-only tier.
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
}

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
  // Candy-boost-only megas: valid same-type boosts that aren't in the attacker
  // pool, so they previously never surfaced as suggestions.
  "Mega Kangaskhan": ["Normal"],
  "Mega Lopunny": ["Normal", "Fighting"],
  "Mega Audino": ["Normal", "Fairy"],
  "Mega Slowbro": ["Water", "Psychic"],
  "Mega Sharpedo": ["Water", "Dark"],
  "Mega Steelix": ["Steel", "Ground"],
  "Mega Mawile": ["Steel", "Fairy"],
  "Mega Sableye": ["Dark", "Ghost"],
  "Mega Medicham": ["Fighting", "Psychic"],
  "Mega Altaria": ["Dragon", "Fairy"],
  "Mega Latias": ["Dragon", "Psychic"],
  "Mega Dragonite": ["Dragon", "Flying"],
  "Mega Victreebel": ["Grass", "Poison"],
  "Mega Malamar": ["Dark", "Psychic"],
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
  "Mega Kangaskhan": "pm115.fMEGA.icon.png",
  "Mega Lopunny": "pm428.fMEGA.icon.png",
  "Mega Audino": "pm531.fMEGA.icon.png",
  "Mega Slowbro": "pm80.fMEGA.icon.png",
  "Mega Sharpedo": "pm319.fMEGA.icon.png",
  "Mega Steelix": "pm208.fMEGA.icon.png",
  "Mega Mawile": "pm303.fMEGA.icon.png",
  "Mega Sableye": "pm302.fMEGA.icon.png",
  "Mega Medicham": "pm308.fMEGA.icon.png",
  "Mega Altaria": "pm334.fMEGA.icon.png",
  "Mega Latias": "pm380.fMEGA.icon.png",
  "Mega Dragonite": "pm149.fMEGA.icon.png",
  "Mega Victreebel": "pm71.fMEGA.icon.png",
  "Mega Malamar": "pm687.fMEGA.icon.png",
};

const MEGA_ATTACKERS = ATTACKERS.filter((a) => a.category === "mega");
const ATTACKER_BY_NAME = new Map(MEGA_ATTACKERS.map((a) => [a.name, a]));

/** Final-evolution species term from a mega's display name (for the search string). */
function megaSpecies(name: string): string {
  return name.replace(/^(Mega|Primal)\s+/, "").replace(/\s+[XY]$/, "").trim();
}

// Build from the full type table (not just attackers) so every released mega is a
// candy-boost candidate. Attacks come from the attacker pool when present; a
// candy-boost-only mega carries none and surfaces in the candy-only tier.
export const MEGAS: MegaForm[] = Object.entries(MEGA_TYPES).map(([name, types]) => {
  const atk = ATTACKER_BY_NAME.get(name);
  const file = MEGA_SPRITE[name];
  if (process.env.NODE_ENV !== "production" && !file) {
    throw new Error(`megas.ts: missing sprite for "${name}"`);
  }
  return {
    name,
    species: atk?.species ?? megaSpecies(name),
    types,
    sprite: SPRITE_BASE + (file ?? ""),
    attacks: atk?.attacks ?? {},
  };
});

// Safety net: an attacking mega without a type entry would silently vanish from
// candy-boost suggestions.
if (process.env.NODE_ENV !== "production") {
  for (const a of MEGA_ATTACKERS) {
    if (!MEGA_TYPES[a.name]) throw new Error(`megas.ts: attacker mega "${a.name}" missing from MEGA_TYPES`);
  }
}
