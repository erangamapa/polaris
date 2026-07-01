# 05 — Backend: Seamless-Wallet Service

The backend is the **single source of truth for live balances**. It's the connection between a game
round and the player's crypto funds. Minimal, serverless, secrets never leave the server.

## Deployment

- **Vercel serverless functions** in `apps/api`. No always-on server.
- Secrets in **Vercel env vars** only (see `11`, `13`). Frontend never sees provider secrets, signer
  keys, or RPC keys.

## The balance-backing abstraction (the key idea)

The game asks the backend for a balance and reports bet/win. The backend decides what **backs** that
balance:

| Mode | `/wallet/balance` returns | Backed by |
|---|---|---|
| `production` | real USDC ledger | mainnet Vault |
| `testnet` | test-USDC ledger | Base Sepolia Vault |
| `demo` | a fake starting stack | nothing (just a number) |

**Same endpoints, same games, same code — only the backing changes.** This is how "real funds vs test
funds vs demo credits" all work through one path, and how a game is "launched with a specific balance."

## Endpoints

All under `apps/api`. Frontend calls `/session/*`. Game clients / providers call `/wallet/*`.
Chain events drive `/vault/*`.

### `POST /session/launch`  (frontend → backend)
Mint a short-lived session token and return the game URL.
```
req  : { player, gameId, mode }            // player from authenticated wallet session
resp : { token, gameUrl }                  // gameUrl = our game or provider launch URL
```
- `token` is a signed, short-TTL JWT stored in KV: `{ player, gameId, mode, chain, exp }`.
- Never embeds balance or secrets.

### `GET /wallet/balance?token=...`  (game → backend)
```
resp : { balance, currency }               // authoritative balance from ledger
```

### `POST /wallet/bet`  (game → backend)  — debit
```
req  : { token, roundId, amount, txId }
resp : { balance, txId }                   // new balance after debit
```
- Verify HMAC (provider) or token (own game). Dedup `txId`. Row-lock player. Check funds. Debit.

### `POST /wallet/win`  (game → backend)  — credit
```
req  : { token, roundId, amount, txId }
resp : { balance, txId }
```

### `POST /wallet/rollback`  (game → backend)  — reverse failed round
```
req  : { token, roundId, txId }            // txId of the bet to reverse
resp : { balance, txId }
```

### `POST /vault/settle`  (frontend/cashout or cron → backend)
Reconcile a session's net result on-chain.
```
req  : { player, sessionId }
resp : { txHash, net }
```
- Compute net = (ledger balance now) − (ledger balance at session start / last settle).
- Sign & submit `Vault.settle` via the session-key relayer within the on-chain permission.

### `POST /vault/deposit-watch`  (chain webhook / cron → backend)
Credit the ledger when an on-chain `Deposited` event is seen.
```
req  : { player, amount, txHash, chainId }
resp : { balance }
```
- Idempotent by `txHash`. Confirm the event on-chain before crediting.

## Ledger schema (Vercel Postgres)

```sql
-- Balances (source of truth for live play). Amounts are integer USDC smallest-units (6dp).
CREATE TABLE ledger (
  player       TEXT PRIMARY KEY,     -- wallet address (lowercased)
  chain_id     INTEGER NOT NULL,
  available    BIGINT  NOT NULL DEFAULT 0,
  locked       BIGINT  NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every balance mutation. Idempotency + audit + settlement basis.
CREATE TABLE txns (
  tx_id        TEXT PRIMARY KEY,     -- client/provider-supplied; dedup key
  player       TEXT NOT NULL,
  round_id     TEXT,
  kind         TEXT NOT NULL,        -- 'bet' | 'win' | 'rollback' | 'deposit' | 'settle'
  amount       BIGINT NOT NULL,      -- signed
  balance_after BIGINT NOT NULL,
  session_id   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session accounting for settlement (net = balance_now - balance_at_start).
CREATE TABLE sessions (
  session_id   TEXT PRIMARY KEY,
  player       TEXT NOT NULL,
  chain_id     INTEGER NOT NULL,
  start_balance BIGINT NOT NULL,
  max_spend    BIGINT NOT NULL,
  valid_until  TIMESTAMPTZ NOT NULL,
  settled_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Provably-fair seed pairs (see 06).
CREATE TABLE pf_seeds (
  player       TEXT NOT NULL,
  server_seed_hash TEXT NOT NULL,
  server_seed  TEXT,                 -- null until revealed
  client_seed  TEXT NOT NULL,
  nonce        INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player, server_seed_hash)
);

-- Per-round game history (verifiable bet log). One row per casino round.
-- This is the source for "My Bets" history + provably-fair replay + compliance/audit.
-- (See 14-data-persistence.md.)
CREATE TABLE rounds (
  round_id     TEXT PRIMARY KEY,     -- matches txns.round_id
  player       TEXT NOT NULL,
  session_id   TEXT NOT NULL,
  game_id      TEXT NOT NULL,        -- 'slot' | 'dice' | 'crash' | provider game id
  stake        BIGINT NOT NULL,
  payout       BIGINT NOT NULL,      -- 0 on a loss
  outcome      JSONB NOT NULL,       -- game-specific result (reels, roll, multiplier…)
  server_seed_hash TEXT NOT NULL,    -- commit (server_seed revealed later via pf_seeds)
  client_seed  TEXT NOT NULL,
  nonce        INTEGER NOT NULL,     -- (server_seed_hash, client_seed, nonce) reproduces outcome
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX rounds_player_time ON rounds (player, created_at DESC);
```

### Win-crediting rule (anti-exploit)
The **backend** resolves each round and computes `payout` itself from the provably-fair result; it
applies bet-debit + win-credit **atomically** and writes the `rounds` row in the same transaction. It
**never** trusts a win amount reported by an own-game client (see `07` HARD RULE and
`14-security-threat-model.md` T3). Third-party provider callbacks are trusted only via HMAC.

Vercel **KV** holds ephemeral session tokens and used-nonce sets (fast, TTL'd).

## Non-negotiable backend rules
- **Idempotency:** if `tx_id` exists, return the stored `balance_after` — never double-apply.
- **Atomicity:** debit/credit inside a single DB transaction with row lock (`SELECT ... FOR UPDATE`).
- **Auth:** `/wallet/*` from third-party providers verified by HMAC (`packages/shared/hmac.ts`);
  from our own games verified by the session token. Reject unsigned calls.
- **No negative balances:** a bet that exceeds `available` returns an error, no partial debit.
- **Settlement safety:** `/vault/settle` can never exceed the session's `max_spend` (mirrors the
  on-chain check) — defense in depth.

## Acceptance criteria
- 50 rapid bet/win cycles produce a correct final balance with no double-charges under retries.
- A duplicated `txId` is a no-op returning the original balance.
- Killing the DB mid-round never corrupts a balance (transaction rolls back).
- A full session settles to exactly `net` on-chain; ledger and vault reconcile.

_Last updated: 2026-07-01_
