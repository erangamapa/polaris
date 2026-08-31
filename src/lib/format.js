export const fmt = (n) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
