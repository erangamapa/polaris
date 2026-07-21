// Dev-only decorator around the real useWallet() — never a second wallet
// store, never a fork of the real connection logic (see DO NOT CHANGE:
// "wallet rewrite"). In production this is exactly `useWallet()` with zero
// extra work; in dev, when the Developer Panel has set a field away from
// "default", the matching real value is overridden for display purposes
// only — nothing here touches the actual wagmi/viem connection, so the
// real wallet flow (Connect, disconnect, chain switching) keeps working
// underneath the mock exactly as before.
//
// Also where the auth/wallet separation this task requires actually
// surfaces in the UI (see devMock.js's architecture note for why): a real
// `authStatus` doesn't exist anywhere else in the app, so its only visible
// effects are the two new derived flags below (`loggedInNoWallet`,
// `sessionExpired`) that TopBar.jsx renders distinctly from the plain
// disconnected/connected states it already had.
import { useWallet } from "@/web3/useWallet";
import { useDevMockState } from "./devMock";

const MOCK_ADDRESS = "0xDEV0000000000000000000000000000000DEV0";

const BALANCE_PRESET_VALUES = {
  zero: 0,
  normal: 1248.32,
  large: 1284392.18,
};

export function useDevAwareWallet() {
  const real = useWallet();
  if (!import.meta.env.DEV) return { ...real, loggedInNoWallet: false, sessionExpired: false, authStatus: "default" };

  // eslint-disable-next-line react-hooks/rules-of-hooks -- import.meta.env.DEV
  // is a build-time constant; this branch never changes within a running
  // build (dev builds always take it, prod builds never reach it — the
  // early return above already dead-code-eliminates this whole rest of the
  // function in production).
  const mock = useDevMockState();

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
    view.casinoBalanceError = mock.balancePreset === "error";
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
