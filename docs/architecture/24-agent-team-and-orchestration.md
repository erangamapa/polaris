# 24 — Agent Team & Orchestration

> How the build is executed by a **team of specialized agents**, assigned by **task complexity** and
> run on the **right model** for cost/capability. An **Orchestrator** spawns roles per phase, splits work,
> runs the per-phase QA connectivity gate (`22`), and only escalates real blockers. Research is mostly
> done (`23`), so a Researcher is spawned **only if** an unknown surfaces.

## Model tiers (assign by complexity, not by role name)
- **Opus 4.8** (`claude-opus-4-8`) — architecture, novel/complex integration (on-chain bet flows,
  affiliate enforcement, non-custody), security-sensitive code, cross-cutting decisions, final review.
- **Sonnet 4.6** (`claude-sonnet-4-6`) — standard implementation that follows the docs (backend
  endpoints, frontend screens, DevOps, SDK wiring).
- **Haiku 4.5** (`claude-haiku-4-5`) — mechanical/repetitive + **connectivity verification** (RPC/subgraph
  smoke checks, running headless test scripts, simple edits, formatting).
- **Fable 5** (`claude-fable-5`) — optional for fast, polished frontend/UX passes.

> Rule: escalate a task to a higher tier if it's ambiguous, security-touching, or cross-cutting;
> downgrade routine/verification work to save cost.

## Roles

| Role | Model (default) | Owns |
|---|---|---|
| **Orchestrator / Tech Lead** | Opus 4.8 | plan, split work, sequence phases, spawn roles, review, gate, escalate |
| **Architect** | Opus 4.8 | `packages/shared` contracts (types, `chains.ts`), integration approach, high-risk design review (`14` affiliate/non-custody) |
| **Web3 / Integration Engineer** | Opus 4.8 (complex) / Sonnet 4.6 (routine) | BetSwirl + Azuro SDK integration, wallet connect, bet flows, affiliate wiring |
| **Backend Engineer** | Sonnet 4.6 | thin Vercel funcs (`/balance`,`/history`,`/bet/prepare`), subgraph queries, affiliate enforcement, optional cache |
| **Frontend Engineer** | Sonnet 4.6 (or Fable 5) | Connect-Wallet + screens, bet-history UI, funds panel, network CTA, wire hooks (`10`) |
| **QA / Connectivity Verifier** | Haiku 4.5 (Sonnet if deep) | per-phase API-level checks + E2E (`22`): RPC up, subgraph responds, headless test bet, affiliate attribution, revenue-to-house-wallet |
| **DevOps Engineer** | Sonnet 4.6 (Haiku for rote) | monorepo restructure, `vercel.json`, provision/preflight scripts, deploy, env wiring (`17`,`20`) |
| **Researcher** | Sonnet 4.6 | **conditional** — only if a `23` item is unresolved or a protocol detail is missing |

## Work split by phase (maps to `12`)

| Phase (`12`) | Lead role(s) | Support | QA gate (`22`) |
|---|---|---|---|
| 0 Prep & creds | Orchestrator | DevOps | — |
| 0.5 Discovery 🔒 | Orchestrator + Architect | QA (smoke), Researcher *(if needed)* | RPC/subgraph reachable; headless test bet per protocol |
| 1 Restructure | DevOps | — | build green |
| 2 Wallet + auth UI | Web3 + Frontend | — | connect works; switch-chain CTA |
| 3 Azuro (sports) | Web3/Integration | Backend | signed order settles on-chain; affiliate == ours |
| 4 BetSwirl (casino) | Web3/Integration | Frontend | test bet settles (VRF); commission attributed |
| 5 Thin backend | Backend | Architect (review) | endpoints correct; forged affiliate rejected |
| 6 Bet history | Frontend + Backend | — | subgraph returns just-placed bets; explorer links |
| 7 Unified balance | Frontend + Web3 | — | balance correct on Base Sepolia |
| 8 Responsible gambling UI | Frontend | — | controls functional |
| 9 Hardening + E2E | QA (lead) + Orchestrator | all | full headless E2E + revenue to house wallet |

## Parallelization
- After Phases 1–2, the **Azuro track (3)** and **BetSwirl track (4)** run **in parallel** (two Integration
  Engineers); **Backend (5)** and **Frontend (6–8)** proceed alongside once their contracts exist.
- **Coordinate on `packages/shared`** (types, `chains.ts`, affiliate helpers) — the Architect owns it;
  changes there are announced so parallel agents stay in sync.
- **QA runs continuously**, not just at the end (`22`).

## Orchestration mechanics
1. Orchestrator runs **Discovery (`23`)** first; spawns Researcher only for unresolved items.
2. For each phase, Orchestrator spawns the lead role(s) with the relevant doc sections as their brief,
   on the model tier above.
3. Each phase ends with the **QA connectivity gate**; must be green before the next (fail → fix in place,
   escalate if blocked, `22`).
4. Architect reviews security-sensitive work (affiliate enforcement, non-custody) before merge.
5. Orchestrator integrates, keeps `main` building, and produces the final handoff (`21`).

## Cost discipline
- Verification/rote → Haiku; standard build → Sonnet; only architecture/complex/security → Opus.
- Don't spawn a Researcher when `23` already answers it. Reuse a running agent (continue) rather than
  re-spawning cold where possible.

_Last updated: 2026-07-01_
