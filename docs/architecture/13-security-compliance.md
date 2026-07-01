# 13 — Security, Secrets & Compliance

Non-negotiable rules for every phase. Security here is not optional polish — it's the definition of
"non-custodial" and the thing that keeps player funds safe.

## Secrets handling
- **Single store:** all secrets live in **Vercel env vars** (server scope) and a local **untracked
  `.env`** for dev. Never in the repo, staged files, commits, docs, or the frontend bundle.
- **Reference by name only.** Code reads `process.env.X` / `import.meta.env.VITE_X`. Docs and examples
  use placeholders (`<SETTLEMENT_SIGNER_PRIVATE_KEY>`).
- **Public vs server split:** only `VITE_`-prefixed values reach the browser and they must be safe to
  expose (project IDs, client IDs, contract addresses, public RPC). Everything else is server-only.
- Add `.env*` to `.gitignore` (verify). Scan diffs for secret-like strings before every commit.

## The non-custodial invariant (the core guarantee)
1. The operator can **never** move a player's funds except a `settle` bounded by that player's own
   signed session permission (`maxSpend`, `validUntil`, one-time `sessionId`).
2. Players can **always** withdraw unilaterally, including with the operator offline (exit timeout).
3. `settle` beyond permission, after expiry, or replaying a `sessionId` **must revert** (contract
   tests enforce this — Phase 3 DoD).
4. The settlement signer key is powerless beyond the permission — leaking it cannot drain vaults
   beyond authorized session limits.

## Session-key safety
- Tight scopes: only the Vault settle path, only up to `maxSpend`, only until `validUntil`.
- Auto-expiry + user-facing revoke.
- Blast radius on leak = the session cap. Never grant a session key broad or unlimited scope.

## Backend safety
- **HMAC** on all provider `/wallet/*` callbacks; **session tokens** on own-game calls. Reject
  unsigned/expired.
- **Idempotency** by `txId`; **atomic** row-locked debits; **no negative balances**.
- Rate-limit `/session/launch` and `/wallet/*` per player/IP.
- Confirm on-chain events (deposit) before crediting the ledger; wait for sufficient confirmations.

## Contract safety
- OpenZeppelin `SafeERC20`, `ReentrancyGuard`; EIP-712 typed permissions.
- Reentrancy, integer, and access-control tests. Consider an external audit before mainnet.
- No admin backdoor to move user funds. Any upgradeability (if used) must not violate invariant #1.

## Randomness integrity
- Server seed committed (hash published) before play; revealed for verification; never reused before
  reveal (`06`). House edge transparent in outcome mapping.

## Compliance flags (CHECKLIST, not legal advice)
> Non-custodial does **not** exempt Polaris from regulation. Treat these as items to resolve with a
> qualified gaming/legal advisor before real-money launch. The agents build the technical gates; the
> owner owns the legal posture.

- **Licensing:** most jurisdictions require a gaming license to operate real-money games and to
  onboard studio content (Curaçao is common entry-level). Testnet/demo play mitigates during dev.
- **KYC/AML:** keep the existing `KycModal` and gate **deposits/withdrawals** (and thresholds) where
  required. Wallet-connect is identity-light by default — plan KYC for fiat/large flows.
- **Geo-restrictions:** block prohibited jurisdictions (IP + wallet-level where feasible).
- **Responsible gambling:** keep the existing responsible-gambling layer; add deposit/loss limits,
  self-exclusion, reality checks.
- **Provider terms:** studio contracts (`09`) impose their own compliance/reporting obligations.
- **Tax/reporting:** jurisdiction-dependent; out of scope for these docs but must be tracked.

## Data & privacy
- Store minimal PII. Wallet address is pseudonymous; treat any KYC data as sensitive (encrypt at rest,
  restrict access). Don't log secrets or full PII.

## Pre-mainnet gate (must all be true)
- Contract audited; invariant tests green; secrets audited out of the repo; exit-timeout proven;
  monitoring live; licensing + KYC/geo posture confirmed by the owner's legal advisor.

_Last updated: 2026-07-01_
