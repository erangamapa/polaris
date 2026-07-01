# 13 — Security (testnet build)

> **Testnet-only scope.** Mainnet compliance — gaming licence, KYC/AML, geoblocking — is **out of scope
> for this build** and intentionally not covered here. This doc is the security baseline for a testnet,
> non-custodial integrator.

## The non-custodial invariant (the core guarantee)
- WildStakes holds **no custody**: no Vault, no signer, no key or contract with authority over player
  funds. Players interact directly with BetSwirl/Azuro from their own wallet.
- Audit check: the frontend and thin backend have **no capability to move a player's funds** (`14` T2).

## Affiliate / revenue integrity
- Our affiliate identifiers (BetSwirl affiliate, Azuro affiliate) are **public, not secret**; the risk is
  substitution. The thin backend **injects/enforces** our identifier on prepared orders and **rejects
  mismatches** before submission (`14` T1, `19`). Never trust a client-supplied affiliate value.

## Secrets handling
- **Minimal secrets:** affiliate config + RPC/API keys. In **Vercel env** (server scope) and a local
  untracked `.env`; referenced by name only; placeholders in committed docs/examples.
- Only `VITE_`-prefixed values reach the browser and must be safe to expose.
- `.env*` and `.secrets/` gitignored (verified). Scan diffs for secret-like strings before every commit.
- **Test-wallet secret:** the MetaMask test wallet's seed/key (`21`) lives only in gitignored
  `.secrets/test-wallet.json` + the handoff message to you; testnet-only, disposable, never committed.
- **Removed:** settlement signer key, HMAC callback secret, session-JWT-for-custody — none exist in this
  model.

## Frontend / order integrity
- On-chain contracts validate all bet parameters and outcomes; the player signs what they submit; client
  tampering cannot change protocol settlement. `/bet/prepare` only sets the affiliate.

## Protocol dependency
- We inherit BetSwirl/Azuro security. Use their audited, live contracts; monitor status; degrade gracefully
  (disable a vertical if its protocol/chain is down). See `14` T3.

## Responsible gambling (UI)
- Keep the existing responsible-gambling layer (limits, self-exclusion reminders, reality checks) as a
  product feature. (This is UI, independent of mainnet licensing.)

## Data & privacy (testnet)
- Store almost nothing (on-chain is source of truth; `15`). No KYC/PII collected in the testnet build.
- Don't log secrets. Any optional cache holds only public on-chain-derived data.

_Last updated: 2026-07-01_
