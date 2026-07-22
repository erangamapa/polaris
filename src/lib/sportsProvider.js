// Which sports betting provider backs the Sports arena. Swappable at build
// time so the whole read+bet path can move from Azuro to SX Bet without
// touching any presentation component — every page consumes the normalized
// SportsEvent model (sportsModel.js) regardless of provider.
//
//   VITE_SPORTS_PROVIDER = "sxbet" (default) | "azuro"
//
// SX Bet has real, populated testnet inventory (Toronto testnet) where Azuro's
// dev feed is effectively empty — see docs/architecture and the provider
// investigation. When SX is active, demo/mock inventory is switched OFF (real
// markets stand on their own), which is why this also gates sportsDemo.js.
export const SPORTS_PROVIDER = import.meta.env.VITE_SPORTS_PROVIDER || "sxbet";

export const isSxbet = () => SPORTS_PROVIDER === "sxbet";
export const isAzuro = () => SPORTS_PROVIDER === "azuro";
