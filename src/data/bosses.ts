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

const { megaRewards, legendaryRewards, genericMegaLevelTotals } = GAME_CONFIG;

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
    rewards: { candy: { min: 5, max: 8 }, xlCandy: { min: 1, max: 3 }, megaEnergy: megaRewards.mega },
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
    rewards: { candy: { min: 5, max: 8 }, xlCandy: { min: 1, max: 3 }, megaEnergy: megaRewards.superMega },
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
    rewards: { candy: legendaryRewards.candy, xlCandy: legendaryRewards.xlCandy },
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
    name: "Altered Forme Giratina",
    types: ["Ghost", "Dragon"],
    windows: [w("sat", 3, 6)],
    counters: ["Mega Gengar", "Shadow Mewtwo", "Mega Houndoom"],
  }),
  legendary({
    id: "giratina-origin",
    name: "Origin Forme Giratina",
    types: ["Ghost", "Dragon"],
    windows: [w("sat", 3, 6)],
    counters: ["Mega Gengar", "Shadow Tyranitar", "Mega Houndoom"],
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
    id: "tornadus-incarnate",
    name: "Incarnate Forme Tornadus",
    types: ["Flying"],
    windows: [w("sun", 0, 3)],
    counters: ["Zekrom", "Rhyperior", "Mamoswine"],
  }),
  legendary({
    id: "tornadus-therian",
    name: "Therian Forme Tornadus",
    types: ["Flying"],
    windows: [w("sun", 0, 3)],
    counters: ["Zekrom", "Rhyperior", "Mamoswine"],
  }),
  legendary({
    id: "thundurus-incarnate",
    name: "Incarnate Forme Thundurus",
    types: ["Electric", "Flying"],
    windows: [w("sun", 0, 3)],
    counters: ["Mamoswine", "Rhyperior", "Shadow Tyranitar"],
  }),
  legendary({
    id: "thundurus-therian",
    name: "Therian Forme Thundurus",
    types: ["Electric", "Flying"],
    windows: [w("sun", 0, 3)],
    counters: ["Mamoswine", "Rhyperior", "Shadow Tyranitar"],
    note: "8th-best Electric attacker (Volt Switch / Wildbolt Storm).",
  }),
  legendary({
    id: "landorus-incarnate",
    name: "Incarnate Forme Landorus",
    types: ["Ground", "Flying"],
    windows: [w("sun", 0, 3)],
    counters: ["Mamoswine", "Galarian Darmanitan", "Kyogre"],
  }),
  legendary({
    id: "landorus-therian",
    name: "Therian Forme Landorus",
    types: ["Ground", "Flying"],
    windows: [w("sun", 0, 3)],
    counters: ["Mamoswine", "Galarian Darmanitan", "Kyogre"],
    note: "Best non-mega/shadow Ground attacker (Mud Shot / Sandsear Storm).",
  }),
  legendary({
    id: "enamorus-incarnate",
    name: "Incarnate Forme Enamorus",
    types: ["Fairy", "Flying"],
    windows: [w("sun", 0, 3)],
    counters: ["Metagross", "Zekrom", "Rhyperior"],
    note: "4th-best Fairy attacker — the Incarnate form is the one for raiding.",
  }),
  legendary({
    id: "enamorus-therian",
    name: "Therian Forme Enamorus",
    types: ["Fairy", "Flying"],
    windows: [w("sun", 0, 3)],
    counters: ["Metagross", "Zekrom", "Rhyperior"],
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
    id: "deoxys-normal",
    name: "Deoxys",
    types: ["Psychic"],
    windows: [w("sun", 3, 6)],
    counters: ["Mega Gengar", "Shadow Tyranitar", "Darkrai"],
  }),
  legendary({
    id: "deoxys-attack",
    name: "Attack Forme Deoxys",
    types: ["Psychic"],
    windows: [w("sun", 3, 6)],
    counters: ["Mega Gengar", "Shadow Tyranitar", "Darkrai"],
  }),
  legendary({
    id: "deoxys-defense",
    name: "Defense Forme Deoxys",
    types: ["Psychic"],
    windows: [w("sun", 3, 6)],
    counters: ["Mega Gengar", "Shadow Tyranitar", "Darkrai"],
  }),
  legendary({
    id: "deoxys-speed",
    name: "Speed Forme Deoxys",
    types: ["Psychic"],
    windows: [w("sun", 3, 6)],
    counters: ["Mega Gengar", "Shadow Tyranitar", "Darkrai"],
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

export const RAID_BOSSES: RaidBoss[] = ROSTER.map((b, i) => ({ ...b, sortPriority: i }));
