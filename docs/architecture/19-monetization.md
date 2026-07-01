# 19 — Monetization

How Polaris makes money across the three verticals. The short version: **the casino edge (which we own
outright) is the profit engine; Azuro sports is a risk-free but capped affiliate stream that rounds out
the product and acquires bettors.** Figures for Azuro are verified against Azuro's docs (linked below).

## Revenue stack (in order of importance)

| # | Stream | Who owns the margin | Our revenue | Bankroll risk |
|---|---|---|---|---|
| 1 | **Casino — our own games** | **Us, 100%** | the full house edge (GGR) | Yes (we fund winners) |
| 2 | **Casino — studio games** (later, `09`) | shared | our % of GGR rev-share | model-dependent |
| 3 | **Sports/Predictions — Azuro** | Azuro (odds + liquidity) | affiliate share of GGR, capped | **None** (Azuro LPs) |
| 4 | Optional minor | — | odds markup, FX/conversion spread, loyalty/premium | — |

## 1 & 2 — Casino: the profit engine (we own the edge)

- Every in-house provably-fair game has a **built-in house edge** expressed transparently in the outcome
  mapping (e.g. dice pays `99/target`, not `100/target`; see `06`). The **RTP is our dial.**
- Over volume, **GGR = total stakes − total payouts** flows entirely to us — **no rev-share with anyone**
  on our own games. This is the fattest, most controllable margin we have.
- **Studio games** (later): standard GGR **revenue-share** with the provider (we keep a %, pay their cut).
- **Cost:** we carry **bankroll risk** — the vault must hold enough house liquidity to pay net winners
  (see `14` T8). Cap per-session `maxSpend`/max payout and monitor reserves vs. open exposure.

**This is why we lead with casino:** high margin, fully owned, RTP under our control.

## 3 — Sports/Predictions via Azuro: risk-free but capped

Azuro pays the **frontend that sources the bet**. We register an **affiliate wallet** and pass it in the
bet order; Azuro pays us a share of the GGR our volume generates.

- **GGR (PoolRev)** = `total bets − total winnings` on our sourced volume.
- **Our cut** = a **RevenueReward of ~70% of the attributable App Revenue**, bounded by a
  **Spread Reward Cap = 50% × spread(vig) × bet size**.
- **No bankroll risk** — Azuro's LP pool is the counterparty and absorbs payout variance. We're a
  high-value affiliate earning a large slice of the vig on bets we bring, without funding payouts.
- **Limits:** the reward is **capped by Azuro's formula** and by the vig Azuro sets — margin is thinner
  and less controllable than the casino edge.

**Strategic role:** Azuro lets us offer a **full, credible sportsbook + prediction market with zero build
and zero bankroll**, earning a risk-free cut — while real profit comes from the casino. Treat sports as
**product completeness + user acquisition**, not the profit center.

## Getting paid by Azuro — affiliate mechanics & securing the address

### How the reward reaches us
- The **affiliate wallet address** is a field in the bet — specifically inside the EIP-712
  **`ClientBetData`** structure (alongside `amount`, `nonce`, `conditionId`, `outcomeId`, `minOdds`,
  `expiresAt`, `chainId`, `relayerFeeAmount`, `affiliate`).
- Bet flow (gasless/relayer): player signs `ClientBetData` → Azuro oracle API (`POST /orders`) → oracle
  signs → Relayer executes `betFor(OrderData[])` on-chain.
- Azuro attributes GGR to the `affiliate` address on the resolved bets; we later claim rewards to that
  wallet. Register the frontend with Azuro's **affiliate-tracker** for correct attribution + support.

### First, kill the wrong mental model
The affiliate address is **NOT a secret.** It appears on-chain in every bet and is queryable by anyone.
So "hiding it from players" is impossible **and unnecessary** — knowing the address does **not** let
anyone steal our accrued rewards (only that address's private key can move them). The real risk is
**substitution**: a user swapping in *their own* address so the reward on *their* bet goes to them.

### The two substitution cases (and what we can actually do)

**Case A — a user tampers with a bet placed *through our app* (PREVENTABLE).**
Because bets are submitted via an order API, we **proxy every order through our own backend** and make the
backend the enforcement point:
- Store our address in **server env** (`AZURO_AFFILIATE_ADDRESS`) — for config/consistency, not secrecy.
- The backend **sets / overwrites the `affiliate` field to `AZURO_AFFILIATE_ADDRESS`** on every order
  before it's signed/forwarded, and **rejects any order whose `affiliate` ≠ our address.**
- Result: an order routed through Polaris always carries our affiliate; client-side tampering is dropped by
  the backend before it reaches Azuro's oracle.

**Case B — a user bypasses our app entirely and bets directly on Azuro (UNPREVENTABLE, and not theft).**
Azuro is a permissionless protocol: anyone can call the bet contract directly with any affiliate (or
none). We **cannot** stop this — nobody can, on a public chain. But this isn't spoofing *our* address;
it's the user simply not using us as the affiliate, so we earn nothing on a bet we didn't source. That's
acceptable, marginal leakage (only technical users who bother to bypass the UI).

### Implementation rules (see `08`, `14` T9)
1. `affiliate` comes from **server env**, injected/enforced **server-side** on every order — never taken
   from a client-supplied value.
2. **Proxy order submission through our backend**; validate `affiliate == AZURO_AFFILIATE_ADDRESS` and
   reject mismatches before forwarding to Azuro's `POST /orders`.
3. Register with Azuro's **affiliate-tracker**; **monitor** attributed on-chain volume vs. our expected
   volume to detect anomalies.
4. Accept Case B as unavoidable; don't build brittle anti-bypass hacks.

## 4 — Optional minor streams (use carefully)

- **Extra odds markup on Azuro** — widen the margin on top of Azuro's odds. Increases our take but hurts
  price competitiveness; use sparingly.
- **FX / currency-conversion spread** — small margin when converting deposits to USDC.
- **Loyalty / premium features** — retention play, minor direct revenue.
- **Avoid deposit/withdrawal fees** — bad UX and counter to the non-custodial, player-owns-funds ethos.

## The one-line strategy

**Own the casino edge (primary margin, we control RTP, we carry bankroll); use Azuro to complete the
product and acquire bettors at a risk-free but capped affiliate cut.** Don't sink capital into becoming a
bookmaker — Azuro already is one; monetize the casino.

## Build hooks (where this shows up in code)
- Casino edge → the outcome mapping / RTP config per game (`06`, `07`).
- Studio rev-share → provider contract terms (`09`).
- Azuro affiliate reward → register the affiliate wallet + pass it in every bet order (`08`).
- Bankroll/solvency monitoring → house-liquidity vs. open-session exposure (`14` T8).

_Last updated: 2026-07-01_
