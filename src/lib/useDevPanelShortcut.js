// Shift+D global shortcut for the Developer Panel — dev-only. Registers
// nothing at all in production: the whole hook body short-circuits before
// adding any listener, so there is no Shift+D interception, no keydown
// handler, and (since `import.meta.env.DEV` is a build-time constant Vite
// inlines and dead-code-eliminates) none of this even ships in the
// production bundle.
import { useEffect } from "react";
import { toggleDevPanel, closeDevPanel, getDevMockState } from "./devMock";

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

// Pure — kept separate from the DOM event listener below so the "is this
// element a typing surface" rule is unit-testable without a real DOM
// (see SHORTCUT BEHAVIOR: input/textarea/select/contenteditable/code
// editor must all be excluded).
export function isTypingTarget(el) {
  if (!el) return false;
  if (EDITABLE_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  // Code editors (CodeMirror/Monaco-style) commonly mark a wrapping element
  // role="textbox" rather than using a real <textarea> for the visible
  // surface — treat that the same as an editable field.
  if (el.closest?.('[role="textbox"], [contenteditable="true"]')) return true;
  return false;
}

// Pure decision function for "does this keydown toggle the panel" — takes
// plain values (not a real KeyboardEvent) so it's unit-testable without
// dispatching DOM events. The listener below is a thin adapter that reads
// these same fields off the real event and calls this.
export function shouldToggleDevPanel({ code, shiftKey, ctrlKey, metaKey, altKey, repeat, target }) {
  if (code !== "KeyD") return false;
  if (!shiftKey) return false;
  if (ctrlKey || metaKey || altKey) return false;
  if (repeat) return false; // held-key auto-repeat must not double-toggle
  if (isTypingTarget(target)) return false;
  return true;
}

export function useDevPanelShortcut() {
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

    const onKeyDown = (e) => {
      // Escape closes whenever the panel is open, regardless of focus
      // target (matches standard "Escape dismisses the topmost overlay"
      // behavior — see ACCESSIBILITY).
      if (e.key === "Escape") {
        if (getDevMockState().panelOpen) closeDevPanel();
        return;
      }

      // event.code is layout/case-independent (the physical "D" key), so
      // this fires the same whether the user's next keystroke would have
      // produced "d" or "D" — no separate uppercase/lowercase branch
      // needed, and ordinary D typing elsewhere is never touched since
      // shouldToggleDevPanel bails out whenever the target is a typing
      // surface.
      if (!shouldToggleDevPanel(e)) return;

      e.preventDefault(); // never let "D" land in a field, never submit/navigate
      toggleDevPanel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // Mount once for the app's lifetime — toggleDevPanel/closeDevPanel read
    // the live store directly rather than closing over state, so this
    // never needs to re-subscribe, and HMR replaces the whole module
    // (old listener torn down by this same cleanup) rather than stacking.
  }, []);
}
