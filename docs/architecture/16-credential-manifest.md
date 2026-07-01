# 16 — Credential Manifest (Authoritative, Machine-Checkable)

This is the **single source of truth** for every credential the build needs. It supersedes the
friendly summary in `11` for automation purposes. Each entry states its **acquisition class** — who
gets it and whether an agent can obtain/derive it — verified against each provider's actual docs.

The goal: reduce the human to a **one-time bootstrap drop** of the `HUMAN_*` items, after which an
agent provisions, configures, funds (testnet), deploys, and tests everything with **zero further
involvement**. See `17-build-autonomy-protocol.md` for the runtime protocol.

## Acquisition classes
- **`AGENT_GENERATED`** — the agent creates it locally (keypair / random secret). No human.
- **`AGENT_PROVISIONED`** — the agent creates it via a provider API, using a `HUMAN_BOOTSTRAP` token.
- **`HUMAN_BOOTSTRAP`** — a human must create the account and mint one token/ID (email/CAPTCHA/2FA
  gated — an agent cannot). One-time, ~2 min each.
- **`HUMAN_CONTRACT`** — requires a signed legal/commercial agreement (game studios, licensing).
- **`HUMAN_FUNDING`** — requires real money / card (mainnet only).

## The manifest

| Key / Env var | Provider | Class | How obtained / verified | Agent uses it to… |
|---|---|---|---|---|
| `VERCEL_TOKEN` | Vercel | **✅ LOCAL DONE / CI-ONLY** | CLI already authenticated locally (`vercel whoami` → `erangamapa`, team `erangamapas-projects`) — agent builds/deploys **now, no token needed**. `VERCEL_TOKEN` from https://vercel.com/account/tokens is required **only** as a GitHub Actions secret for CI/CD auto-deploy. CLI calls use `--scope erangamapas-projects`. | create project, set env vars, provision Postgres + KV, deploy |
| `POSTGRES_URL` | Vercel/Neon | **AGENT_PROVISIONED** | agent provisions via Vercel Storage/Marketplace API using `VERCEL_TOKEN`. Verify: `SELECT 1`. | ledger DB |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Vercel/Upstash | **AGENT_PROVISIONED** | agent provisions KV via `VERCEL_TOKEN`. Verify: `PING`. | sessions/nonces |
| `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET` | Coinbase CDP | **HUMAN_BOOTSTRAP** | https://portal.cdp.coinbase.com → API keys. Verify: authenticated SDK call. | **programmatic testnet funding** (Faucets API: ETH + USDC on base-sepolia) |
| `ALCHEMY_ADMIN_TOKEN` | Alchemy | **HUMAN_BOOTSTRAP** | https://dashboard.alchemy.com → access/admin token. Verify: `GET admin-api.alchemy.com/v1/apps`. | create app + RPC key programmatically |
| `BASE_SEPOLIA_RPC_URL` | Alchemy (or thirdweb) | **AGENT_PROVISIONED** | agent creates app via `ALCHEMY_ADMIN_TOKEN` (`POST /v1/apps`); or use thirdweb RPC (skip Alchemy). Verify: `eth_blockNumber`. | on-chain reads/writes |
| `VITE_THIRDWEB_CLIENT_ID`, `THIRDWEB_SECRET_KEY` | thirdweb | **HUMAN_BOOTSTRAP** | https://thirdweb.com/dashboard → Settings → API Keys. Verify: authenticated call. | smart accounts, session keys, bundler, paymaster |
| `VITE_REOWN_PROJECT_ID` | Reown | **HUMAN_BOOTSTRAP** | https://dashboard.reown.com → new AppKit project. Verify: format/presence (used client-side). | wallet-connect UI |
| `SETTLEMENT_SIGNER_PRIVATE_KEY` | — | **AGENT_GENERATED** | agent generates keypair; **funds it via CDP Faucets API** (needs `CDP_API_KEY_*`). Verify: address has gas. | relayer that submits `Vault.settle` (bounded by permission) |
| `WALLET_CALLBACK_HMAC_SECRET` | — | **AGENT_GENERATED** | agent generates random 32B. Verify: presence/length. | sign/verify `/wallet/*` callbacks |
| `SESSION_JWT_SECRET` | — | **AGENT_GENERATED** | agent generates random 32B. Verify: presence/length. | sign launch/session tokens |
| `VITE_VAULT_ADDRESS` | — | **AGENT_PROVISIONED** | agent deploys `Vault.sol` (needs funded signer) and writes the address. Verify: code at address. | frontend + backend contract binding |
| `AZURO_AFFILIATE_ADDRESS` | — | **AGENT_GENERATED** (testnet) / **HUMAN** (mainnet) | a wallet WE control that receives Azuro affiliate GGR. Public, not secret. Testnet: agent generates. Mainnet: human provides a secured revenue wallet. Server env; enforced server-side (`08`, `14` T9). | claim + attribute Azuro affiliate rewards |

### Optional / feature-gated

| Key | Provider | Class | Notes |
|---|---|---|---|
| `VRF_SUBSCRIPTION_ID` | Chainlink | **AGENT_PROVISIONED** (needs testnet LINK) | agent creates the VRF sub on-chain with a funded wallet; **LINK faucet may be CAPTCHA-gated** → LINK funding can be `HUMAN_BOOTSTRAP`. Only if on-chain RNG is used (`06`). |
| `SENTRY_DSN` | Sentry | **HUMAN_BOOTSTRAP** | error monitoring; recommended pre-prod. |
| `PROVIDER_<NAME>_{OPERATOR_ID,API_KEY,HMAC_SECRET,LAUNCH_URL}` | game studio | **HUMAN_CONTRACT** | SOFTSWISS/BGaming/Slotegrator sandbox. Only for branded content (`09`). Own games need none. |

### Production-only

| Item | Class | Notes |
|---|---|---|
| Gaming license (e.g. Curaçao) | **HUMAN_CONTRACT** | required to operate real-money / onboard studios (`13`). |
| Mainnet USDC + real gas | **HUMAN_FUNDING** | fund the production signer with real money. |
| Fiat on-ramp keys (Transak/MoonPay/CDP Onramp) | **HUMAN_BOOTSTRAP** | out of MVP scope. |

## Tooling & access prerequisites (non-secret — for an uninterrupted build)

The build uses **CLIs + SDK-scripts only — no MCPs** (see `17`). Most tooling the agent installs itself;
a couple of items the human must ensure so the build doesn't stall mid-run.

| Item | Class | Notes |
|---|---|---|
| `vercel` CLI | **AGENT** installs | `npm i -g vercel` (auth via `VERCEL_TOKEN`) |
| Foundry (`forge`/`cast`/`anvil`) | **AGENT** installs | `foundryup` |
| `@coinbase/cdp-sdk`, `thirdweb`, `viem`, Azuro SDK | **AGENT** installs | project deps, run as scripts |
| **`gh` authenticated** | **✅ VERIFIED DONE** | authed as `erangamapa` with scopes `repo`, `workflow` (create private repos, commit, push, CI files). Missing `delete_repo` (can't delete repos via CLI — irrelevant; we build in this repo). |
| **`vercel` CLI authenticated** | **✅ VERIFIED DONE** | logged in as `erangamapa`; local build/deploy works now (use `--scope erangamapas-projects`). |
| **Permission to run CLIs/installs/deploys without per-command prompts** | **HUMAN grants** | autonomous permission mode / tool allowlist (`vercel`, `forge`, `cast`, `npm`, `git`, `gh`, `node`, `psql`) — otherwise each command pauses for approval |
| `git`, `node`, `npm`, `vercel` CLI | ✅ present | baseline (Vercel CLI 51.2.1 installed) |
| Foundry (`forge`/`cast`) | **AGENT** installs | `foundryup` |
| Playwright | **only if requested** | browser E2E is opt-in |

## The irreducible human list (everything else is agent-side)

**✅ Already verified (no action needed):** GitHub (`gh`, scopes `repo`+`workflow`) and Vercel (CLI
logged in, team `erangamapas-projects`) — the agent can create repos, commit/push, and build/deploy now.

To **start** the testnet build, the human provides **only these three crypto-provider credentials**
(paste into `.env.bootstrap`), then grants run permission and says "build":

1. `CDP_API_KEY_ID` + `CDP_API_KEY_SECRET` — https://portal.cdp.coinbase.com (testnet funding)
2. `VITE_THIRDWEB_CLIENT_ID` + `THIRDWEB_SECRET_KEY` — https://thirdweb.com/dashboard (AA/session keys)
3. `VITE_REOWN_PROJECT_ID` — https://dashboard.reown.com (wallet connect)

Plus: **grant permission** to run CLIs/installs/deploys without per-command prompts.

**Not needed to start (defer):**
- `VERCEL_TOKEN` — only later, as a GitHub Actions secret for CI/CD auto-deploy (local deploy works now).
- `ALCHEMY_ADMIN_TOKEN` — optional; skip by using thirdweb RPC.

Everything else (Foundry install, DB, KV, RPC, signer keypair, testnet ETH+USDC funding, HMAC/JWT
secrets, contract deploy, env-var wiring, deploy) is **AGENT_GENERATED or AGENT_PROVISIONED**.

## What an agent fundamentally CANNOT do (the ceiling)
- Create the initial provider accounts (email confirmation / CAPTCHA / phone / 2FA).
- Mint the first bootstrap token behind a dashboard login.
- Sign B2B/legal contracts (game studios, licensing).
- Spend real money (mainnet funding, paid tiers requiring a card).

These are the `HUMAN_*` classes above. There is no way around provider-enforced human gates — the
manifest simply **minimizes** them to the shortest possible one-time list.

_Last updated: 2026-07-01_
