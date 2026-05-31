import type ExcelJS from "exceljs";
import { GAME_CONFIG } from "@/data/config";
import { getBoss } from "@/data";
import { formatRange } from "@/lib/format";
import { hourLabel } from "@/lib/format";
import type {
  BossInput,
  Currency,
  PassType,
  PlanSummary,
  RaidTier,
} from "@/domain/types";

const DAY_LABEL: Record<string, string> = {
  sat: "Sat (Jul 11)",
  sun: "Sun (Jul 12)",
};

const TIER_LABEL: Record<RaidTier, string> = {
  "super-mega": "Super Mega",
  mega: "Mega",
  "five-star": "5★",
  regional: "Regional",
};

const PASS_LABEL: Record<PassType, string> = {
  "free-daily": "Free (Gym disc)",
  premium: "Premium / Remote",
  remote: "Remote",
  "link-charge": "Link Charge",
};

const CURRENCY_LABEL: Record<Currency, string> = {
  candy: "Candy",
  xlCandy: "XL Candy",
  megaEnergy: "Mega Energy",
};

const HEADER_FILL = "FF1C2545";

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle" };
  });
}

/** Populates a workbook with the Schedule, Goals, and Capacity sheets. */
export function buildWorkbook(
  workbook: ExcelJS.Workbook,
  summary: PlanSummary,
  inputs: BossInput[],
): void {
  workbook.creator = "GO Fest 2026 Raid Planner";
  workbook.created = new Date();

  const startLocal = GAME_CONFIG.event.hourStartLocal;
  const inputById = new Map(inputs.map((i) => [i.bossId, i]));

  // ---------------- Sheet 1: Schedule ----------------
  const schedule = workbook.addWorksheet("Schedule");
  schedule.columns = [
    { header: "#", key: "n", width: 5 },
    { header: "Day", key: "day", width: 14 },
    { header: "Time", key: "time", width: 10 },
    { header: "Habitat", key: "habitat", width: 20 },
    { header: "Boss", key: "boss", width: 22 },
    { header: "Tier", key: "tier", width: 12 },
    { header: "Pass", key: "pass", width: 18 },
    { header: "Buddy Mega (evolve for boost)", key: "buddy", width: 28 },
    { header: "Top Counters", key: "counters", width: 48 },
    { header: "Region", key: "region", width: 24 },
  ];
  styleHeader(schedule.getRow(1));

  summary.schedule.raids.forEach((raid, idx) => {
    schedule.addRow({
      n: idx + 1,
      day: DAY_LABEL[raid.day] ?? raid.day,
      time: hourLabel(raid.hour, startLocal),
      habitat: raid.habitat ?? "—",
      boss: raid.bossName,
      tier: TIER_LABEL[raid.tier],
      pass: PASS_LABEL[raid.passType],
      buddy: raid.recommendedBuddyMegaName ?? "—",
      counters: raid.counters.join(", "),
      region: raid.remote ? `${raid.regionLabel ?? "Out of region"} (remote)` : "Local",
    });
  });
  schedule.views = [{ state: "frozen", ySplit: 1 }];
  schedule.autoFilter = "A1:J1";

  if (summary.schedule.raids.length === 0) {
    schedule.addRow({ n: "", day: "Select bosses and enter your currencies to generate a plan." });
  }

  // ---------------- Sheet 2: Goals Summary ----------------
  const goals = workbook.addWorksheet("Goals");
  goals.columns = [
    { header: "Boss", key: "boss", width: 22 },
    { header: "Goal", key: "goal", width: 26 },
    { header: "Need Candy", key: "candy", width: 12 },
    { header: "Need XL", key: "xl", width: 12 },
    { header: "Need Mega Energy", key: "energy", width: 16 },
    { header: "Raids (no boost)", key: "raids", width: 16 },
    { header: "Raids (buddy)", key: "raidsBoost", width: 16 },
    { header: "Limited by", key: "binding", width: 16 },
  ];
  styleHeader(goals.getRow(1));

  for (const result of summary.results) {
    const boss = getBoss(result.bossId);
    const input = inputById.get(result.bossId);
    if (!boss || !input) continue;

    const isMega = boss.tier === "mega" || boss.tier === "super-mega";
    const goalParts: string[] = [];
    if (boss.rewardsCurrencies.includes("xlCandy") && input.target.level > input.current.level) {
      goalParts.push(`Lvl ${input.current.level}→${input.target.level}`);
    }
    if (isMega && input.target.megaLevel > input.current.megaLevel) {
      goalParts.push(`Mega Lvl ${input.current.megaLevel}→${input.target.megaLevel}`);
    }

    goals.addRow({
      boss: boss.name,
      goal: goalParts.join(", ") || "—",
      candy: result.needs.candy?.needed ?? 0,
      xl: result.needs.xlCandy?.needed ?? 0,
      energy: result.needs.megaEnergy?.needed ?? 0,
      raids: formatRange(result.raidsNoBoost),
      raidsBoost: formatRange(result.raidsWithBoost),
      binding: result.bindingCurrency ? CURRENCY_LABEL[result.bindingCurrency] : "—",
    });
  }
  goals.views = [{ state: "frozen", ySplit: 1 }];

  // ---------------- Sheet 3: Capacity ----------------
  const cap = workbook.addWorksheet("Capacity");
  cap.columns = [
    { header: "Metric", key: "metric", width: 32 },
    { header: "Value", key: "value", width: 28 },
  ];
  styleHeader(cap.getRow(1));

  const c = summary.capacity;
  const rows: [string, string | number][] = [
    ["Event", `${GAME_CONFIG.event.name}`],
    ["Dates", GAME_CONFIG.event.dateLabel],
    ["Hours per day", c.hoursPerDay],
    ["Days", c.days],
    ["Seconds per raid (+ downtime)", `${c.raidDurationSec}s + ${c.downtimeSecRange.min}–${c.downtimeSecRange.max}s`],
    ["Raids per hour", formatRange(c.raidsPerHour)],
    ["Max weekend raids", formatRange(c.totalRaids)],
    ["Total raids needed (no boost)", formatRange(summary.totalRaidsNoBoost)],
    ["Total raids needed (with buddy)", formatRange(summary.totalRaidsWithBoost)],
    ["Capacity used (no boost)", `${Math.round(summary.utilizationNoBoost * 100)}%`],
    ["Plan fits the weekend?", summary.feasible ? "Yes" : "No — trim targets or use boosts"],
    ["Scheduled raids placed", summary.schedule.raids.length],
  ];
  for (const [metric, value] of rows) cap.addRow({ metric, value });

  if (summary.schedule.unmetGoals.length > 0) {
    cap.addRow({});
    const warnRow = cap.addRow({ metric: "Unplaceable (window-limited)", value: "Shortfall" });
    warnRow.font = { bold: true };
    for (const u of summary.schedule.unmetGoals) {
      cap.addRow({ metric: u.bossName, value: `${u.shortfall} raids couldn't fit in its windows` });
    }
  }
}
