# 15 — Data Persistence & History

What Polaris stores, why, what's recoverable from chain vs only from our database, and how a returning
wallet gets its balance and history back. Schemas live in `05-backend-seamless-wallet.md`.

## The core fact: casino bets are NOT on-chain

Individual casino rounds resolve **off-chain** and settle **net** on-chain (that's the fast loop). So
the chain only ever shows `deposit → net settle → withdraw`. The **individual spins/rolls exist only
in our database.** If we store nothing, per-round history is gone forever. Therefore storage is
**mandatory**, not optional.

| Data | On-chain? | Recoverable from wallet alone? |
|---|---|---|
| Deposits / withdrawals | ✅ Vault events | Yes (via indexer) |
| Casino **net** settlements | ✅ `Settled` events | Only the net (e.g. "+5") |
| **Individual casino rounds** | ❌ off-chain | **No — only our DB** |
| Provably-fair seeds / nonces | ❌ our DB | No |
| Live / unsettled ledger balance | ❌ our DB | No |
| Azuro sports/prediction bets | ✅ per-bet | Yes (Azuro subgraph) |

## Why we must store player data (three reasons)

1. **Correctness (mandatory).** The *unsettled* portion of a session — bets since the last on-chain
   settle — lives only in our ledger. Lose it → we can't reconcile wins/losses. This is money
   integrity, not a feature.
2. **Provably-fair verification (trust).** Players verify past rounds against revealed seeds. Requires
   storing `server_seed_hash`, `server_seed` (post-reveal), `client_seed`, `nonce`, and outcome per
   round → the `rounds` + `pf_seeds` tables.
3. **Compliance (mandatory once licensed).** Licensed gambling requires bet/transaction history
   retention for audit, dispute resolution, AML, and responsible-gambling limits (loss limits,
   self-exclusion, reality checks). See `13`.

## What we store (keyed by wallet address)

| Store | Table (see `05`) | Purpose |
|---|---|---|
| Balances | `ledger` | live playable balance (mirrors vault) |
| Every balance mutation | `txns` | idempotency + audit + settlement basis |
| **Per-round game history** | `rounds` | "My Bets", provably-fair replay, compliance |
| Provably-fair seeds | `pf_seeds` | verification (commit + reveal) |
| Session accounting | `sessions` | settlement net basis |
| On-chain mirror | (in `txns`, kind `deposit`/`settle`) | fast history without live chain scans |

We also **mirror on-chain deposits/settlements/withdrawals into `txns`** so a player's full history
(on- and off-chain) is queryable in one place without scanning the chain live.

## What we do NOT need to store
- **Passwords / traditional accounts** — the wallet address IS the account (no signup).
- **PII** — only if/when KYC is triggered (fiat, large withdrawals); keep minimal, encrypt at rest,
  restrict access (`13`). Wallet address alone is pseudonymous.
- **Sports/predictions bets** — reconstructable from Azuro's subgraph; we may *cache* them for a fast
  unified "My Bets" view, but they're not a source-of-truth we must own.

## The reconnect / recovery flow

The wallet address is the identity. Everything is keyed by it, not by browser session:

```
1. Player clears browser / removes wallet / returns weeks later.
2. Reconnects the SAME wallet address.
3. Backend looks up ledger + rounds + txns by address.
4. Header shows their playable balance; "My Bets" shows full history; vault funds are intact.
```

Nothing is tied to the device or a login. Reconnecting re-derives the identity; the data was always
address-keyed. Vault funds are always withdrawable regardless of history state.

> Edge case: if the player switches to a **different** wallet address, that's a different account with
> its own balance/history — by design (address = identity). Document this clearly in the UI so users
> aren't surprised.

## Bet History page (build this exactly)

The history page is keyed by the **connected wallet address** and must be transparent about the
**trust model per vertical** — sports bets are fully on-chain; casino rounds are off-chain (for speed)
and anchored on-chain only at settlement. The UI must communicate this, not hide it.

### Two sources, two trust stories

| Vertical | Source | On-chain? | What we show |
|---|---|---|---|
| **Sports / Predictions** | **Azuro subgraph** (GraphQL by address) | ✅ every bet is a tx | the bet + a **block-explorer link** per bet ("fully on-chain — verify") |
| **Casino** | our **`rounds`** table (+ `pf_seeds`) | ❌ rounds off-chain; only net settlement on-chain | rounds grouped by session; the **on-chain settlement tx** the session rolls up into |

### Sports section — "Fully on-chain"
- Query Azuro's subgraph by wallet address (optionally cached, see below).
- Each bet row shows market, selection, odds, stake, status (open/won/lost/cashed-out), payout, and a
  **link to the transaction on the block explorer**.
- Header copy (explicit): _"Your sports bets are settled fully on-chain. Each one is a verifiable
  transaction — tap to view it on the explorer."_

### Casino section — "Off-chain rounds, on-chain settlement"
- List **sessions** (from `sessions`), each expandable to its individual **rounds** (from `rounds`).
- Each session row shows: game(s), round count, total staked, net result, and — crucially — a link to
  the **on-chain settlement transaction** (`txns` kind `settle`, the `Vault.settle` tx hash) that the
  session's rounds settle into. Deposits/withdrawals (`txns` kind `deposit`/`withdraw`) also link to
  their tx hashes.
- Each individual round shows stake, payout, outcome, and a **"verify"** action that reproduces the
  result from the revealed seed pair (`06`) — provably fair even though it's off-chain.
- Header copy (explicit): _"Casino rounds run off-chain so play stays instant — thousands of rounds
  per session. Each round is provably fair (verify it by its seed). Rounds are grouped by session and
  settle to the chain as a single net transaction, linked below."_

### The mental model to convey to the player
- **Sports:** "Here are your bets — each is on-chain, here's the proof."
- **Casino:** "Here are your rounds — they're off-chain for speed and provably fair; the **playable-balance
  settlement** they attach to is the on-chain record (with tx link)." The on-chain footprint for casino
  is the **deposit / net-settle / withdraw** signatures, not each spin.

### Unified view
- One "My Bets" screen with **Casino** / **Sports** tabs (or a merged, source-labelled list). Each row
  is tagged with its trust model (🔗 on-chain vs ⚡ off-chain + provably fair) so the distinction is
  never ambiguous.
- Merge/sort by time across both sources for the combined view.

### Caching (optional but recommended)
- Sports history can be read live from the subgraph, but **cache** it (per `address`) for a fast merged
  view and resilience if the subgraph is slow/down. Casino history is always from our DB.

### Data needed (already speced)
- Casino: `rounds`, `sessions`, `pf_seeds`, `txns` (`05`).
- Casino on-chain anchors: `txns` rows of kind `deposit`/`settle`/`withdraw` carry the tx hash for
  explorer links (mirror on-chain events into `txns`, see above).
- Sports: Azuro subgraph (GraphQL), optional cache table.

## Retention & privacy
- **Retention:** keep bet/transaction history per the licensing jurisdiction's requirement (commonly
  multi-year). Do not silently purge history that may be needed for audit/dispute.
- **Privacy:** store the minimum; treat any KYC data as sensitive (encrypt at rest, access-controlled);
  never log secrets or full PII. Address-keyed data is pseudonymous but still handle per policy.
- **Deletion requests:** reconcile "right to be forgotten"-style requests against gambling retention
  obligations with the owner's legal advisor — the two can conflict; retention usually wins for
  transaction records.

## Acceptance criteria
- After clearing the browser and reconnecting the same wallet, playable balance and full bet history
  are restored.
- Every casino round in history is reproducible from its stored seed pair after reveal.
- On-chain deposits/settlements/withdrawals appear in the unified history without a live chain scan.

_Last updated: 2026-07-01_
