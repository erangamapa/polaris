import { DEV_PANEL_ENABLED } from './devPanelFlag';
import { APP_MODE } from '@shared/chains';

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

// ONE shared resolver for "the platformScope actually in effect right now"
// — every surface that decides whether Sports/Predictions should look
// available (App.jsx's own routing/redirect logic, the desktop arena
// selector, mobile bottom nav, the Casino search's scope dropdown, the
// footer's Sports links) calls this with whatever devMock state it already
// has on hand, instead of each independently re-deriving `DEV_PANEL_ENABLED
// ? mock.platformScope : APP_MODE`.
//
// INACTIVE-ARENA POLISH PASS: that inline expression had drifted into
// several different (and differently broken) copies across the app —
// App.jsx's three own copies correctly fell back to APP_MODE, but
// Sidebar.jsx/MobileBottomNav.jsx/PromoStrip.jsx each independently
// hardcoded a stale `: "full"` fallback instead (predating APP_MODE's
// introduction), AND each of those three ALSO wrapped their resulting
// `disabled` boolean in an extra `DEV_PANEL_ENABLED &&` — together meaning
// Predictions/Sports rendered as fully available, with no muted styling
// and no "Coming soon" tooltip, the instant the Dev Panel was off (now the
// production default — see devPanelFlag.js). Consolidating both the scope
// resolution AND the disabled-state computation through this one function
// (see isArenaAllowed above) is what actually fixes that, not just papers
// over one call site.
//
// Takes the mock state as a plain parameter (not a hook) so the exact same
// function works identically inside component render, event handlers, and
// state initializers alike — some call sites (App.jsx's popstate handler,
// its initial-state initializer) can't call a hook at all.
export function resolveEffectivePlatformScope(mockState) {
  return DEV_PANEL_ENABLED ? mockState.platformScope : APP_MODE;
}
