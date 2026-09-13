// BGaming — third-party studio, demo ("FUN") mode.
//
// Their public demo host serves every game unauthenticated and answers with
// `X-Frame-Options: ALLOWALL`, so the games can be framed directly. There is
// no key, no account and no contract; the flip side is that nothing is
// promised. If the URL shape changes or they start refusing our origin, this
// adapter is the only thing that breaks, and dropping it removes the games
// cleanly rather than leaving dead tiles.
//
// Catalogue lives in ./bgaming.games.js as flat data, harvested from their
// public game sitemap and resolved against the demo host. Regenerating it is
// a data change, not a code change.
import { makeGame, LAUNCH_EXTERNAL } from "../game.js";
import { tagsFor } from "../normalize.js";
import { BGAMING_GAMES } from "./bgaming.games.js";

const DEMO_HOST = "https://demo.bgaming-network.com";
export const demoUrl = (gameId) => `${DEMO_HOST}/play/${gameId}/FUN?server=demo`;

export const bgaming = {
  id: "bgaming",
  label: "BGaming",
  games() {
    return BGAMING_GAMES.map((g) =>
      makeGame({
        key: g.slug,
        title: g.title,
        source: "bgaming",
        kind: "provider",
        studio: "BGaming",
        image: g.image ?? null,
        tags: tagsFor({ genre: g.genre, slug: g.slug, title: g.title }),
        launch: { kind: LAUNCH_EXTERNAL, src: demoUrl(g.game) },
      }),
    );
  },
};
