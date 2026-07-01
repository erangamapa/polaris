# 18 — Runtime Topology (Where Everything Runs)

> **Updated for the BetSwirl + Azuro pivot.** No custom Vault, no settlement signer, no off-chain ledger,
> no seamless-wallet backend. Our footprint is a frontend + a thin read-only backend on Vercel; the
> heavy lifting (custody, bankroll, RNG, settlement) is on the protocols' chains.

## Diagram

```
        ┌──────────────────── VERCEL (everything we run) ────────────────────┐
        │  apps/web (React SPA)  ──  Reown/wagmi wallet connect               │
        │        │                                                            │
        │        ▼                                                            │
        │  apps/api (thin serverless): GET /balance, /history (read-only),    │
        │  POST /bet/prepare (inject affiliate), /geo gate, /session          │
        │        │  (+ optional cache: Vercel KV/Postgres)                     │
        └────────┼───────────────┬───────────────────────┬───────────────────┘
                 │ reads         │ casino                 │ sports/predictions
                 ▼               ▼                        ▼
        ┌────────────────┐  ┌─────────────────┐   ┌──────────────────────┐
        │ Indexers/RPC   │  │ BetSwirl   │   │ Azuro Protocol       │
        │ BetSwirl subgraph   │  │ Base Sepolia    │   │ Polygon/Gnosis/…)    │
        │ Arbitrum RPC   │  │ bankroll·VRF·   │   │ liquidity·odds·      │
        │                │  │ settlement·games│   │ settlement·markets   │
        └────────────────┘  └─────────────────┘   └──────────────────────┘
                 ▲                   ▲                        ▲
                 └──────── player wallet (non-custodial) ─────┘
                            LI.FI bridging if cross-chain
```

## Where each thing runs

| Thing | Runs on | Notes |
|---|---|---|
| Frontend SPA + game lobby | **Vercel** (static/CDN) | the existing app |
| Thin backend (reads, affiliate inject, geo gate) | **Vercel** functions | no custody, no money path |
| Optional cache | **Vercel KV / Postgres** | speed only, not source of truth |
| Casino (games, bankroll, VRF, settlement) | **Base Sepolia** (Base Sepolia) | consumed via BetSwirl SDK |
| Sports/predictions (markets, liquidity, settlement) | **Azuro chain** | consumed via Azuro SDK |
| Wallet connect relay | **Reown / WalletConnect** | client-side |
| Chain reads (balance/history) | **RPC + BetSwirl subgraph + Azuro subgraph** | Alchemy/public RPC |
| Cross-chain bridging | **LI.FI** | not needed (co-located on Base Sepolia); only if later split |
| Custody of funds | **player's own wallet** | non-custodial end to end |

## No always-on server, no signer

- No deposit-watcher, no settlement cron, no signer key — the protocols settle on-chain themselves.
- The backend is stateless read/gate functions. Optional cache refresh can be a light Vercel Cron.

## Secrets vs origin

| Origin | Holds secrets? | Talks to |
|---|---|---|
| Frontend | ❌ public only (`VITE_*`) | Reown, BetSwirl SDK, Azuro SDK, RPC reads, our `/api` |
| Thin backend | ✅ minimal (affiliate config, RPC/API keys) | RPC, indexers, subgraph |
| Build/test scripts | ✅ from `.env.bootstrap` | Vercel provisioning, testnet faucets |

No settlement signer, HMAC-callback secret, or session-JWT-for-custody exists anymore.

## By provider (one line each)
- **Vercel** — frontend + thin backend + optional cache. *All we run.*
- **BetSwirl** — casino (bankroll/VRF/settlement/games) on Base Sepolia.
- **Azuro** — sports/predictions (liquidity/odds/settlement/markets).
- **Reown** — wallet connect.
- **RPC/indexers** (Alchemy/public + BetSwirl subgraph + Azuro subgraph) — reads.
- **LI.FI** — cross-chain bridging for unified balance.

_Last updated: 2026-07-01_
