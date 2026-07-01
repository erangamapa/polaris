# 07 — Casino Games (in-house)

Our own provably-fair games are what make the **full crypto loop work today with zero third-party
gatekeeping**. They are the reference clients for the seamless-wallet API. Third-party studio content
plugs into the same API later (see `09`).

## Games (build order)
1. **Slot** — reels, paylines; every spin = one bet + one win callback. First game (most illustrative).
2. **Dice** — roll-under target; simplest to verify.
3. **Crash** — rising multiplier, cash-out before crash.

Each lives in `packages/games/<game>/` as a standalone iframe app (its own tiny build).

## Why iframe

The game runs as an iframe so the exact same integration contract works for **our games and real
third-party games** — the host app (`apps/web`) embeds a URL and the game talks to the backend. Swap
in Pragmatic/BGaming later with no host changes.

## Game ↔ backend protocol (the seamless-wallet contract)

```
On load:
  GET  /wallet/balance?token=...           → { balance }
Per round:
  POST /wallet/bet   { token, roundId, amount, txId }   → { balance }   (debit)
  ...game resolves outcome via provably-fair result returned with the bet response...
  POST /wallet/win   { token, roundId, amount, txId }   → { balance }   (credit; amount 0 if loss)
On error:
  POST /wallet/rollback { token, roundId, txId }        → { balance }
```

- The **backend** computes the provably-fair outcome (it holds the serverSeed) and returns it in the
  `/wallet/bet` response, so the client can't fake results. Client animates to the given outcome.
- Balance shown in-game is always the value returned by the backend, never client-computed.

### ⚠️ HARD RULE: server-authoritative outcomes (never trust the client)

For **our own games**, the client MUST NOT be able to decide or report its own winnings. If a client
could call `/wallet/win` with an arbitrary amount, a player would credit themselves infinite money via
dev tools — a direct drain. Therefore:

- The backend **resolves the round and computes the win amount itself** (from the provably-fair
  result), and applies bet-debit + win-credit **atomically server-side** keyed to `roundId`.
- Any `/wallet/win` accepted from an own-game client is **validated against the backend's own computed
  result for that `roundId`** and rejected/ignored if it doesn't match. Preferred: don't accept a
  client win amount at all — the win is applied by the backend as part of resolving `/wallet/bet`.
- The client only receives the outcome to *animate* it; it never influences the ledger.
- For **third-party providers** (who compute outcomes on their RGS), trust is established by
  **HMAC-signed callbacks + reconciliation**, never by an unauthenticated client call.

See `14-security-threat-model.md` (vector T3) — this is a tested, non-negotiable invariant.

## "How is a game launched with a specific balance?"

Two supported paths (see also `05`):
- **Seamless (default):** the game boots with only a `token`, then calls `GET /wallet/balance`. The
  backend resolves `token → player → ledger balance`. The number appears in-game.
- **Demo/transfer:** for pure fun-play, bake `balance` + `mode:"demo"` into the launch token; the game
  reads it on load, no vault behind it.

## Launch flow (host → game)

```
1. Player clicks a game tile in apps/web
2. web → POST /session/launch { player, gameId, mode }
3. backend → { token, gameUrl }
4. web renders <iframe src="{gameUrl}?token={token}">
5. game runs the protocol above
```

## postMessage bridge (host ↔ iframe)
- Game emits `balanceChanged`, `roundComplete`, `exit` to the host via `postMessage` so the host's
  unified balance pill updates live and can close the launcher.
- Host validates `event.origin` against the known game origin.

## Provably-fair UX
- Show a "Provably fair ✓" badge; expose the current `serverSeedHash`, `clientSeed`, `nonce`, and a
  "verify" panel where the player can change `clientSeed` and, after reveal, reproduce outcomes.

## Reusing the existing prototype UI
- The current `src/components/casino/GameLauncher.jsx` already models a launch → bet → balance loop
  with mock data. Repurpose it as the **host-side launcher** that now embeds real game iframes and
  reflects backend balances instead of local state.

## Acceptance criteria
- Playing a slot spin debits the vault-backed ledger and credits winnings, visible in-game and in the
  host balance pill, in < 400 ms.
- A losing spin closes the round correctly (win amount 0).
- Every outcome is reproducible from the revealed seed pair.
- The same iframe protocol is provably reusable by a mock "third-party" game (proves `09` drop-in).

_Last updated: 2026-07-01_
