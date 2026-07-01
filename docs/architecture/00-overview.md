# 00 — Overview, Vision & The Gap We Bridge

## Vision

Polaris is a **three-in-one, non-custodial, on-chain** real-money entertainment platform:
**Casino**, **Prediction Market**, **Sportsbook** under one wallet and one unified balance.

Core principle: **the player owns their funds at all times.** We never take custody. Funds live in
the player's wallet or in a smart-contract vault only the player can withdraw from. We provide the
game logic, the speed, and the UX — not the custody.

## The three models (why ours is different)

| Model | Custody | Speed (casino) | Example | Verdict |
|---|---|---|---|---|
| **Custodial crypto casino** | ❌ House holds funds, signup required | ✅ Fast | Stake, BC.Game, Rollbit | Not what we're building |
| **Pure on-chain casino** | ✅ Non-custodial | ⚠️ Slow — every bet is an on-chain tx (+ VRF) | **BetSwirl**, Azuro, SX Bet | Trustless but sluggish for rapid spins |
| **Polaris (target)** | ✅ Non-custodial | ✅ Fast — session keys + off-chain rounds + net on-chain settle | *(underserved gap)* | Our differentiator |

## The gap we bridge (what BetSwirl et al. do NOT do)

**BetSwirl** proved a non-custodial, provably-fair, connect-wallet casino works — but it puts
**every bet on-chain** with a Chainlink VRF callback per wager. That is maximally trustless but:
- Slow (block time + VRF latency per spin)
- Gas-costly per round
- Poor UX for high-frequency casino play (slots, turbo autoplay)

**The gap:** almost nobody combines **non-custodial + casino-fast**. The enabling technology
(**account-abstraction session keys** — ERC-4337 and ERC-7702) only matured in **2024–2025**, so
the market hasn't caught up.

**How Polaris bridges it (with 2025/26 tech):**
- **Session keys** (thirdweb / ERC-4337 / ERC-7702, or Coinbase Spend Permissions) → one approval,
  then bets are signed automatically within a capped, time-boxed scope. No popup per round.
- **Off-chain provably-fair rounds** (commit-reveal) → web-speed resolution, verifiable fairness.
- **Net on-chain settlement** → 40 spins collapse into ~1 on-chain transaction.
- **Non-custodial vault** → funds governed by code, player-withdrawable unilaterally.

Result: **the trustlessness of BetSwirl with the speed of Stake.**

## Not only crypto — and not only one chain

- **Currency-agnostic backend.** The seamless-wallet ledger doesn't care what backs a balance:
  real USDC, testnet USDC, or pure demo credits. Same code, different backing (see `05`).
- **Multi-chain by design.** EVM chains (Base first; Ethereum/Arbitrum/Optimism/Polygon/BNB/Avalanche
  via config + redeploy) are first-class. Solana and Bitcoin are documented as separate future
  tracks (see `03`). One unified ledger balance across all chains.
- **Fiat on-ramp** is a later add (buy USDC with card via a provider) — out of MVP scope, noted in `11`.

## Division of labour (build vs buy)

**🏗️ In-house (our IP / moat):** Vault contract · seamless-wallet backend · provably-fair engine ·
ledger · deposit-watcher & settlement · own casino games · frontend integration.

**🔌 Third-party (rented commodity):** chain (Base) · USDC (Circle) · session keys/AA (thirdweb) ·
bundler/paymaster · RPC · wallet-connect UI (Reown) · hosting/DB (Vercel) · Foundry ·
Chainlink VRF (optional) · Azuro (sports/predictions engine) · studio game content (optional).

Rule: **own everything that touches money-logic and game-logic; rent undifferentiated infra.**

## Glossary

- **Non-custodial** — the operator never holds the private keys to player funds.
- **Vault** — smart contract holding deposited funds; player can always withdraw.
- **Session key** — a temporary, scoped signing key that can place bets within limits without a
  per-action wallet popup.
- **Seamless wallet** — the industry-standard callback API where a game asks the backend for balance
  and reports bet/win; backend is the single source of truth.
- **RGS** — Remote Game Server; runs game rounds and calls the seamless-wallet API.
- **Ledger** — off-chain balance store (source of truth for live play), backed by on-chain vault.
- **Provably fair** — commit-reveal scheme letting players verify the house didn't cheat.
- **Net settlement** — reconciling a whole session's result to the chain in one transaction.
- **AA** — Account Abstraction (ERC-4337 / ERC-7702).
- **Azuro** — decentralized on-chain betting protocol used for our Sports & Predictions verticals.

_Last updated: 2026-07-01_
