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

export function track(event, properties = {}) {
  const payload = { ...baseContext(), ...properties };
  // eslint-disable-next-line no-console
  console.info(`[analytics] ${event}`, payload);
}
