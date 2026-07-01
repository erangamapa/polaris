# 06 — Provably-Fair Engine

Lets players verify the house didn't manipulate outcomes — at web speed, off-chain. Lives in
`packages/shared/provablyFair.ts`, used by the backend RGS.

## Scheme: commit-reveal (industry standard)

```
1. COMMIT  Backend generates serverSeed, publishes hash = SHA256(serverSeed) to the player
           BEFORE any bets. Stored in pf_seeds (server_seed null until reveal).
2. PLAY    Player provides clientSeed (or a default). Each round increments a nonce.
           result = HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}`) → mapped to game outcome.
3. REVEAL  On seed rotation / cashout, backend reveals serverSeed. Player checks
           SHA256(serverSeed) == the hash committed earlier → proves no post-hoc tampering.
```

## Core functions

```ts
export function generateServerSeed(): { seed: string; hash: string };

export function roll(params: {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}): number;  // uniform in [0, 1) — games map this to their outcome space

// Verification helper exposed to players (and used in tests)
export function verify(serverSeed: string, hash: string): boolean;
```

## Mapping `roll` → game outcomes

- **Dice:** `roll * 100` → number 0–99.99; win if under target.
- **Slot:** derive reel positions from successive bytes of the HMAC digest.
- **Crash:** map to a crash multiplier via the standard `(1/(1-r))` style curve with house edge.
- Each game documents its exact mapping so a player can reproduce it independently.

## Seed rotation
- Rotate `serverSeed` on demand (player-initiated) or per session. On rotation: reveal the old seed,
  commit a new hash, reset nonce to 0. Reveal must always precede reuse.

## House edge
- Applied transparently in the outcome mapping (e.g., dice payout = `99 / target` not `100 / target`).
- Documented per game; never hidden in the RNG.

## Optional on-chain verifiable randomness
- **Chainlink VRF v2.5** (Base Sepolia + mainnet supported) for high-stakes or fully-on-chain modes.
- Requires a VRF subscription + LINK (see `11`). Do **not** use per casino spin — it's slow/costly and
  breaks the fast loop. Reserve for jackpot draws or a "provably fair on-chain" premium mode.

## Acceptance criteria
- Given a revealed `serverSeed`, `clientSeed`, and `nonce`, a player can independently reproduce every
  outcome of a session.
- `SHA256(revealedSeed)` equals the pre-committed hash for every rotation.
- Outcome distribution over N rounds matches the documented house edge within tolerance (statistical
  test in the test suite).

_Last updated: 2026-07-01_
