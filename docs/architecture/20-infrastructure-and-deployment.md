# 20 — Infrastructure as Code & Deployment (single repo)

> **Updated for the WINR + Azuro pivot — simpler.** No `packages/contracts`, no `Deploy.s.sol`, no
> signer, no deposit-watch/settle crons. `vercel.json` ships `apps/web` + the thin `apps/api`; the only
> cron is an optional cache refresh. IaC = light provisioning (Reown/affiliate/optional cache), no
> contract deploy. Env is minimal (see `16`): public `VITE_*` + a few server-side keys; **no**
> signer/HMAC/JWT. The "everything in one repo" principle stands. Below, ignore contract-deploy and
> signer-funding references.

---


## Principle (enforced)

**Everything lives in this one mono-repo.** Frontend, backend, smart contracts, shared logic, games,
**and all deployment / infrastructure / config** are versioned together. There is **no out-of-band
infrastructure** — no manual dashboard clicking to wire the system — **except** the one-time human
`HUMAN_BOOTSTRAP` tokens in `16` (accounts + first tokens the providers require a human to mint) and
the actual secret *values* (which live in Vercel env / gitignored `.env`, referenced by name only).

If it's needed to build, deploy, provision, or run Polaris, it is a file in this repo.

## Where the infra lives in the repo

```
polaris/
├─ vercel.json                 # deploy config: builds, routes, functions, crons  (BOTH web + api)
├─ turbo.json                  # task pipeline (build/lint/test/dev) across all workspaces
├─ package.json                # npm workspaces root
├─ .github/workflows/          # CI/CD (lint, test, contract tests, preview + prod deploy)
│  └─ ci.yml
├─ .env.bootstrap              # (gitignored) the ~5 human bootstrap tokens — see 17
├─ .env                        # (gitignored) local dev secrets (agent-generated + provisioned)
├─ apps/
│  ├─ web/                     # frontend (Vite SPA)
│  └─ api/                     # backend (Vercel serverless functions)
└─ packages/
   ├─ contracts/              # Foundry: Vault.sol + tests + deploy scripts
   │  ├─ script/Deploy.s.sol
   │  └─ deployments.json      # committed: deployed addresses per chain (IaC output)
   ├─ shared/
   │  └─ scripts/
   │     ├─ preflight.ts       # readiness gate (verifies every 16 credential)
   │     └─ provision.ts       # IaC: provisions Vercel Postgres/KV, RPC, secrets, funds signer
   └─ games/
```

## `vercel.json` — one deploy config for frontend + backend

Serves the SPA, routes API functions, and schedules cron (no always-on server). Shape:

```jsonc
{
  "buildCommand": "turbo run build",
  "functions": {
    "apps/api/**/*.ts": { "runtime": "nodejs20.x", "maxDuration": 30 }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/apps/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }   // SPA fallback (existing behaviour)
  ],
  "crons": [
    { "path": "/api/vault/deposit-watch", "schedule": "*/1 * * * *" },   // or RPC webhook (18)
    { "path": "/api/vault/settle-idle",   "schedule": "*/5 * * * *" }    // settle expired sessions
  ]
}
```

- **Frontend + backend deploy from the same `vercel deploy`.** No separate pipelines.
- **Cron config is code** (in `vercel.json`), not a dashboard setting — this is the persistent-listener
  answer from `18`.

## IaC scripts (provider resources as code)

Provider resources are provisioned by committed scripts, not manual setup (`17`):
- **`preflight.ts`** — verifies every `16` credential is present + valid; stops with exact remediation
  if not. Run before any build.
- **`provision.ts`** — creates Vercel Postgres + KV, the Alchemy app/RPC key, generates signer + HMAC +
  JWT secrets, funds the signer via CDP faucet, and writes derived values to Vercel env + local `.env`.
  Idempotent (re-run reuses existing resources).
- **`Deploy.s.sol`** (Foundry) — deploys `Vault.sol` per chain; writes addresses to committed
  `deployments.json`, which both `web` and `api` read (single source of deployed addresses).

## CI/CD (`.github/workflows/ci.yml`)

- **On PR:** `turbo run lint test` + `forge test` (contract tests) + a **Vercel preview deploy**.
- **On merge to `main`:** deploy to production via Vercel Git integration.
- Secrets injected from GitHub Actions secrets / Vercel env — never committed.
- Contract deploys are explicit (a workflow_dispatch or a script run), not automatic on every merge.

## Environment matrix (config as code)

| Env | Chain(s) | Currency | Deploy trigger |
|---|---|---|---|
| `local` | Base Sepolia | test USDC | `turbo run dev` |
| `preview` | Base Sepolia | test USDC | Vercel preview per PR |
| `staging` | WINR + Azuro testnet | testnet funds | Vercel (staging branch) |

(Testnet-only build — no mainnet environment.)

- Per-chain config → `packages/shared/chains.ts` (committed).
- Deployed addresses → `packages/contracts/deployments.json` (committed).
- Public config → `VITE_*` env. Secrets → Vercel env / `.env` (gitignored). Names are the contract (`16`).

## What is NOT in the repo (only these)
- **Secret values** — live in Vercel env / gitignored `.env` (referenced by name only; `13`).
- **The human bootstrap tokens** — pasted into gitignored `.env.bootstrap` once (`17`).
- Everything else (config, IaC scripts, deploy config, CI/CD, contract deploy, cron) **is committed.**

## Deploy & rollback
- **Deploy:** `vercel deploy` (or Git push) ships web + api together; DB/KV/RPC already provisioned by
  `provision.ts`; contract addresses from `deployments.json`.
- **Rollback:** Vercel instant rollback for app/api; contracts are immutable (new deploy + address
  update in `deployments.json` if ever needed); DB migrations are versioned + reversible.
- **Promotion:** preview → staging → production, same artifacts, env-scoped config.

## Acceptance
- A fresh clone + `.env.bootstrap` + `provision.ts` + `vercel deploy` yields a fully running stack with
  **zero manual dashboard configuration** beyond the bootstrap tokens.
- All infra (deploy config, crons, CI/CD, provisioning, contract deploy) is present in the repo.

_Last updated: 2026-07-01_
