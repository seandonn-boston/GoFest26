# GO Fest 2026 Raid Planner

> A planning tool for Pokémon GO Fest 2026 that calculates exactly how many raids you need to fully max your chosen Pokémon's XL Candy and Mega Energy across the weekend.

GO Fest weekend is a race against the clock — six rotating habitats, a flood of raids, and Mega Mewtwo X and Y debuting. This planner tells you precisely how many raids each goal takes, then maps them onto every time block so you know what to hit and when. Snap a screenshot to auto-fill your current candy and energy, rank your priorities, factor in remote raids, and walk in with a plan instead of guesswork.

---

A mobile-friendly web app to plan your **Pokémon GO Fest 2026: Global** weekend
(July 11–12, 2026). Pick the raid bosses you actually want to grind, enter the
Candy / XL Candy / Mega Energy you already have plus your Pokémon's level and
mega level, and the planner tells you **how many raids you need** to hit your
goals — headlined by the debut of **Mega Mewtwo X & Y** in Super Mega Raids.

## What it does

- **Pick targets** — browse the GO Fest raid roster (Mega Mewtwo X/Y pinned on
  top) and tap the bosses you want to focus on.
- **Enter what you have** — per boss: current Candy, XL Candy, Mega Energy, your
  Pokémon's level/mega level, and variant (standard / shadow / purified, which
  changes the XL-to-level-50 cost: 296 / 360 / 272).
- **Presets** — one-tap goals like "Level 40 → 50" or "Reach Mega Level 4".
- **Raids needed** — per boss and in total, shown as a range (rewards vary), with
  and without a Mega-buddy Candy/XL boost, and which currency is the constraint.
- **Capacity check** — models the most raids a power-user can realistically do
  over the weekend (9h/day × 2 days) and flags whether your goals fit.
- **Hour-by-hour schedule** — a scarcity-first optimizer places limited-window
  legendaries first and backfills with all-weekend Mega Mewtwo (so it never
  overshoots), recommending a type-matching Mega buddy and a pass type per raid.
- **Excel export** — download the full chronological plan (`.xlsx`) with Schedule,
  Goals, and Capacity sheets.
- **Adjustable assumptions** — tune raid timing, free-pass count, and whether to
  plan for best-/expected-/worst-case reward rolls.
- **Persistence** — your selections, inputs, and settings are saved in the browser
  (localStorage); no account, no backend.

## Tech

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS
- Zustand (with `persist`) for state
- Vitest for the calculation-engine unit tests

The calculation engine in `src/domain/` is pure (no React/DOM) and unit-tested.

## Editing the game data

All tunable game numbers and the boss roster live in two files so they're easy
to correct as Niantic confirms details:

- `src/data/config.ts` — Mega Energy rewards, XL-to-50 costs, raid timing,
  buddy-boost multipliers, free-pass counts, etc.
- `src/data/bosses.ts` — the raid roster (tiers, availability windows, reward
  ranges, counters, Mewtwo mega-level energy totals).

> Several values (Super Mega Raid energy, Mewtwo per-mega-level costs, the full
> boss list) are best-effort from public GO Fest 2026 info and may change.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # run engine unit tests
npm run build    # production build
```

## Deploy

The app is a standard Next.js project and deploys to **Vercel** with zero config
(push the repo, import it on vercel.com — it auto-detects Next.js). It has no
backend or environment variables; all computation runs in the browser.

Any Node host works too:

```bash
npm run build
npm run start   # serves the production build on port 3000
```

## Project layout

- `src/data/` — editable game data (`config.ts`, `bosses.ts`, `presets.ts`).
- `src/domain/` — pure, unit-tested engine (requirements, raids-needed, capacity,
  scheduler, settings) with no React/DOM.
- `src/store/` — Zustand store (selections, inputs, settings) with localStorage.
- `src/components/` — UI (boss list, input cards, dashboard, settings, schedule).
- `src/export/` — ExcelJS workbook builder + browser download.

This is a fan-made planning tool and is not affiliated with Niantic or
The Pokémon Company.
