"use client";

import { useUiStore, type StepId } from "@/store/useUiStore";

interface GuideStep {
  id: StepId;
  title: string;
  body: React.ReactNode;
  optional?: boolean;
}

// Plain-English walkthrough of the whole flow, using Mega Mewtwo as the running
// example so a first-timer can follow one concrete target end to end.
const GUIDE: GuideStep[] = [
  {
    id: 1,
    title: "Pick your targets",
    body: (
      <>
        Tap the Pokémon you want to power up this weekend — that&apos;s all this step is.
        For our example, tap the <b>Mega Mewtwo X</b> (Saturday) and <b>Mega Mewtwo Y</b> (Sunday)
        headliner tiles. Everything else is optional, so don&apos;t feel like you have to touch it.
      </>
    ),
  },
  {
    id: 2,
    title: "Enter what you have",
    body: (
      <>
        Tell the app what you already hold and where you want to end up. Hate typing? Drop your
        Pokémon&apos;s stat-page <b>screenshots</b> at the top and it reads your <b>Candy</b>,
        <b> XL Candy</b> and <b>Mega Energy</b> for you. For Mewtwo, set your level, the <b>X &amp; Y
        Mega Levels</b>, and a goal (say, Mega Level 4 on both) — the one-tap <b>presets</b> help.
      </>
    ),
  },
  {
    id: 3,
    title: "Road of Legends",
    body: (
      <>
        Optional pre-event head start. The <b>Road of Legends</b> weekday raid hours (Mon Jul 6 – Fri
        Jul 10) run before GO Fest. Pick the evenings you&apos;ll raid and which targets to pre-farm
        each day — whatever you knock out here shrinks your weekend demand.
      </>
    ),
  },
  {
    id: 4,
    title: "GO Fest Prioritizer",
    body: (
      <>
        Your weekend payoff: how many raids each target needs, a block-by-block schedule, the top
        counters and the best <b>Mega to evolve</b> each hour, and a spreadsheet export. This is where
        you <b>set priority</b> — drag your targets to rank them inside each time block; if a block is
        over capacity, the ones at the bottom get cut first.
      </>
    ),
  },
  {
    id: 5,
    title: "Remote Prioritizer",
    body: (
      <>
        Optional. Opt into <b>remote raids</b> and assign how many of each species you&apos;ll do
        remotely — region-locked targets first, then your priority. Those raids drop out of the
        in-person time blocks.
      </>
    ),
  },
  {
    id: 6,
    title: "Check the cost",
    body: (
      <>
        Last, the money. Using the <b>passes you entered</b> in step 2, the app spends them on your top
        priorities first, then shows how many more you&apos;d buy and the <b>PokéCoin cost</b> to own
        them after your free daily passes.
      </>
    ),
  },
];

/**
 * A friendly, dismissible "How to use" guide pinned at the top of the app. It
 * explains, in plain English, what each step is for — using Mega Mewtwo as the
 * running example. Dismissing it is remembered per-device; a compact reopener
 * takes its place so it's one tap to bring back. Each step heading jumps there.
 */
export function HowToUse() {
  const dismissed = useUiStore((s) => s.howToDismissed);
  const dismiss = useUiStore((s) => s.dismissHowTo);
  const reopen = useUiStore((s) => s.reopenHowTo);
  const setStep = useUiStore((s) => s.setStep);

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={reopen}
        className="mb-6 inline-flex items-center gap-2 rounded-md border border-gofest-acid/40 bg-gofest-acid/[0.06] px-3 py-1.5 text-xs font-semibold text-gofest-acid transition hover:bg-gofest-acid/15"
      >
        <span aria-hidden>ⓘ</span> How to use this app
      </button>
    );
  }

  return (
    <section className="mb-6 rounded-xl border-2 border-gofest-acid/30 bg-gofest-acid/[0.05] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-sm font-extrabold uppercase tracking-widest text-gofest-acid">
            How to use this app
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            New here? The whole thing is just six steps. You only need to pick a target and enter your
            numbers — everything else is optional. Here&apos;s the flow, using Mega Mewtwo as the example.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss the how-to guide"
          className="shrink-0 rounded-sm border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-300 transition hover:text-white"
        >
          Got it ✕
        </button>
      </div>

      <ol className="mt-3 space-y-2.5">
        {GUIDE.map((s) => (
          <li key={s.id} className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(s.id)}
              aria-label={`Go to step ${s.id}: ${s.title}`}
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gofest-acid/50 bg-gofest-acid/15 text-[13px] font-bold text-gofest-acid transition hover:bg-gofest-acid hover:text-black"
            >
              {s.id}
            </button>
            <p className="text-xs leading-relaxed text-slate-300">
              <button
                type="button"
                onClick={() => setStep(s.id)}
                className="mr-1 font-semibold text-slate-100 underline-offset-2 hover:underline"
              >
                {s.title}
                {s.optional ? <span className="ml-1 text-[12px] font-normal text-slate-500">(optional)</span> : null}
                .
              </button>
              {s.body}
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-[13px] text-slate-400">
        Your plan saves on your device automatically — close the app and come back whenever; it&apos;ll
        still be here.
      </p>
    </section>
  );
}
