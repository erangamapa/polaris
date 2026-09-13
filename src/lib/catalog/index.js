// Source registry: every adapter that may contribute games, merged into one
// list for the lobby.
//
// Adding a studio is adding a file here. Nothing downstream — rails, search,
// favourites, category pages, the launch surface — learns a new case, because
// adapters emit the shape in game.js and tags from normalize.js.
//
// Order matters only for de-duplication: earlier sources win a key collision,
// so first-party content is never displaced by a third party shipping a game
// with the same slug.
import { ENABLE_BGAMING } from "@shared/chains";
import { bgaming } from "./adapters/bgaming.js";

// A source that is off contributes nothing; it is not merely hidden, so no
// rail, search index or category can surface a game that will not launch.
const ADAPTERS = [ENABLE_BGAMING && bgaming].filter(Boolean);

export function externalGames() {
  const seen = new Set();
  const out = [];
  for (const a of ADAPTERS) {
    for (const g of a.games()) {
      if (seen.has(g.favId)) continue;
      seen.add(g.favId);
      out.push(g);
    }
  }
  return out;
}

export const ADAPTER_IDS = ADAPTERS.map((a) => a.id);
