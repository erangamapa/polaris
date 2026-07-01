# 23 — Open Items & Discovery

> The pre-build gate. Much of this is **already resolved** (marked ✅ from live-doc discovery). What
> remains (❓) is a short list the agent confirms in the **first minutes of the build** (Phase 0.5) via
> viem/RPC/SDK — mostly "is the testnet actually funded/reachable." If a ❓ turns into a blocker, the
> agent reports **then**, before building further.

Legend: `✅` confirmed · `❓` confirm at kickoff · `⚠️` needs-user.

## ✅ Already confirmed (from discovery)

**BetSwirl (casino)**
- ✅ Permissionless — **no approval, no contract, no bankroll** ("no approval needed to build your app").
- ✅ SDK: **`@betswirl/sdk-core` v0.1.27** + `viem` + `@apollo/client`; `@betswirl/wagmi-provider`;
  **`@betswirl/ui-react`** (ready React game widgets).
- ✅ Bet flow (headless): `initViemBetSwirlClient(pub, wallet, { affiliate })` → `playDice(...)` /
  `getPlaceBetFunctionData()`.
- ✅ Randomness: **Chainlink VRF** (`getChainlinkVrfCost` in SDK). **Per-bet = on-chain tx (gas + VRF + a
  MetaMask confirm).**
- ✅ Games: Dice, Coin Toss, Roulette, Keno (+ Wheel, Plinko, Weighted; PvP: Coin Toss Battle, Russian
  Roulette, Backgammon).
- ✅ Chains incl. **Base Sepolia** testnet; contracts share the same address across chains.
- ✅ Revenue: affiliate = config field; ~**30% of house edge**; **claim on-chain, no registration**.

**Azuro (sports/predictions)**
- ✅ Permissionless SDK **`@azuro-org/sdk`** (+ Toolkit); `createBet`/`createComboBet`; example app.
- ✅ Bet flow: EIP-712 `ClientBetData` (affiliate field) → oracle `POST /orders` → relayer `betFor` —
  **gasless** (player signs; relayer fee from bet token).
- ✅ Testnets incl. **Base Sepolia** and Polygon Amoy → **co-locate with BetSwirl on Base Sepolia**.
- ✅ History from **Azuro subgraph** (GraphQL).
- ✅ Revenue: attribution on-chain; **payout requires registration with Azuro + monthly** (human,
  mainnet-only — `19`).

**Architecture**
- ✅ **Both verticals on Base Sepolia — one chain, one wallet balance, no bridging.**
- ✅ Wallet needs on that one chain: **native gas** (for BetSwirl bets + VRF) + **the betting token**.
- ✅ GitHub + Vercel authed; only human bootstrap = `VITE_REOWN_PROJECT_ID` (+ optional CDP).

## ❓ Confirm at kickoff (first minutes, via viem/RPC/SDK)

1. **BetSwirl testnet betting token on Base Sepolia** + faucet (which ERC-20 / native the bankroll uses).
2. **BetSwirl testnet bankroll has liquidity** to pay winners (read on-chain; if empty, switch to a funded
   testnet e.g. Polygon Amoy).
3. **BetSwirl gasless/session mode?** (to soften per-bet popups) — yes/no; else accept per-bet gas.
4. **BetSwirl subgraph endpoint** (Apollo) for balance/history on the chosen chain.
5. **Per-game SDK coverage** on the chosen chain (which `play*` functions/games are live there).
6. **Azuro on Base Sepolia specifics:** exact SDK version, subgraph URL, oracle `/orders` endpoint,
   EIP-712 domain, **pool token + faucet**, redeem/claim method, prediction-market coverage.
7. **Shared betting token:** can casino + sports use **one token** (e.g. USDC) on Base Sepolia, or two?
8. **RPC** for Base Sepolia (public or Alchemy) — `eth_blockNumber` reachable.

## ⚠️ Needs-user (not blocking testnet)
- Azuro affiliate **payout registration** (mainnet/real-money only) — a form with Azuro's team (`19`).

## Discovery output (Phase 0.5 deliverable)
- This file: every ❓ → ✅/⚠️; `packages/shared/chains.ts` populated (Base Sepolia params, tokens, RPC,
  subgraph URLs); SDK versions pinned; a smoke check (RPC up, subgraphs respond, a headless test bet on
  each protocol) green. If a ❓ blocks, **report before building**.

_Last updated: 2026-07-01_
