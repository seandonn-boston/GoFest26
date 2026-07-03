import { RAID_BOSSES } from "./bosses";

/**
 * The Road of Legends — the raid-heavy week leading into GO Fest 2026: Global
 * (Mon Jul 6 → Fri Jul 10, local time). Each day runs a two-hour Raid Hour from
 * 6–8 PM local. Only the day's featured Mega is limited to a single hour; the 5★
 * raids, the fusion/crowned energy raids, and Primal Groudon/Kyogre are all
 * raidable the whole 2 hours. These weekday raids let a player pre-farm the SAME
 * targets they plan to max over the weekend, so completing them here is a head
 * start that reduces what the weekend has to cover.
 *
 * Mega Mewtwo X/Y are NOT here — Super Mega Raids are a weekend-only debut.
 *
 * Source: pokemongo.com/news/road-of-legends-2026. Only bosses that exist in our
 * weekend roster (i.e. can be a user target) are listed; off-roster raids on
 * these days (White/Black Kyurem, Dawn/Dusk Mane Necrozma, the Primals) are
 * intentionally omitted since the planner can't target them.
 */
export interface RoadDay {
  /** Stable id (also the playDays key). */
  id: string;
  /** Weekday name. */
  label: string;
  /** Short calendar date, e.g. "Jul 6". */
  dateLabel: string;
  /** Length of that day's Raid Hour block in hours — every day is the full 6–8 PM
   *  window (2h). Only the featured Mega is limited to a single hour; 5★, fusion/
   *  crowned, and Primal (Groudon/Kyogre) targets are raidable the whole 2h. */
  raidHourHours: number;
  /** Hours the featured Mega is available (its cap). ONLY Mega raids are limited
   *  to this one hour; everything else — 5★, fusion/crowned, AND Primal — shares
   *  the full 2h block. 1 on the days with a featured Mega (Tue–Thu); 0 on Monday
   *  (its Mega Salamence shares the 5★ marathon) and Friday (no Mega — Primal
   *  Kyogre/Groudon headline, and Primals are two-hour like every non-Mega). */
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
    megaHours: 0,
    raidHourLabel: "6–8 PM",
    // The full 5★ roster, plus the day's only featured Mega (Salamence).
    bossIds: [...MONDAY_FIVE_STAR, "mega-salamence"],
  },
  {
    id: "tue",
    label: "Tuesday",
    dateLabel: "Jul 7",
    raidHourHours: 2,
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
    // No featured Mega on Friday — Primal Kyogre/Groudon headline, and Primals are
    // NOT Megas here: they're raidable the full 2h, so nothing is one-hour-limited.
    megaHours: 0,
    raidHourLabel: "6–8 PM",
    // 5★: Origin Forme Dialga, Origin Forme Palkia · Primal: Kyogre*, Groudon* (off-roster)
    bossIds: ["dialga-origin", "palkia-origin"],
  },
];

export const ROAD_DAY_IDS = ROAD_DAYS.map((d) => d.id);
