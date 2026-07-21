// Triple-tap the logo (within a 1.5s window) toggles the Developer Panel on
// touch devices, where Shift+D isn't practical — replaces the earlier
// long-press gesture as the app's one non-visible mobile entry point (see
// DO NOT ADD: "visible mobile dev trigger" — a hidden gesture, not an
// on-screen control). No-ops entirely in production, same guarantee as
// every other devMock-driven surface (see lib/devMock.js).
import { useCallback, useRef } from "react";
import { toggleDevPanel, getDevMockState } from "./devMock";
import { toast } from "./toast";

const TAP_WINDOW_MS = 1500;
const REQUIRED_TAPS = 3;
// A short post-toggle cooldown: without it, a stray extra tap landing right
// after the 3rd (a bouncy touchscreen, or the same physical gesture
// overshooting) would immediately start counting a new sequence and could
// re-toggle the panel a moment later — this absorbs that instead ("ignore
// taps during open/close transition", "prevent repeated toggles from extra
// taps").
const COOLDOWN_MS = 400;

// Pure — the actual tap-counting rule, kept separate from the DOM/
// vibration/toast side effects below so it's unit-testable without
// dispatching touch/click events. Given the previous sequence state and a
// new tap's timestamp, decides whether the tap is ignored (still in
// cooldown), starts/extends a sequence, or completes one (the 3rd tap
// within the window).
export function nextLogoTapState(state, now) {
  if (state.cooldownUntil != null && now < state.cooldownUntil) {
    return { ...state, completed: false, ignored: true };
  }
  const withinWindow = state.firstTapAt != null && now - state.firstTapAt <= TAP_WINDOW_MS;
  const count = (withinWindow ? state.tapCount : 0) + 1;
  if (count >= REQUIRED_TAPS) {
    return { tapCount: 0, firstTapAt: null, cooldownUntil: now + COOLDOWN_MS, completed: true, ignored: false };
  }
  return { tapCount: count, firstTapAt: withinWindow ? state.firstTapAt : now, cooldownUntil: null, completed: false, ignored: false };
}

export const INITIAL_LOGO_TAP_STATE = { tapCount: 0, firstTapAt: null, cooldownUntil: null };

export function useDevPanelLogoTap() {
  const stateRef = useRef(INITIAL_LOGO_TAP_STATE);

  // Single callback attached to the logo's onClick — a tap and a click are
  // the same event on touch devices (no separate touchstart/touchend
  // wiring needed), and this leaves the logo's normal single-tap behavior
  // (currently none — it's a static brand mark) completely untouched: 1 or
  // 2 taps just update the in-memory counter and produce no visible effect.
  return useCallback(() => {
    if (!import.meta.env.DEV) return;
    const next = nextLogoTapState(stateRef.current, Date.now());
    stateRef.current = next;
    if (next.ignored || !next.completed) return;

    const wasOpen = getDevMockState().panelOpen;
    toggleDevPanel();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(15); } catch { /* vibration unsupported/blocked — purely cosmetic */ }
    }
    if (!wasOpen) toast.info("Developer Panel opened");
  }, []);
}
