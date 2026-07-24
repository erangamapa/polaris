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
// `image` = self-hosted BetSwirl card art (public/img/games). `playable`
// games are wired + verified on-chain; the weighted games (wheel/plinko)
// revert on this testnet deployment, so they show in the catalog but
// aren't bettable here.
export const BETSWIRL_GAMES = [
  { key: 'dice', title: 'Dice', image: '/img/games/dice.webp', playable: true, control: 'dice', tags: ['popular'] },
  { key: 'coin-toss', title: 'Coin Toss', image: '/img/games/coin-toss.webp', playable: true, control: 'coin', tags: ['popular'] },
  { key: 'roulette', title: 'Roulette', image: '/img/games/roulette.webp', playable: true, control: 'roulette', tags: ['popular', 'live-casino'] },
  { key: 'keno', title: 'Keno', image: '/img/games/keno.webp', playable: true, control: 'keno', tags: ['game-shows'] },
  { key: 'wheel', title: 'Wheel', image: '/img/games/wheel.webp', playable: false, control: 'weighted', tags: ['new'] },
  { key: 'plinko', title: 'Plinko', image: '/img/games/plinko.webp', playable: false, control: 'weighted', tags: ['new'] },
];
