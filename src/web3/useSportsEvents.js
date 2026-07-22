// The active sports provider's normalized-events hook, chosen once at module
// load from the build-time provider flag. A static binding (not a per-render
// branch) so rules-of-hooks hold — the same hook is called every render, and
// only the active provider's feed is ever fetched.
import { isSxbet } from "@/lib/sportsProvider";
import { useNormalizedSxEvents } from "./useSxBet";
import { useNormalizedAzuroEvents } from "./useAzuro";

export const useSportsEvents = isSxbet() ? useNormalizedSxEvents : useNormalizedAzuroEvents;
