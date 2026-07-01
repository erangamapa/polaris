# 14 — Security Threat Model (Anti-Exploit)

Because casino rounds resolve **off-chain** and settle **net on-chain**, the system must defend
against a player trying to take back money they actually lost, or credit themselves money they never
won. This doc enumerates the concrete attack vectors and the defenses. Each defense is a **tested,
non-negotiable invariant**. This is the state-channel security model — well understood, but fatal if
any one piece is wrong.

## Attacker model
- The player fully controls their own wallet, browser, dev tools, and network traffic.
- The player may craft/replay arbitrary HTTP requests to our backend.
- The player may go offline at any moment (e.g., right after losing).
- The player CANNOT forge signatures for keys they don't hold, break SHA-256/HMAC, or alter deployed
  contract code.

---

## T1 — "Withdraw before my losses settle" (PRIMARY drain vector)

**Attack:** deposit 50, lose net 40 off-chain (losses not yet on-chain), then `withdraw(50)` before the
house settles → steal the 40.

**Defense (contract — invariants 6 & 7 in `03`):**
- **Lock at-risk funds:** `openSession` locks up to `maxSpend`; `withdraw` can only move
  `available − locked`. The money at risk is not withdrawable during play.
- **Exit/dispute window:** to reclaim locked funds the player calls `requestExit`; the operator has a
  bounded window to submit the latest signed session net state via `settle`. Newest signed state wins;
  locked funds release only after settlement or after the window elapses.
- **Result:** the player cannot race a withdraw ahead of their recorded losses.

**Tests:** withdraw of locked funds reverts; requestExit → operator settle within window applies the
loss → only remainder withdrawable; requestExit with operator offline → funds release only after window.

---

## T2 — "Go offline after losing to dodge settlement"

**Attack:** lose, then close the tab / never come back, hoping the loss is never applied on-chain.

**Defense (backend + session key):** the **session key is held by the operator relayer** (`04`), which
can call `settle` for a losing session **without the player online**, bounded by the authorized
`maxSpend`. Player absence does not block settlement. A background job settles idle/expired sessions.

**Tests:** relayer settles a losing session with the player disconnected; settle bounded by `maxSpend`.

---

## T3 — Client-reported wins (SNEAKY drain vector)

**Attack:** player opens dev tools and calls `/wallet/win` with an arbitrary amount, or tampers with
the game client to report wins that never happened.

**Defense (backend — HARD RULE, see `05`, `07`):**
- **Server-authoritative outcomes.** The backend holds `serverSeed`, resolves each round, computes the
  `payout` itself, and applies bet-debit + win-credit **atomically** keyed to `roundId`.
- The client is **never** trusted to report a win amount. Any client `/wallet/win` is validated against
  the backend's own computed result for that `roundId`, or (preferred) not accepted at all — the win is
  applied as part of resolving `/wallet/bet`.
- Third-party provider wins are trusted only via **HMAC-signed callbacks**, never a raw client call.

**Tests:** a forged `/wallet/win` (wrong amount / unknown roundId / no HMAC) is rejected; ledger only
changes via server-computed results.

---

## T4 — RNG prediction

**Attack:** learn `serverSeed` before betting, then compute `HMAC(serverSeed, clientSeed:nonce)` and
only bet on winning rounds.

**Defense (`06`):** `serverSeed` is committed (hash published) but kept **secret until reveal**, which
happens only after the round/rotation. Choosing `clientSeed` adaptively gives no edge because the
hidden seed is fixed. The backend must never leak `serverSeed` (or any pre-image) early.

**Tests:** `serverSeed` never present in any pre-reveal response; revealed seed hashes to the commit.

---

## T5 — Ledger races / double-credit

**Attack:** fire concurrent `/wallet/bet` or `/wallet/win` to double-credit or under-debit; replay a
favorable round; reuse a settled session.

**Defense (backend + contract):**
- **Idempotency** by `txId` (dedup; return stored `balance_after`).
- **Atomic** debit/credit inside one DB transaction with row lock (`SELECT … FOR UPDATE`).
- **No negative balances** (over-stake rejected, no partial debit).
- **Nonce sequencing** per seed pair; **one-time on-chain `sessionId`** (replay reverts).

**Tests:** concurrent duplicate `txId` → single effect; replayed round → no double effect; reused
`sessionId` on-chain → revert.

---

## T6 — Settlement manipulation

**Attack:** submit a stale (more favorable) signed session state at exit; front-run `settle`.

**Defense:** newest-signed-state-wins in the dispute window (T1); each `SessionPermission` is one-time
by `sessionId`; `net` is deterministic from the recorded round history. Front-running a deterministic
net settle yields no advantage.

---

## T7 — Contract-level bugs

**Attack:** reentrancy, integer over/underflow, access-control gaps, upgrade backdoors.

**Defense:** OpenZeppelin `SafeERC20` + `ReentrancyGuard`; EIP-712 typed permissions; exhaustive unit
tests; **external audit before mainnet**; any upgradeability must not violate invariants 1–7 in `03`.

---

## T8 — House solvency (not a player exploit, but a failure mode)

If a player **wins** net, the payout draws on house liquidity in the vault. If the vault lacks funds to
pay net winners, settlement fails. This is an operational/economic risk, not a player attack:
- Maintain sufficient house liquidity to cover expected net winnings.
- Cap per-session `maxSpend` and max payout exposure.
- Monitor vault reserves vs. aggregate open-session exposure.

---

## T9 — Azuro affiliate substitution (revenue theft, not fund theft)

**Attack:** a user swaps our `affiliate` address in the Azuro bet order for their own, so the affiliate
GGR reward on their bet goes to them instead of us.

**Defense (backend — see `08`, `19`):**
- The `affiliate` address is **public on-chain, not a secret** — knowing it does NOT let anyone move our
  accrued rewards (only that address's key can). So the risk is substitution, not exposure.
- **Proxy every order through our backend**; the backend **sets/overwrites `affiliate` from server env
  `AZURO_AFFILIATE_ADDRESS`** and **rejects any order whose `affiliate` ≠ ours** before forwarding to
  Azuro's `POST /orders`. Never accept a client-supplied affiliate value.
- Register with Azuro's **affiliate-tracker**; monitor attributed volume vs. expected.

**Residual (accepted):** a user can bypass our app and bet directly on the permissionless Azuro contract
with their own affiliate. Unpreventable by anyone, and not theft — we simply earn nothing on bets we
didn't source. Do not build brittle anti-bypass hacks.

**Tests:** an order with a mismatched `affiliate` is rejected/overwritten by the backend before forwarding.

---

## What is NOT a risk
- **Crypto chargebacks** — on-chain transfers are final; no card-style reversals.
- **Cross-player theft** — the vault gives each player access only to their own balance.
- **Affiliate address visibility** — it's public on-chain; visibility ≠ ability to steal accrued rewards.

## Summary — the four that must be correct
1. **T1** lock at-risk funds + exit/dispute window (contract)
2. **T2** relayer settles losses without the player (backend + session key)
3. **T3** server-authoritative outcomes, never client-reported wins (backend)
4. **T5** idempotent + atomic ledger + one-time sessionId (backend + contract)

Get these four right → no free-money loophole. Any one wrong → exploitable. Audit + tests must focus
here. Cross-references: `03` (contract), `04` (session keys), `05` (backend), `06` (RNG), `07` (games),
`13` (security/compliance).

_Last updated: 2026-07-01_
