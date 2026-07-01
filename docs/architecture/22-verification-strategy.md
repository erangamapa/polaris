# 22 — Verification Strategy (API-level, incremental)

> **Verify connectivity at the API / RPC / SDK level, incrementally, as each piece is built — never a big
> browser test at the end.** Catch a broken RPC, unreachable protocol, failed bet, or missing affiliate
> attribution **the moment it's wired**, not hours later. These are **connectivity / integration checks**,
> not unit tests, and they're **cheap** (no browser loads, no waiting, minimal tokens).

## Principles

- **Fail fast, in place.** Each build step ends with a small programmatic check; if it fails, **STOP and
  report then** — never proceed on a broken layer or defer discovery to the end.
- **API level, not browser.** The agent verifies via **viem / the protocol SDKs / curl** using the test
  wallet's key (`.secrets/`, `21`). **No browser automation, no MetaMask driving, no waiting on game
  iframe loads / screenshots** (time- and token-heavy) — unless you explicitly ask.
- **The full bet loop is verifiable headless.** With the test wallet's private key, the agent can read
  catalogs/markets, build+sign+submit bets, and confirm on-chain settlement + affiliate attribution —
  all without a browser. So "does it actually work on-chain?" is answered continuously, cheaply.

## Division of labour: agent (API) vs you (browser)

| Layer | Agent verifies (API / programmatic, during build) | You verify (browser, at handoff) |
|---|---|---|
| RPC / chains | `eth_blockNumber`; each chain reachable | — |
| Wallet balances | `eth_getBalance` + ERC-20 `balanceOf` per chain | balances visible in MetaMask |
| Wallet connect | n/a (uses the key directly) | MetaMask connect + `wallet_addEthereumChain` prompt |
| BetSwirl casino | read catalog/contract; submit a bet via SDK/viem; confirm on-chain settlement + VRF; affiliate attributed | game iframe renders + click-to-play feel |
| Azuro sports | subgraph query; build+sign+submit EIP-712 order via relayer; confirm settlement + affiliate | market UI + bet-slip feel |
| Thin backend | curl `/balance`, `/history`, `/bet/prepare`; assert data + affiliate enforced | — |
| Bridging | LI.FI quote API reachable for the test route | bridge prompt UX |

## Per-phase connectivity gate (run inline, green before moving on)

| Phase (`12`) | Check immediately after building it |
|---|---|
| 2 Wallet/chains | RPC up on every chain; test wallet funded (read balances) |
| 3 Azuro | subgraph returns markets; a signed test order settles on-chain; on-chain affiliate == ours |
| 4 BetSwirl | catalog reads; a test bet settles on-chain via VRF; commission/affiliate attributed |
| 5 Backend | endpoints return correct on-chain-derived data; a forged affiliate is rejected |
| 6 History | indexer/subgraph return the test wallet's just-placed bets |
| 7 Bridge | LI.FI quote for the test route succeeds |

Each is a tiny script or curl run **during** the phase — not a suite deferred to the end.

## What the agent explicitly does NOT do
- Drive MetaMask or any browser extension.
- Load game iframes, take screenshots, do visual checks, or wait on page loads.
- Save end-to-end testing for the finish. Verification is **continuous**.

## Handoff
The final **browser** confirmation (MetaMask connect → game loads → play) is **your** step with the
handed-over pre-funded test wallet (`21`). It's expected to work because **every layer was already
API-verified on-chain** as it was built.

_Last updated: 2026-07-01_
