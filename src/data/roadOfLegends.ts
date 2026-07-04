import { RAID_BOSSES } from "./bosses";

/**
 * The Road of Legends — the raid-heavy week leading into GO Fest 2026: Global
 * (Mon Jul 6 → Fri Jul 10, local time). Each day runs a two-hour Raid Hour from
 * 6–8 PM local, split into two separate raid hours:
 *   • the 5★ Raid Hour — 5★ raids (incl. the fusion/crowned raids), and
 *   • the Mega Raid Hour (7–8 PM) — Mega and Primal raids ONLY.
 * On Tue–Fri these are DISJOINT: 5★ run 6–7 PM only, Mega/Primal 7–8 PM only.
 * Monday is the exception — its 5★ Raid Hour is the full 6–8 PM (the whole roster),
 * while its Mega (Salamence) still runs only 7–8 PM, sharing that hour with the 5★.
 * These weekday raids let a player pre-farm the SAME targets they plan to max over
 * the weekend, so completing them here is a head start that reduces the weekend.
 *
 * Mega Mewtwo X/Y are NOT here — Super Mega Raids are a weekend-only debut.
 *
 * Source: pokemongo.com/news/road-of-legends-2026, per-hour split confirmed. The
 * four featured Megas (Salamence/Tyranitar/Gardevoir/Gengar) and the Primals are
 * the 7–8 PM Mega Raid Hour; 5★ (and the fusion/crowned raids) are the 5★ hour.
 * Only bosses that exist in our weekend roster (i.e. can be a user target) are
 * listed; off-roster raids (White/Black Kyurem, Dawn/Dusk Mane Necrozma, the
 * Primals) are omitted since the planner can't target them.
 */
export interface RoadDay {
  /** Stable id (also the playDays key). */
  id: string;
  /** Weekday name. */
  label: string;
  /** Short calendar date, e.g. "Jul 6". */
  dateLabel: string;
  /** Length of the whole Raid Hour block in hours — 2 (6–8 PM) every day. */
  raidHourHours: number;
  /** Hours the 5★ Raid Hour spans: 2 on Monday (its 5★ run the full 6–8 PM), 1 on
   *  Tue–Fri (5★ only 6–7 PM). The fusion/crowned raids ride this window. */
  fiveStarHours: number;
  /** Hours the Mega Raid Hour spans (always the 7–8 PM hour): 1 on every day —
   *  Mega AND Primal raids ONLY. On Tue–Fri this is disjoint from the 5★ hour; on
   *  Monday it overlaps the 5★ hour's second hour (the Mega shares 7–8 PM). */
  megaHours: number;
  /** Human Raid-Hour window, e.g. "6–8 PM". */
  raidHourLabel: string;
  /** Roster boss ids featured in raids that day (5★ + Mega, per the roster). */
  bossIds: string[];
}

/** Every five-star roster boss appears in Monday's marathon 5★ pool. */
const MONDAY_FIVE_STAR = RAID_BOSSES.filter((b) => b.tier === "five-star").map((b) => b.id);

export const ROAD_DAYS: RoadDay[] = [
  {
    id: "mon",
    label: "Monday",
    dateLabel: "Jul 6",
    raidHourHours: 2,
    fiveStarHours: 2, // the whole 5★ roster runs the full 6–8 PM
    megaHours: 1, // Mega Salamence still only 7–8 PM (shares that hour with the 5★)
    raidHourLabel: "6–8 PM",
    // The full 5★ roster (6–8 PM), plus the day's featured Mega Salamence (7–8 PM).
    bossIds: [...MONDAY_FIVE_STAR, "mega-salamence"],
  },
  {
    id: "tue",
    label: "Tuesday",
    dateLabel: "Jul 7",
    raidHourHours: 2,
    fiveStarHours: 1, // 5★ only 6–7 PM (disjoint from the 7–8 PM Mega/Primal hour)
    megaHours: 1,
    raidHourLabel: "6–8 PM",
    // 5★: White Kyurem*, Zekrom, Dawn Wings Necrozma* · Mega: Tyranitar
    bossIds: ["zekrom", "mega-tyranitar"],
  },
  {
    id: "wed",
    label: "Wednesday",
    dateLabel: "Jul 8",
    raidHourHours: 2,
    fiveStarHours: 1, // 5★ only 6–7 PM (disjoint from the 7–8 PM Mega/Primal hour)
    megaHours: 1,
    raidHourLabel: "6–8 PM",
    // 5★: Black Kyurem*, Reshiram, Dusk Mane Necrozma* · Mega: Gardevoir
    bossIds: ["reshiram", "mega-gardevoir"],
  },
  {
    id: "thu",
    label: "Thursday",
    dateLabel: "Jul 9",
    raidHourHours: 2,
    fiveStarHours: 1, // 5★ only 6–7 PM (disjoint from the 7–8 PM Mega/Primal hour)
    megaHours: 1,
    raidHourLabel: "6–8 PM",
    // 5★: Crowned Sword Zacian, Crowned Shield Zamazenta — the ONLY Zacian/Zamazenta
    // forme raiding today (the Crowned raid, which banks Hero-form Candy too). They
    // come in as fusion/primal energy targets (ENERGY_GOALS), not roster bosses, so
    // only the Mega is a plain roster pre-farm here. The Hero forme is a Sunday boss.
    // · Mega: Gengar
    bossIds: ["mega-gengar"],
  },
  {
    id: "fri",
    label: "Friday",
    dateLabel: "Jul 10",
    raidHourHours: 2,
    fiveStarHours: 1, // 5★ only 6–7 PM (disjoint from the 7–8 PM Mega/Primal hour)
    megaHours: 1,
    raidHourLabel: "6–8 PM",
    // 5★: Origin Forme Dialga, Origin Forme Palkia · Primal: Kyogre*, Groudon* (off-roster)
    bossIds: ["dialga-origin", "palkia-origin"],
  },
];

export const ROAD_DAY_IDS = ROAD_DAYS.map((d) => d.id);
