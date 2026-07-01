# 05 — Thin Backend (read-only aggregation & gating)

> **SUPERSEDED design note:** the original seamless-wallet backend (ledger, `/wallet/bet|win`,
> settlement, HMAC, idempotency) existed to run our own off-chain casino. With the **WINR + Azuro**
> pivot there is **no custody and no off-chain ledger**, so that backend is **removed**. What remains is
> a thin, read-only layer. This doc describes the new, minimal backend.

## Purpose

The backend does **not** hold funds, run games, resolve outcomes, or settle bets — the on-chain
protocols do all of that. It only:

1. **Aggregates reads** — unified balance + bet history from on-chain sources (WINR indexer + Azuro
   subgraph), optionally cached for speed.
2. **Injects/enforces the affiliate address** on outgoing bet orders server-side (so it can't be
   swapped client-side — `14`, `19`).
3. **Mints short-lived session tokens** for UX (not custody).

Runs as **Vercel serverless functions** (`apps/api`). Secrets (a few API keys, affiliate config) in
Vercel env; nothing that can move player funds.

## Endpoints (minimal)

| Endpoint | Purpose |
|---|---|
| `GET /balance` | unified balance (WINR casino + Azuro-chain wallet), USD-normalized |
| `GET /history` | merged bet history (WINR indexer + Azuro subgraph), cached |
| `POST /bet/prepare` (sports) | build an Azuro order with **our affiliate address enforced**; return for signing |
| `GET /session` | short-lived UX token (no custody) |

Casino bets go **directly** from the frontend through the WINR SDK to WINR contracts; the backend is not
in the money path. Sports bets are prepared server-side only to enforce the affiliate address, then
signed by the player and submitted via Azuro's relayer.

## Data store (minimal)

- **No ledger-of-record.** On-chain is the source of truth.
- Optional **cache** (Vercel KV / Postgres) for aggregated balance/history and affiliate config.

## What was removed (vs the old design)

- ❌ `ledger`, `txns`, `rounds`, `pf_seeds`, `sessions` as sources of truth (on-chain now).
- ❌ `/wallet/bet|win|rollback`, deposit-watch, `/vault/settle`.
- ❌ HMAC callback auth, idempotency-of-settlement, settlement relayer/signer.
- ❌ Provably-fair seed management.

## Acceptance criteria

- `GET /balance` and `GET /history` return correct on-chain-derived data for a connected wallet.
- The backend never has any capability to move player funds (audited: no signer over user funds).
- Sports orders always carry our affiliate address regardless of client tampering (`14` T9).

_Last updated: 2026-07-01_
