# 16 — Credential Manifest (Authoritative)

> **Updated for the BetSwirl + Azuro pivot.** The old custody stack is gone, so most old credentials are
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
| **House / affiliate wallet** (seed + key + address) | — (a wallet we control) | **AGENT_GENERATED** | agent creates a 12-word wallet; sets its address as **both** `BETSWIRL_AFFILIATE_ADDRESS` and `AZURO_AFFILIATE_ADDRESS` (config only — no testnet registration); funds gas for BetSwirl claims; stores in gitignored `.secrets/house-wallet.json`; **hands you the seed** (`21`, `19`). | receive/verify casino + sports commissions |
| `ARBITRUM_RPC_URL` (+ Base Sepolia RPC) | Alchemy / public | **AGENT_PROVISIONED / public** | reads (balance/history). Public RPC or Alchemy app. | chain reads |
| Testnet funds | BetSwirl/Azuro faucets or Coinbase CDP | **AGENT** | fund the player + house wallets on Base Sepolia (`21`). Faucets, or `CDP_API_KEY_*` if using CDP. | E2E + your handoff wallets |
| **Player test wallet** (seed + key) | — | **AGENT_GENERATED** | agent creates a 12-word wallet, funds it on Base Sepolia, stores it in gitignored `.secrets/test-wallet.json`, and **hands you the seed** at completion (`21`). Testnet-only, disposable. | you import into MetaMask → connect → play |

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
2. *(optional)* Coinbase CDP keys **or** rely on BetSwirl/Azuro testnet faucets for test funds.
3. Grant permission to run CLIs/installs/deploys without per-command prompts.

Everything else is **AGENT_GENERATED / AGENT_PROVISIONED**, including both **testnet wallets**:
- the **house / affiliate wallet** (set as BetSwirl + Azuro affiliate, gas-funded, revenue verified), and
- the **player wallet** (funded to play).
Both seeds are handed to you at the end to load and verify. **No wallet setup or registration is needed
from you on testnet.**

(Mainnet-only, out of scope here: gaming licence, a secured production house wallet, **Azuro payout
registration** (the form with Azuro's team), and geoblock.)

## Tooling (CLIs only, no MCPs)
`vercel` (✅ authed), `gh` (✅ authed), `node`/`npm` (✅). BetSwirl SDK, Azuro SDK, wagmi/viem = project deps.
No Foundry/signer needed (no contracts to deploy for the MVP). Playwright only if requested.

_Last updated: 2026-07-01_
