// Shared radial glow backdrop for every promo-card artwork zone — Casino's
// wallet/welcome/race icons (PromoStrip.jsx) and every Sports/Predictions
// icon in this folder all render through this one component instead of
// each carrying its own copy. One consistent atmosphere (the brand blue,
// var(--global-cta) — never a per-arena tint) behind every icon, so all
// promo cards across all three arenas visibly belong to the same system.
export function GlowBackdrop() {
  return (
    <div
      className="absolute inset-0"
      style={{ background: "radial-gradient(65% 65% at 50% 45%, color-mix(in srgb, var(--global-cta) 14%, transparent), transparent 72%)" }}
      aria-hidden="true"
    />
  );
}
