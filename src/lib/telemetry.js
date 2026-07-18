// Thin analytics wrapper — no vendor wired yet, so this just logs a
// structured event to the console (real inspection surface for now: open
// devtools, filter on "[analytics]"). Swapping in a real provider later only
// means changing the body of `track`, not any of its call sites.
function baseContext() {
  if (typeof window === "undefined") return {};
  return {
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
  };
}

// Tracking must never be able to block navigation or surface an error to the
// user — swallow anything a future real vendor's SDK might throw (network
// failure, blocked request, etc).
export function track(event, properties = {}) {
  try {
    const payload = { ...baseContext(), ...properties };
    // eslint-disable-next-line no-console
    console.info(`[analytics] ${event}`, payload);
  } catch {
    /* ignore */
  }
}
