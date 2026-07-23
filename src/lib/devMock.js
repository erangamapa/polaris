// Mock-state store for the Developer Panel (Shift+D). A tiny module-level
// external store (React's built-in useSyncExternalStore, no new state
// library) rather than a Context Provider — this state needs to be read
// from many unrelated surfaces (TopBar, CasinoLobby, game launch, activity)
// without threading a Provider through App.jsx's tree, and it's a genuinely
// global, singleton concern.
//
// Every mutator below no-ops when `DEV_PANEL_ENABLED` (devPanelFlag.js) is
// off, so even if some file accidentally imported this in a path that
// reached a build with the flag off, it could never actually change
// anything there. Product decision: the flag is currently `true` in every
// build, including production, so the panel and its mocks ARE live on
// playtribet.vercel.app — see devPanelFlag.js for the toggle.
//
// IMPORTANT ARCHITECTURE NOTE — auth vs wallet coupling in the real app:
// today there is no independent "logged in" concept anywhere in Tribet;
// `wallet.isConnected` (see web3/useWallet.js) IS the login signal
// (ensureAuth, TopBar's connected cluster, etc. all key off it directly).
// This store deliberately models `authStatus` and `walletStatus` as two
// SEPARATE fields anyway, per this task's explicit architecture rule — but
// only `walletStatus` has a real, pre-existing UI surface to override
// (see useDevAwareWallet.js). `authStatus` drives the one new,
// purpose-built visual this task adds for the combinations that don't
// exist in the real app yet: a "logged in, wallet not connected" prompt
// and a "session expired" state — both entirely mocked/presentational, not
// backed by any real auth system. This is the "clear mock-layer
// distinction" the task asks for in place of a real auth rewrite.
import { useSyncExternalStore } from "react";
import { DEV_PANEL_ENABLED } from "./devPanelFlag";

const STORAGE_KEY = "tribet-dev-panel-state";
const STORAGE_VERSION = 2;

// "default" means "don't override — use the real app's own state." Reset
// is just "every field back to its default." `platformScope` is the one
// exception: it isn't a "defer to real state" mock, it's a direct two-value
// toggle (there's no independent real-app concept to defer to). Its resting
// value is "full" (unrestricted) — matching what every real user actually
// sees — not "mvp", since `DEV_PANEL_ENABLED` now leaves this default live
// in production too; someone opening the panel can still switch it to
// "mvp" to preview the MVP-scoped nav.
export const DEFAULT_DEV_MOCK_STATE = {
  version: STORAGE_VERSION,
  panelOpen: false,
  authStatus: "default", // default | logged-out | logged-in | session-expired
  walletStatus: "default", // default | disconnected | connecting | connected | wrong-network | error
  balancePreset: "default", // default | zero | normal | large | tiny | loading | syncing | stale | error
  platformScope: "full", // mvp | full
  favoritesPreset: "default", // default | empty | populated
  recentlyPlayedPreset: "default", // default | empty | populated
  gameStatus: "default", // default | loading | provider-error | maintenance | region-restricted | insufficient-balance
  transactionStatus: "none", // none | deposit-pending | deposit-confirmed | withdrawal-pending | withdrawal-failed | bet-won | bet-lost
  slowNetwork: false,
  forceApiError: false,
};

function safeLoad() {
  if (!DEV_PANEL_ENABLED || typeof window === "undefined") return DEFAULT_DEV_MOCK_STATE;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DEV_MOCK_STATE;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.version !== STORAGE_VERSION) return DEFAULT_DEV_MOCK_STATE;
    // Merge over defaults (not just parsed) so a state saved by an older
    // build missing a newer field still falls back safely instead of
    // rendering `undefined`.
    return { ...DEFAULT_DEV_MOCK_STATE, ...parsed, panelOpen: false };
  } catch {
    return DEFAULT_DEV_MOCK_STATE;
  }
}

let state = safeLoad();
const listeners = new Set();

function persist() {
  if (!DEV_PANEL_ENABLED || typeof window === "undefined") return;
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable — mock still works in-memory */ }
}

function notify() { listeners.forEach((l) => l()); }

export function getDevMockState() { return state; }

export function subscribeDevMockState(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setDevMockState(patch) {
  if (!DEV_PANEL_ENABLED) return;
  state = { ...state, ...patch };
  persist();
  notify();
}

export function resetDevMockState() {
  if (!DEV_PANEL_ENABLED) return;
  state = { ...DEFAULT_DEV_MOCK_STATE, panelOpen: state.panelOpen };
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  notify();
}

export function toggleDevPanel() {
  if (!DEV_PANEL_ENABLED) return;
  setDevMockState({ panelOpen: !state.panelOpen });
}

export function closeDevPanel() {
  if (!DEV_PANEL_ENABLED) return;
  if (state.panelOpen) setDevMockState({ panelOpen: false });
}

export function useDevMockState() {
  return useSyncExternalStore(subscribeDevMockState, getDevMockState, () => DEFAULT_DEV_MOCK_STATE);
}
