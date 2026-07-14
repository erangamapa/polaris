# Extend a game to ON-CHAIN bet rounds (BetSwirl)

Turn a mock game into a real, on-chain, provably-fair game **without changing the
game itself**. Only the host's settlement swaps from `Math.random` to Chainlink
VRF via our on-chain casino provider, **BetSwirl**.

## Why it drops in cleanly
The bridge already makes the game send `{ amount, outcomes:[{weight,multiplier}] }`
and the host return `{ outcomeIndex, payout, isWin, balance }`. BetSwirl's
**custom weighted game** contract speaks the exact same shape: a config of
`weights` + `multipliers`, drawn on-chain by VRF. So a bridge game's `outcomes`
map 1:1 onto a BetSwirl weighted-game config.

## What changes: pass a `settle` handler to the host
In `src/components/casino/ProviderGame.jsx`, `attachMockHost` accepts an optional
async `settle({ amount, outcomes, meta, balance })`. Provide one that plays on
BetSwirl instead of drawing locally:

```js
import { attachMockHost } from "@/lib/gameBridge";
import { useBetSwirl } from "@/web3/useBetSwirl";   // existing on-chain hook

// inside the component, when connected & funded:
const { playWeighted } = useBetSwirl();             // add a weighted-play wrapper

attachMockHost(iframeRef.current, {
  currency: "ETH",
  onBalance: setBalance,
  settle: async ({ amount, outcomes }) => {
    // 1) map outcomes -> BetSwirl weighted config (weights + multipliers in BP)
    // 2) place the on-chain bet (wallet confirm) -> Chainlink VRF settles
    // 3) read the rolled outcome + payout from the receipt
    const rolled = await playWeighted({ betEth: amount, outcomes });
    return {
      rejected: false,
      outcomeIndex: rolled.outcomeIndex,
      multiplier: rolled.multiplier,
      payout: rolled.payout,
      isWin: rolled.payout > 0,
      balance: rolled.newWalletBalance, // real wallet balance after settle
    };
  },
});
```

## The pieces that already exist
- **Wallet + chain**: `src/web3/useWallet.js`, `src/web3/config.js` (Reown/wagmi).
- **BetSwirl integration**: `src/web3/useBetSwirl.js` (bet flow + VRF wait) and the
  pinned contracts in `packages/shared/chains.js` (`betswirl.games`, incl.
  `custom-weighted-game`).
- On-chain weighted games use BetSwirl's `custom-weighted-game` contract — **no new
  contract deploy and no governance approval** needed (permissionless).

## To implement the on-chain path (checklist)
1. Add a `playWeighted({ betEth, outcomes })` wrapper in `useBetSwirl.js` that:
   - converts `outcomes` → BetSwirl weighted config (multipliers to basis points),
   - calls the weighted-game `play`, waits for the VRF roll,
   - returns `{ outcomeIndex, multiplier, payout }` from the receipt.
2. In `ProviderGame.jsx`, when the player is connected + on the casino chain, pass
   the `settle` handler above instead of the default mock draw.
3. Gate on `ensureAuth()` (connect wallet + correct network) before the first bet.
4. Per-bet cost = gas + VRF fee; winnings pay to the player's wallet. Affiliate =
   the house wallet (already enforced in `useBetSwirl.js`).

## Betting rounds
"Bet rounds" for continuous games (crash/round-based) settle one VRF draw per
round; for popup-free rounds use the **session-key** path (account abstraction) so
the player authorizes once and rounds auto-sign within a budget. That's a separate
enhancement to the wallet layer, not the game.

See also: `bridge-protocol.md`, `../SKILL.md`, `../../AGENTS.md`.
