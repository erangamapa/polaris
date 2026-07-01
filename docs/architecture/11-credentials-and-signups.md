# 11 — Credentials, Sign-ups & Keys (OWNER ACTION REQUIRED)

This is the list of everything a human must fetch before the build can run **end-to-end**. Agents
build everything else. Each key is stored in **Vercel env vars** (and a local untracked `.env` for
dev) and referenced by **env var name only** — never hardcoded, never committed (see `13`).

Legend: **[BLOCKER]** = needed before that phase can run · **[FREE]** = free tier ·
**[LATER]** = only for production or optional features.

## Required for the MVP (testnet, own games)

| # | What | Where to get it | Env var name(s) | Notes |
|---|---|---|---|---|
| 1 | **Reown Project ID** [FREE][BLOCKER] | https://dashboard.reown.com → new project → AppKit | `VITE_REOWN_PROJECT_ID` (public) | Wallet-connect UI |
| 2 | **thirdweb Client ID + Secret Key** [FREE][BLOCKER] | https://thirdweb.com/dashboard → Settings → API Keys | `VITE_THIRDWEB_CLIENT_ID` (public), `THIRDWEB_SECRET_KEY` (server) | Smart accounts + session keys + bundler/paymaster |
| 3 | **Vercel account** + link this repo [FREE][BLOCKER] | https://vercel.com → import Git repo | — (via Vercel dashboard) | Hosts `apps/web` + `apps/api` |
| 4 | **Vercel Postgres** [FREE tier][BLOCKER] | Vercel dashboard → Storage → Postgres (or https://neon.tech) | `POSTGRES_URL` (auto-injected) | Ledger DB |
| 5 | **Vercel KV** [FREE tier][BLOCKER] | Vercel dashboard → Storage → KV (or https://upstash.com) | `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Sessions/nonces |
| 6 | **Base Sepolia RPC** [FREE] | thirdweb RPC works with #2, or https://alchemy.com → app → Base Sepolia | `BASE_SEPOLIA_RPC_URL` | Public RPC exists but a keyed one is more reliable |
| 7 | **Testnet USDC** [FREE, no signup] | https://faucet.circle.com (select Base Sepolia) | — | 20 USDC / 2h per address |
| 8 | **Base Sepolia ETH (gas)** [FREE] | https://portal.cdp.coinbase.com/products/faucet | — | To deploy contract + fund the settlement signer |
| 9 | **Settlement signer wallet** [BLOCKER] | Agent generates the keypair; owner funds it via #8 | `SETTLEMENT_SIGNER_PRIVATE_KEY` (server) | The relayer key that submits `Vault.settle`. NEVER in repo/frontend |
| 10 | **Callback HMAC secret** [BLOCKER] | Agent generates a random secret; owner stores it | `WALLET_CALLBACK_HMAC_SECRET` (server) | Signs/verifies `/wallet/*` callbacks |
| 11 | **Session token signing secret** [BLOCKER] | Agent generates; owner stores | `SESSION_JWT_SECRET` (server) | Signs launch tokens |

> Items 9–11: the agent will generate the values and print them once; the owner pastes them into
> Vercel env (and local `.env`). Item 9's address must be funded from faucet #8.

## Optional / feature-gated

| What | Where | Env var(s) | When |
|---|---|---|---|
| **Chainlink VRF subscription + LINK** | https://vrf.chain.link (Base Sepolia) | `VRF_SUBSCRIPTION_ID`, VRF coordinator (in `chains.ts`) | Only if using on-chain RNG (`06`) |
| **Alchemy/other RPC per extra chain** | https://alchemy.com | `<CHAIN>_RPC_URL` | When adding EVM chains (`03`) |
| **Sentry (error monitoring)** | https://sentry.io | `SENTRY_DSN` | Recommended before production |

## Production-only [LATER]

| What | Where | Notes |
|---|---|---|
| **Gaming license** (e.g. Curaçao) | licensing agent | Required to operate for real money / to onboard studios (`09`, `13`) |
| **Third-party game provider contract + sandbox creds** | SOFTSWISS / BGaming / Slotegrator (see `09`) | `PROVIDER_<NAME>_OPERATOR_ID`, `_API_KEY`, `_HMAC_SECRET`, `_LAUNCH_URL` |
| **Azuro affiliate address** | Azuro docs / dashboard | For frontend fee revenue (`08`) |
| **Fiat on-ramp** (card→USDC) | e.g. Transak / MoonPay / Coinbase Onramp | Out of MVP scope |
| **Base mainnet USDC + real ETH gas** | fund the production signer | Mainnet deploy |

## What the owner needs to do before "go" (MVP)
1. Create accounts and fetch items **1–8** above (all free, ~15 min).
2. Paste the values when the agent prompts (or into Vercel env + local `.env`).
3. Fund the settlement signer address (item 9) from the faucet (item 8) once the agent gives you the
   address.

Everything else — contracts, backend, games, frontend wiring — the agents build.

## Env var summary (names are the contract with the code)
```
# Public (frontend, safe to expose)
VITE_REOWN_PROJECT_ID=
VITE_THIRDWEB_CLIENT_ID=
VITE_CHAIN_ID=84532
VITE_VAULT_ADDRESS=            # filled after deploy

# Server-only (Vercel env / local .env — NEVER committed)
THIRDWEB_SECRET_KEY=
BASE_SEPOLIA_RPC_URL=
SETTLEMENT_SIGNER_PRIVATE_KEY=
WALLET_CALLBACK_HMAC_SECRET=
SESSION_JWT_SECRET=
POSTGRES_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
# optional
VRF_SUBSCRIPTION_ID=
SENTRY_DSN=
# provider (later)
PROVIDER_BGAMING_OPERATOR_ID=
PROVIDER_BGAMING_API_KEY=
PROVIDER_BGAMING_HMAC_SECRET=
PROVIDER_BGAMING_LAUNCH_URL=
```

_Last updated: 2026-07-01_
