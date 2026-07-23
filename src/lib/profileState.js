// Player Profile / Account menu — pure decision logic, kept separate from
// TopBar.jsx/ProfileMenu.jsx so "which of the three profile states are we
// in" and "what does Sign Out actually do" are unit-testable without a DOM
// (matches this session's established convention — see topBarState.js's
// identical split for the balance HUD).
//
// Deliberately a SEPARATE model from topBarState.js's HEADER_CENTER_VARIANT
// (which governs the centered Balance+Wallet HUD — untouched by this task,
// see DO NOT CHANGE): Profile = account/auth state, Balance = wallet state,
// and this task's whole point is keeping those two independent rather than
// collapsing them into one combined enum.
export const PROFILE_VARIANT = {
  LOGGED_OUT: "logged-out",
  SESSION_EXPIRED: "session-expired",
  LOGGED_IN: "logged-in",
};

// `authStatus` mirrors devMock.js's field: "default" | "logged-out" |
// "logged-in" | "session-expired". "default" means no auth-layer override
// is active — per devMock.js's own architecture note, wallet.isConnected IS
// the real login signal in this app (no separate auth backend exists), so
// that's the only honest fallback (see SIGN OUT: "do not fake a backend
// logout if no backend exists; use the mocked auth layer honestly" — the
// same honesty applies to login, not just logout). Whenever an explicit
// mock IS active, it wins regardless of the real/mocked wallet connection
// state — that's the whole point of the mock (see PROFILE STATES: "logged
// in + wallet disconnected" is a real, supported combination).
export function getProfileVariant({ authStatus, isConnected }) {
  if (authStatus === "session-expired") return PROFILE_VARIANT.SESSION_EXPIRED;
  if (authStatus === "logged-out") return PROFILE_VARIANT.LOGGED_OUT;
  if (authStatus === "logged-in") return PROFILE_VARIANT.LOGGED_IN;
  return isConnected ? PROFILE_VARIANT.LOGGED_IN : PROFILE_VARIANT.LOGGED_OUT;
}

// ACCOUNT, SECURITY AND SESSION SETTINGS task's one real question: what did
// the player actually sign in WITH? "wallet" is only ever returned when a
// real wallet connection exists — this app has no other authentication
// mechanism (no email/password, no social login), so it's the one honest,
// non-invented value (see SIGN-IN METHOD: "do not show wallet as the
// sign-in method unless it actually authenticated the user"). The one
// combination with no real backing at all is the dev-only "logged in, but
// wallet not connected" mock (see devMock.js's architecture note) — that
// returns "unknown" rather than quietly claiming "wallet" for a session
// nothing real actually authenticated.
export function getAccountAuthMethod({ authStatus, isConnected }) {
  if (authStatus === "logged-in" && !isConnected) return "unknown";
  return isConnected ? "wallet" : undefined;
}

// Sign Out's one real decision: is there an active devMock auth-layer
// override to clear, or does this app's only real sign-out mechanism
// (disconnecting the wallet — see devMock.js's architecture note) need to
// run instead? Never disconnects a real wallet just because a *mocked*
// auth state is being cleared (see SIGN OUT: "preserve wallet connection
// unless current product logic explicitly disconnects it").
export function getSignOutAction(authStatus) {
  return authStatus === "default" ? "disconnect-wallet" : "reset-auth-mock";
}
