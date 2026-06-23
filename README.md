# GO Fest 2026 Raid Planner

> Plan your **Pokémon GO Fest 2026: Global** weekend (July 11–12, 2026): pick the
> raid bosses you care about, enter what you already have, and find out exactly
> how many raids it takes to max them — headlined by the debut of **Mega Mewtwo X
> & Y** in Super Mega Raids.

GO Fest weekend is a race against the clock: six rotating three‑hour habitats
across two days, day‑locked legendaries, region‑exclusive bosses, and the shared
Mewtwo XL grind. This planner turns your goals into a concrete raid count, maps
them onto every time block so you know what to hit and when, folds in the
weekday **Road of Legends** raid hours, remote raids, and timezone tricks, and
even estimates the **PokéCoin** bill for the passes you'll need. Snap a
screenshot to auto‑fill your candy and energy, rank your priorities, tap any
number to see the math behind it, and walk in with a plan instead of guesswork.

Everything runs **client‑side in the browser** — no account, no backend, no data
leaves your device. It installs to your home screen and works **offline** on
event day.

---

## What it does

- **Pick targets** — browse the GO Fest roster grouped by habitat block, with
  Mega Mewtwo X (Saturday) and Y (Sunday) as headliner tiles. Region‑locked
  bosses are flagged as remote‑only.
- **Enter what you have** — per boss: current Candy, XL Candy, Mega Energy, your
  Pokémon's level and Mega Level, and variant (standard / shadow / purified,
  which changes the XL‑to‑level‑50 cost: 296 / 360 / 272). One‑tap **presets**
  ("Level 40 → 50", "Reach Mega Level 4") and a **quantity** stepper.
- **Max several distinct individuals** — list more than one Pokémon of a species,
  each with its own level / Mega Level / variant, in priority order. Your on‑hand
  Candy / XL / Energy cascades down the list (the top copy is fed first), so you
  see exactly which copy still needs what.
- **Screenshot import (OCR)** — drop in your in‑game Pokémon stat screenshots and
  Tesseract reads the Candy / XL / Mega Energy and the species, then you tap which
  Pokémon each belongs to. Bulk‑import a whole roster at once.
- **Raids needed** — per boss and in total, as a range (rewards roll), showing
  which currency is the binding constraint and the effect of a same‑type **Mega
  buddy** Candy/XL boost.
- **Tap any number for the math** — every value derived from your inputs (raids
  needed, currency needs, capacity %, goal progress, pass cost, Rare Candy, the
  Road‑of‑Legends head start, per‑block and per‑species counts) opens a
  "show‑your‑work" popover. On the per‑boss card the equation's inputs are
  **editable inline**, recalculating the whole plan.
- **Shared‑resource species** — Giratina, Dialga, Palkia, the genie quartet, and
  the Cosmog line (**Solgaleo + Lunala**) draw from one Candy/XL pool, so they
  collapse into a single combined target (with per‑forme counters and typing)
  instead of being double‑counted.
- **Mega Mewtwo X & Y** — one combined card: enter your shared Candy/XL/level once,
  each form keeps its own Mega Energy and Mega Level, and the 40→50 leveling is
  smart‑balanced across both forms (you farm Mewtwo XL from either day's raids).
  Several Mewtwo can be maxed as independent copies with their own X/Y branches.
- **Per‑block weekend plan** — fixed‑window bosses pin to their habitat block(s),
  Mewtwo backfills the rest; each block is risk‑banded by capacity and ordered by
  a **drag‑to‑prioritize** list (lowest priority is cut first when a block is over
  capacity). Toggle **quick‑catch** per block to trade catch Candy/XL for speed,
  and track raids **done** as the weekend unfolds.
- **Road of Legends** — the weekday Raid Hours (Mon Jul 6 → Fri Jul 10) that lead
  into the event. Tick the days you'll raid and your targets are poured into each
  day's time budget; whatever fits becomes a **head start** that shrinks the
  weekend plan.
- **Remote raids** — an opt‑in pool. GO Fest 2026 lifts the daily remote cap, so
  it's modeled as **time‑bound, not pass‑capped**: you set your sleep hours and
  the planner sizes how many remote raids fit your waking hours outside the event.
  Allocate per species by hand or one‑tap auto‑balance by priority (region‑locked
  first).
- **Pass cost (PokéCoins)** — the lowest–highest coin range to *own* the passes
  your plan needs: free daily passes applied first (playing more Road‑of‑Legends
  days lowers the bill), then Premium passes for in‑person, Remote passes, and 800
  Link Charges per *remote* Super Mega (Mewtwo) raid.
- **Mega‑evolve suggestions** — for each boss and each habitat block, which mega
  to evolve for the biggest same‑type Candy XL boost, ranked by whether it also
  fights well or matches the featured wild spawns.
- **Best counters** — top attackers per boss, copyable as a Pokémon GO search
  string.
- **Goal progress & capacity** — what fraction of each goal actually fits in the
  time you have, plus the Rare Candy / Rare Candy XL the plan hands out and GO Fest
  research credits folded into your on‑hand totals.
- **Calibrate to your luck** — log the per‑raid drops you actually see (Mega Energy
  per raid, Candy XL per legendary/mega catch); a logged value overrides the
  assumed range and tightens the plan.
- **Estimate confidence** — a panel listing every load‑bearing number with its
  confidence tier (verified / community / estimated) and source, so you know what
  to trust and what may still change.
- **Share, export & back up** — share a whole plan as a URL (encoded in the link,
  never uploaded), export the full schedule to an `.xlsx` workbook, or back up /
  restore via JSON or the exported spreadsheet to move a plan between devices.
- **Install & offline** — add to your home screen for a full‑screen app; a service
  worker caches the shell and sprites so it keeps working when the park signal
  drops.
- **Persistence** — selections, inputs, settings, and imported screenshots are
  saved per‑device (heavy image blobs in IndexedDB, the small plan in local
  storage), so a plan survives closing the tab or app and persists across days.

## How it works

The calculation lives in `src/domain/` as a **pure engine** (no React, no DOM),
unit‑tested with Vitest. The pipeline:

1. **Requirements** (`requirements.ts`) — gross then net currency needs from your
   level/Mega‑Level goals and what you hold (XL to level 50, Candy below 40, Mega
   Energy per Mega Level), per individual copy, with the shared on‑hand pool
   cascaded by priority.
2. **Raids needed** (`raidsNeeded.ts`) — net needs ÷ per‑raid reward (with the
   same‑type mega‑buddy boost and any logged calibration) → a min/max raid range
   per currency; the currency needing the most raids is the binding constraint.
3. **Plan summary** (`index.ts`) — collapses shared‑resource form groups, runs
   each selected boss, splits the shared Mewtwo leveling across X/Y, and sizes the
   aggregate capacity / feasibility view.
4. **Capacity** (`capacity.ts`) — models the realistic raids/hour for a power user
   (lobby size, Party Play, battle + catch + downtime), plus a quick‑catch speed
   factor and the time‑bound remote‑raid capacity.
5. **Block plan** (`blockPlan.ts`) — lays the demand across the six habitat blocks,
   risk‑bands each block, applies per‑block priority cuts, and builds the remote
   pool, goal progress, and Rare Candy forecast.
6. **Road of Legends** (`roadOfLegends.ts`) — fills each opted‑in weekday Raid
   Hour with your targets and returns the head start that reduces weekend demand.
7. **Pass economy** (`passEconomy.ts`) — turns the in‑person / remote / Super‑Mega
   raid mix into a lowest–highest PokéCoin cost, free passes first.

Two "show‑your‑work" layers feed the tooltips: `explain.ts` rebuilds a single
boss's currency steps as **editable** equation tokens, and `explainPlan.ts` does
the same (read‑only) for the aggregate dashboard numbers — both engine‑true and
asserted against the engine in tests.

Supporting modules: `forms.ts` (multi‑form species, remote day‑side caps,
combined‑card naming), `mewtwo.ts` (independent X/Y multi‑copy engine),
`megaBoosts.ts` (candy‑boost mega engine), `counters.ts` (type effectiveness +
best attackers), `buddyBoost.ts`, `research.ts` (GO Fest research credits),
`region.ts` (hemisphere/continent availability), and `scheduler.ts` (the
chronological per‑raid schedule used by the Excel export).

## Tech

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS 3**
- **Zustand** (`persist`, quota‑tolerant local storage; IndexedDB for image blobs)
- **Tesseract.js** (loaded from CDN at runtime) for screenshot OCR
- **ExcelJS** for the workbook export
- **three.js** for the loader visuals; **next/og** (Satori) for icons + social card
- **Vitest** + Testing Library / jsdom for engine and component tests

The app is fully static (no server, API routes, or runtime secrets) — every
computation runs in the browser. A service worker provides offline support and a
web manifest makes it installable.

## Project structure

```
src/
  app/            Next.js App Router (layout, page, manifest, og/icon routes, error boundary)
  data/           Editable game data (see below)
  domain/         Pure, unit-tested calculation engine + "explain" layers
  store/          Zustand stores (plan state, backup, tilt, app-ready)
  hooks/          usePlannerResults (summary + block plan + remote balancing), dialog, etc.
  components/
    BossList/       Target picker + Mewtwo headliner tiles
    BossInputCard/  Per-boss inputs, multi-copy editors, screenshot scan, counters, megas
    Dashboard/      Summary, capacity, per-block accordion, goal progress, remote,
                    Road of Legends, pass economy
    Settings/       Screenshot importer, assumptions, calibration, location, backup, feedback
    loader/         Animated loading screen (warms caches + OCR)
    pwa/            Service-worker registration
    ui/             Shared presentational components (incl. MathTooltip / ExplainValue)
  export/         ExcelJS workbook builder, backup/restore, browser download
  lib/            OCR (screenshotScan, ocrEngine), search, share-URL, IndexedDB,
                  image/thumbnail helpers, formatting, math
public/
  sw.js           Offline service worker
```

## Game data

All tunable numbers and the roster live in `src/data/` so they're easy to correct
as Niantic confirms details:

- `config.ts` — event details, Mega Energy / catch rewards, XL‑to‑50 and Candy /
  Stardust level‑up costs, raid timing & lobby model, free‑pass / remote / pass‑shop
  economy.
- `bosses.ts` — the raid roster (tiers, availability windows, reward ranges,
  counters, region locks, Mewtwo per‑Mega‑Level energy totals).
- `habitats.ts` — the six three‑hour habitat windows and their featured wild types.
- `formGroups.ts` — shared‑Candy multi‑form species (Giratina, Dialga, Palkia, the
  genies, and the Cosmog line).
- `megas.ts` / `attackers.ts` — every released mega (typing + sprite) and the
  attacker pool (eDPS) behind counters and candy‑boost suggestions.
- `roadOfLegends.ts` — the weekday Raid Hour schedule and featured targets.
- `estimateConfidence.ts` — the per‑number confidence/source list shown in the app.
- `research.ts`, `presets.ts`, `locations.ts`, `typeVisuals.ts`,
  `pokemonSprites.ts` — research rewards, goal presets, regions, theming, sprites.

> Several values (Super Mega Raid energy, Mewtwo per‑Mega‑Level costs, the Global
> research rewards, parts of the boss list) are best‑effort from public GO Fest
> 2026 info and may change. The in‑app confidence panel flags which are confirmed.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # run the unit/component tests (Vitest)
npm run build    # production build
npm run lint     # ESLint
```

## Deploy

The app is a static client‑side site and ships two ways:

- **Vercel (recommended)** — import the repo on vercel.com; it auto‑detects Next.js.
  Served under the `/go-fest-raid-planner` base path (override with `BASE_PATH`).
  No environment variables or backend required.
- **GitHub Pages** — `.github/workflows/deploy-pages.yml` type‑checks, tests, then
  builds a fully static export (`output: "export"`) on push to `main`, using the
  repo subpath as the `basePath`.

Any static or Node host works as well:

```bash
npm run build
npm run start    # serves the production build on port 3000
```

---

This is a fan‑made planning tool and is **not affiliated with Niantic, Nintendo,
or The Pokémon Company**. Pokémon names and sprites are the property of their
respective owners.
