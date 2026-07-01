# Polaris — Architecture & Build Specification

This directory is the **build blueprint** for turning Polaris from a mock-data prototype into a
**non-custodial, on-chain, connect-wallet-and-play** real-money entertainment platform
(Casino + Predictions + Sportsbook), starting on testnet.

It is written to be executed by **Claude Code and its agents**. Each file is a self-contained
section with concrete interfaces, schemas, env var names, and acceptance criteria.

> **Status: SPECIFICATION — build not yet started.** These are the instructions to build from.

## How to use these docs (for agents)

1. Read `00-overview.md` first — it defines the vision, the market gap, and the core model.
2. Read `11-credentials-and-signups.md` — the human owner must fetch the listed keys before the
   build can run end-to-end. Nothing that needs a key gets built blind; stub + flag instead.
3. Follow `12-build-plan-phases.md` — the phased, dependency-ordered build sequence. Each phase has
   a Definition of Done. Do not start a phase until its dependencies are green.
4. Consult the layer docs (`03`–`10`) for the detailed spec of whatever you're building.
5. Respect `13-security-compliance.md` on every phase — secrets, session-key scoping, non-custodial
   guarantees are non-negotiable.

## File index

| File | Section |
|---|---|
| `00-overview.md` | Vision, the gap we bridge, model comparison, glossary |
| `01-system-architecture.md` | Full system diagram, components, end-to-end data flow |
| `02-monorepo-structure.md` | Repo layout, workspaces, tooling, conventions |
| `03-blockchain-layer.md` | Chains (multi-chain strategy), Vault contract spec, USDC, chain config |
| `04-wallet-and-session-keys.md` | Account abstraction, session keys, the fast-play loop |
| `05-backend-seamless-wallet.md` | Vercel functions, endpoints, ledger schema, HMAC, settlement |
| `06-provably-fair-engine.md` | Commit-reveal RNG, verification, Chainlink VRF option |
| `07-casino-games.md` | In-house games, iframe protocol, launch flow, balance loading |
| `08-sports-and-predictions-azuro.md` | Azuro integration, unified balance, UX reconciliation |
| `09-third-party-game-providers.md` | Seamless-wallet bridge for studio content (contract-gated) |
| `10-frontend-integration.md` | Existing app wiring, wallet connect, deposit UI |
| `11-credentials-and-signups.md` | **All keys/tokens/registrations + sign-up URLs** |
| `12-build-plan-phases.md` | Phased build sequence for agents, milestones, DoD |
| `13-security-compliance.md` | Secrets, session-key scope, non-custodial guarantees, compliance flags |
| `14-security-threat-model.md` | Anti-exploit: drain vectors (withdraw-before-settle, client-reported wins…) + tested defenses |
| `15-data-persistence.md` | What's stored vs on-chain, bet history, retention, wallet reconnect/recovery |
| `16-credential-manifest.md` | **Authoritative** machine-checkable credential list + acquisition class (agent vs human) |
| `17-build-autonomy-protocol.md` | How the agent builds end-to-end from one human bootstrap drop (preflight → provision → build → E2E) |
| `18-runtime-topology.md` | Where everything runs — our services/DB on Vercel, custody on Base, SaaS APIs we call |
| `19-monetization.md` | Revenue stack — casino house edge (owned) + Azuro affiliate GGR share + minor streams |
| `20-infrastructure-and-deployment.md` | IaC & deployment — everything (config, crons, CI/CD, provisioning) lives in the one repo |

## The one-sentence summary

Player connects their own wallet → deposits USDC once into a **non-custodial vault contract** →
grants a **scoped session key** → plays casino rounds resolved **off-chain at web speed** by a
**provably-fair seamless-wallet backend** → net result **settles on-chain** → withdraws anytime.
Sports & Predictions are powered by the **Azuro** on-chain protocol. Deposits and withdrawals touch
the chain; individual bets do not.

_Last updated: 2026-07-01_
