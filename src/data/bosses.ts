import type {
  EventDay,
  HabitatWindow,
  RaidBoss,
  RegionScope,
} from "@/domain/types";
import { GAME_CONFIG } from "./config";

/**
 * RAID_BOSSES — the GO Fest 2026: Global raid roster.
 *
 * Availability follows the published habitat schedule (see habitats.ts). Hours
 * are event-local indexes 0..8 (10am = 0 ... 6pm = 8). Mega Mewtwo X is
 * Saturday-only and Mega Mewtwo Y is Sunday-only; they do NOT share Mega Energy.
 *
 * Reward ranges pull shared tier defaults from GAME_CONFIG so they're tuned in
 * one place. Region-locked bosses carry a `region` scope used to decide whether
 * the player can raid them locally or must remote raid.
 */

const { megaRewards, catch: catchRewards, genericMegaLevelTotals } = GAME_CONFIG;

const w = (day: EventDay, startHour: number, endHour: number): HabitatWindow => ({
  day,
  startHour,
  endHour,
});

// Cumulative Mega Energy to reach Mega Level 0..4 for a fresh Mewtwo. Index 1 is
// the first evolution (7,500); the level-4 total (~18,580) is the reported value.
const MEWTWO_ENERGY_TOTALS = [0, 7500, 10080, 13580, 18580];

interface MegaOpts {
  id: string;
  name: string;
  types: string[];
  windows: HabitatWindow[];
  counters: string[];
  note?: string;
}

function mega(o: MegaOpts): RaidBoss {
  return {
    id: o.id,
    name: o.name,
    tier: "mega",
    sortPriority: 0,
    allWeekend: false,
    windows: o.windows,
    rewards: { candy: catchRewards.candy, xlCandy: catchRewards.megaXl, megaEnergy: megaRewards.mega },
    rewardsCurrencies: ["candy", "xlCandy", "megaEnergy"],
    bestCounters: o.counters,
    types: o.types,
    megaLevelEnergyTotals: [...genericMegaLevelTotals],
    note: o.note,
  };
}

function superMega(o: MegaOpts): RaidBoss {
  return {
    id: o.id,
    name: o.name,
    tier: "super-mega",
    sortPriority: 0,
    allWeekend: false,
    windows: o.windows,
    rewards: { candy: catchRewards.candy, xlCandy: catchRewards.legendaryXl, megaEnergy: megaRewards.superMega },
    rewardsCurrencies: ["candy", "xlCandy", "megaEnergy"],
    bestCounters: o.counters,
    types: o.types,
    megaEvolutionEnergyFirst: 7500,
    megaLevelEnergyTotals: [...MEWTWO_ENERGY_TOTALS],
    goFestPreUnlocked: true,
    note: o.note,
  };
}

interface LegOpts {
  id: string;
  name: string;
  types: string[];
  windows: HabitatWindow[];
  counters: string[];
  region?: RegionScope;
  note?: string;
}

function legendary(o: LegOpts): RaidBoss {
  return {
    id: o.id,
    name: o.name,
    tier: "five-star",
    sortPriority: 0,
    allWeekend: false,
    windows: o.windows,
    rewards: { candy: catchRewards.candy, xlCandy: catchRewards.legendaryXl },
    rewardsCurrencies: ["candy", "xlCandy"],
    bestCounters: o.counters,
    types: o.types,
    region: o.region,
    note: o.note,
  };
}

const ROSTER: RaidBoss[] = [
  // ============ Super Mega Raids (headliners) ============
  superMega({
    id: "mega-mewtwo-x",
    name: "Mega Mewtwo X",
    types: ["Psychic", "Fighting"],
    windows: [w("sat", 0, 9)],
    counters: ["Shadow Tyranitar (Bite/Crunch)", "Mega Gengar", "Shadow Chandelure"],
    note: "Saturday only. The top Fighting-type pick; X energy comes only from X raids.",
  }),
  superMega({
    id: "mega-mewtwo-y",
    name: "Mega Mewtwo Y",
    types: ["Psychic"],
    windows: [w("sun", 0, 9)],
    counters: ["Shadow Tyranitar (Bite/Crunch)", "Mega Gengar", "Shadow Weavile"],
    note: "Sunday only. Best Psychic attacker in the game; Y energy comes only from Y raids.",
  }),

  // ============ Saturday — Stormfire Peaks (10a–1p · Ice/Electric/Fire) ============
  mega({
    id: "mega-ampharos",
    name: "Mega Ampharos",
    types: ["Electric", "Dragon"],
    windows: [w("sat", 0, 3)],
    counters: ["Mega Garchomp", "Rhyperior", "Mamoswine"],
    note: "Skippable if you already have Mega Manectric, unless you want the Electric/Dragon boost.",
  }),
  mega({
    id: "mega-blaziken",
    name: "Mega Blaziken",
    types: ["Fire", "Fighting"],
    windows: [w("sat", 0, 3)],
    counters: ["Primal Kyogre", "Mega Swampert", "Rayquaza"],
    note: "2nd-best Fire and a strong Fighting attacker — a top mega to prioritize.",
  }),
  mega({
    id: "mega-abomasnow",
    name: "Mega Abomasnow",
    types: ["Grass", "Ice"],
    windows: [w("sat", 0, 3)],
    counters: ["Mega Charizard Y", "Reshiram", "Mega Blaziken"],
    note: "Worth it for the Ice boost if you don't have Mega Glalie.",
  }),
  legendary({
    id: "articuno",
    name: "Articuno",
    types: ["Ice", "Flying"],
    windows: [w("sat", 0, 3)],
    counters: ["Rhyperior", "Rampardos", "Zekrom"],
  }),
  legendary({
    id: "zapdos",
    name: "Zapdos",
    types: ["Electric", "Flying"],
    windows: [w("sat", 0, 3)],
    counters: ["Rhyperior", "Mamoswine", "Shadow Tyranitar"],
  }),
  legendary({
    id: "moltres",
    name: "Moltres",
    types: ["Fire", "Flying"],
    windows: [w("sat", 0, 3)],
    counters: ["Rhyperior", "Rampardos", "Zekrom"],
  }),
  legendary({
    id: "raikou",
    name: "Raikou",
    types: ["Electric"],
    windows: [w("sat", 0, 3)],
    counters: ["Mega Garchomp", "Excadrill", "Rhyperior"],
  }),
  legendary({
    id: "entei",
    name: "Entei",
    types: ["Fire"],
    windows: [w("sat", 0, 3)],
    counters: ["Primal Kyogre", "Rhyperior", "Mega Swampert"],
  }),
  legendary({
    id: "suicune",
    name: "Suicune",
    types: ["Water"],
    windows: [w("sat", 0, 3)],
    counters: ["Mega Sceptile", "Zekrom", "Kartana"],
  }),
  legendary({
    id: "lugia",
    name: "Lugia",
    types: ["Psychic", "Flying"],
    windows: [w("sat", 0, 3)],
    counters: ["Mega Gengar", "Shadow Tyranitar", "Zekrom"],
    note: "Strong in Master League (≈rank 15).",
  }),
  legendary({
    id: "ho-oh",
    name: "Ho-Oh",
    types: ["Fire", "Flying"],
    windows: [w("sat", 0, 3)],
    counters: ["Rhyperior", "Rampardos", "Zekrom"],
  }),

  // ============ Saturday — Astral Tides (1p–4p · Psychic/Ghost/Water) ============
  mega({
    id: "mega-alakazam",
    name: "Mega Alakazam",
    types: ["Psychic"],
    windows: [w("sat", 3, 6)],
    counters: ["Mega Gengar", "Mega Tyranitar", "Darkrai"],
    note: "Outclassed by Mega Mewtwo X/Y — only worth it if you can't do the Super Mega raids.",
  }),
  mega({
    id: "mega-gengar",
    name: "Mega Gengar",
    types: ["Ghost", "Poison"],
    windows: [w("sat", 3, 6)],
    counters: ["Mega Mewtwo Y", "Shadow Tyranitar", "Origin Forme Giratina"],
    note: "Best Ghost-type mega and the #1 Poison attacker — high priority.",
  }),
  mega({
    id: "mega-swampert",
    name: "Mega Swampert",
    types: ["Water", "Ground"],
    windows: [w("sat", 3, 6)],
    counters: ["Mega Sceptile", "Kartana", "Mega Venusaur"],
    note: "2nd-best Water attacker — prioritize if you don't have Primal Kyogre.",
  }),
  legendary({
    id: "uxie",
    name: "Uxie",
    types: ["Psychic"],
    windows: [w("sat", 3, 6)],
    region: { continent: "apac" },
    counters: ["Mega Gengar", "Shadow Tyranitar", "Darkrai"],
  }),
  legendary({
    id: "mesprit",
    name: "Mesprit",
    types: ["Psychic"],
    windows: [w("sat", 3, 6)],
    region: { continent: "emea" },
    counters: ["Mega Gengar", "Shadow Tyranitar", "Darkrai"],
  }),
  legendary({
    id: "azelf",
    name: "Azelf",
    types: ["Psychic"],
    windows: [w("sat", 3, 6)],
    region: { continent: "americas" },
    counters: ["Mega Gengar", "Shadow Tyranitar", "Darkrai"],
  }),
  legendary({
    id: "dialga",
    name: "Dialga",
    types: ["Steel", "Dragon"],
    windows: [w("sat", 3, 6)],
    counters: ["Mega Lucario", "Mega Garchomp", "Rhyperior"],
  }),
  legendary({
    id: "palkia",
    name: "Palkia",
    types: ["Water", "Dragon"],
    windows: [w("sat", 3, 6)],
    counters: ["Mega Salamence", "Xerneas", "Shadow Dragonite"],
  }),
  legendary({
    id: "giratina-altered",
    name: "Giratina (Altered)",
    types: ["Ghost", "Dragon"],
    windows: [w("sat", 3, 6)],
    counters: ["Mega Gengar", "Shadow Tyranitar", "Mega Houndoom"],
    note: "Altered Forme — the bulkier Ghost/Dragon, a staple in Master & Ultra League.",
  }),
  legendary({
    id: "giratina-origin",
    name: "Giratina (Origin)",
    types: ["Ghost", "Dragon"],
    windows: [w("sat", 3, 6)],
    counters: ["Mega Gengar", "Shadow Tyranitar", "Mega Houndoom"],
    note: "Origin Forme — the stronger Ghost attacker (Shadow Force).",
  }),
  legendary({
    id: "xerneas",
    name: "Xerneas",
    types: ["Fairy"],
    windows: [w("sat", 3, 6)],
    counters: ["Metagross", "Mega Gengar", "Mega Beedrill"],
    note: "Top-tier Master League pick (≈rank 4).",
  }),
  legendary({
    id: "yveltal",
    name: "Yveltal",
    types: ["Dark", "Flying"],
    windows: [w("sat", 3, 6)],
    counters: ["Xerneas", "Zekrom", "Rhyperior"],
  }),
  legendary({
    id: "solgaleo",
    name: "Solgaleo",
    types: ["Psychic", "Steel"],
    windows: [w("sat", 3, 6)],
    counters: ["Mega Charizard Y", "Shadow Chandelure", "Mega Houndoom"],
    note: "Also fusion material for Dusk Mane Necrozma.",
  }),
  legendary({
    id: "lunala",
    name: "Lunala",
    types: ["Psychic", "Ghost"],
    windows: [w("sat", 3, 6)],
    counters: ["Mega Gengar", "Shadow Tyranitar", "Darkrai"],
    note: "Also fusion material for Dawn Wings Necrozma.",
  }),

  // ============ Saturday — Dragonflight Summit (4p–7p · Flying/Rock/Dragon) ============
  mega({
    id: "mega-pidgeot",
    name: "Mega Pidgeot",
    types: ["Normal", "Flying"],
    windows: [w("sat", 6, 9)],
    counters: ["Mega Aerodactyl", "Rhyperior", "Zekrom"],
  }),
  mega({
    id: "mega-aerodactyl",
    name: "Mega Aerodactyl",
    types: ["Rock", "Flying"],
    windows: [w("sat", 6, 9)],
    counters: ["Mega Swampert", "Metagross", "Rhyperior"],
    note: "Useful Rock attacker and boosts candy from the many flying legendaries.",
  }),
  mega({
    id: "mega-salamence",
    name: "Mega Salamence",
    types: ["Dragon", "Flying"],
    windows: [w("sat", 6, 9)],
    counters: ["Mamoswine", "Galarian Darmanitan", "Mega Glalie"],
  }),
  legendary({
    id: "kyogre",
    name: "Kyogre",
    types: ["Water"],
    windows: [w("sat", 6, 9)],
    counters: ["Mega Sceptile", "Zekrom", "Kartana"],
    note: "No Primal Energy here — consider Primal Kyogre raids if that's your goal.",
  }),
  legendary({
    id: "groudon",
    name: "Groudon",
    types: ["Ground"],
    windows: [w("sat", 6, 9)],
    counters: ["Primal Kyogre", "Mega Sceptile", "Kyogre"],
    note: "No Primal Energy here — consider Primal Groudon raids if that's your goal.",
  }),
  legendary({
    id: "rayquaza",
    name: "Rayquaza",
    types: ["Dragon", "Flying"],
    windows: [w("sat", 6, 9)],
    counters: ["Mamoswine", "Galarian Darmanitan", "Mega Glalie"],
    note: "For Mega Energy wait for Mega Rayquaza raids; still great for candy/shinies.",
  }),
  legendary({
    id: "reshiram",
    name: "Reshiram",
    types: ["Dragon", "Fire"],
    windows: [w("sat", 6, 9)],
    counters: ["Shadow Tyranitar", "Rhyperior", "Rayquaza"],
    note: "9th-best Fire attacker; ≈rank 9 in Master League.",
  }),
  legendary({
    id: "zekrom",
    name: "Zekrom",
    types: ["Dragon", "Electric"],
    windows: [w("sat", 6, 9)],
    counters: ["Mamoswine", "Shadow Garchomp", "Mega Salamence"],
    note: "10th-best Electric attacker; ≈rank 11 in Master League.",
  }),
  legendary({
    id: "kyurem",
    name: "Kyurem",
    types: ["Dragon", "Ice"],
    windows: [w("sat", 6, 9)],
    counters: ["Mega Lucario", "Metagross", "Terrakion"],
    note: "Fusion energy comes from Black/White Kyurem raids, not this one.",
  }),

  // ============ Sunday — Earthforged Domain (10a–1p · Ground/Steel/Normal) ============
  mega({
    id: "mega-metagross",
    name: "Mega Metagross",
    types: ["Steel", "Psychic"],
    windows: [w("sun", 0, 3)],
    counters: ["Mega Charizard Y", "Reshiram", "Shadow Chandelure"],
  }),
  mega({
    id: "mega-garchomp",
    name: "Mega Garchomp",
    types: ["Dragon", "Ground"],
    windows: [w("sun", 0, 3)],
    counters: ["Mamoswine", "Galarian Darmanitan", "Mega Abomasnow"],
    note: "Top Dragon and Ground attacker — prioritize if you lack Mega Rayquaza/Primal Groudon.",
  }),
  mega({
    id: "mega-audino",
    name: "Mega Audino",
    types: ["Normal", "Fairy"],
    windows: [w("sun", 0, 3)],
    counters: ["Mega Gengar", "Mega Beedrill", "Metagross"],
  }),
  legendary({
    id: "regirock",
    name: "Regirock",
    types: ["Rock"],
    windows: [w("sun", 0, 3)],
    counters: ["Mega Lucario", "Machamp", "Terrakion"],
  }),
  legendary({
    id: "regice",
    name: "Regice",
    types: ["Ice"],
    windows: [w("sun", 0, 3)],
    counters: ["Mega Blaziken", "Reshiram", "Mega Lucario"],
  }),
  legendary({
    id: "registeel",
    name: "Registeel",
    types: ["Steel"],
    windows: [w("sun", 0, 3)],
    counters: ["Mega Blaziken", "Reshiram", "Mega Charizard Y"],
  }),
  legendary({
    id: "dialga-origin",
    name: "Origin Forme Dialga",
    types: ["Steel", "Dragon"],
    windows: [w("sun", 0, 3)],
    counters: ["Mega Lucario", "Mega Garchomp", "Rhyperior"],
    note: "Chance at Roar of Time (adventure effect that pauses item timers) — can't be TM'd.",
  }),
  legendary({
    id: "palkia-origin",
    name: "Origin Forme Palkia",
    types: ["Water", "Dragon"],
    windows: [w("sun", 0, 3)],
    counters: ["Mega Salamence", "Xerneas", "Shadow Dragonite"],
    note: "Chance at Spacial Rend (adventure effect that widens encounter radius) — can't be TM'd.",
  }),
  legendary({
    id: "heatran",
    name: "Heatran",
    types: ["Fire", "Steel"],
    windows: [w("sun", 0, 3)],
    counters: ["Primal Kyogre", "Mega Swampert", "Mega Lucario"],
  }),
  legendary({
    id: "regigigas",
    name: "Regigigas",
    types: ["Normal"],
    windows: [w("sun", 0, 3)],
    counters: ["Mega Lucario", "Machamp", "Terrakion"],
  }),
  legendary({
    id: "tornadus",
    name: "Tornadus (Incarnate & Therian)",
    types: ["Flying"],
    windows: [w("sun", 0, 3)],
    counters: ["Zekrom", "Rhyperior", "Mamoswine"],
    note: "Both Incarnate and Therian Formes appear.",
  }),
  legendary({
    id: "thundurus",
    name: "Thundurus (Incarnate & Therian)",
    types: ["Electric", "Flying"],
    windows: [w("sun", 0, 3)],
    counters: ["Mamoswine", "Rhyperior", "Shadow Tyranitar"],
    note: "Therian Forme is the strong Electric attacker (Volt Switch / Wildbolt Storm).",
  }),
  legendary({
    id: "landorus",
    name: "Landorus (Incarnate & Therian)",
    types: ["Ground", "Flying"],
    windows: [w("sun", 0, 3)],
    counters: ["Mamoswine", "Galarian Darmanitan", "Kyogre"],
    note: "Therian Forme is the best non-mega/shadow Ground attacker.",
  }),
  legendary({
    id: "enamorus",
    name: "Enamorus (Incarnate & Therian)",
    types: ["Fairy", "Flying"],
    windows: [w("sun", 0, 3)],
    counters: ["Metagross", "Zekrom", "Rhyperior"],
    note: "Incarnate Forme is the 4th-best Fairy attacker.",
  }),
  legendary({
    id: "regieleki",
    name: "Regieleki",
    types: ["Electric"],
    windows: [w("sun", 0, 3)],
    counters: ["Mega Garchomp", "Excadrill", "Rhyperior"],
    note: "Best Electric-type attacker in the game.",
  }),
  legendary({
    id: "regidrago",
    name: "Regidrago",
    types: ["Dragon"],
    windows: [w("sun", 0, 3)],
    counters: ["Xerneas", "Mamoswine", "Mega Salamence"],
  }),

  // ============ Sunday — Verdant Anomaly (1p–4p · Poison/Bug/Grass) ============
  mega({
    id: "mega-beedrill",
    name: "Mega Beedrill",
    types: ["Bug", "Poison"],
    windows: [w("sun", 3, 6)],
    counters: ["Mega Charizard Y", "Mega Pidgeot", "Mewtwo"],
  }),
  mega({
    id: "mega-pinsir",
    name: "Mega Pinsir",
    types: ["Bug", "Flying"],
    windows: [w("sun", 3, 6)],
    counters: ["Mega Aerodactyl", "Rhyperior", "Zekrom"],
    note: "3rd-best Bug attacker (no legacy move needed) — better Bug pick than Beedrill.",
  }),
  mega({
    id: "mega-sceptile",
    name: "Mega Sceptile",
    types: ["Grass", "Dragon"],
    windows: [w("sun", 3, 6)],
    counters: ["Mega Charizard Y", "Mega Salamence", "Mamoswine"],
    note: "#1 Grass attacker — high priority.",
  }),
  legendary({
    id: "deoxys",
    name: "Deoxys (all Formes)",
    types: ["Psychic"],
    windows: [w("sun", 3, 6)],
    counters: ["Mega Gengar", "Shadow Tyranitar", "Darkrai"],
    note: "Normal, Attack, Defense, and Speed Formes all appear.",
  }),
  legendary({
    id: "genesect",
    name: "Genesect (all Drive Formes)",
    types: ["Bug", "Steel"],
    windows: [w("sun", 3, 6)],
    counters: ["Mega Charizard Y", "Reshiram", "Mega Blaziken"],
    note: "All five Drive Formes (Normal/Douse/Shock/Burn/Chill) appear, globally.",
  }),
  legendary({
    id: "nihilego",
    name: "Nihilego",
    types: ["Rock", "Poison"],
    windows: [w("sun", 3, 6)],
    counters: ["Mega Garchomp", "Excadrill", "Rhyperior"],
    note: "5th-best Poison attacker.",
  }),
  legendary({
    id: "buzzwole",
    name: "Buzzwole",
    types: ["Bug", "Fighting"],
    windows: [w("sun", 3, 6)],
    region: { continent: "americas" },
    counters: ["Mega Pidgeot", "Moltres", "Mega Gardevoir"],
  }),
  legendary({
    id: "pheromosa",
    name: "Pheromosa",
    types: ["Bug", "Fighting"],
    windows: [w("sun", 3, 6)],
    region: { continent: "emea" },
    counters: ["Mega Pidgeot", "Moltres", "Mewtwo"],
  }),
  legendary({
    id: "xurkitree",
    name: "Xurkitree",
    types: ["Electric"],
    windows: [w("sun", 3, 6)],
    region: { continent: "apac" },
    counters: ["Mega Garchomp", "Excadrill", "Rhyperior"],
    note: "4th-best Electric attacker.",
  }),
  legendary({
    id: "celesteela",
    name: "Celesteela",
    types: ["Steel", "Flying"],
    windows: [w("sun", 3, 6)],
    region: { ns: "S" },
    counters: ["Mega Charizard Y", "Reshiram", "Zekrom"],
  }),
  legendary({
    id: "kartana",
    name: "Kartana",
    types: ["Grass", "Steel"],
    windows: [w("sun", 3, 6)],
    region: { ns: "N" },
    counters: ["Mega Charizard Y", "Reshiram", "Mega Blaziken"],
    note: "Best non-mega Grass attacker.",
  }),
  legendary({
    id: "guzzlord",
    name: "Guzzlord",
    types: ["Dark", "Dragon"],
    windows: [w("sun", 3, 6)],
    counters: ["Xerneas", "Mega Lucario", "Mamoswine"],
  }),
  legendary({
    id: "necrozma",
    name: "Necrozma",
    types: ["Psychic"],
    windows: [w("sun", 3, 6)],
    counters: ["Mega Gengar", "Shadow Tyranitar", "Darkrai"],
    note: "Fusion energy comes from the fused Necrozma raids; raid Solgaleo/Lunala as fusion material.",
  }),
  legendary({
    id: "stakataka",
    name: "Stakataka",
    types: ["Rock", "Steel"],
    windows: [w("sun", 3, 6)],
    region: { ew: "E" },
    counters: ["Mega Lucario", "Mega Swampert", "Machamp"],
  }),
  legendary({
    id: "blacephalon",
    name: "Blacephalon",
    types: ["Fire", "Ghost"],
    windows: [w("sun", 3, 6)],
    region: { ew: "W" },
    counters: ["Primal Kyogre", "Shadow Tyranitar", "Mega Gengar"],
    note: "Best non-mega Fire attacker.",
  }),
  legendary({
    id: "tapu-koko",
    name: "Tapu Koko",
    types: ["Electric", "Fairy"],
    windows: [w("sun", 3, 6)],
    counters: ["Mega Garchomp", "Excadrill", "Mega Gengar"],
  }),
  legendary({
    id: "tapu-lele",
    name: "Tapu Lele",
    types: ["Psychic", "Fairy"],
    windows: [w("sun", 3, 6)],
    counters: ["Metagross", "Mega Gengar", "Mega Beedrill"],
  }),
  legendary({
    id: "tapu-bulu",
    name: "Tapu Bulu",
    types: ["Grass", "Fairy"],
    windows: [w("sun", 3, 6)],
    counters: ["Mega Charizard Y", "Mega Pidgeot", "Genesect"],
  }),
  legendary({
    id: "tapu-fini",
    name: "Tapu Fini",
    types: ["Water", "Fairy"],
    windows: [w("sun", 3, 6)],
    counters: ["Zekrom", "Mega Sceptile", "Roserade"],
  }),

  // ============ Sunday — Twilight Battlefield (4p–7p · Dark/Fairy/Fighting) ============
  mega({
    id: "mega-tyranitar",
    name: "Mega Tyranitar",
    types: ["Rock", "Dark"],
    windows: [w("sun", 6, 9)],
    counters: ["Mega Lucario", "Machamp", "Terrakion"],
    note: "Best Dark attacker and a strong Rock attacker.",
  }),
  mega({
    id: "mega-gardevoir",
    name: "Mega Gardevoir",
    types: ["Psychic", "Fairy"],
    windows: [w("sun", 6, 9)],
    counters: ["Metagross", "Mega Gengar", "Roserade"],
    note: "#1 Fairy attacker (Charm / Dazzling Gleam).",
  }),
  mega({
    id: "mega-lucario",
    name: "Mega Lucario",
    types: ["Fighting", "Steel"],
    windows: [w("sun", 6, 9)],
    counters: ["Mega Blaziken", "Reshiram", "Mega Garchomp"],
    note: "#1 Fighting attacker and a strong Steel attacker — high priority.",
  }),
  legendary({
    id: "latias",
    name: "Latias",
    types: ["Dragon", "Psychic"],
    windows: [w("sun", 6, 9)],
    counters: ["Mega Gengar", "Shadow Tyranitar", "Mamoswine"],
  }),
  legendary({
    id: "latios",
    name: "Latios",
    types: ["Dragon", "Psychic"],
    windows: [w("sun", 6, 9)],
    counters: ["Mega Gengar", "Shadow Tyranitar", "Mamoswine"],
  }),
  legendary({
    id: "cresselia",
    name: "Cresselia",
    types: ["Psychic"],
    windows: [w("sun", 6, 9)],
    counters: ["Mega Gengar", "Shadow Tyranitar", "Darkrai"],
  }),
  legendary({
    id: "darkrai",
    name: "Darkrai",
    types: ["Dark"],
    windows: [w("sun", 6, 9)],
    counters: ["Mega Lucario", "Machamp", "Xerneas"],
  }),
  legendary({
    id: "cobalion",
    name: "Cobalion",
    types: ["Steel", "Fighting"],
    windows: [w("sun", 6, 9)],
    counters: ["Mega Charizard Y", "Reshiram", "Mega Lucario"],
  }),
  legendary({
    id: "terrakion",
    name: "Terrakion",
    types: ["Rock", "Fighting"],
    windows: [w("sun", 6, 9)],
    counters: ["Mega Swampert", "Mega Sceptile", "Mewtwo"],
    note: "One of the best non-mega/shadow Fighting attackers (Double Kick / Sacred Sword).",
  }),
  legendary({
    id: "virizion",
    name: "Virizion",
    types: ["Grass", "Fighting"],
    windows: [w("sun", 6, 9)],
    counters: ["Mega Pidgeot", "Moltres", "Mega Charizard Y"],
  }),
  legendary({
    id: "zacian",
    name: "Zacian (Hero of Many Battles)",
    types: ["Fairy"],
    windows: [w("sun", 6, 9)],
    counters: ["Metagross", "Mega Gengar", "Mega Beedrill"],
    note: "Crowned Sword energy comes from the Crowned Zacian raids — this is the Hero form.",
  }),
  legendary({
    id: "zamazenta",
    name: "Zamazenta (Hero of Many Battles)",
    types: ["Fighting"],
    windows: [w("sun", 6, 9)],
    counters: ["Mega Mewtwo Y", "Mega Gardevoir", "Mega Pidgeot"],
    note: "Crowned Shield energy comes from the Crowned Zamazenta raids — this is the Hero form.",
  }),
];

// Pokémon GO sprite icon filenames (Leek Duck CDN). Collapsed multi-form groups
// use their default/representative form's icon.
const SPRITE_BASE = "https://cdn.leekduck.com/assets/img/pokemon_icons/";
const SPRITES: Record<string, string> = {
  "mega-mewtwo-x": "pm150.fMEGA_X.icon.png",
  "mega-mewtwo-y": "pm150.fMEGA_Y.icon.png",
  "mega-ampharos": "pokemon_icon_181_51.png",
  "mega-blaziken": "pm257.fMEGA.icon.png",
  "mega-abomasnow": "pokemon_icon_460_51.png",
  articuno: "pokemon_icon_144_00.png",
  zapdos: "pokemon_icon_145_00.png",
  moltres: "pokemon_icon_146_00.png",
  raikou: "pokemon_icon_243_00.png",
  entei: "pokemon_icon_244_00.png",
  suicune: "pokemon_icon_245_00.png",
  lugia: "pokemon_icon_249_00.png",
  "ho-oh": "pokemon_icon_250_00.png",
  "mega-alakazam": "pokemon_icon_065_51.png",
  "mega-gengar": "pokemon_icon_094_51.png",
  "mega-swampert": "pm260.fMEGA.icon.png",
  uxie: "pokemon_icon_480_00.png",
  mesprit: "pokemon_icon_481_00.png",
  azelf: "pokemon_icon_482_00.png",
  dialga: "pokemon_icon_483_00.png",
  palkia: "pokemon_icon_484_00.png",
  "giratina-altered": "pokemon_icon_487_11.png",
  "giratina-origin": "pokemon_icon_487_12.png",
  xerneas: "pokemon_icon_716_00.png",
  yveltal: "pokemon_icon_717_00.png",
  solgaleo: "pm791.icon.png",
  lunala: "pm792.icon.png",
  "mega-pidgeot": "pokemon_icon_018_51.png",
  "mega-aerodactyl": "pm142.fMEGA.icon.png",
  "mega-salamence": "pm373.fMEGA.icon.png",
  kyogre: "pokemon_icon_382_00.png",
  groudon: "pokemon_icon_383_00.png",
  rayquaza: "pokemon_icon_384_00.png",
  reshiram: "pokemon_icon_643_00.png",
  zekrom: "pokemon_icon_644_00.png",
  kyurem: "pokemon_icon_646_11.png",
  "mega-metagross": "pm376.fMEGA.icon.png",
  "mega-garchomp": "pm445.fMEGA.icon.png",
  "mega-audino": "pm531.fMEGA.icon.png",
  regirock: "pokemon_icon_377_00.png",
  regice: "pokemon_icon_378_00.png",
  registeel: "pokemon_icon_379_00.png",
  "dialga-origin": "pm483.fORIGIN.icon.png",
  "palkia-origin": "pm484.fORIGIN.icon.png",
  heatran: "pokemon_icon_485_00.png",
  regigigas: "pokemon_icon_486_00.png",
  tornadus: "pokemon_icon_641_11.png",
  thundurus: "pokemon_icon_642_11.png",
  landorus: "pokemon_icon_645_11.png",
  enamorus: "pm905.fTHERIAN.icon.png",
  regieleki: "pm894.icon.png",
  regidrago: "pm895.icon.png",
  "mega-beedrill": "pokemon_icon_015_51.png",
  "mega-pinsir": "pm127.fMEGA.icon.png",
  "mega-sceptile": "pm254.fMEGA.icon.png",
  deoxys: "pokemon_icon_386_11.png",
  genesect: "pokemon_icon_649_11.png",
  nihilego: "pm793.icon.png",
  buzzwole: "pm794.icon.png",
  pheromosa: "pm795.icon.png",
  xurkitree: "pm796.icon.png",
  celesteela: "pm797.icon.png",
  kartana: "pm798.icon.png",
  guzzlord: "pm799.icon.png",
  necrozma: "pm800.icon.png",
  stakataka: "pm805.icon.png",
  blacephalon: "pm806.icon.png",
  "tapu-koko": "pm785.icon.png",
  "tapu-lele": "pm786.icon.png",
  "tapu-bulu": "pm787.icon.png",
  "tapu-fini": "pm788.icon.png",
  "mega-tyranitar": "pm248.fMEGA.icon.png",
  "mega-gardevoir": "pm282.fMEGA.icon.png",
  "mega-lucario": "pm448.fMEGA.icon.png",
  latias: "pokemon_icon_380_00.png",
  latios: "pokemon_icon_381_00.png",
  cresselia: "pokemon_icon_488_00.png",
  darkrai: "pokemon_icon_491_00.png",
  cobalion: "pokemon_icon_638_00.png",
  terrakion: "pokemon_icon_639_00.png",
  virizion: "pokemon_icon_640_00.png",
  zacian: "pm888.fHERO.icon.png",
  zamazenta: "pm889.fHERO.icon.png",
};

export const RAID_BOSSES: RaidBoss[] = ROSTER.map((b, i) => ({
  ...b,
  sortPriority: i,
  sprite: SPRITES[b.id] ? SPRITE_BASE + SPRITES[b.id] : undefined,
}));

/** Sprite URL for Mega Mewtwo Y (used in the combined Mewtwo card). */
export const MEWTWO_Y_SPRITE = SPRITE_BASE + SPRITES["mega-mewtwo-y"];
export const MEWTWO_X_SPRITE = SPRITE_BASE + SPRITES["mega-mewtwo-x"];
