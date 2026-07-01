# 02 — Mono-repo Structure

> **Updated for the BetSwirl + Azuro pivot — much lighter.** No `packages/contracts` (no Vault) and no
> `packages/games` (BetSwirl provides games). The structure is now:
> ```
> polaris/
> ├─ apps/web/        # frontend (existing app) + BetSwirl SDK + Azuro SDK + wallet connect
> ├─ apps/api/        # THIN backend: reads (balance/history), affiliate inject, session tokens
> ├─ packages/shared/ # types, chain config (BetSwirl + Azuro chains), affiliate helpers
> ├─ vercel.json · turbo.json · package.json (workspaces) · .github/workflows/
> ```
> Deployment/IaC still all live in-repo (`20`). The detailed layout below is historical (it referenced
> contracts/games packages that are no longer built).

---


Everything lives in one repo. Frontend, backend, contracts, shared logic, and games are workspaces —
**and so is all deployment/IaC/config** (`vercel.json`, `turbo.json`, CI/CD, provisioning + contract
deploy scripts). See `20-infrastructure-and-deployment.md` for the enforced "everything in-repo"
principle and the full deploy/CI/CD spec.

## Target layout

```
polaris/
├─ apps/
│  ├─ web/                     # existing Vite/React app (frontend)
│  │  ├─ src/                  # current src/ moves here
│  │  ├─ index.html
│  │  └─ vite.config.js
│  └─ api/                     # Vercel serverless functions (backend)
│     ├─ session/launch.ts
│     ├─ wallet/balance.ts
│     ├─ wallet/bet.ts
│     ├─ wallet/win.ts
│     ├─ wallet/rollback.ts
│     ├─ vault/deposit-watch.ts
│     └─ vault/settle.ts
├─ packages/
│  ├─ contracts/              # Foundry: Vault.sol + tests + deploy scripts
│  │  ├─ src/Vault.sol
│  │  ├─ test/Vault.t.sol
│  │  ├─ script/Deploy.s.sol
│  │  └─ foundry.toml
│  ├─ shared/                 # TS shared by web + api
│  │  ├─ provablyFair.ts      # commit-reveal engine
│  │  ├─ hmac.ts              # callback signing/verification
│  │  ├─ chains.ts            # multi-chain config registry
│  │  ├─ types.ts            # Bet, Round, Ledger, Session, Txn types
│  │  └─ money.ts             # fixed-point USDC math (6 decimals)
│  └─ games/                  # in-house provably-fair games (iframe clients)
│     ├─ slot/
│     ├─ dice/
│     └─ crash/
├─ docs/architecture/         # these specs
├─ package.json               # workspaces root
├─ turbo.json                 # Turborepo pipeline
└─ vercel.json                # deploy config (web + api)
```

## Tooling

- **Package manager:** npm workspaces (repo already uses npm + package-lock).
- **Task runner:** Turborepo (`turbo.json` pipelines: `build`, `lint`, `test`, `dev`).
- **Contracts:** Foundry (`forge`, `cast`, `anvil`).
- **Language:** TypeScript across `api`, `shared`, `games`. `web` may stay `.jsx` initially and
  migrate incrementally (see the separate `docs/architecture-refactor-plan.md` Phase 6).
- **Lint:** keep existing `oxlint` for web; add `tsc --noEmit` for TS packages.

## Root `package.json` (shape)

```jsonc
{
  "name": "polaris",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test"
  }
}
```

## Migration from current structure (Phase 1 of the build)

1. Move root `src/`, `index.html`, `vite.config.js`, `public/` → `apps/web/`.
2. Create `apps/web/package.json` with the current dependencies.
3. Add root workspaces `package.json` + `turbo.json`.
4. Scaffold `apps/api`, `packages/{contracts,shared,games}` empty.
5. Update `vercel.json` to build `apps/web` (SPA) and deploy `apps/api/**` as functions.
6. Verify `npm run dev` still serves the existing app unchanged.

**Acceptance:** existing app runs identically from `apps/web`; `turbo run build` green; no behaviour
change; empty backend/contracts/games packages scaffolded and typechecking.

## Conventions

- Shared types live only in `packages/shared/types.ts` — never duplicated.
- Money is integer `bigint` in smallest units (USDC = 6 decimals). No floats for balances.
- Every backend endpoint imports HMAC + idempotency helpers from `packages/shared`.
- Env var names are the contract between docs, code, and Vercel (see `11`).

_Last updated: 2026-07-01_
