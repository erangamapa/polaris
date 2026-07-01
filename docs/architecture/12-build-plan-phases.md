# 12 — Build Plan (Phased, for Agents)

> **Rephased for the BetSwirl + Azuro integrator model.** No Vault, no session keys, no seamless-wallet
> backend, no own games, no provably-fair engine. The build is: wallet connect → integrate two on-chain
> protocols → thin read backend → unified UX. Each phase has a Definition of Done (DoD).

## Phase 0 — Prep & credentials
- Human: provide `VITE_REOWN_PROJECT_ID`; grant run permission. (GitHub + Vercel already authed.)
- Agent: generate the **house/affiliate wallet** (set as BetSwirl + Azuro affiliate, gas-funded) and the
  **player wallet**; confirm tooling. Both persisted to gitignored `.secrets/` for handoff (`21`).
- **DoD:** Reown id present; both wallets generated; app still runs.

## Phase 0.5 — Discovery (RESOLVE ALL OPEN ITEMS FIRST) 🔒
- Work through **`23-open-items-and-discovery.md`** end to end: BetSwirl SDK/chain/launch/affiliate/payout,
  Azuro SDK/chain/token/subgraph/order-API/redeem, RPC/faucets, assets/tiles, MetaMask network params.
- Turn every `❓` into `✅ <answer>` (or `⚠️` with the blocker). Populate `packages/shared/chains.ts`;
  pin SDK versions.
- **This is a hard gate.** Do **not** start Phase 1+ until Discovery is resolved. If a blocking item is
  `⚠️`, **report before building** — this is the step that prevents burning tokens then discovering
  something missing halfway.
- **DoD:** `23` fully resolved (or blockers surfaced); chain config + SDK versions pinned; a smoke
  connectivity check per protocol (RPC up, subgraph responds, BetSwirl game catalog reads) passes.

## Phase 1 — Light restructure
- Keep the existing app as `apps/web`; add a thin `apps/api` (Vercel functions) + `packages/shared`
  (types, chain config, affiliate helpers). npm workspaces. (Much lighter than the old monorepo — no
  contracts/games packages.)
- **DoD:** `npm run build` green; app runs identically; thin api scaffold deploys.

## Phase 2 — Wallet connection + auth UI swap (`10`)
- Reown AppKit + wagmi + viem; connect EVM wallets on **Base Sepolia**. Network indicator + **Switch to
  Base Sepolia** CTA.
- **UI:** replace **Login/Register with a “Connect Wallet” button**; connected state = address + balance
  pill + account menu (disconnect). Remove `AuthModal` (password); `AccountDialog` → Wallet/Account;
  `WalletDialog` → **Funds** panel (balances + faucet, no deposit-to-us); `KycModal` dormant.
- **DoD:** no Login/Register; Connect Wallet connects a real wallet and shows address + balance;
  wrong-network switch CTA works.

## Phase 3 — Sports & Predictions via Azuro
- Integrate Azuro SDK into the existing sports + predictions verticals (replace mock data). Enforce our
  affiliate address server-side (`08`, `19`, `14` T9).
- **DoD (testnet):** place a non-custodial sports bet + a prediction bet end-to-end; both settle on-chain
  via Azuro; affiliate attributed; history readable from the subgraph.

## Phase 4 — Casino via BetSwirl
- Integrate BetSwirl SDK; list catalog games in the existing lobby; on-chain play with BetSwirl bankroll + VRF;
  attach our BetSwirl affiliate identifier. Confirm autoplay/session UX (`07`).
- **DoD (testnet):** connect wallet → be on Base Sepolia → play a BetSwirl game catalog game end-to-end from the
  player's own wallet; settles on-chain; provably fair; affiliate attributed; no bankroll from us.

## Phase 5 — Thin backend (reads + gating)
- `apps/api`: `GET /balance`, `GET /history` (aggregate BetSwirl subgraph + Azuro subgraph; optional cache),
  `POST /bet/prepare` (inject/enforce affiliate for Azuro orders), `GET /geo` gate, `GET /session`.
- **DoD:** unified balance + merged history correct from on-chain reads; affiliate enforced server-side
  (forged affiliate rejected); geo gate blocks disallowed regions; backend holds no custody/signer.

## Phase 6 — Bet history page
- One "My Bets" screen, Casino + Sports tabs, **both on-chain** with explorer links; Chainlink VRF proof on
  casino rows; reconnect restores from chain (`15`).
- **DoD:** every bet links to a verifiable on-chain tx; clearing browser + reconnecting the same wallet
  restores balance + history from chain.

## Phase 7 — Unified balance + cross-chain
- Unified USD balance (BetSwirl casino + Azuro-chain wallet); LI.FI bridging when verticals are on different
  chains; clear UX for switching/bridging.
- **DoD:** unified balance correct across chains; a player can move funds between the casino and sports
  chains via the in-app bridge flow.

## Phase 8 — Responsible gambling (UI)
- Keep the existing responsible-gambling layer (limits, self-exclusion reminders, reality checks) as UI.
- **DoD:** responsible-gambling controls functional. (Mainnet compliance — licence / geoblock / KYC — is
  out of scope for this testnet build.)

## Phase 9 — Hardening, observability, autonomous E2E
- Error monitoring (Sentry), rate-limiting, threat-model pass (`14`, esp. affiliate integrity + no
  custody), and a final **API-level E2E** using the player wallet key (viem/SDK) — the culmination of the
  per-phase `22` connectivity checks, **not** a browser test.
- **Verify revenue to the house wallet:** sourced bets attribute the affiliate share to the house wallet →
  **claim** BetSwirl revenue → confirm balance rises (Azuro: confirm on-chain attribution). (`21`, `19`)
- **DoD:** the headless E2E (bet on BetSwirl + Azuro → settle on-chain → read history) passes with no human;
  house wallet shows/claims affiliate revenue; no secret in the frontend bundle; non-custodial verified.
  Both wallet seeds (player + house) are handed off (`21`). Browser play is the user's step.

## Later / gated (not blocking MVP)
- **Own BetSwirl games** (BetSwirl engine/SDK; possible DAO proposal) for more control (`07`).
- **Branded studio games** (needs contracts) — only if desired (`09`).
- **Read cache** (Vercel Postgres/KV) if indexer latency needs it (`05`).

## Agent team & orchestration
Executed by a **team of specialized agents** (Orchestrator, Architect, Web3/Integration, Backend,
Frontend, QA/connectivity, DevOps, Researcher-if-needed), assigned by **complexity** on the right **model
tier** (Opus = architecture/complex/security · Sonnet = standard build · Haiku = verification/rote). Full
role → phase → QA-gate mapping and parallelization in **`24-agent-team-and-orchestration.md`**.

## Verify as you build (not at the end)
Every integration phase ends with an **API-level connectivity check** (viem/SDK/curl using the test
wallet key) — see `22`. If a check fails, **STOP and report then**; never proceed on a broken layer or
defer verification to a big end-of-build test. Browser/MetaMask confirmation is the user's handoff step
(`21`), not the agent's.

## Global Definition of Done (every phase)
`npm run build` + lint green · no secrets committed · **non-custodial invariant intact** (no capability
to move player funds) · affiliate attribution enforced server-side · **the phase's `22` connectivity
check is green** · no regression.

_Last updated: 2026-07-01_
