# GO Fest 2026 Raid Planner

> Plan your **Pokémon GO Fest 2026: Global** weekend (July 11–12, 2026): pick the
> raid bosses you care about, enter what you already have, and find out exactly
> how many raids it takes to max them — headlined by the debut of **Mega Mewtwo X
> & Y** in Super Mega Raids.

GO Fest weekend is a race against the clock: six rotating three‑hour habitats
across two days, day‑locked legendaries, region‑exclusive bosses, and the
shared Mewtwo XL grind. This planner turns your goals into a concrete raid count,
maps them onto every time block so you know what to hit and when, and lets you
fold in remote raids and timezone tricks. Snap a screenshot to auto‑fill your
candy and energy, rank your priorities, and walk in with a plan instead of
guesswork.

Everything runs **client‑side in the browser** — no account, no backend, no data
leaves your device.

---

## What it does

- **Pick targets** — browse the GO Fest roster grouped by habitat block, with
  Mega Mewtwo X (Saturday) and Y (Sunday) as headliner tiles. Region‑locked
  bosses are flagged as remote‑only.
- **Enter what you have** — per boss: current Candy, XL Candy, Mega Energy, your
  Pokémon's level and Mega Level, and variant (standard / shadow / purified,
  which changes the XL‑to‑level‑50 cost: 296 / 360 / 272). One‑tap **presets**
  ("Level 40 → 50", "Reach Mega Level 4") and a **quantity** stepper to max
  several copies.
- **Screenshot import (OCR)** — drop in your in‑game Pokémon stat screenshots and
  Tesseract reads the Candy / XL / Mega Energy and the species, then you tap which
  Pokémon each belongs to. Bulk‑import a whole roster at once.
- **Raids needed** — per boss and in total, as a range (rewards roll), showing
  which currency is the binding constraint and the effect of a same‑type **Mega
  buddy** Candy/XL boost.
- **Shared‑resource species** — Giratina, Dialga, Palkia, the genie quartet, and
  the Cosmog line (**Solgaleo + Lunala**) draw from one Candy/XL pool, so they
  collapse into a single combined target (with per‑forme counters and typing)
  instead of being double‑counted.
- **Mega Mewtwo X & Y** — one combined card: enter your shared Candy/XL/level once,
  each form keeps its own Mega Energy and Mega Level, and the 40→50 leveling is
  smart‑balanced across both forms (you farm Mewtwo XL from either day's raids).
- **Per‑block weekend plan** — fixed‑window bosses pin to their habitat block(s),
  Mewtwo backfills the rest; each block is risk‑banded by capacity and ordered by
  a **drag‑to‑prioritize** list (lowest priority is cut first when a block is over
  capacity). Toggle **quick‑catch** per block to trade catch Candy/XL for speed.
- **Remote raids** — an opt‑in pool of up to 60 passes (Fri 10 / Sat & Sun 40 /
  Mon 10 by timezone). Allocate per species by hand (or one‑tap auto‑balance by
  priority); single‑day bosses are correctly capped to their reachable window.
- **Mega‑evolve suggestions** — for each boss and each habitat block, which mega
  to evolve for the biggest same‑type Candy XL boost, ranked by whether it also
  fights well or matches the featured wild spawns.
- **Best counters** — top attackers per boss, copyable as a Pokémon GO search
  string.
- **Goal progress & capacity** — what fraction of each goal actually fits in the
  time you have, plus the Rare Candy / Rare Candy XL the plan hands out and GO Fest
  research credits folded into your on‑hand totals.
- **Excel export** — download the full plan as an `.xlsx` workbook.
- **Persistence** — selections, inputs, settings, and imported screenshots are
  saved per‑device in browser local storage, so a plan survives closing the tab
  or app and persists across days. Use Backup &amp; restore (JSON / `.xlsx`) to
  move a plan between devices.

## How it works

The calculation lives in `src/domain/` as a **pure engine** (no React, no DOM),
unit‑tested with Vitest. The pipeline:

1. **Requirements** (`requirements.ts`) — gross then net currency needs from your
   level/Mega‑Level goals and what you hold (XL to level 50, Candy below 40, Mega
   Energy per Mega Level), scaled by quantity.
2. **Raids needed** (`raidsNeeded.ts`) — net needs ÷ per‑raid reward → a min/max
   raid range per currency; the currency needing the most raids is the binding
   constraint.
3. **Plan summary** (`index.ts`) — collapses shared‑resource form groups, runs
   each selected boss, and splits the shared Mewtwo leveling across X/Y.
4. **Capacity** (`capacity.ts`) — models the realistic raids/hour for a power user
   (lobby size, battle + catch + downtime), including a quick‑catch speed factor.
5. **Block plan** (`blockPlan.ts`) — lays the demand across the six habitat blocks,
   risk‑bands each block, applies per‑block priority cuts, and builds the remote
   pool, goal progress, and Rare Candy forecast.

Supporting modules: `forms.ts` (multi‑form species, remote day‑side caps,
combined‑card naming), `megaBoosts.ts` (candy‑boost mega engine), `counters.ts`
(type effectiveness + best attackers), `buddyBoost.ts`, `research.ts` (GO Fest
research credits), `region.ts` (hemisphere/continent availability), and
`scheduler.ts` (the chronological per‑raid schedule used by the Excel export).

## Tech

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS 3**
- **Zustand** (`persist`, quota‑tolerant local storage) for state
- **Tesseract.js** (loaded from CDN at runtime) for screenshot OCR
- **ExcelJS** for the workbook export
- **three.js** for the loader visuals
- **Vitest** for the engine unit tests

The app is fully static (no server, API routes, or runtime secrets) — every
computation runs in the browser.

## Project structure

```
src/
  app/            Next.js App Router entry (layout, page, global styles)
  data/           Editable game data (see below)
  domain/         Pure, unit-tested calculation engine
  store/          Zustand store (selections, inputs, settings, imports)
  hooks/          usePlannerResults (summary + block plan + remote balancing), etc.
  components/
    BossList/       Target picker + Mewtwo headliner tiles
    BossInputCard/  Per-boss inputs, screenshot scan, counters, mega suggestions
    Dashboard/      Summary, per-block accordion, capacity, goal progress, remote
    Settings/       Screenshot importer, assumptions, location, feedback
    ui/             Shared presentational components
  export/         ExcelJS workbook builder + browser download
  lib/            OCR (screenshotScan, ocrEngine), Pokémon search, image/thumbnail
                  helpers, formatting, math
```

## Game data

All tunable numbers and the roster live in `src/data/` so they're easy to correct
as Niantic confirms details:

- `config.ts` — event details, Mega Energy / catch rewards, XL‑to‑50 costs, raid
  timing & lobby model, free‑pass and remote caps.
- `bosses.ts` — the raid roster (tiers, availability windows, reward ranges,
  counters, region locks, Mewtwo per‑Mega‑Level energy totals).
- `habitats.ts` — the six three‑hour habitat windows and their featured wild types.
- `formGroups.ts` — shared‑Candy multi‑form species (Giratina, Dialga, Palkia, the
  genies, and the Cosmog line).
- `megas.ts` / `attackers.ts` — every released mega (typing + sprite) and the
  attacker pool (eDPS) behind counters and candy‑boost suggestions.
- `research.ts`, `presets.ts`, `locations.ts`, `typeVisuals.ts`,
  `pokemonSprites.ts` — research rewards, goal presets, regions, theming, sprites.

> Several values (Super Mega Raid energy, Mewtwo per‑Mega‑Level costs, parts of
> the boss list) are best‑effort from public GO Fest 2026 info and may change.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # run the engine unit tests (Vitest)
npm run build    # production build
npm run lint     # ESLint
```

## Deploy

The app is a static client‑side site and ships two ways:

- **Vercel (recommended)** — import the repo on vercel.com; it auto‑detects Next.js
  and serves from the root. No environment variables or backend required. Custom
  domains and HTTPS are one‑click.
- **GitHub Pages** — `.github/workflows/deploy-pages.yml` builds a static export on
  push to `main` (using `output: "export"` with a repo subpath `basePath`).

Any static or Node host works as well:

```bash
npm run build
npm run start    # serves the production build on port 3000
```

---

This is a fan‑made planning tool and is **not affiliated with Niantic, Nintendo,
or The Pokémon Company**. Pokémon names and sprites are the property of their
respective owners.
