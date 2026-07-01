# 01 — System Architecture

## High-level diagram

```
                         ┌───────────────────────────────────────────────┐
                         │                  FRONTEND (apps/web)           │
                         │  React + Vite · wagmi/viem · Reown AppKit      │
                         │  Unified balance · Deposit UI · Game lobby     │
                         └───────┬───────────────┬───────────────┬────────┘
                                 │               │               │
                (connect/deposit)│    (launch)   │   (bets)      │ (sports/pred)
                                 │               │               │
                    ┌────────────▼───┐   ┌───────▼────────┐  ┌───▼─────────────┐
                    │ Wallet / AA    │   │  BACKEND       │  │  Azuro SDK      │
                    │ thirdweb       │   │  (apps/api)    │  │  (on-chain      │
                    │ session keys   │   │  Vercel funcs  │  │  sports + pred) │
                    └────────┬───────┘   │                │  └───┬─────────────┘
                             │           │  /session/*    │      │
                             │           │  /wallet/*     │      │
                             │           │  /vault/*      │      │
                             │           └───┬────────┬───┘      │
                             │               │        │          │
                    ┌────────▼───────────────▼──┐  ┌──▼──────────▼──────────────┐
                    │      BLOCKCHAIN            │  │   DATA / STATE             │
                    │  Base Sepolia → mainnet    │  │  Vercel Postgres (ledger)  │
                    │  Vault.sol (non-custodial) │  │  Vercel KV (sessions/nonce)│
                    │  USDC · Chainlink VRF(opt) │  │  Provably-fair seeds       │
                    └────────────────────────────┘  └────────────────────────────┘
                             ▲                                    ▲
                             │  deposit / settle / withdraw       │  per-round debit/credit
                             └────────────────────────────────────┘
```

## Component responsibilities

| Component | Owns | Talks to |
|---|---|---|
| **Frontend** (`apps/web`) | Wallet connect, deposit/withdraw UI, lobby, unified balance display, iframe host | Wallet/AA, backend `/session`, Azuro SDK |
| **Wallet / AA** (thirdweb) | Smart account, session-key grant, bet signing | Chain (bundler/paymaster) |
| **Backend** (`apps/api`) | Seamless-wallet ledger, provably-fair engine, session tokens, settlement | Chain (RPC + signer), DB, games, providers |
| **Games** (`packages/games`) | Casino game clients (slot/dice/crash) as iframes | Backend `/wallet/*` |
| **Azuro SDK** | Sports + prediction markets, odds, liquidity, settlement | Chain directly (per-bet) |
| **Chain** | Custody (vault), USDC, optional VRF | — |
| **DB** | Ledger (balances), sessions, nonces, seeds, txns | Backend only |

## Two settlement models under one roof (important)

Polaris deliberately runs **two** models, unified only at the balance-display layer:

1. **Casino (fast loop)** — session key + off-chain rounds + net on-chain settle. See `04`–`07`.
2. **Sports/Predictions (Azuro)** — per-bet on-chain via Azuro SDK. See `08`.

The frontend shows **one unified balance** by summing: vault-backed ledger balance (casino) +
Azuro on-chain position/wallet balance. UX reconciliation is specified in `08` and `10`.

## End-to-end data flow (casino round — the fast path)

```
1. Player deposits USDC → Vault.deposit()           [on-chain, once]
2. deposit-watcher observes Deposited event → ledger.credit(player)   [backend]
3. Player grants session key (one signature)         [wallet/AA]
4. Player opens a game → frontend POST /session/launch → {token, gameUrl}
5. Frontend embeds <iframe src=gameUrl?token=...>
6. Game boots → GET /wallet/balance?token → ledger balance
7. Each round:
   a. game POST /wallet/bet {token, roundId, amount, txId}  → debit, return balance
   b. provably-fair engine resolves round (commit-reveal)
   c. game POST /wallet/win {token, roundId, amount, txId}  → credit, return balance
8. Player cashes out → POST /vault/settle → server signs net result → Vault settle  [on-chain]
9. Player withdraws → Vault.withdraw()               [on-chain]
```

**Chain touched at steps 1, 8, 9 only. Every bet (step 7) is off-chain.**

## Non-functional requirements

- **Latency:** a casino round (bet→resolve→win) must complete < 400 ms server-side.
- **Idempotency:** all `/wallet/*` calls are idempotent by `txId` (providers retry).
- **Atomicity:** ledger debits/credits are row-locked DB transactions.
- **Auth:** provider→backend callbacks are HMAC-signed; frontend→backend uses session tokens.
- **Secrets:** never in the repo or frontend; Vercel env only (see `13`).
- **Non-custodial invariant:** the operator must never be able to move a player's funds except via
  a session-key-authorized settle bounded by the player's own signed permission.

## Environments

| Env | Chain | Currency | Purpose |
|---|---|---|---|
| `local` | Base Sepolia | testnet USDC | dev |
| `preview` | Base Sepolia | testnet USDC | PR previews (Vercel) |
| `staging` | Base Sepolia | testnet USDC | pre-prod |
| `production` | Base mainnet | USDC | live (post-license) |

_Last updated: 2026-07-01_
