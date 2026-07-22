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
import { isSxbet } from "./sportsProvider";

// Mocks exist because Azuro's testnet feed is near-empty. SX Bet's testnet is
// genuinely populated, so demo mode is FORCED OFF whenever SX is the active
// provider — real markets stand on their own, no placeholders. For the Azuro
// provider it stays default-on (set VITE_SPORTS_DEMO_MODE=false to opt out).
export const SPORTS_DEMO_MODE = !isSxbet() && import.meta.env.VITE_SPORTS_DEMO_MODE !== "false";

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
