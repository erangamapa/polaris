# Polaris — Changelog

Front-end prototype of a three-in-one crypto casino / sportsbook / prediction market.
All data is mock; no backend, real money, or provider integrations.

## Build log

### Foundation & shell
- Scaffolded Vite + React 19 + Tailwind v4 + shadcn/ui (OKLCH theme, dark-first).
- Top bar: burger, logo, balance + Deposit, activity, account (balance centered on desktop, Stake-style).
- Contextual left rail: 3 product tabs (Casino / Predictions / Sports) with subtle per-product accent colors; category/section lists per product; burger-toggled; mobile slide-over drawer.
- Mobile bottom product bar; hides on keyboard focus.
- Error boundary, favicon, page title, README.

### Casino
- Lobby with promo hero carousel, category rails, portrait game tiles, instant search.
- Working favourites (star toggle + Favorites view), category filtering.
- Game launcher with a bet → balance loop; live-wins feed.
- Renamed "Originals" → "Popular" (aggregator framing).

### Predictions (Polymarket-style)
- Curated Yes/No markets, category tabs, search.
- Market detail: probability chart (recharts), resolution rules/source, order book behind an "advanced" toggle (basic mode = Yes/No only).
- Position ticket (amount → shares → payout), positions table.

### Sportsbook (deepest vertical — Stake-referenced)
- Sports rail, Live/Upcoming, events grouped by Region · League.
- **Multi-market events** (Match Result, Over/Under, Handicap, BTTS) with market-group tabs + event detail page ("+N markets").
- **Score-driven settlement**: each event has a simulated final score → bets settle won / lost / void (void returns stake), incl. multi-leg void recalculation.
- **Bet slip**: singles + multi, per-leg stake, quick stakes, confirm step.
- **Cash-out**: full + 50% partial, live value, time-delay confirm; "Cashed out" state.
- **Bet receipt** on placement (ref, count, stake, return, "view my bets").
- **My Bets** (activity): Open / Settled with Won / Lost / Void / Cashed-out.
- **Odds-format toggle**: decimal / fractional / american (persisted).
- **Live odds movement** (▲▼ flash), **accept-odds-changes** toggle + re-accept prompt, **market suspension** (locked odds), **ticking clock**.

### Wallet
- One balance with Available / In-play / Pending states.
- Staged deposit (detected → confirming → credited), conversion disclosure, copy address.
- Staged withdrawal (requested → review → sent → confirming → completed), fees, tx hash.
- Transaction history; KYC-gated (deposit + withdraw).

### Auth & account
- Login / register modal (4 wallets + email/password) with the custom pill/tile design system.
- Mock KYC gate on the wallet; session persistence (localStorage); account dialog with verify status + logout.
- Money actions gated: betting requires login; wallet requires login + KYC.

### Trust layer
- Real footer (Casino / Sports / Support / About columns, licence line, 18+/RG).
- Responsible-gambling dialog: deposit/loss/session limits, reality-check interval, take-a-break (persisted).
- Support dialog: help topics + contact support with mock case ID.

### Routing
- URL sync for top-level nav (`/casino/:cat`, `/predictions/:section`, `/sports/:sport`), deep links, back/forward, SPA fallback (`vercel.json`). No router dependency.

### Motion, a11y & quality
- Top-anchored modals (no re-centering on content change) + subtle fades; reduced-motion respected.
- Focus-visible rings on custom controls; fixed sidebar tab layout jump.
- Select-on-focus for all amount inputs (bet slip, casino, ticket, wallet).
- Loading skeletons across casino / predictions / sports.

### Docs (in `/docs`)
- UX teardown spec, Stake sportsbook teardown (primary-sourced), parity audits, and a live front-end MVP checklist.

## Not built (intentional)
- Backend, real KYC/wallet/provider integrations, on-chain settlement.
- External surfaces (email, SMS/2FA delivery, KYC scanner, fiat on-ramp, live chat) — handoff states only.
- Playable casino games (Dice/Mines) + provably-fair — descoped for the MVP showcase.
