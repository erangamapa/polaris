# 07 — Casino via BetSwirl Protocol

> Casino runs on **BetSwirl** — an on-chain, non-custodial, **permissionless** casino protocol with a
> **shared bankroll** (we fund nothing) and **Chainlink VRF** randomness. This replaces the earlier
> WINR/custom-stack ideas. Verified against BetSwirl's live SDK/docs.

## What BetSwirl gives us
- **Shared bankroll** — LP-funded on-chain; pays all winners. We fund nothing.
- **Chainlink VRF** — provably-fair on-chain randomness (the SDK exposes `getChainlinkVrfCost`).
- **Public SDKs (permissionless, no approval, no contract):**
  - `@betswirl/sdk-core` (v0.1.27) — viem-based: `initViemBetSwirlClient()`, `playDice()`,
    `getCasinoGames()`, `getPlaceBetFunctionData()`.
  - `@betswirl/wagmi-provider` — wagmi integration.
  - **`@betswirl/ui-react`** — ready-made **React game UI widgets** (solves game screens + reduces the
    art we must build).
  - Peer deps: `viem`, `@apollo/client` (subgraph reads).
- **Audited** (Paladin), non-custodial, EVM. Contracts share the **same address across chains**.
- Docs: https://docs.betswirl.com · SDK: https://github.com/BetSwirl/sdk

## Chains & the co-location decision
- Casino runs on **Base Sepolia (testnet)** — deliberately the **same chain as Azuro sports** so the
  player funds **one chain**, no bridging (see `03`, `08`). BetSwirl also supports Polygon Amoy, Arbitrum
  Sepolia, Avalanche Fuji, BNB testnet (fallback options).
- Mainnets (later, out of scope): Arbitrum, Avalanche, Base, BNB, Polygon.

## Games (BetSwirl catalog)
- **Solo/house (confirmed on-chain contracts + SDK):** Dice, Coin Toss, Roulette, Keno.
- **Also listed:** Wheel, Plinko, Weighted Game (custom-odds).
- **PvP:** Coin Toss Battle, Russian Roulette, Backgammon. Plus Lottery / Video Poker.
- All are crypto "originals" (Stake-style), **not** branded studio slots (`09`).

## ⚠️ Per-bet gas + popup (the key UX reality)
Each casino bet is an **on-chain transaction**:
- Costs **native gas + a Chainlink VRF fee**, and triggers a **MetaMask confirmation per bet**.
- Result arrives on the **VRF callback** (seconds) — not instant.
- So **rapid autoplay = a popup + gas + short wait each round.** The old off-chain "1000 spins/min, no
  popup" loop does **not** exist here — that's the price of non-custodial + no-bankroll + no-contracts.
- **Discovery item:** confirm whether BetSwirl offers any **gasless / session / batched** bet mode to
  reduce per-bet popups; if not, we accept per-bet gas for the testnet build.

## Bet flow (headless-verifiable via viem)
```
1. Build BetSwirl client: initViemBetSwirlClient(publicClient, walletClient, { affiliate: '0x<ours>' }).
2. Place a bet: viemBetSwirlClient.playDice(77, ...) (or getPlaceBetFunctionData() for encoded tx).
3. Bet is an on-chain tx (native gas + VRF fee). Chainlink VRF resolves the outcome.
4. Shared bankroll pays winners on-chain.
5. Balance/history read from the BetSwirl subgraph (Apollo/GraphQL).
```
The affiliate address is a **config field** on the client — how our commission is attributed (see `19`).

## Revenue (see `19`)
- House edge **2.4–4%**, split on-chain (Bank / Partner / **Affiliate** / Dividends / Treasury / Team).
- As affiliate/partner we **set the house edge** and **claim revenue trustlessly on-chain** to our wallet
  — **no registration, no approval**. (Contrast Azuro sports, which needs registration — `19`.)

## UI & assets
- `@betswirl/ui-react` provides **game components** — use them directly, or render games in our existing
  lobby (`src/components/casino/*`, `GameTile.jsx`).
- **Lobby tiles/thumbnails:** use catalog metadata if present, else generate via **tilecraft**
  (`github.com/erangamapa/tilecraft`), else house-designed. Existing tile UI unchanged.

## Open items to confirm in Discovery (Phase 0.5) — see `23`
1. Exact **testnet betting token(s)** on Base Sepolia + **faucet**.
2. **Testnet bankroll has liquidity** to pay winners (read on-chain; else switch to a funded testnet).
3. **Gasless / session** bet option (to soften per-bet popups) — yes/no.
4. Per-game **SDK function coverage** (playCoinToss/playRoulette/playKeno, etc.) + which games on the chosen chain.
5. **Subgraph endpoint** (Apollo) for balance + history on the chosen chain.
6. **Affiliate claim** method (contract call) for withdrawing revenue.

## Acceptance criteria (testnet)
- Connect wallet on Base Sepolia → play a BetSwirl game end-to-end from the player's own wallet; bet is an
  on-chain tx (gas + VRF), settles via shared bankroll, affiliate attributed to us — **verified headless
  via viem** (`22`), no bankroll from us.
- Lobby renders games (BetSwirl UI widgets or our tiles); balance + history from the subgraph.

_Last updated: 2026-07-01_
