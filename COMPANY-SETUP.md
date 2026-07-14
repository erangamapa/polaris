# Boyzz → TriBet — Company & AI-Agent Ops Setup

> **Boyzz** = umbrella company (internal, invisible to the public).
> **TriBet** = the front-facing product/brand (domain, app, marketing).
> The public only ever sees **TriBet**. The two are connected by a single private
> deploy pipeline — nothing else, no public correlation.

---

## Architecture diagram

```
╔══════════════════════════ BOYZZ · umbrella co · INTERNAL ONLY ══════════════════════════╗
║                                                                                          ║
║   ☁  24/7 AI AGENT TEAM                      host: cheap VPS / Fly.io  (~$10/mo)          ║
║   ┌────────────────────────────────────────────────┐                                     ║
║   │  Orchestrator / Tech Lead ........ Opus         │   BRAINS = one Claude subscription  ║
║   │   ├─ Architect ................... Fable        │   (Max / Team — flat rate,          ║
║   │   ├─ Senior Engineers ............ Sonnet       │    NOT metered API tokens)          ║
║   │   ├─ Junior Engineers ............ Haiku        │                                     ║
║   │   └─ Routine bots / cron scripts . Haiku        │   cheap models do the rote work,    ║
║   └────────────────────────────────────────────────┘   Fable/Opus only for architecture  ║
║                                                                                          ║
║            read task ─► branch ─► code ─► PR ─► deploy ─► notify ─► close                 ║
║                                                                                          ║
║      ┌───────────┬────────────┬─────────────┬──────────────┬───────────────────┐        ║
║      ▼           ▼            ▼             ▼              ▼                   ▼        ║
║  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ ┌────────────┐   ║
║  │ LINEAR │ │  GITHUB  │ │  VERCEL  │ │  SLACK   │ │ GOOGLE WORKSPACE│ │  SENTRY /  │   ║
║  │ (boyzz)│ │  org     │ │  team    │ │ (boyzz)  │ │   boyzz.xyz     │ │  logs      │   ║
║  │ tasks  │ │ (boyzz)  │ │ (boyzz)  │ │  alerts  │ │ email·SSO·Drive │ │  errors    │   ║
║  │ sprints│ │ priv repo│ │ CI+build │ │          │ │                 │ │            │   ║
║  └────────┘ └────┬─────┘ └────┬─────┘ └──────────┘ └────────────────┘ └────────────┘   ║
║                  └─ merge ────►│                                                         ║
╚═══════════════════════════════╪══════ private deploy · the ONLY link ═══════════════════╝
                                 ▼
╔══════════════════════ TRIBET · front-facing brand · WHAT THE WORLD SEES ═════════════════╗
║                                                                                          ║
║        🌐  tribet.gg  ─────────────  the app (served by Boyzz's Vercel)                   ║
║             whois-private · no "operated by Boyzz" anywhere                               ║
║                                                                                          ║
║        ✉   hello@tribet.gg · marketing@tribet.gg   (TriBet identity, secondary domain)   ║
║                                                                                          ║
║        👥  players  ───────────────  only ever touch tribet.gg                            ║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## What each link does (one line each)

| Link | Purpose |
|------|---------|
| **Linear → agents** | Agents poll Linear, pick a task, execute it. |
| **agents → GitHub** | Create a branch + PR with the code. |
| **GitHub → Vercel** | Merge to `main` auto-builds & deploys. |
| **Vercel → tribet.gg** | The deployed app is served on the TriBet domain *(the only Boyzz→TriBet link — private)*. |
| **agents → Slack** | Post status / alerts / blockers. |
| **Google Workspace** | Internal email, SSO login, shared Drive/docs. |
| **Sentry / logs** | Runtime errors feed back to agents as new tasks. |

**The loop:** `Linear task → agent codes → GitHub PR → CI → Vercel deploy → Slack ping → Linear closed`.

---

## Boyzz ↔ TriBet separation (no correlation)

| | **Boyzz** (internal) | **TriBet** (public) |
|---|---|---|
| Used for | all tooling, code, ops, agents | domain, app, marketing |
| Names everywhere | Linear / Slack / GitHub / Vercel / Workspace = **boyzz** | tribet.gg, emails **@tribet.gg** |
| Visible to public? | **never** | yes |
| The only link | domain attached inside Boyzz's Vercel project (private) | — |

**Keep it clean:**
- `whois` **privacy** on tribet.gg.
- **No "operated by Boyzz"** in any public footer/ToS/social.
- TriBet email = **secondary domain** in the Boyzz Google Workspace (or its own).
- No shared analytics IDs, social handles, or support addresses across the two.

---

## Cheap tier stack (≈5 seats)

| Tool | Tier | ~Cost | Role |
|------|------|-------|------|
| **Claude** (agent brains) | 1 Max seat (Fable/Opus) + Team seats | main cost; **flat-rate, not tokens** | the AI employees |
| **Linear** | Free → Standard | $0–8 / user | task manager |
| **Slack** | Free | $0 | comms / alerts |
| **Google Workspace** | Business Starter | ~$6 / user | email · SSO · Drive |
| **Vercel** | Pro (commercial use) | ~$20 (1–2 seats) | hosting / CI-CD |
| **GitHub** | Free (unlimited private collaborators) | $0 | source control |
| **Cloud host** | small VPS / Fly.io | ~$10 | runs the agent team 24/7 |

**The one cost lever:** run the agents on a **flat-rate Claude subscription** (Max/Team), not the metered API — and assign **Haiku** to routine work, reserving **Fable/Opus** only for architecture. That's how you get all models running 24/7 without huge token bills.

---

## AI agent team → roles → models

| Agent role | Model | Does |
|---|---|---|
| Architect | **Fable** | system design, high-level decisions |
| Tech Lead / Orchestrator | **Opus** | plan, split work, review, gate, deploy |
| Senior Engineer(s) | **Sonnet** | feature build, integrations |
| Junior Engineer(s) | **Haiku** | small tasks, fixes, tests |
| Routine bots / cron | **Haiku** / scripts | housekeeping, monitoring, digests |

Escalate a task to a higher model only if it's ambiguous / security-touching; downgrade rote work to Haiku to save cost.

---

## One caveat (not a tooling issue)
A holding-co + product-brand split is standard and legal, but a real-money gambling
operator still needs **licensing + geoblocking + KYC/AML** regardless of branding.
The Boyzz/TriBet separation reduces brand exposure — it does **not** remove legal
obligation. Get a gaming lawyer for target markets before going to mainnet/real money.

_Last updated: 2026-07-14_
