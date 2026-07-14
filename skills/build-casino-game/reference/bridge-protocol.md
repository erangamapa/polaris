# TriBet Game Bridge — protocol reference

The postMessage contract between an embedded game (iframe) and the host app.
Host implementation: `src/lib/gameBridge.js`. Games send/receive these messages.

**Principle:** the game owns presentation; the **host owns money + randomness**.
The game proposes a bet with a weighted outcome table; the host draws the winner
and settles. Same game, two hosts: mock (Math.random) or on-chain (VRF).

All messages are objects with `channel: "tribet-game"`.

## Messages

| Direction | `type` | Payload | Meaning |
|---|---|---|---|
| game → host | `ready` | — | game loaded, request initial state |
| host → game | `init` | `{ balance, currency }` | starting balance |
| game → host | `bet` | `{ id, amount, outcomes, meta? }` | request to place a bet |
| host → game | `settled` | `{ id, outcomeIndex, multiplier, payout, isWin, balance }` | bet result |
| host → game | `rejected` | `{ id, reason, balance }` | bet not accepted (`insufficient` / `invalid`) |

### `outcomes` (the heart of it)
An array of `{ label, weight, multiplier }`:
- `weight` — relative probability (host normalizes).
- `multiplier` — payout on that outcome (`1` = stake back, `0` = lose, `2` = 2×).

Encode the player's **choice into the table** (winning outcomes carry the
multiplier, losing ones carry 0), then map the returned `outcomeIndex` back to
your visual. The host never needs to know your game's rules — only the weights
and multipliers.

### RTP
`RTP = Σ(weightᵢ × multiplierᵢ) / Σ(weightᵢ)`. Keep it ~0.95–0.98.
The house edge is `1 − RTP`. Example coin flip: `[1.96, 0]` with equal weights →
`0.5 × 1.96 = 0.98` → 2% edge.

## Minimal game side (vanilla)
```js
const CHANNEL = "tribet-game";
const post = (m) => parent.postMessage({ channel: CHANNEL, ...m }, "*");
const waiting = {};
window.addEventListener("message", (e) => {
  const m = e.data; if (!m || m.channel !== CHANNEL) return;
  if (m.type === "init") balance = m.balance;
  if (m.type === "settled" || m.type === "rejected") waiting[m.id]?.(m);
});
post({ type: "ready" });

function bet(amount, outcomes) {
  const id = crypto.randomUUID();
  return new Promise((res) => { waiting[id] = res; post({ type: "bet", id, amount, outcomes }); });
}
```

## Security notes
- The iframe is `sandbox="allow-scripts allow-same-origin allow-pointer-lock"`.
- The host validates `amount` against the balance and ignores messages from any
  other window. The game cannot mint balance — it can only *request* bets.
- Because the host owns the draw, moving to on-chain VRF requires **no game change**.
