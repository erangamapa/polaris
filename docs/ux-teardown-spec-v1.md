# UX Teardown & Pattern Spec — v1

**Scope:** Casino + lobby (ref: Stake) · Predictions (ref: Polymarket) · Shared wallet/account loop. Sportsbook deferred.
**Purpose:** Extract proven flows, IA, components, states and microcopy so the MVP feels familiar — then rebuild them as clean, ownable React/Tailwind components. We copy *conventions*, not assets.

---

## 0. Ground rules (read first)

**What we extract (safe + smart):**
- Information architecture and navigation structure
- User flows and screen sequencing
- Component anatomy and interaction states
- Microcopy *conventions* (the meaning, not the exact strings)
- Layout logic and responsive behaviour

**What we never lift:**
- CSS, DOM, minified JS, or scraped component code
- Logos, brand colours, fonts, illustrations, icon sets, sound assets
- Exact marketing copy / proprietary phrasing
- Anything that makes us look like a clone rather than a familiar product

Polymarket's frontend and contracts are substantially open-source (MIT) — for predictions we *can* reference real code for logic (CLOB pricing, share math). Stake is closed — we work strictly from observed UX patterns.

**Naming:** components below use a neutral `B` prefix (B = our brand, TBD). Swap when the name lands. Tokens are ours; structure is borrowed.

---

## 1. Shared foundations

### 1.1 Design tokens (define once, reuse everywhere)
- **Color roles:** `bg/surface/surface-raised/border`, `text-primary/secondary/muted`, `brand`, `positive` (win/yes), `negative` (loss/no), `warning`, `pending`. Crypto books skew dark-first — build dark as default, light optional later.
- **Money semantics:** one shared color logic across all three verticals — green = credit/win/yes, red = debit/loss/no, amber = pending. Never let casino "win green" differ from predictions "yes green."
- **Type scale:** numeric/tabular font for all balances, odds, prices, stakes (use `font-variant-numeric: tabular-nums` so digits don't jump).
- **Radius/spacing/elevation:** 2–3 elevation levels max. Tiles and cards share one radius token.

### 1.2 Global layout shell
- **Persistent balance header** (top-right): available balance + deposit CTA, reachable from every screen. This is the single most-reused element across all three verticals.
- **Primary nav:** Casino · Predictions · (Sportsbook later) · Wallet. Left rail on desktop, bottom tab bar on mobile.
- **Mobile-first (see §1.4):** every critical action (see balance, find event, enter stake, confirm, track, withdraw) must be one-thumb reachable. Default layout = mobile; desktop adds rail, sidebar, and header search — never the reverse.

### 1.3 Universal interaction states (apply to every component)
Default · Hover/Focus · Loading (skeleton) · Empty · Error · Disabled · Success/confirmed · Pending. Spec these once as shared primitives so casino, predictions and wallet don't reinvent them.

### 1.4 Mobile-first responsive rules

**Definition:** Mobile-first means (1) base styles and default layout target the smallest viewport, (2) larger breakpoints *add* capability — never the reverse, and (3) every critical action is reachable with one thumb without hunting or horizontal panning the whole page.

**Tailwind convention (mandatory):**
- Unprefixed classes = mobile default.
- `sm:` (640px+) · `md:` (768px+) · `lg:` (1024px+) · `xl:` (1280px+) = progressive enhancement only.
- Never ship a desktop layout and hide/collapse it for mobile. Build mobile, then expand.

**Shell breakpoint map:**

| Element | Mobile (default) | Desktop enhancement |
|---|---|---|
| Primary nav | Fixed bottom tab bar | Left rail at `lg:` |
| Balance + deposit | Top bar, always visible | Same — do not move behind menus |
| Search | Inline in main content | Top bar at `md:` (single source of truth — no duplicate UX long-term) |
| Secondary panels (live wins, positions) | Compact inline strip or collapsible | Sidebar at `lg:` |
| Sheets (deposit, confirm) | Bottom sheet (`items-end`) | Centered modal at `sm:` |
| Main content padding | Extra bottom padding for tab bar (`pb-24`+) | Reduced at `lg:` |

**One-thumb reach checklist (every vertical):**
- [ ] See balance
- [ ] Deposit / add funds
- [ ] Find content (search or primary category)
- [ ] Enter stake / amount
- [ ] Confirm action
- [ ] Close / back / exit full-screen
- [ ] Track status (tx, bet, position)

If any item fails on a 375px viewport, the screen is not mobile-first — fix before adding desktop polish.

**Touch & interaction (not optional):**
- Minimum tap target: **44×44px** for all primary actions.
- Never rely on `hover` alone for affordance — play overlays, tooltips, and actions must work on tap.
- Respect `safe-area-inset-*` for notched devices (bottom nav, full-screen launcher).
- Horizontal scroll is OK for rails/tiles; vertical scroll must not trap the user.
- Prefer `active:` / visible default states over `group-hover` for game tiles and cards.

**Viewport:** `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` on every entry page.

**What "mobile-first" is not:**
- Responsive CSS that happens to work on phones.
- Desktop lobby with a hamburger menu bolted on.
- Hiding useful data on mobile with no alternative (e.g. live wins only in a desktop sidebar).

---

## 2. Wallet + Account loop (the backbone — build this first)

The doc's own thesis: the money loop is the product. This layer wraps all three verticals, so it ships first.

### 2.1 Screen inventory
1. Register / login (email or wallet connect)
2. Verify (age/jurisdiction gate → KYC where required)
3. Deposit (currency/chain select → address/QR or on-ramp → confirm)
4. Balance view (available vs pending, per-currency)
5. Withdraw (amount → method/address → confirm → status tracking)
6. Transaction history (filterable, every state visible)
7. Responsible-play controls (limits, cool-off)

### 2.2 The five journeys (from your vision doc) → component map
| Journey | Screens | Key components |
|---|---|---|
| First deposit | Register → verify → deposit → balance appears | `BAuthForm`, `BKycGate`, `BDepositSheet`, `BBalanceHeader` |
| First casino session | lobby → launch → bet → balance updates | `BGameTile`, `BGameLauncher`, `BBalanceHeader` |
| First prediction | market → Yes/No → stake → confirm | `BMarketCard`, `BOutcomeToggle`, `BPositionTicket` |
| First withdrawal | amount → method → track → receive | `BWithdrawSheet`, `BTxStatusTracker` |

### 2.3 Components
- `BBalanceHeader` — available + pending, currency switcher, deposit CTA. Pending shown distinctly (amber, "processing").
- `BDepositSheet` — crypto-first: chain/asset picker, address + QR + copy, network/fee notice, min-deposit, live "detected/confirming/credited" status.
- `BWithdrawSheet` — amount (with max), destination, fee + net-received breakdown, confirm, then hand off to tracker.
- `BTxStatusTracker` — stepper: Requested → Processing → On-chain (tx hash link) → Complete. **This is your trust moment — over-invest here.**
- `BTxHistoryTable` — type, amount, status chip, timestamp, tx link. Filter by type/status.
- `BStatusChip` — shared status pill (pending/confirmed/failed/void) reused across wallet, bets, positions.

### 2.4 Microcopy conventions
Always state, in plain language: amount, fee, **net received**, method, current status, and ETA. Never hide fees until the end. "Withdraw" not "cash out" in the wallet (reserve "cash out" for sportsbook later).

### 2.5 Copy from references / avoid
- **Copy:** Stake's crypto deposit/withdraw clarity (chain pick → QR → live confirmations) is best-in-class; mirror that structure.
- **Avoid:** burying KYC triggers. Show *when/why* KYC will be required up front — ties to your privacy positioning.

---

## 3. Casino + lobby teardown (ref: Stake)

### 3.1 Screen inventory
1. Lobby / home (hero + rails)
2. Category view (Slots, Live Casino, Game Shows, etc.)
3. Search + filter results
4. Provider/studio browse
5. Game launch (full-screen iframe + bet/balance chrome)
6. Game history / my bets

### 3.2 IA & layout logic
- **Left rail (desktop):** personal rails first — *Continue Playing, Following/Saved, Recommended* — then categories: Slots, Originals, Live Casino, Game Shows, Blackjack, Bonus Buy, etc. On mobile this collapses to a category chip row + bottom nav.
- **Main grid:** search, provider filter, category browse, popularity/sort — all without leaving the page. Density is intentional; don't over-whitespace a casino lobby, it reads "empty."
- **Live data surfaced inline:** recent big wins / live bet ticker / race leaderboard. Optional for MVP but cheap signal of "alive."
- **No native app:** Stake runs as mobile web / PWA. Plan PWA-first; it's the proven path.

### 3.3 Component inventory
- `BGameTile` — portrait thumbnail, title, provider, hover→play, optional live-RTP/badge. The workhorse; spec hover, loading skeleton, and favourited states.
- `BGameRail` — horizontal scroll row with title + "see all". Used for every personalised/category strip.
- `BCategoryNav` — left rail (desktop) / chip row (mobile).
- `BProviderFilter` — searchable studio list.
- `BSearchBar` — instant results, recent searches.
- `BGameLauncher` — full-screen game frame + persistent balance, bet amount, fullscreen/exit, fairness/info. Real-money settlement syncs `BBalanceHeader`.
- `BBetWinToast` — settlement feedback that updates balance optimistically then reconciles.
- `BGameHistoryTable` — game, bet, multiplier, payout, time.

### 3.4 Interaction states
- Tile: default / hover (play overlay) / loading skeleton / favourited / unavailable-in-region.
- Launcher: loading provider iframe / connected / disconnected-retry / insufficient-balance → deposit prompt.
- Balance: live sync after each round; never let displayed balance lag the game.

### 3.5 Microcopy conventions
Plain settlement language; show bet, multiplier, payout. Region-block message should be honest and specific.

### 3.6 Copy / avoid
- **Copy:** rail-based personalised lobby, instant search, provider filtering, density.
- **Avoid:** Stake's heavy VIP/loyalty surface and originals — explicitly deferred in your MVP. Don't import their bonus mechanics complexity.

### 3.7 Casino scaffold — mobile-first audit (v0)

Current `polaris` scaffold status: **responsive shell, actively closing mobile-first gaps.**

**Implemented (good):**
- Bottom nav default; side nav at `lg:` only.
- Single-column lobby default; no desktop-only sidebar for live data.
- `LiveFeed` inline in main content on all viewports (Bets / High Rollers / Races tabs).
- Mobile search in main; header search at `md:`.
- Bottom padding clears fixed tab bar.
- Deposit sheet: bottom sheet on mobile, centered modal at `sm:`.
- Full-screen game launcher works on all viewports.

**Gaps to close before calling casino MVP mobile-first:**

| Gap | Current behaviour | Required fix |
|---|---|---|
| Game tile play affordance | Hover-only overlay | Always-visible play icon or tap-to-launch with clear pressed state |
| Tile sizing | Fixed `136px` width | Acceptable for rail scroll; audit thumb reach and consider slightly larger on small phones |
| Search duplication | Two inputs (header + main) | Unify logic; one component, two placements — not two separate patterns |
| Safe areas | Not applied | `env(safe-area-inset-*)` on bottom nav and launcher chrome |
| Category chips | Horizontal scroll only | Ensure active chip scrolls into view on tap |

**Acceptance criteria for casino lobby (375px):**
1. User can deposit, search, launch a game, place a bet, and see balance update — all without reaching top-left corners or depending on hover.
2. Live activity is visible somewhere on mobile (even if simplified).
3. Bottom nav never obscures primary CTAs.
4. No horizontal page scroll; only intentional rail scroll.

---

## 4. Predictions teardown (ref: Polymarket)

Polymarket uses a **central limit order book (CLOB)**, not an AMM. Core invariant: **Yes + No shares always = $1.** If Yes trades at $0.65, No is $0.35, and price = implied probability. Displayed price = midpoint of best bid/ask, e.g. (0.34 + 0.40)/2 = 0.37 → "37%".

For MVP your own doc scopes this down to **curated markets, simple Yes/No, clear price, stake & payout, closing time, resolution source** — defer order-book depth, limit orders and user-created markets. So we present a *simplified* front over the same mental model.

### 4.1 Screen inventory
1. Markets home (category tabs + market cards)
2. Market detail (price/chart, Yes/No, rules, resolution source, close time)
3. Position ticket (buy Yes/No → stake → payout preview → confirm)
4. My positions (open / settled)
5. Resolution view (outcome + source + payout)

### 4.2 IA & layout logic
- **Category tabs:** Politics, Crypto, Sports, Economy, Tech, etc. (curate to a handful for MVP).
- **Market card grid/list:** each card shows question, current % per outcome, volume, close time. Cards are the entry unit.
- **Detail page:** probability chart over time, prominent Yes/No buy, collapsible Rules + Resolution source + Close time.

### 4.3 Component inventory
- `BMarketCard` — question, outcome %(s), 24h/total volume, close countdown, thumbnail. For MVP keep to binary Yes/No display.
- `BOutcomeToggle` — Yes / No selector showing live price (¢ and %). Green/red roles shared with the rest of the app.
- `BPositionTicket` — amount in, **shares received**, avg price, **max payout**, potential return %. Mirror the bet-slip mental model: stake → potential return.
- `BProbabilityChart` — line chart of implied probability over time (lightweight; Chart.js fine).
- `BResolutionPanel` — resolution rules + source + close time. **The integrity surface — make the source explicit and legible.**
- `BPositionsTable` — open vs settled, entry price, current/final value, P/L, status chip (reuse `BStatusChip`).

### 4.4 Interaction states
- Toggle: selected/unselected, price updating (subtle), market-closed (disabled).
- Ticket: live payout recalculation, insufficient balance → deposit prompt, market suspended, slippage/price-moved warning.
- Market: open / closing-soon / closed / resolving / resolved.

### 4.5 Microcopy conventions
State stake, shares, average price, max payout, close time, and **how it resolves & who decides** in plain language. Resolution source is the single most trust-critical string in this vertical — never bury it.

### 4.6 Copy / avoid
- **Copy:** Yes+No=$1 mental model, % = probability, card→detail→ticket flow, prominent resolution rules.
- **Avoid (MVP):** full order book, limit orders, user-created markets, deep charting. Present market-price simplicity; you can expose the CLOB later. Resolution disputes are the real risk — start with curated, clearly-sourced markets only.

---

## 5. Master component inventory → build order

Shared primitives (build once, used everywhere):
`BBalanceHeader` · `BStatusChip` · `BMoneyInput` (stake/amount with max) · `BConfirmSheet` · `BSkeleton` · `BEmptyState` · `BToast`

Wallet: `BAuthForm` · `BKycGate` · `BDepositSheet` · `BWithdrawSheet` · `BTxStatusTracker` · `BTxHistoryTable`

Casino: `BGameTile` · `BGameRail` · `BCategoryNav` · `BProviderFilter` · `BSearchBar` · `BGameLauncher` · `BBetWinToast` · `BGameHistoryTable`

Predictions: `BMarketCard` · `BOutcomeToggle` · `BPositionTicket` · `BProbabilityChart` · `BResolutionPanel` · `BPositionsTable`

**Suggested build sequence (matches "prove the money loop first"):**
1. Foundations + shell + shared primitives
2. Wallet loop end-to-end (deposit → balance → withdraw → history)
3. Casino (fastest-settling vertical → quickest proof of loop)
4. Predictions (curated, simplified)
5. Sportsbook (later)

---

## 6. Vibecoding notes (Cursor / VS Code)

- Build each component as a **prop-driven, data-agnostic stub** first (mock data), so you can wire real providers/CLOB later without touching UI.
- Keep money/odds/price formatting in **one shared util** (`formatMoney`, `formatPercent`, `formatOdds`) — every vertical calls it. Prevents the classic inconsistency bugs.
- Co-locate the interaction states from §1.3 as Storybook-style variants so you and GPT can iterate on states, not just happy paths.
- Treat `BTxStatusTracker` and `BResolutionPanel` as the two highest-trust components — over-build them.

---

*Confidential working draft. References used as pattern study only; all assets to be original.*
