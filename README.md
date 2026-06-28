# GO Fest 2026 Raid Planner

> Plan your **Pokémon GO Fest 2026: Global** weekend (July 11–12, 2026) — pick the
> raid bosses you care about, enter what you already hold, and find out exactly how
> many raids it takes to max them. Headlined by the debut of **Mega Mewtwo X & Y**
> in Super Mega Raids.

GO Fest weekend is a race against the clock: six rotating three‑hour habitats across
two days, day‑locked legendaries, region‑exclusive bosses, and the shared Mewtwo XL
grind. This planner turns your goals into a concrete raid count, maps them onto every
time block so you know what to hit and when, gives you a weekday **Road of Legends**
head start, and tells you what the passes will cost in PokéCoins. Snap a screenshot
to auto‑fill your Candy and Energy, rank your priorities, share the plan with a link,
and walk in with a plan instead of guesswork.

Everything runs **client‑side in the browser** — no account, no backend, nothing
leaves your device. It installs as a PWA and works offline on event day.

---

## What it does

The app is a five‑step flow. Each step is optional to revisit, and your progress is
saved as you go.

### 1 · Pick targets

Browse the GO Fest roster grouped by its habitat block, with **Mega Mewtwo X**
(Saturday) and **Mega Mewtwo Y** (Sunday) as headliner tiles. Bosses outside your
region are flagged **remote‑only**, and multi‑form shared‑Candy species
(Giratina, Dialga, Palkia, the Forces‑of‑Nature genies, and the Cosmog line —
**Solgaleo + Lunala**) collapse into a single combined target so their pool is never
double‑counted.

### 2 · Enter what you have

Per boss, enter your current **Candy, XL Candy, and Mega Energy**, your Pokémon's
**level** and **Mega Level**, and the **variant** — standard / shadow / purified,
which changes the XL‑to‑level‑50 cost (296 / 360 / 272). One‑tap **presets** and a
**quantity** stepper cover the common goals.

- **Max several distinct individuals** — instead of N identical copies, list specific
  Pokémon in **priority order**, each with its own level / Mega Level / variant. Your
  on‑hand Candy/XL/Energy pool **cascades down the list**: the top‑priority individual
  absorbs what you hold first, the next takes what's left.
- **Mega Mewtwo X & Y** share one combined card — enter your shared Candy/XL/level
  once; each form keeps its own (day‑locked) Mega Energy and Mega Level, and the 40→50
  leveling is balanced across both forms so neither is double‑counted. Each individual
  Mewtwo tracks independent X and Y branches.
- **Screenshot import (OCR)** — drop in your in‑game stat screenshots and Tesseract
  (loaded at runtime, in your browser) reads the Candy / XL / Mega Energy and the
  species; you confirm which Pokémon each belongs to. Import one card at a time or a
  whole roster at once; scans are kept in IndexedDB so they survive a refresh.

### 3 · Add‑ons

Optional ways to refine the plan:

- **Road of Legends head start** — the weekday Raid Hours (Mon Jul 6 – Fri Jul 10)
  let you pre‑farm selected targets. Pick which evenings you'll play; whatever fits is
  netted out of your weekend demand.
- **Fusion / Crowned / Primal energy goals** — Road of Legends week also runs the
  special raids that drop the "build a new forme" energies. Opt in per energy on
  Kyurem (Blaze / Volt), Necrozma (Solar / Lunar), Zacian, Zamazenta, Groudon, and
  Kyogre; enter what you hold (auto‑fillable from a screenshot scan) and get the raids
  needed to reach **1,000** (fuse / crown) or **400** (first Primal revert). These are
  standalone from the weekend maxing plan, and because energy per raid scales with
  speed/damage it's shown as a range.
- **Remote raids** — an opt‑in pool sized by **how many Remote Raid Passes you plan to
  use** (GO Fest 2026 lifts the daily limit, so it's a pass count, not a time cap).
  Allocate per species by hand or one‑tap **auto‑balance** by priority; single‑day and
  region‑locked bosses are capped to their reachable window.
- **Passes & Rare Candy on hand** — tell the planner the Raid Passes, Remote Passes,
  Link Charges, and Rare Candy you already hold so they're spent against your plan.

### 4 · Results

- **Raids needed** — per boss and in total, as a range (rewards roll), showing which
  currency is the **binding constraint** and the effect of a same‑type **Mega buddy**
  Candy/XL boost (scaling to **+30%** at Mega Level 4).
- **Reward case** — plan around best‑case, expected, or worst‑case drops; the toggle
  re‑sizes every number live.
- **Per‑block weekend plan** — fixed‑window bosses pin to their habitat block(s),
  Mewtwo backfills the rest; each block is risk‑banded by capacity and ordered by a
  **drag‑to‑prioritize** list (lowest priority is cut first when a block is over
  capacity). Toggle **quick‑catch** per block to trade catch Candy/XL for speed.
- **Goal progress & capacity** — what fraction of each goal actually fits in the time
  you have, with GO Fest research credits folded into your on‑hand totals.
- **Mega‑evolve suggestions** — for each boss and block, which Mega to evolve for the
  biggest same‑type Candy XL boost, ranked by whether it also fights well or matches
  the featured wild spawns.
- **Best counters** — top attackers per boss across buckets (shadow, shadow legendary,
  mega/primal, legendary, budget), copyable as a Pokémon GO search string — with a
  matching string for the Megas to evolve.
- **Show the math** — every headline number opens an **editable equation tooltip**:
  see exactly how a raid count was derived and tweak an input right inside the tooltip
  to recompute the whole plan.
- **Calibrate to your luck** — log the per‑raid drop rates you actually see (Mega
  Energy, catch XL); a logged value overrides the assumed range for the rest of the
  plan.
- **Estimate confidence** — a transparency panel lists every load‑bearing number with
  its tier (verified / community / estimated) and source.
- **Export** — download the full chronological schedule — every raid with its pass
  type, the Mega buddy to evolve, and top counters — as an `.xlsx` workbook.

### 5 · Cost

- **Passes you already have** are spent on your **highest priorities first**, then
  shown as a have / need / buy split: a coverage bar (covered vs. still to buy) and a
  per‑target, priority‑ordered breakdown, so a lower‑priority goal never jumps ahead.
- **Pass economy (PokéCoin cost)** — what it would cost to own every pass the plan
  needs, as a lowest–highest range: free daily passes are applied first, then paid
  Premium (in‑person) and Remote passes, plus the **200 Link Charges** a remote Super
  Mega (Mewtwo) raid requires on top of a Remote Pass.

### Throughout

- **Adjustable assumptions** — lobby size, lobby wait, between‑raid downtime, free
  daily passes, Party Play, and the assumed same‑type Mega‑buddy level all feed the
  capacity model and update the plan live.
- **Share, export & back up** — share a plan as a link (the whole plan is encoded in
  the URL, never on a server), export the schedule as a spreadsheet, or back up /
  restore via JSON or the exported `.xlsx` to move between devices.
- **Persistence & offline** — selections, inputs, settings, and imports are saved
  per‑device (localStorage for the plan, IndexedDB for screenshots), so a plan
  survives closing the app. A service worker caches the shell and sprites for offline
  use in a crowded park.

> **What the Candy‑XL numbers count:** in‑person 5★/Legendary and Mega‑tier catches,
> the same‑type Mega‑buddy boost, and GO Fest research when enabled. They deliberately
> don't count XL from transferring/trading, egg hatches, or buddy walking — and
> running from an encounter yields Mega Energy only, no catch XL.

## How the math works

The calculation lives in `src/domain/` as a **pure engine** (no React, no DOM),
unit‑tested with Vitest. `computePlanSummary()` is the entry point; the pipeline:

1. **Collapse forms** (`forms.ts`) — multi‑form species fold into one shared‑resource
   target so their Candy/XL pool isn't counted twice.
2. **Requirements** (`requirements.ts`) — gross then net currency needs from your
   level/Mega‑Level goals and what you hold (XL to level 50, Candy below 40, Mega
   Energy per Mega Level), summed across copies, with the on‑hand pool cascaded by
   priority.
3. **Raids needed** (`raidsNeeded.ts`) — net needs ÷ per‑raid reward → a min/max raid
   range per currency; the currency needing the most raids is the binding constraint.
   Models catch rewards, the same‑type Mega‑buddy XL boost, and your calibration
   overrides.
4. **Mewtwo** (`mewtwo.ts`) — X and Y are separate raids on separate days with
   independent Mega Energy but one shared Mewtwo; leveling is split across the two
   forms so neither is double‑counted.
5. **Capacity** (`capacity.ts`) — realistic raids/hour for a power user from battle
   time (by tier and lobby size), the lobby wait, fixed UI transitions, catch time,
   downtime, and Party Play — plus a quick‑catch speed factor and the remote‑pass
   budget.
6. **Block plan** (`blockPlan.ts`) — lays demand across the six habitat blocks,
   risk‑bands each block, applies per‑block priority cuts, and builds goal progress and
   the remote pool.
7. **Road of Legends** (`roadOfLegends.ts`) — fits selected targets into the weekday
   raid hours and returns a head start that reduces weekend demand.
8. **Schedule** (`scheduler.ts`) — a greedy, scarcity‑first per‑raid timetable
   (limited‑window bosses placed first, Mewtwo backfilling) used by the export.
9. **Pass economy** (`passEconomy.ts`) + **coverage** (`passCoverage.ts`) — turns the
   in‑person / remote / Super‑Mega raid counts into a PokéCoin cost range after free
   passes, and splits owned passes into have / need / buy by priority.

Supporting modules: `counters.ts` (type effectiveness + best attackers), `megaBoosts.ts`
+ `buddyBoost.ts` (same‑type Candy‑boost Mega engine), `region.ts` (hemisphere/continent
availability → local vs. remote), `research.ts` (GO Fest research credits), `explain.ts`
(editable math‑tooltip equations), and `settings.ts` / `defaults.ts` (planning knobs and
starting inputs).

## Tech

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS 3**
- **Zustand 5** (`persist`, quota‑tolerant localStorage + IndexedDB for blobs)
- **Tesseract.js** (loaded from a CDN at runtime, in‑browser) for screenshot OCR
- **ExcelJS** (dynamically imported) for the workbook export
- **three.js** for the loader visuals; icons & social card generated with `next/og`
- **Vitest** + Testing Library / jsdom for the engine and component tests

The app is fully static — no server, API routes, or runtime secrets — so every
computation runs in the browser, and it ships as an installable, offline‑capable PWA.

## Project structure

```
src/
  app/            App Router shell (layout, page, globals, manifest, OG image, icons, error boundary)
  data/           Editable game data (see below)
  domain/         Pure, unit-tested calculation engine
  store/          Zustand store (inputs, settings, research, imports, priorities) + backup + sanitizer
  hooks/          usePlannerResults (summary + block plan + remote balancing), hydration, swipe nav, …
  components/
    BossList/       Target picker + Mewtwo headliner tiles
    BossInputCard/  Per-boss inputs, multi-copy editors, screenshot scan, counters, mega search
    Dashboard/      Summary, add-ons setup, per-block accordion, capacity, goal progress, cost
    Settings/       Screenshot importer, assumptions, location, calibration, backup, feedback
    Stepper/        Step navigation, footer, how-to, empty-state nudges
    loader/         Substitute-voxel loading screen
    pwa/            Service-worker registration
    ui/             Shared presentational components (badges, tooltips, sprites, install banner, …)
  export/         ExcelJS workbook builder, browser download, JSON/XLSX backup-restore
  lib/            OCR (ocrEngine, screenshotScan), Pokémon search, share-plan URLs, IndexedDB,
                  image/thumbnail helpers, geolocation, formatting, math
public/
  sw.js           Offline service worker
  help/           In-app help imagery
```

## Game data

All tunable numbers and the roster live in `src/data/` so they're easy to correct as
Niantic confirms details. Every value carries a confidence/source note.

- `config.ts` — `GAME_CONFIG`, the single source of truth: event details, Mega Energy /
  catch rewards, XL‑to‑50 (296 / 360 / 272) and Candy‑to‑40 costs, Stardust reference
  totals, the raid timing & lobby model, free‑pass / remote economy, and the PokéCoin
  pass + Link Charge pricing.
- `bosses.ts` — the raid roster (tiers, availability windows, reward ranges, counters,
  types, region locks). Each Mega's energy curve is derived from its real
  first‑evolution cost: 200 typical, **300** for the pseudo‑legendaries
  (Tyranitar / Salamence / Metagross / Garchomp), 100 for Pidgeot / Beedrill; Mewtwo
  carries its own per‑Mega‑Level totals (7,500 first evolution → 18,580 to Level 4).
- `habitats.ts` — the six three‑hour habitat windows and their featured wild types.
- `formGroups.ts` — the shared‑Candy multi‑form species (Giratina, Dialga, Palkia, the
  four genies, and the Cosmog line).
- `energyGoals.ts` — the Fusion / Crowned / Primal energy goals and their costs.
- `roadOfLegends.ts` — the weekday Raid‑Hour schedule (Mon–Fri) and featured bosses.
- `megas.ts` / `attackers.ts` — every released Mega/Primal (typing + sprite) and the
  attacker pool (eDPS) behind counters and Candy‑boost suggestions.
- `research.ts`, `presets.ts`, `locations.ts`, `estimateConfidence.ts`, `typeVisuals.ts`,
  `pokemonSprites.ts` — research rewards, goal presets, region presets, the
  confidence/source ledger, theming, and sprite resolution.

> Several values (Super Mega Raid energy, the Global research rewards, parts of the boss
> list) are best‑effort from public GO Fest 2026 info and may change. The
> estimate‑confidence panel flags which is which.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # run the unit + component tests (Vitest)
npm run build    # production build
npm run lint     # ESLint
```

Local dev serves from the root. The app is served from a subpath in production, applied
via `BASE_PATH` (default `/go-fest-raid-planner`); set `BASE_PATH=""` to force root.

## Deploy

The app is a static client‑side site and ships two ways:

- **Vercel** — import the repo; it auto‑detects Next.js and serves under the
  `/go-fest-raid-planner` base path. No environment variables or backend required.
- **GitHub Pages** — `.github/workflows/deploy-pages.yml` typechecks, tests, then builds
  a fully static export (`output: "export"`) on push to `main`, using the repo subpath as
  `basePath`. The deploy is gated on green types + tests, so a broken plan never ships.

Any static or Node host works as well:

```bash
npm run build
npm run start    # serves the production build on port 3000
```

---

This is a fan‑made planning tool and is **not affiliated with Niantic, Nintendo, or The
Pokémon Company**. Pokémon names and sprites are the property of their respective owners.
