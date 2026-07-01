# 07 — Casino via WINR Protocol

> **This replaces the earlier in-house casino** (own provably-fair games + seamless-wallet + Vault +
> session keys). The casino now runs on **WINR Protocol** — on-chain, shared bankroll, no contracts.

## What WINR gives us

- **Bankroll-as-a-Service** — a shared, LP-funded on-chain bankroll pays all winners. **We fund nothing.**
- **WINR VRF** — on-chain verifiable randomness (provably fair, resolves <300ms, ~1s finality).
- **Game catalog** — ready on-chain games we can list, plus a growing creator catalog.
- **Permissionless integration** — SDK; no B2B contract, no whitelist, no fixed cost. Operators never
  custody player funds.
- Runs on **WINR Chain** (L3 on Arbitrum, Orbit). Bets settle in the **WINR** chip; player **USDC is
  auto-swapped to WINR**; UI shows USD.

Docs: https://docs.winr.games · Operators: https://docs.winr.games/for-operators · JustBet (reference
casino built on WINR): https://www.just.bet · SDK/repos: https://github.com/winrprotocol

## Games available (WINR / JustBet catalog)

Crypto-native "originals" (Stake-style), all on-chain:
**Dice · Roulette · Blackjack · Baccarat · Slots (incl. AI-built slots) · Plinko · Crash · Wheel · Keno ·
Coin Flip · Limbo · Mines · Roll** — plus a growing **creator catalog**.

⚠️ These are originals, **not** branded studio slots (Pragmatic/Evolution). Branded content needs
contracts and is out of scope — see `09`.

## Two integration modes

1. **List existing catalog games** (default, fastest) — surface WINR/creator games in our lobby; bets
   route to WINR contracts; bankroll + VRF + settlement handled by the protocol.
2. **Build our own games on the WINR engine/SDK** (optional, later) — more control, still uses WINR's
   bankroll + VRF. New custom games may require a WINR DAO proposal to plug into the shared pool.

MVP uses mode 1.

## Integration surface (to implement in `apps/web`)

- Add the **WINR SDK** (confirm exact package + version at build time from docs.winr.games).
- Wallet connect via Reown/wagmi/viem; ensure the player is on **WINR Chain** (show a switch/bridge CTA
  if not — see `03`, `10`).
- Render the WINR game catalog in the existing lobby UI (reuse `GameLauncher`/lobby components).
- Attach our **WINR affiliate/referrer identifier** to sourced bets so commission routes to us
  (see `19`; enforce server-side per `14`).
- Reflect on-chain balance + results in the UI (reads via WINR indexer; see `15`).

## Player funding & UX

- Player deposits USDC (auto-swapped to WINR chip) per WINR's flow; funds stay non-custodial.
- **Autoplay / rapid rounds:** WINR advertises <300ms VRF + ~1s finality on its L3. **Verify at build
  time** whether rapid autoplay needs a signature per bet or uses a session/gasless UX — this is the one
  UX property to confirm (the old off-chain session-key loop is gone). Document findings here.

## Reuse of existing UI

The current casino lobby (`src/components/casino/*`, `GameLauncher.jsx`) becomes the host UI for WINR
games instead of mock/own games. Keep the look; swap the data/bet layer for the WINR SDK.

## What is NOT needed anymore (removed)

- ❌ Own provably-fair engine (`06`) — WINR VRF replaces it.
- ❌ Seamless-wallet `/wallet/*` backend + ledger (`05`) — no custody; WINR settles on-chain.
- ❌ Vault + session keys (`03`/`04`) — WINR is non-custodial and handles bet UX.
- ❌ Our own games + iframe seamless protocol.

## Acceptance criteria

- A player can connect a wallet, be on WINR Chain, and play a WINR catalog game end-to-end on **testnet**
  with funds from their own wallet — no WildStakes custody, no bankroll from us.
- Bets settle on-chain via WINR; outcomes are provably fair (WINR VRF).
- Our affiliate identifier is attached to sourced bets (commission attribution verified).
- Balance + history reflect on-chain state.

## Open items to confirm at build time

- Exact WINR SDK package/version + integration API.
- WINR affiliate/referrer mechanism + identifier format (how commission attribution is set).
- Autoplay/session UX (signature-per-bet vs session/gasless).
- Current WINR testnet + faucet details; WINR Chain RPC.

_Last updated: 2026-07-01_
