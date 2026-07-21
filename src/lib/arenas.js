// Canonical arena identity — the one place "which arenas exist and what
// they're called" is defined. Every per-surface arena list (Sidebar.jsx's
// PRODUCTS, MobileBottomNav.jsx's PRODUCTS, PromoStrip.jsx's SEARCH_SCOPES)
// derives its id/label from this instead of re-typing the same three
// strings independently in three different files — adding, renaming, or
// reordering an arena is a one-file change (see IMPLEMENTATION: "avoid
// hardcoding Casino-only behaviour inside individual components" / "one
// shared source of truth for arena availability").
//
// Per-surface presentation (icons, colors, search placeholder copy) stays
// local to each consumer — that's genuinely surface-specific, not
// "availability" data — each consumer maps over ARENAS and merges in its
// own metadata by id. The ALLOW/DENY decision itself (which of these is
// actually reachable right now) is a separate concern, already centralized
// in lib/platformScope.js's isArenaAllowed/resolveScopedProduct.
export const ARENAS = [
  { id: "casino", label: "Casino" },
  { id: "predictions", label: "Predictions" },
  { id: "sports", label: "Sports" },
];
