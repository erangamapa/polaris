# Polaris

A three-in-one real-money entertainment platform concept — **Casino**, **Prediction Market**, and **Sportsbook** under one account and one balance. This is an MVP / showcase front-end: familiar, fast, mobile-first, built on proven interaction patterns.

> Front-end prototype with mock data only. No real money, accounts, odds feeds, or game providers are connected.

## What's inside

- **Casino** — lobby with promo hero, category rails, portrait game tiles, instant search, a live-wins feed, and a game launcher with a working bet → balance loop.
- **Predictions** — Yes/No markets (price = implied probability), market detail with a probability chart and order book, a position ticket, and a positions table.
- **Sportsbook** — sports rail, Live/Upcoming, events grouped by competition, odds buttons, and a single/multi bet slip.
- **Shared shell** — one balance across all three verticals, a contextual left rail with subtle per-product accent colors (Casino emerald, Predictions violet, Sports amber), and a deposit sheet.

## Stack

- React 19 + Vite
- Tailwind CSS v4
- shadcn/ui (Radix primitives)
- Recharts (probability charts)
- lucide-react (icons)

## Getting started

```bash
npm install
npm run dev
```

Open the local URL it prints (usually http://localhost:5173).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint with oxlint |

## Project structure

```
src/
  App.jsx                 app shell + product/section routing
  components/
    shell/                TopBar, Sidebar, BalancePill
    casino/               lobby, rails, tiles, game launcher, live feed
    predictions/          markets, detail, chart, order book, ticket, positions
    sports/               event rows, odds buttons, bet slip
    wallet/               deposit sheet
    ui/                   shadcn primitives
  lib/                    mock data + formatting helpers
docs/
  ux-teardown-spec-v1.md  UX pattern study (Stake / Polymarket)
```

## Notes

All data is mocked in `src/lib/*Data.js`. Swap these for real provider/API integrations to take it past prototype.

## Where this is headed — architecture & build spec

The plan to take Polaris from this mock-data prototype to a **non-custodial, on-chain,
connect-wallet-and-play** platform (player owns funds, casino-fast via session keys + off-chain
settlement) lives in **[`docs/architecture/`](docs/architecture/README.md)** — a full, agent-executable
build specification.

Start with [`docs/architecture/README.md`](docs/architecture/README.md). Highlights:

- **[00 — Overview](docs/architecture/00-overview.md)** — the model + the gap we bridge (vs BetSwirl)
- **[12 — Build plan](docs/architecture/12-build-plan-phases.md)** — phased, agent-followable sequence
- **[14 — Threat model](docs/architecture/14-security-threat-model.md)** — anti-exploit invariants
- **[16 — Credential manifest](docs/architecture/16-credential-manifest.md)** + **[17 — Build autonomy](docs/architecture/17-build-autonomy-protocol.md)** — what keys are needed and how the build runs from one bootstrap drop
- **[18 — Runtime topology](docs/architecture/18-runtime-topology.md)** — where everything runs (Vercel + Base)

A separate near-term refactor of the current prototype is in
[`docs/architecture-refactor-plan.md`](docs/architecture-refactor-plan.md).
