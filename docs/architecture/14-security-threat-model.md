# 14 — Security Threat Model

> **Updated for the BetSwirl + Azuro pivot.** Most of the old vectors (withdraw-before-settle,
> client-reported wins, ledger races, settlement replay) were risks of our **own off-chain casino**,
> which no longer exists. BetSwirl/Azuro settle on-chain and carry those risks in audited protocol code. Our
> remaining surface is small: affiliate integrity, the non-custodial guarantee, protocol dependency, and
> compliance.

## Attacker model
- The player controls their wallet, browser, dev tools, and network traffic.
- We hold **no custody** and **no signer over player funds** — so there is no pool of user funds for us
  to leak or for an attacker to drain via us.

## T1 — Affiliate/commission substitution (our main revenue risk)
**Attack:** a user swaps our affiliate identifier (BetSwirl affiliate / Azuro `affiliate`) for their own so the
commission on their play goes to them.
**Defense:** identifiers are **public, not secret** — the risk is substitution, not exposure. The thin
backend **injects/enforces** our identifier on prepared orders and **rejects mismatches** before
submission (`05`, `19`). Never trust a client-supplied affiliate value.
**Residual (accepted):** a user can bypass our frontend and use the permissionless protocols directly
with their own/no affiliate — unpreventable, not theft; we just don't earn on volume we didn't source.
**Test:** an order with a wrong affiliate is overwritten/rejected server-side.

## T2 — Custody / fund-drain (largely designed out)
**Attack:** move player funds illegitimately.
**Defense:** we use **non-custodial protocols** and hold **no Vault, no signer, no ledger** over user
funds. There is no function anywhere in our stack that can move a player's money. Players interact
directly with BetSwirl/Azuro contracts from their own wallet.
**Test:** audit confirms the backend/frontend have no key or contract with authority over user funds.

## T3 — Protocol/dependency risk
**Attack/failure:** BetSwirl or Azuro contract bug, chain outage, bankroll insolvency, or token issues.
**Defense/mitigation:** rely on audited, live protocols with real volume ($250M+ BetSwirl; large Azuro
volume). Monitor protocol status; degrade gracefully (disable a vertical if its protocol is down). We
inherit their security posture — this is the core trade of the integrator model. Document protocol
audit/status links; watch BetSwirl-token/chain risk.

## T4 — Frontend/order tampering (beyond affiliate)
**Attack:** manipulate bet parameters in the client.
**Defense:** on-chain contracts validate all bet parameters and outcomes; the player signs what they
submit; nothing the client fakes changes protocol settlement. Our `/bet/prepare` only sets the affiliate
and never trusts client-supplied economic terms it shouldn't.

## T5 — Secrets / infra
**Defense:** minimal secrets (affiliate config, RPC/API keys) in Vercel env; never
committed; scan diffs before commit (`13`). No settlement signer/HMAC/JWT-for-custody exists anymore.

## What is NOT a risk
- **Chargebacks** — on-chain finality.
- **Draining our bankroll** — we don't have one (protocol LPs do).
- **Off-chain ledger manipulation** — there is no ledger of record.
- **Affiliate address visibility** — public by nature; visibility ≠ ability to steal accrued rewards.

## Summary — what must be correct now
1. **T1** affiliate enforced server-side (revenue integrity).
2. **T2** no custody / no signer over user funds (non-custodial invariant).
3. **T3** monitor + degrade gracefully on protocol/chain issues.

_Last updated: 2026-07-01_
