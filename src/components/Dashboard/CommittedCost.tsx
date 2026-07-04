"use client";

import { useMemo } from "react";
import { GAME_CONFIG } from "@/data/config";
import { computePassCost, commitmentByBoss } from "@/domain";
import type { PlanSummary } from "@/domain/types";
import type { RoadPlan, WeekendBlockPlan } from "@/domain";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Disclosure } from "@/components/ui/Disclosure";
import { Confetti } from "@/components/ui/Confetti";
import { PixelIcon } from "@/components/ui/PixelIcon";

const coins = (n: number) => Math.round(n).toLocaleString();
const range = (lo: number, hi: number) => (lo === hi ? coins(lo) : `${coins(lo)}–${coins(hi)}`);

function Row({ label, detail, value }: { label: string; detail?: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5 text-xs">
      <span className="min-w-0 text-slate-300">
        {label}
        {detail ? <span className="ml-1 text-slate-500">{detail}</span> : null}
      </span>
      <span className="shrink-0 font-mono text-slate-200">{value}</span>
    </div>
  );
}

/**
 * The committed-plan pass bill. Prices only the raids that fit their windows
 * (via `commitmentByBoss`), spends owned + free daily passes on the in-person
 * ones first, and always buys remote passes. When nothing in-person is left to
 * buy, the "0" glimmers gold and confetti falls. A collapsed section prices the
 * leftover raids needed for a full 100% run, including the days of free dailies
 * it'd take to grind them.
 */
export function CommittedCost({
  summary,
  blockPlan,
  roadPlan,
}: {
  summary: PlanSummary;
  blockPlan: WeekendBlockPlan;
  roadPlan: RoadPlan;
}) {
  const inputs = usePlannerStore((s) => s.inputs);
  const settings = usePlannerStore((s) => s.settings);
  const remoteAllocations = usePlannerStore((s) => s.remoteAllocations);
  const playDays = usePlannerStore((s) => s.playDays);

  const committed = useMemo(() => commitmentByBoss(blockPlan, roadPlan), [blockPlan, roadPlan]);
  const cost = useMemo(
    () => computePassCost(Object.values(inputs), summary.results, settings, remoteAllocations, playDays, committed),
    [inputs, summary.results, settings, remoteAllocations, playDays, committed],
  );
  // The full 100%-of-goals bill, for the collapsed "chase 100%" section.
  const cost100 = useMemo(
    () => computePassCost(Object.values(inputs), summary.results, settings, remoteAllocations, playDays),
    [inputs, summary.results, settings, remoteAllocations, playDays],
  );

  if (summary.totalRaids.max <= 0) return null;

  // "Passes still to buy" for the committed IN-PERSON plan (after owned + free +
  // any Link-Charge substitution). Zero → the plan is covered → golden + confetti.
  const greenToBuy = cost.paidInPerson;
  const committedInPerson = cost.inPersonRaids;
  const covered = greenToBuy <= 0 && committedInPerson > 0;
  const remoteToBuy = cost.totalRemote;

  // Extra to reach a full 100% run (goals that never fit their windows).
  const extraInPerson = Math.max(0, cost100.paidInPerson - cost.paidInPerson);
  const extraRemote = Math.max(0, cost100.totalRemote - cost.totalRemote);
  const extraPasses = extraInPerson + extraRemote;
  const extraLow = Math.max(0, cost100.low.total - cost.low.total);
  const extraHigh = Math.max(0, cost100.high.total - cost.high.total);
  const perDay = GAME_CONFIG.passEconomy.freeOrangePassesPerDay;
  const daysTo100 = extraInPerson > 0 ? Math.ceil(extraInPerson / perDay) : 0;

  return (
    <div className="space-y-3">
      <Confetti fire={covered} replayKey={covered ? 1 : 0} />

      {/* Headline: passes still to buy for the committed plan. */}
      <div className="rounded-lg border border-amber-300/25 bg-amber-300/[0.04] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-200/80">
              In-person passes still to buy
            </div>
            <div className="mt-0.5 text-[12px] text-slate-500">for your committed RoL + GO Fest raids</div>
          </div>
          {covered ? (
            <span className="golden-zero font-mono text-5xl font-extrabold leading-none">0</span>
          ) : (
            <span className="font-mono text-5xl font-extrabold leading-none text-amber-200">{greenToBuy}</span>
          )}
        </div>

        {covered ? (
          <p className="mt-2 text-[13px] text-emerald-300">
            <PixelIcon name="confetti" size={13} /> You already hold everything you need for every committed in-person raid —
            owned and free daily passes cover them all.
          </p>
        ) : (
          <p className="mt-2 text-[13px] text-slate-300">
            After your <b>{cost.ownedPassesUsed}</b> owned and <b>{cost.freePassesUsed}</b> free daily passes, you&apos;d buy{" "}
            <b className="text-amber-200">{greenToBuy}</b> more Premium (green) pass{greenToBuy === 1 ? "" : "es"}.
          </p>
        )}

        {remoteToBuy > 0 ? (
          <p className="mt-1 text-[13px] text-sky-300">
            + <b>{remoteToBuy}</b> remote pass{remoteToBuy === 1 ? "" : "es"} — always bought (you hold at most 3).
          </p>
        ) : null}

        {/* PokéCoin bill for the committed plan. */}
        {cost.hasCost ? (
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-extrabold text-amber-200">
                {range(cost.low.total, cost.high.total)}
              </span>
              <span className="text-[13px] text-slate-400">coins for the committed plan</span>
            </div>
            <div className="mt-2 divide-y divide-white/[0.04] rounded-md border border-white/10 bg-gofest-bg/30 px-2.5 py-1.5">
              <Row
                label="Free daily passes used"
                detail={`of ${cost.freePasses} (9/day + ${cost.weekdaysPlayed} weekday${cost.weekdaysPlayed === 1 ? "" : "s"})`}
                value={`${cost.freePassesUsed}`}
              />
              {cost.ownedInPersonPasses > 0 ? (
                <Row
                  label="Owned passes used"
                  detail={`of ${cost.ownedInPersonPasses} you hold`}
                  value={`${cost.ownedPassesUsed}`}
                />
              ) : null}
              {greenToBuy > 0 ? (
                <Row
                  label="Premium (green) passes to buy"
                  detail={`${greenToBuy} pass${greenToBuy === 1 ? "" : "es"}`}
                  value={range(cost.low.greenCoins, cost.high.greenCoins)}
                />
              ) : null}
              {remoteToBuy > 0 ? (
                <Row
                  label="Remote passes to buy"
                  detail={`${remoteToBuy} pass${remoteToBuy === 1 ? "" : "es"} (3-packs + singles)`}
                  value={coins(cost.high.remoteCoins)}
                />
              ) : null}
              {cost.linkChargesNeeded > 0 ? (
                <Row
                  label="Link Charges to buy"
                  detail={`${cost.linkChargesNeeded.toLocaleString()} LC · ${cost.remoteSuperMegaRaids} remote Super Mega`}
                  value={coins(cost.high.linkChargeCoins)}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-emerald-300">
            ✓ No coins needed for the committed plan{remoteToBuy > 0 ? " beyond the remote passes above" : ""}.
          </p>
        )}

        <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
          Remotes are always bought as you go (hold-limit 3): as many 3-packs as fit, then singles. Owned Link Charges can
          stand in for Mega / Super-Mega passes when you opt in. Box prices vary — the low end assumes a best-case bulk box.
        </p>
      </div>

      {/* Collapsed extra cost to chase a full 100% run — only when goals were cut. */}
      {extraPasses > 0 ? (
        <Disclosure
          title={<span className="font-semibold text-slate-200">Cost to reach 100% of your goals</span>}
          hint={<span className="text-[12px] text-slate-500">+{extraPasses} passes</span>}
        >
          <div className="space-y-2 py-1">
            <p className="text-[13px] text-slate-300">
              Some goals don&apos;t fit their time windows this week. To finish every raid you&apos;d need{" "}
              <b className="text-amber-200">{extraPasses}</b> more pass{extraPasses === 1 ? "" : "es"} beyond the committed
              plan
              {extraLow + extraHigh > 0 ? (
                <>
                  {" "}
                  (<b>{range(extraLow, extraHigh)}</b> more coins)
                </>
              ) : null}
              .
            </p>
            {extraInPerson > 0 ? (
              <p className="text-[13px] text-slate-300">
                Grinding the <b>{extraInPerson}</b> extra in-person raid{extraInPerson === 1 ? "" : "s"} on free daily passes
                alone (≈{perDay}/day, assuming the bosses stayed available) would take about{" "}
                <b className="text-gofest-accent2">{daysTo100}</b> day{daysTo100 === 1 ? "" : "s"}.
              </p>
            ) : null}
            {extraRemote > 0 ? (
              <p className="text-[12px] text-slate-500">
                {extraRemote} of those are remote raids — those always need a bought remote pass (no free daily covers them).
              </p>
            ) : null}
            <p className="text-[12px] text-slate-500">
              Free-pass rate is an editable estimate: 1 daily + averaged event / community-day / research bonuses.
            </p>
          </div>
        </Disclosure>
      ) : null}
    </div>
  );
}
