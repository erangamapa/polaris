# Polaris — Stake Parity Audit

Deep audit of the current prototype against **Stake.com as the 1:1 reference**. Goal: reach Stake parity on the core loop, then diverge with custom improvements.

**Legend:** ✅ built · 🟡 partial · ❌ missing
**Tag:** `[core]` = makes it feel like Stake (build for parity) · `[breadth]` = Stake's scale/retention machinery (AJ deferred; optional)

> Scope note: "1:1 Stake" is far larger than AJ's MVP scope. Predictions has **no Stake equivalent** — it's our differentiator, so it's out of parity scope by definition.

_Created: 2026-06-30_

---

## 1. Global shell / header

| Element | Stake | Us | Gap |
|---|---|---|---|
| Product toggle (Casino/Sports) | ✅ | ✅ (+Predictions) | — |
| Balance + currency selector | ✅ multi-currency dropdown, fiat-display toggle | 🟡 single USD balance | `[core]` currency selector + fiat toggle |
| Wallet button | ✅ | ✅ | — |
| Global search | ✅ searches games/events | 🟡 casino-only | `[core]` unified search |
| Notifications bell | ✅ | ❌ | `[breadth]` |
| Live chat (right rail) | ✅ signature feature | ❌ | `[breadth]` |
| Profile/menu dropdown | ✅ | 🟡 dialog | `[core]` proper account menu |
| Footer (licenses, RG, sponsors, provably fair) | ✅ huge | 🟡 18+ line only | `[core]` real footer w/ license + RG links |

## 2. Auth & account

| Item | Stake | Us | Gap |
|---|---|---|---|
| Register fields | username, email, password, DOB, promo code | email + password | `[core]` username, DOB, promo code |
| Email verification | ✅ | ❌ | `[core]` verify-email step |
| 2FA | ✅ | ❌ | `[core]` 2FA (esp. withdrawal) |
| Password reset / recovery | ✅ | ❌ | `[core]` |
| KYC tiers | ✅ levels 1–4, progressive | 🟡 single mock step | `[core]` tiered KYC |
| Account settings (security, sessions, preferences) | ✅ | ❌ | `[breadth]` settings pages |
| VIP level / progress | ✅ | ❌ | `[breadth]` |

## 3. Wallet

| Item | Stake | Us | Gap |
|---|---|---|---|
| Balance states | ✅ | ✅ available/in-play/pending | — |
| Multi-currency | ✅ many coins, per-coin balances | ❌ one USD balance | `[core]` multi-currency model |
| Deposit (asset+network, QR, status) | ✅ | ✅ staged | — |
| Withdrawal (staged, fee, tx) | ✅ + 2FA | ✅ (no 2FA) | `[core]` 2FA on withdraw |
| Buy crypto (fiat on-ramp) | ✅ MoonPay | ❌ | `[breadth]` |
| Vault (lock funds) | ✅ | ❌ | `[breadth]` |
| Tip / send to user | ✅ | ❌ | `[breadth]` |
| Currency swap / convert | ✅ | ❌ | `[breadth]` |
| Withdrawal address book | ✅ | ❌ | `[breadth]` |
| Transaction history + filters | ✅ | 🟡 flat list | `[core]` filters/tabs |

## 4. Casino

| Item | Stake | Us | Gap |
|---|---|---|---|
| Lobby rails / categories / search | ✅ | ✅ | — |
| Favourites / recent | ✅ | ✅ | — |
| **Real, distinct games** | ✅ Originals w/ real mechanics + 3rd-party slots | ❌ one generic RNG launcher | `[core]` game variety / real mechanics |
| Game info modal (RTP, provider, description) | ✅ | ❌ | `[core]` |
| Demo / fun play (no login) | ✅ | ❌ | `[core]` |
| Provider / publisher browse page | ✅ 260+ | 🟡 filter on tiles only | `[core]` providers page |
| Provably fair (verify seed) | ✅ core trust feature | ❌ | `[core]` for Originals |
| In-game bet controls (autobet, presets, hotkeys) | ✅ | 🟡 ½/2× only | `[core]` presets/autobet |
| Live bets feed under game / global | ✅ real | 🟡 fake ticker | `[core]` realer feed |
| Game bet history | ✅ per-game | 🟡 in My Activity | `[core]` per-game history |
| Theatre / fullscreen | ✅ | 🟡 fullscreen modal | minor |

## 5. Sportsbook

| Item | Stake | Us | Gap |
|---|---|---|---|
| Sports list / leagues / competitions | ✅ many | ✅ 4 sports | `[core]` more sports/depth |
| **Multiple markets per event** | ✅ 1X2, O/U, handicaps, props, 100s | ❌ one market each | `[core]` market groups/tabs |
| Live odds movement | ✅ real-time | ❌ static | `[core]` odds movement |
| Bet slip singles/multi | ✅ | ✅ | — |
| System bets | ✅ | ❌ | `[breadth]` |
| **Cash out (full/partial)** | ✅ | ❌ | `[core]` |
| Accept-odds-changes toggle | ✅ | ❌ | `[core]` |
| Bet builder / same-game parlay | ✅ | ❌ | `[breadth]` |
| Bet receipt | ✅ detailed | 🟡 toast | `[core]` receipt |
| Open/settled/my-bets in sports | ✅ | 🟡 global My Activity | `[core]` in-context my bets |
| Boosted odds | ✅ | ❌ | `[breadth]` |
| Live scores / stats / stream | ✅ | 🟡 static score | `[breadth]` |
| Racing / esports | ✅ | ❌ | `[breadth]` |

## 6. Predictions — no Stake equivalent

Our Polymarket-style vertical. Out of parity scope; this is where we intentionally diverge from Stake. Keep as-is for now.

## 7. Cross-cutting core logic (the real gaps)

- ❌ **Odds/prices don't move.** Everything static. Stake is live-priced. `[core]`
- ❌ **No real-time layer** (websockets). Live feed + scores are fake timers. `[core]`
- ❌ **No provably-fair** RNG/verification — Stake's core trust mechanic. `[core]`
- 🟡 **Settlement** is random auto-resolve after a delay — fine for mock, not real logic.
- ❌ **No multi-currency / fiat conversion** engine. `[core]`
- ❌ **No promotions engine** (races, rakeback, weekly bonus, reload). `[breadth]`
- ❌ **No responsible-gambling tools** (deposit/loss/time limits, self-exclusion, reality check). `[core]` (also legally required)
- ❌ **No i18n / localization.** Stake is heavily localized. `[breadth]`
- ❌ **No notifications / comms.** `[breadth]`

## 8. Data realism

- Casino: 20 mock games, all generic. Stake: thousands, real.
- Sports: 10 events, 1 market each. Stake: thousands, dozens of markets each.
- Predictions: 8 markets. (Our own scope.)
- No pagination / "load more" anywhere.

---

## Recommended parity order (core-loop first)

To make it *feel* like Stake without boiling the ocean:

1. **Sportsbook depth** — multiple markets per event (market groups/tabs) + a bet receipt + accept-odds-changes toggle. This is the biggest "feels like Stake" gap.
2. **Cash out** — full + partial on open sports bets. Signature Stake interaction.
3. **Casino realism** — game info modal + demo mode + a couple of *actually playable* Originals (Dice/Mines) with provably-fair verify.
4. **Live odds movement** — mock odds drift + "odds changed, re-accept" in the slip.
5. **Wallet multi-currency** — currency selector + fiat-display toggle (even if still one underlying balance).
6. **Unified global search** + real footer (license, responsible gambling).
7. **Responsible-gambling tools** — limits + reality check (also compliance).

Defer (breadth): VIP, races, rakeback, vault, tipping, on-ramp, live chat, bet builder, system bets, racing/esports, localization, notifications.
