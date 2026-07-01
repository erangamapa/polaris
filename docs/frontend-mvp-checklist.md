# Polaris — Front-End MVP Checklist

What's left to reach a **fully functional front-end MVP** (core loop complete, Stake-familiar).
Front-end only — no backend, ops, legal, or real integrations.

**Guiding rule:** build the in-app touchpoints **we own**. For anything **external** (email, SMS,
KYC scanner, on-ramp, chat, wallet popups, chain confirmations) show a single clear **handoff state**
(a button + "check your email" / "enter code" / "redirecting…") and stop — don't simulate the
provider's UI or the delivery channel. External surfaces are designed separately.

**Priority:** 🔴 needed for "fully functional" · 🟡 expected / Stake-familiar · ⚪ polish
**Status:** `[x]` done · `[~]` partial · `[ ]` to do

_Last updated: 2026-06-30_

---

## Sportsbook (biggest remaining)

- [x] 🔴 **Cash-out** — full + 50% partial, mock cash-out value, short time-delay confirm _(suspension state pending)_
- [x] 🔴 **Bet receipt** — bet ref, count, stake, potential return, "view my bets" _(on placement banner)_
- [x] 🔴 **My Bets** — Open / Settled tabs with cash-out on open bets, Cashed-out / Void / Won / Lost states
- [x] 🟡 Odds-format toggle — decimal / fractional / american (persisted)
- [x] 🟡 Live odds movement (▲▼) + accept-odds-changes toggle + re-accept prompt
- [x] 🟡 Live clock ticking + market suspension (locked/greyed) state
- [ ] ⚪ Quick-stake chips on singles (currently multi only)
- [x] Multi-market events + event detail + market groups
- [x] Score-driven settlement (won / lost / void-returns-stake)

## Casino

- [~] ~~1–2 playable games (Dice/Mines) + provably-fair + game-info/demo/autobet~~ — **descoped for MVP showcase** (game mockups add little demo value)
- [ ] ⚪ Providers browse page
- [x] Lobby, rails, tiles, search, favourites, categories, live-wins feed, game launcher loop

## Wallet

- [x] 🔴 2FA **code-entry gate** on withdrawal (6-digit step; delivery external)
- [x] 🟡 Currency selector + fiat display — one unified dropdown (crypto + fiat), balance/wallet/activity/positions convert; inputs stay USD (persisted)
- [ ] 🟡 Transaction-history filters/tabs (deposits vs withdrawals)
- [ ] 🟡 Withdrawal review / hold / rejection states (happy path only today)
- [x] Balance states (available / in-play / pending)
- [x] Staged deposit (detected→confirming→credited) + staged withdrawal + tx history

## Trust & account (in-app)

- [x] 🔴 Responsible-gambling controls — deposit/loss/session limits, reality-check interval, take-a-break (persisted)
- [x] 🔴 Real footer — Casino/Sports/Support/About columns, license line, RG + support links
- [x] 🔴 Help / support entry point — help topics + contact support with mock case ID
- [ ] 🟡 Account settings page — beyond the current account dialog (preferences, sessions)
- [x] Login / register modal (wallets + email), KYC gate on wallet, session persistence, account dialog

## Predictions

- [ ] 🟡 Sell / close position early (predictions' cash-out)
- [ ] ⚪ Market lifecycle states (trading closed → awaiting source → resolved → paid)
- [x] Curated Yes/No markets, detail + chart, order book (advanced), ticket, positions

## Foundation (front-end architecture)

- [~] 🔴 **Routing / shareable URLs** — top-level nav in the URL (`/casino/:cat`, `/predictions/:section`, `/sports/:sport`), deep links + back/forward + SPA fallback (History API, no router dep). _Event-detail URLs (`/sports/:sport/:eventId`) still pending._
- [x] 🟡 Toast system — top-center/top, raised+shadow, 4 categories, action link, pause-on-hover, progress; migrated bet-placed / limits-saved / deposit+withdrawal-complete _(notifications bell pending)_
- [ ] ⚪ i18n scaffolding — defer
- [x] Motion polish (top-anchored modals, subtle fades), reduced-motion, a11y focus rings, error boundary

---

## External — NOT mocked (handoff state only, designed separately)

- Verification/reset **emails**, magic links
- **2FA delivery** (SMS / authenticator) — we keep only the in-app code field
- **KYC document capture / scanning** (vendor SDK) — our name/DOB/country gate is enough
- **Buy-crypto / fiat on-ramp** (MoonPay, etc.)
- **Live chat** vendor widget
- **Wallet-connect popups** (MetaMask, etc.) — our button represents it
- **On-chain confirmations** — our status UI represents them

---

## The three that most make it "fully functional"

1. **Sports cash-out + bet receipt + My Bets** (completes the sportsbook loop)
2. **Routing / shareable URLs** (makes it behave like a real app)
3. **Responsible-gambling controls + real footer/support** (the trust layer)
