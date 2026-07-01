# 17 — Build Autonomy Protocol

How an agent takes this repo from "spec" to "deployed, tested, working on testnet" with **one
human bootstrap step and nothing else**. This is the runtime companion to the `16` manifest.

## The contract with the human (happens once)

The human performs exactly one action: **the bootstrap drop.**

1. Mint the **3 crypto-provider credentials** in `16`'s start list (CDP, thirdweb, Reown) — GitHub and
   Vercel are already authenticated locally, so nothing to do for them.
2. Paste them into an **untracked** `.env.bootstrap` at the repo root (gitignored; never committed).
3. Grant run permission and say "build."

That's it. Everything after is the agent.

```
# .env.bootstrap  (untracked — the ONLY thing the human provides to START a testnet build)
# GitHub (gh) + Vercel CLI are already authenticated locally — nothing to add for them.
CDP_API_KEY_ID=
CDP_API_KEY_SECRET=
VITE_THIRDWEB_CLIENT_ID=
THIRDWEB_SECRET_KEY=
VITE_REOWN_PROJECT_ID=
# --- deferred, not needed to start ---
# VERCEL_TOKEN=            # only for CI/CD auto-deploy (local deploy works via CLI login)
# ALCHEMY_ADMIN_TOKEN=     # optional; omit to use thirdweb RPC
```

## Build tooling — CLIs only, no MCPs

The entire build uses **CLIs + SDK-scripts run via Bash** — **no MCP servers required** (CLIs are more
token-efficient and their output can be filtered). SDKs (`@coinbase/cdp-sdk`, `thirdweb`, `viem`, Azuro)
run as scripts, not MCPs.

| Tool | Used for | Auth | Who installs |
|---|---|---|---|
| `vercel` CLI | deploy web+api, env, provision Postgres/KV, logs | `VERCEL_TOKEN` | **agent** (`npm i -g vercel`) |
| Foundry (`forge`/`cast`/`anvil`) | contract build/test/deploy/interact | RPC + signer key | **agent** (`foundryup`) |
| `gh` CLI | CI/CD workflows, PRs | GitHub auth | **human ensures** (see below) |
| `git`, `node`, `npm` | baseline | — | present |
| Playwright | browser E2E | — | **only if explicitly requested** |

Agent auto-installs the agent-owned tools during preflight; it does not need MCPs for any provider.

## Running uninterrupted — prerequisites (so the build doesn't stall)

For the agent to build straight through without stopping, ensure **before** saying "build":
1. **Bootstrap tokens** present in `.env.bootstrap` (the list above / `16`).
2. **`gh` authenticated** in the environment (or a `GITHUB_TOKEN` provided) — for CI/CD + PRs.
3. **Permission to run the CLIs/installs/deploys without a prompt per command** — run in an autonomous
   permission mode or pre-approve the tool allowlist (`vercel`, `forge`, `cast`, `npm`, `git`, `gh`,
   `node`, `psql`). Otherwise each command may pause for approval.

If any of these is missing the agent stops at preflight with the exact remediation — it never guesses.

## Step 0 — Preflight readiness gate (agent runs FIRST, always)

Before writing any build code, the agent runs a **preflight** that checks tooling + every credential in `16`:

```
packages/shared/scripts/preflight.ts   # agent-authored in Phase 0
```

Checks:
- **Tooling** → `vercel` (✅ installed + authed), `gh` (✅ authed: `repo`+`workflow`), `node`/`npm`
  (✅). If **Foundry** (`forge`/`cast`) is missing, **auto-install** (`foundryup`).
- **HUMAN_BOOTSTRAP (start set)** → `CDP_API_KEY_*`, `THIRDWEB_*`, `VITE_REOWN_PROJECT_ID` present in
  `.env.bootstrap`? valid? (CDP authed call, thirdweb authed call, Reown id format). If missing, STOP
  with the exact item + URL.
- **Deferred** → `VERCEL_TOKEN` (CI only), `ALCHEMY_ADMIN_TOKEN` (optional) — not required to start.
- **AGENT_GENERATED / AGENT_PROVISIONED** → created later; just check prerequisites exist.

Output = a readiness report. **If any HUMAN_BOOTSTRAP item is missing/invalid, STOP** and print the
exact item, its provider URL, and how to get it (from `16`). Never build blind, never guess a value,
never fake a credential.

## Step 1 — Auto-provision (agent, using bootstrap tokens)

The agent runs `packages/shared/scripts/provision.ts`, which:
1. **Vercel** (`VERCEL_TOKEN`): create/link the project; provision **Postgres** + **KV**; capture
   `POSTGRES_URL`, `KV_REST_API_*`.
2. **Alchemy** (`ALCHEMY_ADMIN_TOKEN`) *or thirdweb*: create the Base Sepolia app; capture
   `BASE_SEPOLIA_RPC_URL`.
3. **Generate secrets** (`AGENT_GENERATED`): `SETTLEMENT_SIGNER_PRIVATE_KEY` (keypair),
   `WALLET_CALLBACK_HMAC_SECRET`, `SESSION_JWT_SECRET`.
4. **Fund the signer** (`CDP_API_KEY_*` → CDP Faucets API): request Base Sepolia **ETH** (gas) and
   **USDC** to the signer address. Poll until confirmed.
5. **Write all derived values** into Vercel env (via API) **and** a local untracked `.env` for dev.
   Never into git.

Idempotent: re-running detects existing resources and reuses them.

## Step 2 — Build (agent, phases per `12`)

Proceed through `12-build-plan-phases.md`:
- Deploy `Vault.sol` (signer is funded) → write `VITE_VAULT_ADDRESS`.
- Build backend, session keys, games, frontend, Azuro.
- Each phase's Definition of Done must pass before the next.

## Step 3 — Autonomous end-to-end verification (agent)

The agent proves the whole loop **without a human wallet**, using an agent-controlled test wallet:
1. Generate a throwaway test EOA; fund it with test USDC via **CDP Faucets API**.
2. Script: connect → deposit → open session (lock) → play N slot rounds → settle → withdraw.
3. Assert: balances reconcile; rounds persisted + reproducible from seeds (`06`, `15`); threat-model
   checks pass (`14` T1/T2/T3/T5); no secret in the frontend bundle.

Because CDP funds testnet wallets programmatically, **the agent can run the full player journey
end-to-end with no human**, on testnet.

## Step 4 — Report

Agent outputs: deployed URLs, contract address + explorer link, preflight/verify results, E2E test
results, and any `HUMAN_CONTRACT`/`HUMAN_FUNDING` items deferred (e.g. studio games, mainnet).

## Secrets handling (ties to `13`)
- `.env.bootstrap` and `.env` are **gitignored**; secrets also live in **Vercel env** (server scope).
- Code references env var **names** only. Placeholders in all committed docs/examples.
- The agent scans diffs for secret-like strings before any commit (`13`).

## The honest boundary (repeat of `16`)
The agent does **everything** except: create provider accounts, mint the first dashboard token, sign
legal contracts, and spend real money. Those are provider-enforced human gates, minimized to the
one-time bootstrap drop above. For a **testnet MVP with our own games**, that boundary is ~5 tokens;
for **branded studio games or mainnet**, add the `HUMAN_CONTRACT` / `HUMAN_FUNDING` items.

## TL;DR
```
Human:  create ~5 accounts → mint tokens → paste into .env.bootstrap → say "build"
Agent:  preflight → provision (DB/KV/RPC/secrets/fund signer) → deploy contract →
        build all phases → run full E2E on testnet → report
```

_Last updated: 2026-07-01_
