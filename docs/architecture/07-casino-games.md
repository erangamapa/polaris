# 07 — Casino via WINR Protocol

> Casino runs on **WINR Protocol** — on-chain, shared bankroll, WINR VRF, permissionless. This doc is
> the integration spec + the **things to confirm in Discovery (Phase 0.5)** before building, so we don't
> hit surprises mid-build.

## What WINR gives us

- **Bankroll-as-a-Service** — shared LP-funded on-chain bankroll pays all winners. We fund nothing.
- **WINR VRF** — on-chain verifiable randomness (provably fair, ~<300ms, ~1s finality).
- **Game catalog** — on-chain games + a growing creator catalog we can list.
- **Permissionless** — SDK; no B2B contract, no whitelist, no fixed cost; operators never custody funds.
- **WINR Chain** (L3 on Arbitrum, Orbit). Bets settle in the **WINR** chip; player **USDC auto-swapped**;
  UI shows USD.

Docs: https://docs.winr.games · Operators: https://docs.winr.games/for-operators ·
JustBet: https://www.just.bet · Repos: https://github.com/winrprotocol (Solidity: JustBet, WINR_Protocol)

## What WINR serves vs what WE build (avoid surprises)

| Concern | WINR / creator serves | We build / source |
|---|---|---|
| Bet settlement, payout, bankroll | ✅ on-chain | — |
| Randomness (VRF) | ✅ | — |
| Game logic contracts | ✅ | — |
| Game catalog **metadata** (name, id, category) | ✅ likely (catalog) — **CONFIRM** | map into lobby |
| Playable game **UI/embed** (the actual game screen) | ✅ likely (creator-built game) — **CONFIRM embed/launch mechanism** | host/frame it |
| Lobby **tile / thumbnail art** | ⚠️ **NOT confirmed served** | **we source** (see below) |
| Sport/casino lobby, search, balance, history | — | ✅ (existing app) |
| Wallet connect, chain switching, affiliate attach | — | ✅ |

> Public WINR repos are Solidity (contracts); docs describe *"the game computes the outcome, settlement
> sent to WINR."* So WINR is the **settlement/bankroll/RNG + game-logic** layer. Whether the creator
> catalog ships **tile art / playable embeds** must be confirmed in Discovery.

## Game assets & tiles (explicit plan)

Because tile art likely isn't served:
1. **If the WINR catalog exposes art/metadata** → use it directly.
2. **Else generate tiles with `tilecraft`** (`github.com/erangamapa/tilecraft` — AI portrait game-tile
   generator from provider assets) using WINR game names/assets.
3. **Else** design a small set of house tiles for the initial catalog.
The existing `src/components/casino/GameTile.jsx` + lobby already render portrait tiles — only the image
source changes.

## Games catalog (WINR / JustBet originals)
Dice · Roulette · Blackjack · Baccarat · Slots (incl. AI-built) · Plinko · Crash · Wheel · Keno ·
Coin Flip · Limbo · Mines · Roll · + creator catalog. (Originals, **not** branded studio slots — `09`.)

## Integration surface (to implement in `apps/web`)
- Add the **WINR SDK** (confirm exact npm package + version in Discovery) and/or interact with WINR
  contracts via **viem**.
- Wallet connect via Reown/wagmi/viem; ensure player is on **WINR Chain** (add via
  `wallet_addEthereumChain`; switch/bridge CTA — `03`, `10`).
- Render the catalog in the existing lobby; launch/embed the playable game (mechanism per Discovery).
- Attach our **WINR affiliate/referrer identifier** to sourced bets; enforce server-side (`19`, `14`).
- Reflect on-chain balance + results via the WINR indexer (`15`).

## Payout, funding & UX (CONFIRM in Discovery)
- **Funding:** USDC deposit → auto-swap to WINR chip. Confirm the exact deposit flow + whether we
  trigger it or WINR's widget does.
- **Payouts:** confirm winnings are **auto-credited on settlement** (vs a claim step).
- **Autoplay / rapid rounds:** confirm whether rapid play needs a **signature per bet** or a
  **session/gasless** UX on the L3 (the old off-chain session-key loop is gone). This drives casino UX.

## Open items to confirm in Discovery (Phase 0.5) — RESOLVE BEFORE BUILDING
1. Exact **WINR SDK** package + version + API (or contract ABIs for viem).
2. **WINR Chain testnet**: chainId, RPC URL, currency symbol, explorer, **faucet**.
3. **Game launch/embed** mechanism (hosted URL? iframe? render component?) + origin for postMessage.
4. **Catalog access**: does it expose metadata? art? per-game IDs? how to list?
5. **Affiliate/referrer** mechanism + identifier format (how commission attribution is set on a bet).
6. **Bet submission** path (SDK method vs direct contract call via viem) — so headless API verification
   (`22`) can place a real testnet bet.
7. **Payout model** (auto vs claim) and **USDC→WINR** swap step.
8. **Autoplay/session UX** (popup-per-bet vs session/gasless).
9. **WINR indexer / query** endpoint for balance + bet history (`15`).
10. **Tile/asset availability** (else tilecraft fallback).

## Acceptance criteria (testnet)
- Connect wallet → be on WINR Chain → play a WINR catalog game end-to-end from the player's own wallet;
  bet settles on-chain (VRF), payout received, affiliate attributed — **verified headless via viem/SDK**
  (`22`), no bankroll from us.
- Lobby shows tiles (served or tilecraft-generated); balance + history read from the WINR indexer.

_Last updated: 2026-07-01_
