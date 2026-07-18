// Mock content for the Sports/Predictions promo tiles (ArenaTileRow). Kept
// separate from ArenaPromoTile so the presentation component stays
// data-driven — swap these for real fixtures/markets later without touching
// any rendering code.
//
// `href` points at real in-app routes (see src/lib/routing.js) so the CTAs
// are never dead links, but none of them deep-link into a specific fixture or
// market yet since no such id exists in the mock data — the `?promo=` marker
// exists purely so a future pass can tell "arrived via a promo tile" apart
// from organic navigation. Replace with real ids once fixtures/markets carry
// stable identifiers.
export const SPORTS_PROMOS = [
  {
    id: "live-match",
    label: "LIVE NOW",
    title: "Barcelona vs Arsenal",
    metadata: "21:00 · Champions League",
    ctaLabel: "View markets",
    href: "/sports/soccer?promo=live-match",
    artwork: "sports-live-match",
    ariaLabel: "View markets — Barcelona vs Arsenal, 21:00, Champions League",
  },
  {
    id: "bet-builder",
    label: "BUILD YOUR BET",
    title: "One match. Your combination.",
    metadata: "Combine markets from the same game",
    ctaLabel: "Build a bet",
    href: "/sports/soccer?promo=bet-builder",
    artwork: "sports-bet-builder",
    ariaLabel: "Build a bet — combine markets from the same game",
  },
];

export const PREDICTIONS_PROMOS = [
  {
    id: "trending-market",
    label: "TRENDING NOW",
    title: "Will Bitcoin reach $150K?",
    metadata: "62% chance · $18.9M volume",
    ctaLabel: "View market",
    href: "/predictions/crypto?promo=trending-market",
    artwork: "predictions-trending-market",
    ariaLabel: "View market — Will Bitcoin reach $150K, 62% chance, $18.9M volume",
  },
  {
    id: "yes-no-position",
    label: "YOUR VIEW",
    title: "Yes or no. Enter at your price.",
    metadata: "Add, reduce or close anytime",
    ctaLabel: "Explore markets",
    href: "/predictions/trending?promo=yes-no-position",
    artwork: "predictions-yes-no-position",
    ariaLabel: "Explore markets — take a Yes or No position at your price",
  },
];
