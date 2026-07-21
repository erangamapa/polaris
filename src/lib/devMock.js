// Dev-only mock-state store for the Developer Panel (Shift+D). A tiny
// module-level external store (React's built-in useSyncExternalStore, no
// new state library) rather than a Context Provider — this state needs to
// be read from many unrelated surfaces (TopBar, CasinoLobby, game launch,
// activity) without threading a Provider through App.jsx's tree, and it's
// a genuinely global, singleton, dev-only concern.
//
// Every mutator below no-ops outside dev (`import.meta.env.DEV` is a
// build-time constant Vite inlines and dead-code-eliminates — see
// DEV-ONLY REQUIREMENT), so even if some file accidentally imported this
// in a path that reached production, it could never actually change
// anything there. The panel component itself is also never rendered in
// production (see DevPanel.jsx) — this is the second, independent layer of
// exclusion, not the only one.
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

const STORAGE_KEY = "tribet-dev-panel-state";
const STORAGE_VERSION = 2;

// "default" means "don't override — use the real app's own state." Reset
// is just "every field back to its default." `platformScope` is the one
// exception: it isn't a "defer to real state" mock, it's a direct two-value
// toggle (there's no independent real-app concept to defer to), so its
// default is the literal starting value "mvp", not "default".
export const DEFAULT_DEV_MOCK_STATE = {
  version: STORAGE_VERSION,
  panelOpen: false,
  authStatus: "default", // default | logged-out | logged-in | session-expired
  walletStatus: "default", // default | disconnected | connecting | connected | wrong-network | error
  balancePreset: "default", // default | zero | normal | large | loading | error
  platformScope: "mvp", // mvp | full
  favoritesPreset: "default", // default | empty | populated
  recentlyPlayedPreset: "default", // default | empty | populated
  gameStatus: "default", // default | loading | provider-error | maintenance | region-restricted | insufficient-balance
  transactionStatus: "none", // none | deposit-pending | deposit-confirmed | withdrawal-pending | withdrawal-failed | bet-won | bet-lost
  slowNetwork: false,
  forceApiError: false,
};

function safeLoad() {
  if (!import.meta.env.DEV || typeof window === "undefined") return DEFAULT_DEV_MOCK_STATE;
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
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable — mock still works in-memory */ }
}

function notify() { listeners.forEach((l) => l()); }

export function getDevMockState() { return state; }

export function subscribeDevMockState(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setDevMockState(patch) {
  if (!import.meta.env.DEV) return;
  state = { ...state, ...patch };
  persist();
  notify();
}

export function resetDevMockState() {
  if (!import.meta.env.DEV) return;
  state = { ...DEFAULT_DEV_MOCK_STATE, panelOpen: state.panelOpen };
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  notify();
}

export function toggleDevPanel() {
  if (!import.meta.env.DEV) return;
  setDevMockState({ panelOpen: !state.panelOpen });
}

export function closeDevPanel() {
  if (!import.meta.env.DEV) return;
  if (state.panelOpen) setDevMockState({ panelOpen: false });
}

export function useDevMockState() {
  return useSyncExternalStore(subscribeDevMockState, getDevMockState, () => DEFAULT_DEV_MOCK_STATE);
}
