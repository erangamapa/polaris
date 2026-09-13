// Source genre wording -> our own CATEGORY_META tags.
//
// Every studio names its shelves differently ("Exclusive Slots", "Instant",
// "Table"). The lobby only understands the tags in casinoCategories.js, so
// translation happens here, once, rather than each adapter inventing its own.
// An unmapped genre yields no tag rather than a guess: a game that shows up
// under no category is recoverable, one filed under the wrong one is not.

// Matched against genre + slug + title together, so a studio's own shelf name
// ("Cards", "Casual") and a telling game name ("dragons-crash") both land.
const RULES = [
  [/(roulette|blackjack|baccarat|poker|craps|sic\s?bo|cards?|table)/i, "table-games"],
  [/(crash|limbo|xy\b|always\s?up|aviator|rocket)/i, "crash"],
  [/(plinko|mine|scratch|keno|dice|hi-?lo|instant|wheel|casual|lottery|bingo)/i, "instant"],
  [/(live)/i, "live-casino"],
  [/(slot|megaways|hold\s*(and|&)\s*win|bonanza|reel|fruit)/i, "slots"],
];

// Slug/title keywords are the fallback when a source exposes no genre at all.
export function tagsFor({ genre, slug = "", title = "" }) {
  const hay = `${genre ?? ""} ${slug} ${title}`;
  const tags = new Set();
  for (const [re, tag] of RULES) if (re.test(hay)) tags.add(tag);
  // A game that matched nothing is still playable and still has to live
  // somewhere, or it renders in the lobby under no category at all. Slots is
  // the safe home: it is the overwhelming majority of every studio catalogue,
  // and the distinctive genres above have already been claimed by this point.
  if (tags.size === 0) tags.add("slots");
  // "crash"/"instant" are our shelf names for the same family the lobby shows
  // under Game Shows today; keep both so either category can be populated.
  if (tags.has("crash") || tags.has("instant")) tags.add("game-shows");
  return [...tags];
}
