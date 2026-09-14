// Hand-curated "Popular" shelf — NOT a real play-count/popularity metric.
// None exists anywhere in this project's client data (confirmed: no
// popularity/playCount/plays/rank field in bgaming.games.js or elsewhere).
// Picked for name recognition and genre variety across the catalog.
// Verify against bgaming.games.js if that file is regenerated — a slug
// that no longer exists there silently drops out of Popular (see
// catalog.test.js's subset assertion).
export const POPULAR_SLUGS = new Set([
  "aloha-king-elvis",       // Slots
  "aztec-magic-deluxe",     // Slots
  "alien-fruits",           // Slots
  "fruit-million",          // Slots
  "elvis-frog-in-playamo",  // Exclusive Slots
  "wild-west-bonanza",      // Slots Exclusive
  "american-roulette",      // Roulette (Table Games)
  "multihand-blackjack",    // Cards (Table Games)
  "dice-clash",             // Dice (Table Games)
  "3-kings-scratch",        // Scratch
  "dragons-crash",          // Casual
  "easter-plinko",          // Casual
  "balloon-mania",          // Casual
  "chicken-shot",           // Casual
]);
