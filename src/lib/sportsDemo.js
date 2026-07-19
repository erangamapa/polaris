// Demo-mode inventory merge — the ONLY thing demo mode changes. Page
// components, routing, and the event-template system are identical in both
// modes; only which events flow into them differs. See DEMO MODE /
// INVENTORY STABILITY.
//
// Real provider events are always authoritative and always included.
// Placeholder events only ever supplement — they never replace or relabel
// a real event, and their odds/markets are never merged onto a real event
// (see PROVIDER DATA RULES: no mixing invented odds into a real event).
import { normalizeMockEvent } from "./sportsModel";
import { EVENTS as MOCK_RAW_EVENTS } from "./sportsData";

// Default true: real inventory on Base Sepolia/Polygon Amoy testnet is
// proven sparse (see docs/architecture/25-sports-taxonomy-and-ia.md §3), so
// without demo mode the MVP navigation structure has nothing to show.
// Explicitly set VITE_SPORTS_DEMO_MODE=false for a provider-only build.
export const SPORTS_DEMO_MODE = import.meta.env.VITE_SPORTS_DEMO_MODE !== "false";

const MOCK_EVENTS = MOCK_RAW_EVENTS.map(normalizeMockEvent).filter(Boolean);

// `sourceMarker` is dev-only labelling (AZURO / MOCK) — never shown to
// normal users, only read by the /sports/dev diagnostics panel.
export function getSportsInventory({ providerEvents = [], demoMode = SPORTS_DEMO_MODE } = {}) {
  const seen = new Set();
  const merged = [];
  for (const e of providerEvents) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    merged.push(e);
  }
  if (demoMode) {
    for (const e of MOCK_EVENTS) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      merged.push(e);
    }
  }
  return merged;
}
