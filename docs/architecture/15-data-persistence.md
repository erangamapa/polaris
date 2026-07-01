# 15 — Data Persistence & History

> **Updated for the WINR + Azuro pivot.** Previously casino rounds were off-chain and we HAD to store
> them. Now **both casino (WINR) and sports (Azuro) settle on-chain**, so history is on-chain for both
> and we store almost nothing of record.

## The core fact: everything is on-chain now

| Data | On-chain? | Read from |
|---|---|---|
| Casino bets/rounds (WINR) | ✅ on-chain | WINR indexer / explorer |
| Casino settlement (WINR bankroll) | ✅ on-chain | WINR indexer |
| Sports/prediction bets (Azuro) | ✅ on-chain | Azuro subgraph |
| Balances | ✅ on-chain (wallet + protocol) | RPC / indexers |
| Deposits / swaps (USDC→WINR) | ✅ on-chain | explorer |

There is **no off-chain source of truth**. The wallet address is the account; all state is derivable
from chain.

## What we store (almost nothing)

- **No ledger, no rounds table, no seeds, no sessions-of-record** (all removed with the old design).
- **Optional cache** (Vercel KV/Postgres) of aggregated balance + merged history, purely for speed and
  resilience if an indexer is slow — never a source of truth.
- **Affiliate/config** (our affiliate addresses, per chain).

## Reconnect / recovery — automatic

Because everything is on-chain and keyed to the wallet address:
```
1. Player clears browser / returns weeks later.
2. Reconnects the SAME wallet.
3. We read on-chain state (balances + history via indexers) → everything reappears.
```
Nothing is tied to a device or login; there's no server state to lose. A different wallet address = a
different account (by design).

## Bet History page (build this exactly)

Keyed by the connected wallet address. **Both verticals are fully on-chain**, so both show verifiable
on-chain transactions — the page's message is simple and consistent: *"Everything you play is on-chain.
Here's the proof."*

### Two sources, same trust story (both on-chain)

| Vertical | Source | Shows |
|---|---|---|
| **Casino** | WINR indexer / explorer | game, stake, payout, outcome + **on-chain tx / explorer link**; WINR VRF proof of fairness |
| **Sports / Predictions** | Azuro subgraph | market, selection, odds, stake, status, payout + **explorer link** |

- Each row links to its **transaction on the block explorer** — fully verifiable.
- Casino rows can surface the **WINR VRF proof** (provably fair, on-chain).
- One "My Bets" screen with **Casino / Sports** tabs (or a merged, source-labelled, time-sorted list).
- Tag rows 🔗 on-chain (both are) — no off-chain caveat needed anymore.
- **Cache** both feeds per address for a fast unified view; the chain remains source of truth.

> Note: this simplifies the earlier design, where casino was off-chain and needed the "off-chain rounds,
> on-chain settlement" explanation. With WINR, casino is on-chain like sports — one clean story.

## Retention & privacy
- On-chain data is public and permanent by nature (pseudonymous by address).
- The testnet build collects no KYC/PII; any optional cache holds only public on-chain-derived data.

## Acceptance criteria
- Reconnecting the same wallet restores balance + full history purely from on-chain reads.
- Every casino and sports bet in history links to a verifiable on-chain transaction.
- No off-chain store is required for correctness (cache is optional).

_Last updated: 2026-07-01_
