# 18 — Runtime Topology (Where Everything Runs)

The definitive "where does each piece run" map. Short version: **everything we own runs on Vercel**
(compute + data + static), **custody/settlement is on Base** (the chain), and the rest are **SaaS APIs
we call out to**. No always-on server is required for the MVP.

## Diagram

```
        ┌──────────────────────────── VERCEL (everything we own) ────────────────────────────┐
        │                                                                                       │
        │  apps/web (React SPA)      packages/games/* (iframes)                                  │
        │        │                          │                                                    │
        │        ▼                          ▼                                                    │
        │  ┌─────────────────────── apps/api  (serverless functions) ───────────────────────┐   │
        │  │ /session/launch  /wallet/{balance,bet,win,rollback}  /vault/{deposit-watch,settle}│  │
        │  │ provably-fair engine · settlement relayer (holds signer key)                     │  │
        │  └──────────────┬───────────────────────────────┬──────────────────────────────────┘  │
        │                 │                                │                                       │
        │        ┌────────▼────────┐              ┌────────▼────────┐        ┌───────────────┐    │
        │        │ Vercel Postgres │              │   Vercel KV     │        │  Vercel Cron  │    │
        │        │ ledger, txns,   │              │ tokens, nonces  │        │ deposit-watch │    │
        │        │ rounds, seeds   │              │                 │        │ + settle idle │    │
        │        └─────────────────┘              └─────────────────┘        └───────────────┘    │
        └───────────────┬───────────────────────────┬───────────────────────────┬───────────────┘
                        │ RPC (Alchemy/thirdweb)     │ AA (thirdweb)             │ wallet-connect (Reown)
                        ▼                            ▼                           ▼
            ┌──────────────────────┐    ┌───────────────────────┐   (frontend ↔ user's wallet)
            │  BASE (on-chain)     │    │ thirdweb: bundler,    │
            │  Vault.sol (custody) │    │ paymaster, session    │
            │  USDC · Azuro · VRF  │    │ keys                  │
            └──────────────────────┘    └───────────────────────┘
```

## Our own services → Vercel serverless functions (`apps/api`)

| Service / endpoint | Purpose | Runs on |
|---|---|---|
| `/session/launch` | mint session token, return game URL | Vercel function |
| `/wallet/balance` | return ledger balance (game calls) | Vercel function |
| `/wallet/bet` | debit + resolve round (server-authoritative, `07`/`14` T3) | Vercel function |
| `/wallet/win` | credit ledger (validated, not client-trusted) | Vercel function |
| `/wallet/rollback` | reverse failed round | Vercel function |
| `/vault/settle` | sign net result, submit `Vault.settle` | Vercel function (holds signer key) |
| `/vault/deposit-watch` | credit ledger when a deposit lands | Vercel function (see caveat) |
| Provably-fair engine | commit-reveal outcomes | inside functions (`packages/shared`) |
| Settlement relayer | signs settle txs w/ `SETTLEMENT_SIGNER_PRIVATE_KEY` | inside functions |

## Our own data → Vercel storage

| Store | Holds | Provider |
|---|---|---|
| **Postgres** | `ledger`, `txns`, `rounds`, `pf_seeds`, `sessions` | Vercel Postgres (or Neon) |
| **KV** | session tokens, used-nonce sets | Vercel KV (or Upstash) |

## Frontend + games → Vercel static hosting / CDN

| Asset | Provider |
|---|---|
| `apps/web` (React SPA) | Vercel |
| `packages/games/*` (slot/dice/crash iframes) | Vercel |

## Third-party APIs we call OUT to

| Call | From | Provider / where |
|---|---|---|
| Chain reads/writes (deposit, settle, balances) | backend | Alchemy RPC (or thirdweb) → Base |
| Bundler + paymaster + session keys | frontend + backend | thirdweb |
| Wallet-connect relay | frontend | Reown / WalletConnect |
| Custody + settlement (Vault contract) | on-chain | Base Sepolia → Base mainnet |
| Sports/predictions markets | frontend (SDK) | Azuro contracts (via RPC) + subgraph |
| Testnet funding (`requestFaucet`) | build/test scripts only | Coinbase CDP (not a prod runtime dep) |
| Chainlink VRF *(optional)* | on-chain | Chainlink on Base |

## Calls INTO our backend (inbound)

| Caller | Hits | Auth |
|---|---|---|
| Our own game iframes | `/wallet/*` | session token |
| Third-party provider RGS *(later)* | `/wallet/*` | HMAC secret |
| Chain event / cron | `/vault/deposit-watch`, settle-idle | internal |

## Where secrets live vs where calls originate

| Origin | Can hold secrets? | Talks to |
|---|---|---|
| **Frontend** (`apps/web`, games) | ❌ public values only (`VITE_*`) | Reown, thirdweb client, Azuro SDK, our `/session` + reads |
| **Backend** (Vercel functions) | ✅ server env only | RPC, thirdweb secret, Postgres, KV, chain signing |
| **Build/test scripts** | ✅ from `.env.bootstrap` | Vercel/Alchemy/CDP provisioning APIs (`17`) |

## The one caveat: no persistent listener

Serverless functions don't run continuously, so anything needing a persistent watch uses **Vercel
Cron** or an **RPC-provider webhook** instead of an always-on process:
- **Deposit-watcher** — Vercel Cron polling, or Alchemy Notify / thirdweb Insight webhook → `/vault/deposit-watch`.
- **Auto-settle idle/expired sessions** — Vercel Cron.

If we ever needed a true always-on listener, only that single component would move to a small worker
(e.g. a Railway/Fly/Render process); everything else stays serverless on Vercel.

## The map by provider (one line each)
- **Vercel** — all our compute (functions), data (Postgres + KV), frontend, game iframes, cron. *This is where our services and database run.*
- **Base** — custody + settlement (Vault), Azuro, optional VRF.
- **thirdweb** — account abstraction: bundler, paymaster, session keys.
- **Alchemy** (or thirdweb) — RPC.
- **Reown** — wallet-connect.
- **Coinbase CDP** — testnet funding at build time only.

_Last updated: 2026-07-01_
