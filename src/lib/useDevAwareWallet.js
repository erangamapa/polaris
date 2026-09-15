// Decorator around the real useWallet() — never a second wallet store,
// never a fork of the real connection logic (see DO NOT CHANGE: "wallet
// rewrite"). When `DEV_PANEL_ENABLED` (devPanelFlag.js) is off this is
// exactly `useWallet()` with zero extra work; when it's on (currently
// every build, including production), and the Developer Panel has set a
// field away from "default", the matching real value is overridden for
// display purposes only — nothing here touches the actual wagmi/viem
// connection, so the real wallet flow (Connect, disconnect, chain
// switching) keeps working underneath the mock exactly as before.
//
// Also where the auth/wallet separation this task requires actually
// surfaces in the UI (see devMock.js's architecture note for why): a real
// `authStatus` doesn't exist anywhere else in the app, so its only visible
// effects are the two new derived flags below (`loggedInNoWallet`,
// `sessionExpired`) that TopBar.jsx renders distinctly from the plain
// disconnected/connected states it already had.
import { useWallet } from "@/web3/useWallet";
import { useDevMockState } from "./devMock";
import { DEV_PANEL_ENABLED } from "./devPanelFlag";

const MOCK_ADDRESS = "0xDEV0000000000000000000000000000000DEV0";

const BALANCE_PRESET_VALUES = {
  zero: 0,
  normal: 1248.32,
  large: 1284392.18,
  // Real BetSwirl stakes on this testnet are this small (see
  // BetSwirlGame.jsx's default 0.00001 ETH bet) — exercises precision/
  // formatting at the actual scale this app uses, not an arbitrary tiny
  // number (see CASINO ACTIVITY/BALANCE task's NUMERIC SAFETY: "large
  // balances remain readable" applies just as much in the other direction).
  tiny: 0.00000042,
  // "syncing"/"stale" reuse the "normal" value as their underlying balance —
  // both are about the STATUS derived around a real value (see
  // lib/casinoBalance.js's resolveBalanceStatus), not a different amount.
  syncing: 1248.32,
  stale: 1248.32,
};

export function useDevAwareWallet() {
  const real = useWallet();
  // Keep hook order unconditional; the store itself handles the disabled flag.
  const mock = useDevMockState();
  if (!DEV_PANEL_ENABLED) return { ...real, loggedInNoWallet: false, sessionExpired: false, authStatus: "default" };

  let view = { ...real, wrongNetworkOverride: null };

  if (mock.walletStatus !== "default") {
    const connected = mock.walletStatus === "connected" || mock.walletStatus === "wrong-network";
    view.status = mock.walletStatus === "wrong-network" ? "connected" : mock.walletStatus;
    view.isConnected = connected;
    view.onCasinoChain = connected && mock.walletStatus !== "wrong-network";
    view.onSportsChain = view.onCasinoChain;
    view.address = connected ? (real.address ?? MOCK_ADDRESS) : real.address;
    view.isSwitching = mock.walletStatus === "connecting";
    // App.jsx's own `wrongNetwork` prop is derived from the REAL wallet, so
    // it can't see this mock — TopBar reconciles the two by preferring this
    // override whenever a wallet mock is active (see TopBar.jsx).
    view.wrongNetworkOverride = mock.walletStatus === "wrong-network";
  }

  if (mock.balancePreset !== "default") {
    view.casinoBalanceLoading = mock.balancePreset === "loading";
    // "stale" simulates a refresh that failed while a good value was
    // already on screen (see resolveBalanceStatus: error + a real
    // lastUpdatedAt = stale, not the bare "error" state with no value ever
    // obtained) — "error" alone simulates the no-value-ever case.
    view.casinoBalanceError = mock.balancePreset === "error" || mock.balancePreset === "stale";
    // "syncing" simulates a background refetch while a value is already
    // shown — real react-query semantics (see useWallet.js's
    // casinoBalanceFetching), just forced on for this preset instead of
    // waiting for a real 15s poll to land mid-demo.
    view.casinoBalanceFetching = mock.balancePreset === "syncing";
    if (mock.balancePreset in BALANCE_PRESET_VALUES) view.casinoBalance = BALANCE_PRESET_VALUES[mock.balancePreset];
  }

  // "Logged in" but the wallet itself is still disconnected/default — the
  // one combination with no real backing state at all (see architecture
  // note above). Only meaningful when the wallet isn't already showing as
  // connected some other way.
  view.loggedInNoWallet = mock.authStatus === "logged-in" && !view.isConnected;
  view.sessionExpired = mock.authStatus === "session-expired";
  // Raw pass-through — lib/profileState.js's getProfileVariant needs the
  // full three-way mock value (including "logged-out"), not just these two
  // already-derived booleans.
  view.authStatus = mock.authStatus;

  return view;
}
