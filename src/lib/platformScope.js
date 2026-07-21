// Pure decision logic for the Developer Panel's Platform Scope mock (see
// devMock.js's `platformScope` field). Casino is always allowed; Sports and
// Predictions are gated by scope. Kept separate from App.jsx/Sidebar.jsx/
// MobileBottomNav.jsx so the actual gating rule is unit-testable without a
// DOM, and shared by every surface that needs to answer "is this arena
// reachable right now" (routing, arena-switch handlers, disabled-tab UI).
export function isArenaAllowed(product, platformScope) {
  if (product === "casino") return true;
  return platformScope === "full";
}

// Resolves a requested product against the current scope — the same
// product if it's allowed, otherwise the "Coming soon" redirect target
// (Casino). Used for initial-load resolution, popstate, and any other spot
// that needs "what product should actually be shown."
export function resolveScopedProduct(product, platformScope) {
  return isArenaAllowed(product, platformScope) ? product : "casino";
}
