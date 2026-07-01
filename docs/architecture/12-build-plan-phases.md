# 12 — Build Plan (Phased, for Agents)

Dependency-ordered. Each phase has a Definition of Done (DoD). **Do not start a phase until its
dependencies are green.** Every phase keeps the repo building, linting, and (from Phase 2 on) testing
green. No secrets in the repo (see `13`).

## Phase 0 — Prep & credentials [owner + agent]
- Human does the **bootstrap drop**: the ~5 `HUMAN_BOOTSTRAP` tokens into `.env.bootstrap` (`16`, `17`).
- Agent authors + runs **preflight** (readiness gate) and **provision** scripts: verifies bootstrap
  tokens; provisions Postgres/KV/RPC; generates signer + HMAC + JWT secrets; funds the signer via the
  **CDP Faucets API**; writes derived values to Vercel env + local `.env` (all gitignored).
- Agent verifies the current app still runs (`apps/web` baseline).
- **DoD:** preflight green for every `16` credential; all AGENT_PROVISIONED resources created; signer
  funded (testnet ETH+USDC); baseline app runs. (See `16`, `17`.)

## Phase 1 — Mono-repo restructure [agent]
- Move current app → `apps/web`; add workspaces + Turborepo; scaffold `apps/api`,
  `packages/{contracts,shared,games}`; update `vercel.json`.
- **DoD:** `turbo run build` green; existing app runs identically from `apps/web`; empty packages
  typecheck. (See `02`.)

## Phase 2 — Shared foundations [agent]
- `packages/shared`: `chains.ts`, `types.ts`, `money.ts`, `hmac.ts`, `provablyFair.ts` (+ tests).
- Add Vitest to the repo.
- **DoD:** provably-fair + HMAC + money unit tests pass; verification reproducibility test passes.
  (See `06`.)

## Phase 3 — Vault contract [agent]
- `packages/contracts`: `Vault.sol` + full test suite + deploy script. Deploy to Base Sepolia.
- Must implement **locked at-risk funds** (`openSession`), **exit/dispute window** (`requestExit`),
  and one-time `sessionId` settle — the T1 anti-drain mechanism (`14`).
- Write deployed address into `chains.ts` / `deployments.json`.
- **DoD:** all invariant tests pass, incl. #6 (locked funds not withdrawable) and #7 (exit window)
  from `03`; withdraw-before-settle is proven impossible; deployed + verified on explorer; manual
  deposit/withdraw via `cast` works. (See `03`, `14` T1/T6.)

## Phase 4 — Backend seamless-wallet [agent]
- `apps/api`: `/session/launch`, `/wallet/{balance,bet,win,rollback}`, `/vault/{deposit-watch,settle}`.
- Ledger + `txns` + `rounds` + `pf_seeds` + `sessions` schema in Postgres; sessions/nonces in KV;
  HMAC + idempotency + atomic debits.
- **Server-authoritative outcomes** (T3): backend computes payout and writes the `rounds` row
  atomically with debit/credit; never trusts a client-reported win.
- Persist per-round history (`rounds`) + mirror on-chain deposits/settles into `txns` (see `15`).
- **DoD:** integration tests: 50 rapid bet/win cycles correct; duplicate `txId` no-op; **forged
  `/wallet/win` rejected (T3)**; deposit-watch credits ledger from a real on-chain deposit; settle
  reconciles to chain; every round persisted + reproducible from its seed. (See `05`, `14` T3/T5, `15`.)

## Phase 5 — Session keys + settlement wiring [agent]
- thirdweb smart account + session-key grant; backend relayer settles within the on-chain permission.
- **DoD:** ≥ 50 consecutive bets with zero popups after one grant; session cannot exceed
  `maxSpend`/`validUntil`; net settle lands on-chain. (See `04`.)

## Phase 6 — First casino game (slot) [agent]
- `packages/games/slot`: iframe client using the seamless-wallet protocol; provably-fair outcomes
  from backend; host launcher in `apps/web` embeds it.
- **DoD:** a spin debits/credits the vault-backed ledger < 400 ms, visible in-game + host pill;
  outcomes reproducible from revealed seed. (See `07`.)

## Phase 7 — Frontend wallet integration [agent]
- Reown/wagmi connect; real deposit/withdraw via Vault; "enable fast play"; unified balance display.
- **DoD:** connect → deposit test USDC → play slot (instant) → withdraw, all from the existing UI;
  no secret in the bundle. (See `10`.)

## Phase 8 — More casino games [agent]
- `dice`, then `crash`, on the same protocol.
- **DoD:** both playable end-to-end, provably fair, reusing the same backend + host launcher.

## Phase 9 — Sports & Predictions via Azuro [agent]
- Integrate Azuro SDK into the sports + predictions verticals (replace mock data). Unify balance.
- **DoD:** a non-custodial sports bet + a prediction bet settle on-chain via Azuro; unified balance
  correct across both models. (See `08`.)

## Phase 9b — Bet history page & recovery [agent]
- Build the **Bet History page** per the full spec in `15`, keyed by wallet address:
  - **Casino**: sessions (from `sessions`) expandable to off-chain `rounds`; each round has a
    provably-fair **verify** action; each session + deposit/withdraw links to its **on-chain tx**;
    copy explains rounds are off-chain for speed and settle to the chain as one net transaction.
  - **Sports**: read from the **Azuro subgraph**; each bet is **fully on-chain** with a block-explorer
    link. Optional per-address cache.
  - Every row tagged 🔗 on-chain vs ⚡ off-chain+provably-fair.
- Wallet reconnect restores balance + history.
- **DoD:** casino rounds shown grouped by session, each linking to its on-chain settlement tx and
  verifiable from its seed; sports bets shown from the subgraph with explorer links; clearing the
  browser and reconnecting the same wallet restores playable balance + full history. (See `15`, `08`, `06`.)

## Phase 10 — Hardening & observability [agent]
- Rollback paths, error monitoring (Sentry), rate-limiting, session-key revoke UI, exit-timeout tested.
- Full threat-model pass: verify T1–T7 defenses hold end-to-end.
- **DoD:** rollback works; monitoring live; the non-custodial exit invariant proven with operator
  offline; T1 (withdraw-before-settle), T2 (offline-loss settle), T3 (forged win), T5 (race/replay)
  all proven closed by tests. (See `13`, `14`.)

## Phase 11 — Multi-chain enablement [agent, optional]
- Add a second EVM chain via `chains.ts` + redeploy Vault + deposit-watcher.
- **DoD:** same flows work on a second EVM chain; unified cross-chain balance. (See `03`.)

## Later / gated (not blocking MVP)
- **Third-party studio games** (`09`) — needs owner's provider contract + sandbox creds.
- **Chainlink VRF mode** (`06`), **fiat on-ramp**, **Solana/BTC tracks** (`03`), **mainnet + license**.

## Suggested agent division (when parallelizing)
- **Contracts agent** → Phase 3 (+ VRF later).
- **Backend agent** → Phases 2, 4, 5 (+ provider bridge later).
- **Games agent** → Phases 6, 8.
- **Frontend agent** → Phases 7, 9, 10.
- Coordinate on `packages/shared/types.ts` as the shared contract.

## Global Definition of Done (every phase)
`turbo run build` + `turbo run lint` + `turbo run test` green · no secrets committed · non-custodial
invariant intact · no behaviour regression in unrelated areas.

_Last updated: 2026-07-01_
