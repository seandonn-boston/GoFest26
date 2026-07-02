/**
 * Species → icon URL, for the small sprites shown beside every copyable search
 * string. Search terms are final-evolution species names (see lib/pokemonSearch),
 * so this maps a species to its base-form Pokémon GO icon on the same PokeMiners
 * Addressable Assets set the roster sprites use (`pm{dex}.icon.png`).
 *
 * Roster bosses already carry verified icon URLs, so those are reused directly;
 * everything else resolves by National Dex number. Unknown species return
 * undefined and the <Sprite> component falls back to a lettered chip.
 */
import { RAID_BOSSES, spriteUrl } from "./bosses";
import { MEGAS } from "./megas";
import { pokemonSearchName } from "@/lib/pokemonSearch";

// National Dex numbers for every attacker/counter species in the pool.
const SPECIES_DEX: Record<string, number> = {
  // Megas' base species (also valid plain counters)
  charizard: 6,
  venusaur: 3,
  blastoise: 9,
  blaziken: 257,
  swampert: 260,
  sceptile: 254,
  beedrill: 15,
  pidgeot: 18,
  alakazam: 65,
  gengar: 94,
  pinsir: 127,
  gyarados: 130,
  aerodactyl: 142,
  ampharos: 181,
  scizor: 212,
  heracross: 214,
  houndoom: 229,
  tyranitar: 248,
  gardevoir: 282,
  aggron: 306,
  manectric: 310,
  camerupt: 323,
  banette: 354,
  absol: 359,
  glalie: 362,
  salamence: 373,
  metagross: 376,
  latios: 381,
  kyogre: 382,
  groudon: 383,
  rayquaza: 384,
  garchomp: 445,
  lucario: 448,
  gallade: 475,
  diancie: 719,
  mewtwo: 150,
  // Legendary / Mythical / Ultra Beast
  reshiram: 643,
  moltres: 146,
  chandelure: 609,
  entei: 244,
  feraligatr: 160,
  empoleon: 395,
  tangrowth: 465,
  torterra: 389,
  raikou: 243,
  zapdos: 145,
  electivire: 466,
  magnezone: 462,
  mamoswine: 473,
  articuno: 144,
  weavile: 461,
  machamp: 68,
  hariyama: 297,
  nidoking: 34,
  rhyperior: 464,
  excadrill: 530,
  rampardos: 409,
  honchkrow: 430,
  staraptor: 398,
  dragonite: 149,
  espeon: 196,
  blacephalon: 806,
  heatran: 485,
  "ho-oh": 250,
  palkia: 484,
  suicune: 245,
  kartana: 798,
  "tapu bulu": 787,
  zarude: 893,
  regieleki: 894,
  xurkitree: 796,
  zeraora: 807,
  zekrom: 644,
  thundurus: 642,
  kyurem: 646,
  regice: 378,
  terrakion: 639,
  keldeo: 647,
  zamazenta: 889,
  virizion: 640,
  cobalion: 638,
  naganadel: 804,
  landorus: 645,
  tornadus: 641,
  yveltal: 717,
  deoxys: 386,
  necrozma: 800,
  latias: 380,
  lunala: 792,
  genesect: 649,
  pheromosa: 795,
  buzzwole: 794,
  giratina: 487,
  regidrago: 895,
  dialga: 483,
  jirachi: 385,
  darkrai: 491,
  xerneas: 716,
  zacian: 888,
  enamorus: 905,
  "tapu lele": 786,
  "tapu koko": 785,
  // Regular final evolutions
  darmanitan: 555,
  volcarona: 637,
  emboar: 500,
  typhlosion: 157,
  kingler: 99,
  greninja: 658,
  roserade: 407,
  leafeon: 470,
  vikavolt: 738,
  luxray: 405,
  raichu: 26,
  glaceon: 471,
  conkeldurr: 534,
  annihilape: 979,
  toxicroak: 454,
  overqwil: 904,
  vileplume: 45,
  krookodile: 553,
  rhydon: 112,
  archeops: 567,
  braviary: 628,
  haxorus: 612,
  dragapult: 887,
  hydreigon: 635,
  bisharp: 625,
  togekiss: 468,
  sylveon: 700,
  primarina: 730,
  granbull: 210,
  golurk: 623,
  mismagius: 429,
  gigalith: 526,
  escavalier: 589,
};

// Form-only species have no plain `pm{dex}.icon.png` on PokeMiners — they need a
// form suffix. Verified Addressable filenames for the default/representative form.
const DEX_FORM_FILE: Record<number, string> = {
  555: "pm555.fGALARIAN_STANDARD.icon.png", // Galarian Darmanitan (the raid attacker)
  641: "pm641.fINCARNATE.icon.png", // Tornadus
  642: "pm642.fINCARNATE.icon.png", // Thundurus
  645: "pm645.fINCARNATE.icon.png", // Landorus
  646: "pm646.fNORMAL.icon.png", // Kyurem
  647: "pm647.fORDINARY.icon.png", // Keldeo
  649: "pm649.fNORMAL.icon.png", // Genesect
  905: "pm905.fINCARNATE.icon.png", // Enamorus
};

/** Addressable sprite filename for a species' dex number (form-suffixed when needed). */
function dexIconFile(dex: number): string {
  return DEX_FORM_FILE[dex] ?? `pm${dex}.icon.png`;
}

// Prefer base-species dex icons (a search term IS the base species); fall back
// to a roster boss's verified sprite for anything not in the dex table above.
const rosterBySpecies = new Map<string, string>();
for (const b of RAID_BOSSES) {
  if (!b.sprite) continue;
  const key = pokemonSearchName(b.name).toLowerCase();
  if (!rosterBySpecies.has(key)) rosterBySpecies.set(key, b.sprite);
}

export function speciesIconUrl(species: string): string | undefined {
  const key = species.trim().toLowerCase();
  const dex = SPECIES_DEX[key];
  if (dex) return spriteUrl(dexIconFile(dex));
  return rosterBySpecies.get(key);
}

// Form-specific icon files for attacker forms whose plain `pm{dex}.icon.png`
// doesn't exist (or shows the wrong form) — verified PokeMiners filenames, reused
// from the roster where possible. Keyed by the attacker's display name.
const FORM_SPRITE: Record<string, string> = {
  "Thundurus (Therian)": "pokemon_icon_642_12.png",
  "Tornadus (Therian)": "pokemon_icon_641_12.png",
  "Landorus (Therian)": "pokemon_icon_645_12.png",
  "Enamorus (Incarnate)": "pm905.fINCARNATE.icon.png",
  Kyurem: "pokemon_icon_646_11.png",
  Genesect: "pokemon_icon_649_11.png",
  "Deoxys (Attack)": "pokemon_icon_386_11.png",
  "Origin Forme Giratina": "pokemon_icon_487_12.png",
  "Giratina (Altered)": "pokemon_icon_487_11.png",
};

const megaSpriteByName = new Map(MEGAS.map((m) => [m.name, m.sprite]));

/**
 * Icon for a specific attacker FORM (not just its species): Mega/Primal use the
 * mega sprite, forme'd legendaries use their form file, and everything else
 * falls back to the base-species icon (Shadow forms share the base icon). So a
 * sprite chip shows the variant that's actually the relevant raid attacker.
 */
export function attackerIconUrl(attacker: { name: string; species: string }): string | undefined {
  return (
    megaSpriteByName.get(attacker.name) ??
    (FORM_SPRITE[attacker.name] ? spriteUrl(FORM_SPRITE[attacker.name]) : speciesIconUrl(attacker.species))
  );
}

/** Every sprite URL the app references — fed to the loader so they're warm. */
export function allSpriteUrls(): string[] {
  const urls = new Set<string>();
  for (const dex of Object.values(SPECIES_DEX)) urls.add(spriteUrl(dexIconFile(dex)));
  for (const m of MEGAS) urls.add(m.sprite);
  for (const b of RAID_BOSSES) if (b.sprite) urls.add(b.sprite);
  return [...urls];
}
