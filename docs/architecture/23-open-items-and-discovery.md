# 23 — Open Items & Discovery (resolve BEFORE building)

> **The pre-build gate.** Every "confirm at build time" unknown across the whole stack, in one place.
> The agent runs **Discovery (Phase 0.5)** first, answers each item from the live docs/SDKs/testnets,
> and **records the answer inline here** (turn each `❓` into a `✅ <answer>`). Building does not start
> until this list is resolved — so we never get halfway and find something missing.

Legend: `❓` unresolved · `✅` confirmed (write the value) · `⚠️` blocked/needs-user.

## A. WINR (casino) — see `07`
- ❓ WINR **SDK** npm package + version + API (or contract ABIs for viem).
- ❓ **WINR Chain testnet**: chainId, RPC URL, currency symbol, block explorer, **faucet URL**.
- ❓ **Game launch/embed** mechanism (hosted URL / iframe / render component) + iframe origin.
- ❓ **Catalog access**: does it expose game metadata? art/thumbnails? per-game IDs? how to list?
- ❓ **Affiliate/referrer** mechanism + identifier format (how commission attribution is set on a bet).
- ❓ **Bet submission** path (SDK method vs viem contract call) — must be scriptable headless (`22`).
- ❓ **Payout model**: auto-credit on settlement vs a claim step.
- ❓ **Funding**: USDC→WINR chip swap flow; who triggers it.
- ❓ **Autoplay/session UX**: signature-per-bet vs session/gasless on the L3.
- ❓ **WINR indexer/query** endpoint for balance + bet history.
- ❓ **Tile/asset** availability (else tilecraft fallback).

## B. Azuro (sports/predictions) — see `08`
- ❓ **SDK + Toolkit** package + version + hooks API (pin).
- ❓ **Target chain + testnet** + **pool/betting token** per chain (align with casino if possible).
- ❓ **Subgraph GraphQL endpoint(s)** per chain + example queries (markets, odds, bets, history).
- ❓ **Oracle order API** endpoint (`POST /orders`) + EIP-712 domain/types + relayer flow.
- ❓ **Affiliate**: affiliate-tracker registration + how `affiliate` is set + **reward claim**.
- ❓ **Redeem/claim winnings** contract method + timing.
- ❓ **Live betting** flow (if surfaced).
- ❓ **Sport/league/team** metadata shape + **logo/icon** sourcing.
- ❓ **Testnet faucet** for pool token + gas.
- ❓ **Prediction-market** coverage on the chosen chain.

## C. Chains / RPC / bridging — see `03`, `18`
- ❓ Final chain choice per vertical (casino = WINR L3; sports = Azuro chain) + whether they differ.
- ❓ **RPC URLs** (public or Alchemy) for each chain; reachability (`eth_blockNumber`).
- ❓ **LI.FI** testnet support for the bridge route (unified balance) — or defer bridging.
- ❓ `wallet_addEthereumChain` params for each non-default chain (for MetaMask auto-add).

## D. Wallet / MetaMask — see `04`, `21`
- ❓ Reown AppKit config with the target chains (custom WINR L3 network).
- ❓ MetaMask network-add params (chainId, RPC, symbol, explorer) for the handoff (`21`).

## E. Thin backend / reads — see `05`, `15`
- ❓ Confirmed indexer/subgraph query shapes for `GET /balance` + `GET /history`.
- ❓ `/bet/prepare` affiliate-enforcement approach for Azuro orders (server-side sign/inject vs validate).

## F. Test wallet & funding — see `21`, `22`
- ❓ Which faucets are **programmatic** (CDP / protocol) vs CAPTCHA-gated (flag if manual needed).
- ❓ Amounts to fund per chain (gas + betting token) for a full casino + sports test.

## G. Assets — see `07`, `08`
- ❓ Casino tiles: served by WINR? else **tilecraft** generation plan.
- ❓ Sports logos/icons: served by Azuro? else sourcing plan.

## Discovery output (Phase 0.5 deliverable)
- This file with every `❓` → `✅ <answer/value>` (or `⚠️` with the blocker + who resolves it).
- `packages/shared/chains.ts` populated with confirmed chain params, tokens, RPCs, indexer/subgraph URLs.
- Pinned SDK versions in `package.json`.
- A go/no-go: if any item is `⚠️` and blocking, **report before building** (don't burn build tokens).

_Last updated: 2026-07-01_
