// Viewport/orientation classification for the Casino gameplay frame — pure
// functions kept separate from the hook (same split as
// sportsDesktopBetslipUi.js's nextDesktopBetslipUiState vs
// useSportsDesktopBetslipUi) so the classification rules are unit-testable
// without rendering anything.
import { useEffect, useState } from "react";

// Same md breakpoint every other mobile/desktop split in this app already
// uses (MobileBottomNav's `md:hidden`, App.jsx's own matchMedia for the
// mobile menu) — one shared number, not a second breakpoint convention.
export const MOBILE_BREAKPOINT_QUERY = "(max-width: 767px)";

export function classifyViewport(width) {
  return width < 768 ? "mobile" : "desktop";
}

export function classifyOrientation(width, height) {
  return width >= height ? "landscape" : "portrait";
}

// Whether the current orientation is worth a non-blocking rotate hint for
// this specific game. Only ever true for a game that explicitly declares
// itself landscape-only — no game in PROVIDER_GAMES/BETSWIRL_GAMES declares
// `orientation` today (see ASPECT RATIO/metadata: "do not invent metadata
// without evidence"), so this is real, tested logic that simply has no live
// trigger yet rather than a fabricated one. A future game that legitimately
// needs it (e.g. a wide provably-unplayable-in-portrait iframe) sets
// `orientation: "landscape"` on its catalog entry and this activates with no
// further code changes.
export function needsRotateHint(game, orientation) {
  return Boolean(game && game.orientation === "landscape" && orientation === "portrait");
}

// One shared listener for the gameplay frame's own viewport/orientation
// reads (analytics' viewportClass/orientation fields, the rotate hint) —
// deliberately the only resize/orientation listener the frame installs, so
// it doesn't compete with a second system (see RESIZE HANDLING: "do not
// introduce multiple competing resize systems"). Sizing itself is plain CSS
// (min()/dvh/env()), not driven by this hook at all — this only answers
// "what orientation/class is it right now", not "how many pixels".
export function useCasinoViewportInfo() {
  const getSnapshot = () => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  });
  const [{ width, height }, setSize] = useState(getSnapshot);

  useEffect(() => {
    const onResize = () => setSize(getSnapshot());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return {
    width,
    height,
    viewportClass: classifyViewport(width),
    orientation: classifyOrientation(width, height),
  };
}
