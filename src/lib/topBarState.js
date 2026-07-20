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
