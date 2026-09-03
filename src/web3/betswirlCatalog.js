// The full BetSwirl catalog on Base Sepolia — pure data, deliberately kept
// separate from useBetSwirl.js (which needs the real @betswirl/sdk-core SDK
// to place bets). CasinoCatalog.jsx needs this list eagerly (every Casino
// Lobby render), but importing it from useBetSwirl.js pulled the entire SDK
// into the initial bundle just for a handful of title/image/tag strings —
// see PERFORMANCE task's CATALOG DERIVATION: "shared metadata remains one
// source of truth" and GAME CLIENT SPLITTING: "Lobby cards do not import
// full game implementations." useBetSwirl.js re-exports this for any
// existing consumer that imported BETSWIRL_GAMES from there.
//
// `image` = self-hosted BetSwirl card art (public/img/games).
//
// Playability is PER CHAIN, not a property of the game: BetSwirl pauses games
// independently on each deployment, so the same title can be bettable on one
// network and dead on another. Verified on-chain via the SDK's `paused` getter
// on 2026-09-03 — on Base Sepolia the weighted games (wheel/plinko) revert,
// while on Arbitrum keno is paused too. A game absent from the active chain's
// unplayable set is bettable; games stay in the catalog either way so the lobby
// keeps its shape, they just aren't launchable. Re-verify when retargeting the
// casino chain (see CASINO_MAINNET_ID in @shared/chains).
import { CASINO_CHAIN_ID, BASE_SEPOLIA_ID, ARBITRUM_ID } from '@shared/chains';

const UNPLAYABLE_BY_CHAIN = {
  [BASE_SEPOLIA_ID]: new Set(['wheel', 'plinko']),
  [ARBITRUM_ID]: new Set(['wheel', 'plinko', 'keno']),
};

// Unknown chain -> treat everything as unplayable rather than offering a bet we
// haven't verified. Failing closed keeps a mis-set network from taking money for
// a game that will revert.
const unplayable = UNPLAYABLE_BY_CHAIN[CASINO_CHAIN_ID] ?? null;
const isPlayable = (key) => (unplayable ? !unplayable.has(key) : false);

export const BETSWIRL_GAMES = [
  { key: 'dice', title: 'Dice', image: '/img/games/dice.webp', control: 'dice', tags: ['popular'] },
  { key: 'coin-toss', title: 'Coin Toss', image: '/img/games/coin-toss.webp', control: 'coin', tags: ['popular'] },
  { key: 'roulette', title: 'Roulette', image: '/img/games/roulette.webp', control: 'roulette', tags: ['popular', 'live-casino'] },
  { key: 'keno', title: 'Keno', image: '/img/games/keno.webp', control: 'keno', tags: ['game-shows'] },
  { key: 'wheel', title: 'Wheel', image: '/img/games/wheel.webp', control: 'weighted', tags: ['new'] },
  { key: 'plinko', title: 'Plinko', image: '/img/games/plinko.webp', control: 'weighted', tags: ['new'] },
].map((g) => ({ ...g, playable: isPlayable(g.key) }));
