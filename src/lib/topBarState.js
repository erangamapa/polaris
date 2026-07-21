// TopBar's one real decision: which right-cluster variant to show. Kept as
// a pure function (same split as sportsDesktopBetslipUi.js/
// sportsMobileBetslipUi.js/mobileMenuFocus.js) so it's unit-testable
// without rendering anything, and so the two nested conditionals this
// task's states section describes (connected vs disconnected, then
// wrong-network vs normal) resolve through one place instead of being
// re-derived inline in JSX.
export const TOP_BAR_MODE = {
  DISCONNECTED: "disconnected",
  WRONG_NETWORK: "wrong-network",
  CONNECTED: "connected",
};

export function getTopBarMode({ isConnected, wrongNetwork }) {
  if (!isConnected) return TOP_BAR_MODE.DISCONNECTED;
  if (wrongNetwork) return TOP_BAR_MODE.WRONG_NETWORK;
  return TOP_BAR_MODE.CONNECTED;
}

// Which content the centered Balance/Wallet HUD shows — one more decision
// layered on top of getTopBarMode's wallet-only read, folding in the two
// dev-only auth states (Developer Panel -> User) that pre-empt it entirely.
// Session expired is deliberately its OWN variant, never coerced into
// "disconnected" or "connected": auth and wallet are independent axes (see
// useDevAwareWallet.js's architecture note), so a session can expire while
// the wallet itself stays connected underneath.
export const HEADER_CENTER_VARIANT = {
  ...TOP_BAR_MODE,
  SESSION_EXPIRED: "session-expired",
  LOGGED_IN_NO_WALLET: "logged-in-no-wallet",
};

export function getHeaderCenterVariant({ sessionExpired, loggedInNoWallet, mode }) {
  if (sessionExpired) return HEADER_CENTER_VARIANT.SESSION_EXPIRED;
  if (loggedInNoWallet) return HEADER_CENTER_VARIANT.LOGGED_IN_NO_WALLET;
  return mode;
}
