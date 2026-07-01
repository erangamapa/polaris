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

## ✅ Confirmed at kickoff (Discovery run 2026-07-01, via viem/RPC/SDK)

1. ✅ **BetSwirl betting token** = **native ETH** (`bank.getTokens` -> `[ETH @ 0x0]`). Faucet = CDP
   (proven: real drips landed). Bank `0x637D…2021`.
2. ✅ **BetSwirl bankroll liquidity** = bank holds **~0.099 ETH** on Base Sepolia — enough to pay small
   testnet wins. (Auto-route to Polygon Amoy only if it empties.)
3. ✅ **No gasless/session mode** — accept **per-bet gas + VRF**. VRF cost read live = **~0.0000000718
   ETH/bet** (negligible); so per-bet cost ≈ gas + tiny VRF. Per-bet MetaMask confirm stands.
4. ⚠️ **BetSwirl subgraph** (`api.studio.thegraph.com/query/80936/betswirl-base-sepolia-v2/v0.1.3`)
   returns **"Not found"** — used only for aggregated history (Phase 6). Bet placement/settlement read
   directly from chain (VRF receipts), so **not blocking**. Revisit endpoint for history.
5. ✅ **Per-game coverage** on Base Sepolia: dice, coin-toss, roulette, keno, wheel, plinko
   (+ weighted). Addresses pinned in `packages/shared/chains.js`.
6. ✅ **Azuro Base Sepolia** = env **`BaseSepoliaWETH`**. SDK `@azuro-org/sdk@7.4.1` /
   `@azuro-org/toolkit@6.3.1`. Contracts lp/core/relayer/azuroBet/cashout pinned. Bets subgraph **live**
   (block synced to chain head); feed has **future/bettable games** (e.g. 2027-03). API +
   socket endpoints pinned.
7. ✅ **Not one shared token — two, both ETH-denominated:** BetSwirl = **native ETH**, Azuro = **WETH**
   (`0x9e09…935f`). Same chain; fund ETH then **wrap** some to WETH. No bridging.
8. ✅ **RPC** `https://sepolia.base.org` — `eth_blockNumber` reachable (fallback: publicnode).

## ⚠️ Needs-user (not blocking testnet)
- Azuro affiliate **payout registration** (mainnet/real-money only) — a form with Azuro's team (`19`).

## Discovery output (Phase 0.5 deliverable)
- This file: every ❓ → ✅/⚠️; `packages/shared/chains.ts` populated (Base Sepolia params, tokens, RPC,
  subgraph URLs); SDK versions pinned; a smoke check (RPC up, subgraphs respond, a headless test bet on
  each protocol) green. If a ❓ blocks, **report before building**.

_Last updated: 2026-07-01_
