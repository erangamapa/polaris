# 00 — Overview, Vision & Model

> **ARCHITECTURE: BetSwirl + Azuro integrator (full on-chain).** TriBet is a frontend + thin backend
> that integrates two proven on-chain protocols. We provide **no bankroll** and sign **no game-provider
> contracts**. This supersedes the earlier custom-stack design (Vault + session keys + seamless-wallet +
> own provably-fair games), which is retained only as historical context in `03`/`04`/`05`/`06`/`07`
> (marked SUPERSEDED).

## Vision

TriBet (repo codename **polaris**) is a **three-in-one, fully on-chain, non-custodial**
entertainment platform (testnet build) — **Casino**, **Prediction Market**, **Sportsbook** — under one wallet and one
unified balance. Players connect their own wallet and play; funds never touch a TriBet-controlled
wallet.

## The core principle: we are an integrator, not the house

We do **not** build custody, bankroll, randomness, settlement, or game content. Two on-chain protocols
provide all of that; we build the product experience on top and earn a commission on volume.

| Vertical | Protocol | Provides |
|---|---|---|
| **Casino** | **BetSwirl** | shared bankroll, Chainlink VRF randomness, on-chain settlement, catalog of games |
| **Sports / Predictions** | **Azuro Protocol** | shared liquidity, odds/data feeds, on-chain settlement, markets |

Both are **non-custodial, on-chain, shared-liquidity, provably fair**. Result: a fully on-chain
platform with **zero bankroll** from us and **zero provider contracts**.

## Why this model (the two hard requirements it satisfies)

1. **No liquidity / bankroll from us.** BetSwirl's shared pool (LP-funded) and Azuro's shared pool cover all
   player payouts. We route bets; the protocols carry the risk. BetSwirl: *"no fixed costs or capital
   requirements to get started."*
2. **No contracts with game providers.** BetSwirl integration is permissionless (SDK, no B2B agreement, no
   whitelist). Azuro is likewise permissionless. Contrast: branded studio slots (Pragmatic/Evolution)
   would need contracts — deliberately **out of scope** (`09`).

## What we build vs what we consume

**🏗️ In-house (thin):**
- Frontend (the existing React app) — lobby, wallet connect, unified balance, bet history, 3 verticals.
- **Thin backend** (Vercel functions) — read-only aggregation (unified balance + bet history from
  on-chain indexers), affiliate-address injection, and session tokens for UX.
  **No custody, no ledger-of-record, no settlement, no RNG.**
- Protocol integrations (BetSwirl SDK, Azuro SDK) + wallet connect (Reown/wagmi/viem).

**🔌 Consumed (protocols + infra):** BetSwirl (casino: bankroll/VRF/settlement/games) · Azuro (sports:
liquidity/odds/settlement/markets) · Reown (wallet UI) · Vercel (hosting + thin backend) · RPC
(Arbitrum/BetSwirl) · LI.FI (cross-chain bridging for unified balance).

## Everything is on-chain now (important consequence)

Because **both** verticals settle on-chain, **bet history for both is on-chain** and read from indexers
(BetSwirl subgraph + Azuro subgraph). This flips the earlier design where casino rounds were off-chain and
had to be stored by us. We now store almost nothing of record (see `15`).

## Chains & currency (co-located on ONE chain)

- **Casino (BetSwirl) and Sports (Azuro) both run on Base Sepolia (testnet).** They deliberately share
  **one chain**, so the player funds a single chain — **no bridging, one unified balance**. See `03`, `08`.
- Bets use that chain's supported **betting token** (a test token on Base Sepolia; exact token confirmed
  in Discovery `23` — aligned to one token where possible).
- Both are non-custodial: funds stay in the player's wallet.

## ⚠️ Per-bet mechanics (know this up front)
- **Casino (BetSwirl):** each bet is an **on-chain transaction → native gas + a Chainlink VRF fee + a
  MetaMask confirmation per bet**, result on VRF callback (seconds). No off-chain "no-popup autoplay" —
  that's the price of non-custodial + no-bankroll. (Discovery: check for a gasless/session mode.)
- **Sports (Azuro):** **gasless** — the player just **signs** an order; a relayer submits it (relayer fee
  taken from the bet token). No native gas per bet.

## Revenue (see `19`)

- **Casino (BetSwirl):** ~**30% of house edge** (edge 2.4–4%), **claimed trustlessly on-chain** to our
  wallet — **no registration**.
- **Sports (Azuro):** **affiliate GGR share** (~70% of attributable app revenue, capped) — but payout
  requires **registering with Azuro** (a form + monthly payout), a mainnet/real-money-only human step.
- We earn a share of player volume; the protocols' LPs are the house.

## Scope: testnet only

- This is a **testnet end-to-end** build — connect a wallet, play with **testnet funds**, no real money.
- **Tech/infra:** effectively **free** (Vercel free tier, permissionless protocols, free testnet faucets).
- **Out of scope (deferred, not part of this build):** mainnet, real-money operation, gaming licence,
  KYC, and geoblocking.

## Glossary

- **Integrator/operator** — us: the frontend that sources players and earns commission.
- **BetSwirl** — permissionless on-chain casino protocol (shared bankroll + Chainlink VRF + settlement + games).
- **Azuro Protocol** — on-chain betting infra (liquidity + odds + settlement) for sports/predictions.
- **Shared bankroll** — protocol-level LP-funded pool that pays winners; not funded by us.
- **Chainlink VRF** — BetSwirl's on-chain verifiable randomness (provably fair, <300ms).
- **Non-custodial** — players hold their own funds in their own wallet; we never take custody.
- **Affiliate address** — a wallet we control that on-chain volume is attributed to for revenue.

_Last updated: 2026-07-01_
