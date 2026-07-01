# 08 — Sports & Predictions via Azuro

For the Sports and Predictions verticals we **use Azuro** rather than build oracles, odds engines,
liquidity, and settlement ourselves. Azuro is a non-custodial, on-chain betting protocol.

## What Azuro is
- A **decentralized betting protocol / infrastructure** (smart contracts + odds engine + oracle/data
  feeds + shared liquidity pool + SDK). Not a casino you skin — you build the frontend, it runs the
  betting backend on-chain. Multi-chain, non-custodial.
- SDK/Toolkit: React hooks + utilities (SDK v7.4 / Toolkit v6.3 as of mid-2026).
- Docs: https://gem.azuro.org · SDK: https://gem.azuro.org/hub/apps/sdk/overview
- Tutorial app: https://github.com/Azuro-protocol/azuro-tutorial-app

## What it gives us
| Capability | Azuro provides |
|---|---|
| Sports betting markets + odds + data feeds | ✅ core |
| Prediction markets (non-binary outcomes) | ✅ core |
| Shared **liquidity pool** (LPs are the counterparty / house) | ✅ — **no bankroll needed** from us |
| Non-custodial (funds leave wallet only at bet placement) | ✅ |
| Simple games-of-chance ("AzuroGames") | ⚠️ auxiliary — not rich casino content |
| Branded slots / live dealer | ❌ not applicable (use `07` + `09`) |

The **liquidity model is the big win**: we don't fund payouts ourselves for these verticals — Azuro's
LP pool is the counterparty.

## Integration plan
- Consume the **Azuro SDK** (React hooks) inside `apps/web` to power the existing
  `src/components/sports/*` and `src/components/predictions/*` verticals (which currently use mock
  data — swap the data layer for Azuro hooks).
- Bets are placed **directly on-chain** through Azuro (per-bet `approve` + bet tx). This is a
  **different flow** from the casino fast loop — that's expected and acceptable for sports/predictions.
- Chains: use an Azuro-supported chain that aligns with our casino chain where possible (confirm
  current deployments in Azuro docs; Base/Polygon/Gnosis have been supported).

## Bet history — read from the chain (Azuro subgraph)
- Sports/prediction bets are **fully on-chain**, so history is reconstructable **without our own DB**.
- Read it from **Azuro's subgraph (GraphQL)** by wallet address — do NOT scan the chain raw.
- Show each bet with a **block-explorer link** ("fully on-chain — verify"). Optionally cache per address
  for a fast merged "My Bets" view. Full page spec + the casino/sports trust-model contrast is in `15`.

## Both verticals are on-chain (WINR + Azuro)
Under the WINR + Azuro pivot, **both** verticals settle on-chain and are non-custodial:
- **Casino:** WINR Protocol (on-chain, WINR VRF, shared bankroll) — see `07`.
- **Sports/Predictions:** Azuro (on-chain, shared liquidity) — this doc.

**Unify at the display layer only.** The frontend shows one USD balance = WINR (casino) balance +
Azuro-chain wallet balance. Casino and sports may be on **different chains** (WINR L3 vs Azuro chain), so
reconcile via bridging (LI.FI) and a switch/bridge CTA when entering a vertical (`03`, `10`). Keep each
vertical native to its protocol — do not route one through the other.

## Revenue & securing the affiliate address (build detail)
- Azuro apps/frontends earn an **affiliate GGR share** on volume they source (see `19` for the
  economics: ~70% of attributable app revenue, capped by `50% × spread × bet size`).
- The **affiliate wallet address** is a field in the EIP-712 **`ClientBetData`** (with `amount`, `nonce`,
  `conditionId`, `outcomeId`, `minOdds`, `expiresAt`, `chainId`, `relayerFeeAmount`, `affiliate`). Bets
  flow: player signs `ClientBetData` → Azuro oracle (`POST /orders`) → oracle signs → Relayer `betFor`.

### Anti-substitution rules (MUST — see `19`, `14` T9)
- The address is **public on-chain, not a secret** — the goal is preventing substitution, not hiding it.
- Store it in **server env `AZURO_AFFILIATE_ADDRESS`**; **never** accept an affiliate value from the client.
- **Proxy order submission through our backend.** The backend **sets/overwrites `affiliate` to our
  address** and **rejects any order whose `affiliate` ≠ ours** before forwarding to Azuro's `POST /orders`.
- Register with Azuro's **affiliate-tracker**; monitor attributed on-chain volume vs. expected.
- Residual: a user can bypass our app and bet directly on Azuro with their own affiliate — unpreventable
  on a permissionless protocol, and not theft (we simply don't earn on bets we didn't source).

## Open items to confirm at build time
- Current Azuro chain deployments + which to target.
- Exact SDK version + hook APIs (pin versions).
- Whether AzuroGames is worth surfacing as extra "instant" markets or skipped in favour of `07`.

## Acceptance criteria
- A user can place a non-custodial sports bet via Azuro from `apps/web` and see it settle on-chain.
- A prediction market bet works end-to-end via Azuro.
- The unified balance correctly reflects both casino (ledger) and Azuro (on-chain) balances.

_Last updated: 2026-07-01_
