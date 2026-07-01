# 16 — Credential Manifest (Authoritative)

> **Updated for the WINR + Azuro pivot.** The old custody stack is gone, so most old credentials are
> **removed** (settlement signer, HMAC secret, session-JWT, Vault address, thirdweb AA keys, CDP as a
> hard requirement). The set below is what the integrator model actually needs.

Acquisition classes: **AGENT_GENERATED** (agent makes it) · **AGENT_PROVISIONED** (agent creates via a
provider API) · **HUMAN_BOOTSTRAP** (human mints; account/CAPTCHA-gated) · **✅ DONE** (already available).

## Manifest

| Key / Env var | Provider | Class | How obtained / notes | Used for |
|---|---|---|---|---|
| GitHub (`gh`) | GitHub | **✅ DONE** | authed as `erangamapa` (`repo`,`workflow`) | repo, CI, PRs |
| Vercel (CLI) | Vercel | **✅ DONE** | CLI logged in; deploy works (`--scope erangamapas-projects`) | hosting, thin backend |
| `VITE_REOWN_PROJECT_ID` | Reown | **HUMAN_BOOTSTRAP** | https://dashboard.reown.com → AppKit project | wallet connect |
| `WINR_AFFILIATE_ID` | — (a wallet we control) | **AGENT_GENERATED** | address/identifier WINR attributes commission to. Confirm exact format/registration from docs.winr.games at build time (integration is permissionless). | casino revenue attribution |
| `AZURO_AFFILIATE_ADDRESS` | — (a wallet we control) | **AGENT_GENERATED** | address Azuro attributes affiliate GGR to. Public, not secret; enforced server-side (`14` T9). | sports revenue attribution |
| `ARBITRUM_RPC_URL` (+ WINR Chain RPC) | Alchemy / public | **AGENT_PROVISIONED / public** | reads (balance/history). Public RPC or Alchemy app. | chain reads |
| Testnet funds | WINR/Azuro faucets or Coinbase CDP | **AGENT** | fund the MetaMask test wallet across chains (`21`). WINR/Azuro testnet faucets, or `CDP_API_KEY_*` if using CDP. | E2E + your handoff wallet |
| **MetaMask test wallet** (seed + key) | — | **AGENT_GENERATED** | agent creates a 12-word wallet, funds it on all supported testnet chains, stores it in gitignored `.secrets/test-wallet.json`, and **hands you the seed phrase** at completion (`21`). Testnet-only, disposable. | you import into MetaMask → connect → play |

### Optional
| Key | Provider | Class | Notes |
|---|---|---|---|
| `VERCEL_TOKEN` | Vercel | HUMAN_BOOTSTRAP | only for CI/CD auto-deploy (local deploy already works) |
| `POSTGRES_URL` / `KV_REST_API_*` | Vercel | AGENT_PROVISIONED | only if we add the optional read cache (`05`, `15`) |
| `CDP_API_KEY_ID/SECRET` | Coinbase CDP | HUMAN_BOOTSTRAP | only if funding test wallets via CDP instead of protocol faucets |
| `SENTRY_DSN` | Sentry | HUMAN_BOOTSTRAP | error monitoring, pre-prod |

### Removed (no longer needed)
`SETTLEMENT_SIGNER_PRIVATE_KEY`, `WALLET_CALLBACK_HMAC_SECRET`, `SESSION_JWT_SECRET`, `VITE_VAULT_ADDRESS`,
`THIRDWEB_*` (AA/session keys), and Postgres/KV as a source of truth — all obsolete with the non-custodial
protocol pivot.

## The irreducible human list

**✅ Already done:** GitHub, Vercel (local).

**To start the testnet build, provide only:**
1. `VITE_REOWN_PROJECT_ID` — https://dashboard.reown.com
2. *(optional)* Coinbase CDP keys **or** rely on WINR/Azuro testnet faucets for test funds.
3. Grant permission to run CLIs/installs/deploys without per-command prompts.

Everything else (affiliate addresses on testnet, RPC, cache if used, build, deploy, E2E) is
**AGENT_GENERATED / AGENT_PROVISIONED**.

(Mainnet — gaming licence, secured wallets, geoblock — is out of scope for this testnet build.)

## Tooling (CLIs only, no MCPs)
`vercel` (✅ authed), `gh` (✅ authed), `node`/`npm` (✅). WINR SDK, Azuro SDK, wagmi/viem = project deps.
No Foundry/signer needed (no contracts to deploy for the MVP). Playwright only if requested.

_Last updated: 2026-07-01_
