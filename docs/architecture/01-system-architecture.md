# 01 — System Architecture

> **BetSwirl + Azuro integrator model.** No custody, no bankroll, no own settlement/RNG. This supersedes the
> earlier custom-stack architecture.

## High-level diagram

```
                    ┌───────────────────────────────────────────────────────┐
                    │              FRONTEND (apps/web)                        │
                    │  React + Vite · Reown/wagmi/viem wallet connect         │
                    │  Lobby · unified balance · bet history · 3 verticals    │
                    └───────┬───────────────┬───────────────────┬────────────┘
                            │               │                   │
                (wallet UX) │   (casino)    │   (sports/pred)    │ (reads: balance/history)
                            │               │                   │
                    ┌───────▼──────┐  ┌─────▼───────────┐  ┌────▼──────────────────┐
                    │ BetSwirl SDK     │  │ Azuro SDK       │  │ THIN BACKEND (apps/api)│
                    │ casino games │  │ sports markets  │  │ Vercel functions       │
                    │ on Base Sepolia   │  │ on Azuro chain  │  │ read-only aggregation, │
                    └───────┬──────┘  └─────┬───────────┘  │ affiliate inject,      │
                            │               │              │ session tokens (UX)    │
                            │               │              └────┬───────────────────┘
                    ┌───────▼──────┐  ┌─────▼───────────┐       │ (reads)
                    │ BetSwirl│  │ Azuro Protocol  │       │
                    │ bankroll·VRF │  │ liquidity·odds  │◄──────┘
                    │ settlement   │  │ settlement      │
                    │ (on-chain)   │  │ (on-chain)      │
                    └──────────────┘  └─────────────────┘
                            ▲                   ▲
                            └──── player wallet (non-custodial) ────┘
                                   bridging via LI.FI if cross-chain
```

## Component responsibilities

| Component | Owns | Notes |
|---|---|---|
| **Frontend** (`apps/web`) | UX, wallet connect, lobby, unified balance, bet history, bet placement via SDKs | the bulk of what we build |
| **BetSwirl SDK/contracts** | casino games, randomness, bankroll, settlement | on Base Sepolia; permissionless |
| **Azuro SDK/contracts** | sports/prediction markets, odds, liquidity, settlement | on Azuro chain; permissionless |
| **Thin backend** (`apps/api`) | read-only aggregation, affiliate injection, session tokens | **no custody, no ledger, no settlement, no RNG** |
| **Player wallet** | custody of funds | non-custodial throughout |

## What we do NOT build anymore (removed vs the old custom stack)

- ❌ `Vault.sol` custody contract — protocols are non-custodial.
- ❌ Session keys / account abstraction relayer — BetSwirl/Azuro handle bet UX on-chain.
- ❌ Seamless-wallet backend + off-chain ledger — no custody, protocols are source of truth.
- ❌ Own provably-fair RNG engine — Chainlink VRF + Azuro provide it.
- ❌ Own casino games — BetSwirl game catalog.
- ❌ Deposit-watcher, settlement relayer, signer key.

The backend shrinks from "the core money engine" to a **thin, read-only aggregation + gating layer.**

## End-to-end flows

### Casino round (via BetSwirl)
```
1. Player connects wallet (Reown/wagmi) on Base Sepolia; holds the betting token in their own wallet.
2. Player opens a BetSwirl game → plays.
3. Each bet is an ON-CHAIN TX → native gas + Chainlink VRF fee + a MetaMask confirmation per bet.
4. Chainlink VRF resolves the outcome; the shared bankroll pays winners on-chain.
5. Our affiliate address (client config) routes commission to us.
6. Balance/history reflect on-chain state (read via BetSwirl subgraph).
```

### Sports bet (via Azuro)
```
1. Player connects wallet; ensures they're on an Azuro-supported chain/currency (switch CTA if not).
2. Player places a bet → EIP-712 ClientBetData signed (affiliate = our address, enforced server-side).
3. Azuro oracle + relayer submit on-chain; shared liquidity is the counterparty; settles on-chain.
4. Balance/history reflect on-chain state (read via Azuro subgraph).
```

## Data & reads

- **No source-of-truth database.** Balances and bet history are **on-chain**, read via BetSwirl subgraph +
  Azuro subgraph. The thin backend may **cache** these for a fast unified view (see `15`).
- **Unified balance** = BetSwirl (casino) balance + Azuro-chain wallet balance, shown in USD; cross-chain
  reconciled at the display layer (bridging via LI.FI where needed).

## Non-functional requirements

- **Non-custodial invariant:** TriBet must never be able to move player funds. Guaranteed by using
  non-custodial protocols and holding no custody contract or signer over player funds.
- **Affiliate integrity:** our affiliate address is injected/enforced **server-side** so it can't be
  swapped by the client (see `19`, `14`).
- **Testnet scope:** mainnet, licensing, KYC, and geoblocking are out of scope for this build.
- **Secrets:** none of the old signer/HMAC/JWT-for-settlement; only public config + a few API keys, all
  server-side where private (`16`).

## Environments (testnet only)

| Env | Casino (BetSwirl) | Sports (Azuro) | Purpose |
|---|---|---|---|
| `local` / `preview` / `staging` | BetSwirl testnet | Azuro testnet | dev / demo with testnet funds |

Mainnet/production is out of scope for this build.

_Last updated: 2026-07-01_
