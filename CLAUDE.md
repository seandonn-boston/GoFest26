# GoFest26 Raid Planner — contributor guide

Next.js 16 (App Router, **static export**) + React 19 + Zustand 5 + Tailwind. A
client-only planner for Pokémon GO Fest 2026: pick raid targets, enter what you
have, and get a per-time-block raid plan for the Road of Legends week (Jul 6–10)
and the GO Fest weekend (Jul 11–12). See `README.md` for the product/math story.

## Commands

```sh
npm run dev          # dev server (page lives at basePath /go-fest-raid-planner)
npm test             # vitest, single run     · npm run test:watch
npm run lint         # eslint (CI enforces --max-warnings 0)
npm run typecheck    # tsc --noEmit
npm run format       # prettier --write .     · format:check in CI
npm run build        # production build (static export)
```

CI (`.github/workflows/ci.yml`) gates every PR on format:check, lint (zero
warnings), typecheck, and tests. `deploy-pages.yml` deploys `main` to GitHub
Pages; `next.config.ts` derives `basePath` from `GITHUB_PAGES`/`BASE_PATH`.

## Architecture & layering rules

```
src/data      event data + GAME_CONFIG (single source of every tunable number)
src/domain    PURE planning engine — no React, no store, no browser APIs
src/store     Zustand store (persisted; see version procedure below)
src/hooks     composition layer: store → domain → results for the UI
src/components/ UI (App Router pages in src/app)
src/lib, src/export  helpers, share links, xlsx/json backup
```

- `src/domain` must stay pure and unit-testable; it may import from `src/data`
  but never from store/hooks/components.
- `src/data` may import **types** from domain, nothing at runtime.
- Every game number lives in `GAME_CONFIG` (`src/data/config.ts`) with a
  `source:` comment saying whether it is confirmed or an estimate.
- Untrusted input (uploaded backups, `#plan=` share links) must pass through
  `sanitizeBackup` before touching the store. Share-link payloads are size-capped
  in `src/lib/sharePlan.ts`.

## Domain model in one paragraph

`computeCapacity` turns play-style settings into raids/hour. `computePlanSummary`
turns per-boss inputs into raids-needed ranges (candy luck). `computeRoadPlan`
fits the weekday Raid Hours — each Tue–Fri day is TWO independent windows
(6–7 PM 5★, 7–8 PM Mega/Primal; Monday is one 2 h 5★ marathon) — and returns a
`headStart` that `computeBlockPlan` subtracts from the weekend's six habitat
blocks. Fusion/crowned/primal energy raids are day-locked, reorderable shares
(`energy:<bossId>:<key>` pseudo-ids in `roadTargets`); their candy double-duty is
pre-credited and then **reconciled against what actually fit** so a squeezed-out
energy raid never leaves a phantom weekend credit.

## Store persistence — version bump procedure

When adding a persisted field to `usePlannerStore`:

1. Add the field + action; wire into `resetAll` and `loadState`.
2. Add a type-guard backfill in `migrate` and bump `version` (comment what changed).
3. Add the field to `StateBackup` (`stateBackup.ts`), `serializeState`, and a
   coercion in `sanitizeBackup.ts` (use the existing `bool`/`numRecord`/
   `strArrayRecord` helpers — they strip `__proto__`).
4. Cover the round-trip in `sanitizeBackup.test.ts`.

## Testing conventions

- Domain tests live next to the module (`src/domain/*.test.ts`), pure node env.
- Component/hook tests opt into jsdom with `// @vitest-environment jsdom`.
- When fixing a planner bug, pin it with a regression test that states the
  before/after numbers in a comment.

## Known deferred improvements

- `noUncheckedIndexedAccess` in tsconfig (~300 mechanical errors to absorb —
  do it as its own PR, module by module).
- Slice `usePlannerStore.ts` (~1k lines) into typed `StateCreator` slices.
- Compress `#plan=` share links (`CompressionStream`) with a fallback for
  existing uncompressed links.
- Convert `src/components/loader/SubstituteLoaderScreen.jsx` to `.tsx` and drop
  `allowJs`.
- `migrate` uses blanket backfill rather than stepwise `if (version < n)`
  branches — revisit if migrations ever become destructive.
