# Polaris — Architecture Refactor Plan

A staged plan to take the front-end from a clean **prototype** to an **extensible product**,
without changing user-visible behaviour. Each phase is independently shippable and reversible.

**Guiding rule:** behaviour-preserving refactors first. No feature changes, no UX changes.
Every phase must leave the app building (`npm run build`), linting (`npm run lint`), and running (`npm run dev`) green.

**Priority:** 🔴 structural risk / do first · 🟡 extensibility · ⚪ polish
**Status:** `[ ]` to do · `[~]` in progress · `[x]` done

_Last updated: 2026-07-01_

---

## Context — why

`src/App.jsx` (362 lines) is a "god component": it owns ~25 `useState` hooks **and** all business
logic (`placeBet`, `settleBet`, `cashOut`, `logRound`, auth/KYC orchestration, routing, favorites),
then prop-drills state (notably `balance`/`setBalance`) through nearly every component. This is the
main scaling risk. The money logic is also untested, the whole app ships as one 751 KB
(214 KB gzip) chunk, and components import mock data directly — coupling that will make the
eventual real-API swap touch many files.

None of this is broken today. This plan reduces future cost, in priority order.

---

## Phase 0 — 🔴 Quick wins & safety net _(low risk, ~30 min)_

Do these first so later phases have a green baseline to diff against.

- [ ] Remove unused import `fmt` in `src/components/activity/ActivityDialog.jsx:5`
- [ ] Remove unused import `Clock` in `src/components/predictions/MarketCard.jsx:3`
- [ ] Fix `no-unused-expressions` in `src/App.jsx:178` — rewrite the `toggleFav`
      `n.has(k) ? n.delete(k) : n.add(k)` ternary-as-statement as an explicit `if`
- [ ] Confirm `npm run lint` shows only the accepted `only-export-components` warnings
      (from context files exporting hooks alongside providers)

**Exit:** `npm run lint` clean of the three real warnings; build + dev still green.

---

## Phase 1 — 🔴 Add a test harness _(enables safe refactoring)_

Set up testing **before** moving logic, so the extractions in Phases 2–3 are verified against
locked-in behaviour. Aligns with the global standard (write tests for new work; `data-test-id`
selectors; `import`, never `require`).

- [ ] Add `vitest` + `@testing-library/react` + `jsdom` as devDependencies
- [ ] Add `"test": "vitest"` (and `"test:run": "vitest run"`) scripts to `package.json`
- [ ] Configure `test` in `vite.config.js` (jsdom environment, globals)
- [ ] Characterisation tests for the **current** money logic (before any move), covering:
  - [ ] `settleBet` — won pays `potential`, void returns `stake`, lost pays nothing
  - [ ] `cashoutValue` — full and fractional (partial banks the fraction, leaves rest live)
  - [ ] `outcomeResult` + multi-leg combining in `SportsApp.place()` (won / lost / all-void)
  - [ ] `src/lib/format.js` and odds-format conversions in `src/lib/odds.jsx`

**Exit:** `npm run test:run` green; these tests become the guardrail for Phases 2–3.

---

## Phase 2 — 🔴 Extract the betting engine

Move domain logic out of the shell into a testable unit. Behaviour identical; `App.jsx` shrinks.

- [ ] Create `src/lib/bettingEngine.js` with **pure** helpers: `betRef`, `cashoutValue`,
      settlement resolution (the `won`/`lost`/`void` decision), fractional cash-out math
- [ ] Create `src/hooks/useBettingEngine.js` (a hook or `useReducer`) that owns `activity` state
      and exposes `placeBet`, `logRound`, `cashOut`, `settleBet`, and derived `inPlay`
- [ ] Replace the `activityRef` + `setTimeout` settlement pattern with the hook's internal state
      (keep the delayed-settle timer, but scoped inside the hook)
- [ ] Wire `App.jsx` to consume the hook; delete the moved logic from the shell
- [ ] Point the Phase 1 tests at the extracted module; add any missing cases

**Exit:** tests green, behaviour unchanged, `App.jsx` no longer contains settlement/cash-out logic.

---

## Phase 3 — 🔴 Introduce Wallet & Auth contexts

Kill the prop-drilling. Two focused providers wrap the app alongside the existing
`CurrencyProvider` / `OddsFormatProvider` in `main.jsx`.

- [ ] `src/context/WalletContext.jsx` — owns `balance`, `pending`, `txns`, `inPlay`;
      exposes `setBalance`/`pushTxn`/etc. Remove `balance`/`setBalance` prop threading from
      `TopBar`, `CasinoLobby`, `PredictionsApp`, `SportsApp`, `GameLauncher`, `WalletDialog`
- [ ] `src/context/AuthContext.jsx` — owns `user`, `authOpen`/`authTab`, `kycOpen`/`kycIntent`,
      `accountOpen`, `pendingWallet`; exposes `ensureAuth`, `openAuth`, `openWallet`, `logout`,
      `onAuthed`, `onVerified`. Absorbs the login → KYC → wallet chain
- [ ] Keep `session.js` (localStorage) as the AuthContext's persistence layer
- [ ] `App.jsx` becomes primarily layout + routing + dialog mounting

**Exit:** `balance`/`setBalance` no longer passed as props; auth flow behaviour unchanged; tests green.

---

## Phase 4 — 🟡 Data-access seam

Isolate the future real-API swap to one layer. Prototype still reads mock data underneath.

- [ ] Add `src/data/` hooks: `useGames()`, `useGamesByCategory(cat)`, `useEvents(sport, live)`,
      `useMarkets(...)`, `usePredictionMarkets(section)` that currently return the mock data
- [ ] Replace direct `mockData` / `sportsData` / `predictionsData` imports in **components**
      with these hooks (lib/data files remain the single source under the hooks)
- [ ] Document in the hook file headers: "swap the body for a fetch/react-query call to go live"

**Exit:** components no longer import `*Data.js` directly; swapping to real APIs touches only `src/data/`.

---

## Phase 5 — 🟡 Code-splitting

Cut the 751 KB single chunk; defer per-vertical + Recharts cost.

- [ ] `React.lazy` + dynamic `import()` for `PredictionsApp` and `SportsApp` in `App.jsx`
- [ ] Wrap the lazy products in `<Suspense>` using the existing `Skeleton` fallback
- [ ] Re-run `npm run build`; confirm Recharts moves into the predictions chunk and the
      initial bundle drops
- [ ] (Optional) explicit `build.rolldownOptions` chunking if the split needs tuning

**Exit:** initial JS chunk meaningfully smaller; predictions/sports load on demand; build green.

---

## Phase 6 — ⚪ TypeScript (optional, highest long-term leverage)

Only if the project is committed to going past prototype. Do it **last** — it's the largest diff.

- [ ] Add `typescript` + `tsconfig.json` (allow JS, incremental adoption)
- [ ] Type the data shapes first: bet `selection`, `resolver`, `market`, `outcome`, `txn`, `user`
- [ ] Convert `src/lib/*` and `src/data/*` to `.ts` (pure logic — cheapest, highest value)
- [ ] Convert contexts and components incrementally; keep `.jsx` interop working throughout

**Exit:** `tsc --noEmit` green; core data shapes and logic typed.

---

## Sequencing & risk

| Phase | Depends on | Risk | User-visible change |
|---|---|---|---|
| 0 Quick wins | — | none | none |
| 1 Test harness | 0 | none | none |
| 2 Betting engine | 1 | low (tests guard) | none |
| 3 Wallet/Auth ctx | 2 | medium (broad edits) | none |
| 4 Data seam | — (any time) | low | none |
| 5 Code-splitting | — (any time) | low | none (brief Suspense skeleton) |
| 6 TypeScript | 2–4 ideal | medium | none |

**Do 0 → 1 → 2 → 3 in order** (each de-risks the next). Phases 4 and 5 are independent and can
slot in anywhere after Phase 0. Phase 6 is optional and best after the structure settles.

**Definition of done (every phase):** `npm run build`, `npm run lint`, and `npm run test:run`
(from Phase 1 on) all green; no behaviour or UX change unless explicitly noted.
