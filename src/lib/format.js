export const fmt = (n) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Locale-safe USD formatting, e.g. 6284.2 -> "$6,284.20" (used by the
// Wallet modal's market-rate USD estimate — see useAssetPrice.js).
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const fmtUsd = (n) => usdFormatter.format(n);

// Spoken-out accessible label for a USD amount, e.g. 842.41 -> "842 dollars
// and 41 cents" — screen readers generally read currency-formatted text
// fine on their own, but the Wallet modal's USD line is spelled out
// explicitly per an accessibility requirement rather than relying on that.
export function fmtUsdSpoken(n) {
  const dollars = Math.floor(n);
  const cents = Math.round((n - dollars) * 100);
  const dollarWord = dollars === 1 ? "dollar" : "dollars";
  const centWord = cents === 1 ? "cent" : "cents";
  return `${dollars} ${dollarWord} and ${cents} ${centWord}`;
}

// Compact money, e.g. 1_240_000 -> "$1.2M"
export const fmtCompact = (n) =>
  "$" +
  Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

// Probability as a whole-number percent, e.g. 0.62 -> "62%"
export const fmtPct = (p) => `${Math.round(p * 100)}%`;

// Price in cents, e.g. 0.62 -> "62¢"
export const fmtCents = (p) => `${Math.round(p * 100)}¢`;

// Current time for activity feed entries, e.g. "Jun 28, 14:02".
export function nowLabel() {
  return new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
