---
name: build-casino-game
description: >
  Build a new TriBet casino game end to end from an idea. Use when someone wants
  to "add a game", "build a slot/wheel/crash/dice game", "create a casino game",
  or "make a new game for the lobby". Walks through: define the game (look,
  animation, logic, betting/RTP) → build it → generate a tile → add it to the
  casino lobby → run it on a MOCK balance. Then optionally extend it on-chain.
---

# Build a TriBet casino game

You are building a game that appears in the Casino lobby and runs inside a
sandboxed iframe, settling bets through the **TriBet Game Bridge**. The game owns
**presentation** (look, animation, controls); the host owns **money + randomness**
(mock balance now, on-chain later). Never let the game decide its own payouts.

## Step 0 — Define the game (do this first, write it down)
Capture these before coding:
- **Name + theme** — e.g. "Nova Wheel", neon space wheel.
- **Look** — colors, layout, key visual (wheel/reel/curve/dice).
- **Animation** — the reveal (spin, flip, climb, roll) and win/lose feedback.
- **Logic / outcomes** — the list of outcomes as `{ label, weight, multiplier }`.
  `weight` = relative probability; `multiplier` = payout (1 = stake back, 0 = lose).
- **Betting strategy / RTP** — target Return-To-Player. Compute:
  `RTP = Σ(weightᵢ × multiplierᵢ) / Σ(weightᵢ)`. Aim ~0.95–0.98 (2–5% house edge).
  Tune multipliers so the weighted average lands there.
- **Controls** — what the player picks (side, number, risk level, bet amount).

## Step 1 — Build the game
Copy the template and adapt it:
```
cp -r skills/build-casino-game/templates/game public/games/<slug>
```
Edit `public/games/<slug>/{index.html,game.js,styles.css}`:
- Implement your look + animation in `styles.css` / `index.html`.
- In `game.js`, build your outcomes list from Step 0 and drive the animation from
  the settled `outcomeIndex` the host returns. **Keep the bridge code intact** —
  it posts `ready`, sends `bet`, and reacts to `settled`/`rejected`. Don't compute
  payouts in the game; send `outcomes` and animate whatever index the host returns.
- The game is a plain static app (any stack that builds to static files works;
  the template is dependency-free vanilla JS). Vendor only real files — no
  `node_modules`, tests, or zips.

## Step 2 — Generate the tile
Portrait **3:4** SVG, showing the **game name** + **"TRIBET STUDIO"** at the bottom.
```
cp skills/build-casino-game/templates/tile.svg public/img/games/<slug>.svg
```
Edit the colors, key visual, and the two title lines. (Template mirrors
`public/img/games/vector-crash.svg`.)

## Step 3 — Add to the lobby + link the game
Register one entry in `src/components/casino/ProviderGame.jsx` → `PROVIDER_GAMES`:
```js
{ key: "<slug>", title: "Nova Wheel", src: "/games/<slug>/index.html",
  badge: "TriBet Studio", image: "/img/games/<slug>.svg" }
```
That's the whole wiring — `CasinoCatalog` renders the tile in the **Provider games**
section, and `ProviderGame` opens it (lazy iframe) and attaches the mock host.

## Step 4 — Runs on a mock balance (already works)
`ProviderGame` calls `attachMockHost` (`src/lib/gameBridge.js`), which gives every
bridge game a shared **mock balance** (persisted in localStorage, shown in the
header). Place a bet → host draws the weighted outcome, updates the balance, and
returns the result for your animation. No extra work.

## Step 5 — Verify & ship
```bash
npm run build && npm run lint     # both must be green
```
Open the app → Casino → Provider games → your tile → play. Commit on a branch, PR.

## Step 6 (optional) — Extend to ON-CHAIN with real bet rounds
The game does not change. Swap the host's settlement from mock RNG to the on-chain
casino provider (BetSwirl custom-weighted game): pass a `settle` handler to
`attachMockHost`. See **`reference/on-chain-extension.md`** — your `{outcomes}`
map straight onto BetSwirl's weighted-game config, and settlement comes from
Chainlink VRF instead of `Math.random`.

## Files this skill touches
- `public/games/<slug>/` — the game
- `public/img/games/<slug>.svg` — the tile
- `src/components/casino/ProviderGame.jsx` — register in `PROVIDER_GAMES`
- (bridge host + protocol already exist: `src/lib/gameBridge.js`)

## References
- `reference/bridge-protocol.md` — the exact postMessage contract.
- `reference/on-chain-extension.md` — mock → BetSwirl on-chain rounds.
- `templates/game/` — a working coin-flip game to copy.
- `templates/tile.svg` — tile starting point.
- Repo-wide conventions: `../../AGENTS.md`.
