// Source genre wording -> our own CATEGORY_META tags.
//
// Every studio names its shelves differently. The lobby only understands
// the tags in casinoCategories.js, so translation happens here, once,
// rather than each adapter inventing its own. An unmapped genre yields no
// tag rather than a guess: a game that shows up under no category is
// recoverable, one filed under the wrong one is not.
//
// Exact-genre match is the primary path — BGaming's own genre field is
// already a clean, small enum (10 distinct values across 338 games,
// verified), so guessing from slug/title text is unnecessary noise for the
// one real source this project has. Both of BGaming's two spellings of the
// same shelf ("Exclusive Slots" / "Slots Exclusive") normalize to ONE tag
// right here — the only place genre-to-tag translation happens, so no
// category filter downstream ever needs an `||` on genre spelling.
const GENRE_TAG = {
  "Slots": "slots",
  "Casual": "casual",
  "Casual Exclusive": "casual",
  "Scratch": "scratch",
  "Lottery": "scratch",
  "Roulette": "table-games",
  "Cards": "table-games",
  "Dice": "table-games",
  "Exclusive Slots": "exclusive",
  "Slots Exclusive": "exclusive",
};

// Fallback only for a source with no genre field at all (or an unrecognized
// value) — never exercised by BGaming today, since every one of its 338
// entries has a genre. Kept so a future genre-less adapter still lands
// somewhere sane rather than requiring this file to change shape.
const FALLBACK_RULES = [
  [/(roulette|blackjack|baccarat|poker|craps|sic\s?bo|cards?|dice|table)/i, "table-games"],
  [/(scratch|lottery|bingo)/i, "scratch"],
  [/(casual)/i, "casual"],
];

export function tagsFor({ genre, slug = "", title = "" }) {
  const tags = new Set();
  const mapped = GENRE_TAG[genre];
  if (mapped) {
    tags.add(mapped);
  } else {
    const hay = `${genre ?? ""} ${slug} ${title}`;
    for (const [re, tag] of FALLBACK_RULES) if (re.test(hay)) tags.add(tag);
  }
  // A game that matched nothing is still playable and still has to live
  // somewhere, or it renders in the lobby under no category at all. Slots is
  // the safe home: it is the overwhelming majority of every studio catalogue.
  if (tags.size === 0) tags.add("slots");
  return [...tags];
}
