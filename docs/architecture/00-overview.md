# 00 — Overview, Vision & Model

> **ARCHITECTURE: WINR + Azuro integrator (full on-chain).** WildStakes is a frontend + thin backend
> that integrates two proven on-chain protocols. We provide **no bankroll** and sign **no game-provider
> contracts**. This supersedes the earlier custom-stack design (Vault + session keys + seamless-wallet +
> own provably-fair games), which is retained only as historical context in `03`/`04`/`05`/`06`/`07`
> (marked SUPERSEDED).

## Vision

WildStakes (repo codename **polaris**) is a **three-in-one, fully on-chain, non-custodial**
entertainment platform (testnet build) — **Casino**, **Prediction Market**, **Sportsbook** — under one wallet and one
unified balance. Players connect their own wallet and play; funds never touch a WildStakes-controlled
wallet.

## The core principle: we are an integrator, not the house

We do **not** build custody, bankroll, randomness, settlement, or game content. Two on-chain protocols
provide all of that; we build the product experience on top and earn a commission on volume.

| Vertical | Protocol | Provides |
|---|---|---|
| **Casino** | **WINR Protocol** (JustBet infra) | shared bankroll, WINR VRF randomness, on-chain settlement, catalog of games |
| **Sports / Predictions** | **Azuro Protocol** | shared liquidity, odds/data feeds, on-chain settlement, markets |

Both are **non-custodial, on-chain, shared-liquidity, provably fair**. Result: a fully on-chain
platform with **zero bankroll** from us and **zero provider contracts**.

## Why this model (the two hard requirements it satisfies)

1. **No liquidity / bankroll from us.** WINR's shared pool (LP-funded) and Azuro's shared pool cover all
   player payouts. We route bets; the protocols carry the risk. WINR: *"no fixed costs or capital
   requirements to get started."*
2. **No contracts with game providers.** WINR integration is permissionless (SDK, no B2B agreement, no
   whitelist). Azuro is likewise permissionless. Contrast: branded studio slots (Pragmatic/Evolution)
   would need contracts — deliberately **out of scope** (`09`).

## What we build vs what we consume

**🏗️ In-house (thin):**
- Frontend (the existing React app) — lobby, wallet connect, unified balance, bet history, 3 verticals.
- **Thin backend** (Vercel functions) — read-only aggregation (unified balance + bet history from
  on-chain indexers), affiliate-address injection, and session tokens for UX.
  **No custody, no ledger-of-record, no settlement, no RNG.**
- Protocol integrations (WINR SDK, Azuro SDK) + wallet connect (Reown/wagmi/viem).

**🔌 Consumed (protocols + infra):** WINR (casino: bankroll/VRF/settlement/games) · Azuro (sports:
liquidity/odds/settlement/markets) · Reown (wallet UI) · Vercel (hosting + thin backend) · RPC
(Arbitrum/WINR) · LI.FI (cross-chain bridging for unified balance).

## Everything is on-chain now (important consequence)

Because **both** verticals settle on-chain, **bet history for both is on-chain** and read from indexers
(WINR indexer + Azuro subgraph). This flips the earlier design where casino rounds were off-chain and
had to be stored by us. We now store almost nothing of record (see `15`).

## Chains & currency (multi-chain)

- **Casino → WINR Chain** (an L3 on Arbitrum, Orbit stack). Bets settle in the **WINR** chip; player
  **USDC deposits are auto-swapped to WINR**, UI shows USD.
- **Sports → Azuro** on a supported chain (Arbitrum / Polygon / Gnosis / Base etc.); bets settle in that
  chain's pool token (USDT/USDC/WXDAI…).
- Casino and sports may live on **different chains** → unified balance via bridging (LI.FI). See `03`.

## Revenue (see `19`)

- **Casino:** WINR **commission** on sourced volume + **vWINR** emissions. No bankroll, no full edge.
- **Sports:** Azuro **affiliate GGR share** (~70% of attributable app revenue, capped).
- We earn a share of player volume; the protocols' LPs are the house.

## Scope: testnet only

- This is a **testnet end-to-end** build — connect a wallet, play with **testnet funds**, no real money.
- **Tech/infra:** effectively **free** (Vercel free tier, permissionless protocols, free testnet faucets).
- **Out of scope (deferred, not part of this build):** mainnet, real-money operation, gaming licence,
  KYC, and geoblocking.

## Glossary

- **Integrator/operator** — us: the frontend that sources players and earns commission.
- **WINR Protocol** — on-chain casino infra (bankroll + VRF + settlement + game catalog); powers JustBet.
- **Azuro Protocol** — on-chain betting infra (liquidity + odds + settlement) for sports/predictions.
- **Shared bankroll** — protocol-level LP-funded pool that pays winners; not funded by us.
- **WINR VRF** — WINR's on-chain verifiable randomness (provably fair, <300ms).
- **Non-custodial** — players hold their own funds in their own wallet; we never take custody.
- **Affiliate address** — a wallet we control that on-chain volume is attributed to for revenue.

_Last updated: 2026-07-01_
