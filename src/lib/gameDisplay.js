// TRIBET GAME DISPLAY SYSTEM — one authoritative metadata contract for how
// every game (Tribet Originals + provider/vendored) is framed, sized, and
// controlled by the shared GameStage.jsx shell.
// See docs/casino/game-display-inventory.md for the evidence this is
// based on — profile assignments and provider-control declarations below
// are traceable to specific CSS/HTML evidence found there, not invented;
// anywhere that evidence was thin, the inventory doc says so and this
// file defaults to the safe, current, unchanged behavior rather than
// guessing a new one.
//
// Plain JS (this is a JS-based project — no TypeScript introduced solely
// for this file, matching every other lib/* module).

// FOUNDATION: three viewport profiles cover every game in the catalog
// today. A game that needs a different shape in the future adds a fourth
// profile here, not a one-off exception inside GameStage.jsx.
export const DISPLAY_PROFILE = {
  // Centered, form-like UI (bet amount, action button, simple selectors).
  // Evidence: BetSwirlGame.jsx's own root already self-constrains to
  // max-w-md (448px) — giving it a compact box removes proven-empty
  // background instead of fighting its own internal width cap.
  COMPACT: "compact",
  // Dashboard-style layouts with side-by-side panels that want real
  // width. Evidence: crash's own `max-width: 1440px` + `.game-column`
  // side-panel layout.
  LANDSCAPE_WIDE: "landscapeWide",
  // Fully responsive iframe apps with their own internal breakpoints
  // across a wide size range, with no single strong preferred ratio
  // found in this pass. The safe default: keep today's EXISTING box
  // exactly as-is (no regression risk) rather than assume a shape no
  // evidence supports — see the inventory doc's per-game confidence notes.
  FLEXIBLE: "flexible",
};

// Each profile's own box — consumed by GameStage.jsx's content-box
// sizing. `sizingMode` describes how the CONTENT within the box should
// behave:
//   "intrinsic" — content is naturally narrower than the box; center it,
//                 never stretch it to fill (Tribet Originals' own forms)
//   "contain"   — box has a real preferred aspect ratio; letterbox rather
//                 than crop/stretch if the available area doesn't match
//   "fill"      — content is genuinely responsive; let it fill the box
//                 (today's existing, unchanged default)
// Do not force every third-party game into one hardcoded aspect ratio —
// only COMPACT and LANDSCAPE_WIDE declare a real preferred shape, both
// backed by concrete evidence; FLEXIBLE deliberately declares none.
export const VIEWPORT_PROFILES = {
  [DISPLAY_PROFILE.COMPACT]: {
    sizingMode: "intrinsic",
    preferredAspectRatio: null,
    designViewport: { width: 520, height: 640 },
    minimumViewport: {
      desktop: { width: 420, height: 520 },
      mobile: { width: 320, height: 480 },
    },
    // CSS-consumable box (see GameStage.jsx) — a real MAXIMUM,
    // not a forced size: shorter content still shrinks the box via
    // min()/percent, the same technique the existing box already used.
    contentBoxMaxWidthPx: 560,
    contentBoxMaxHeightPx: 720,
    supportsFullscreenDefault: false, // fullscreening a deliberately-small centered form doesn't serve the player
  },
  [DISPLAY_PROFILE.LANDSCAPE_WIDE]: {
    sizingMode: "fill",
    preferredAspectRatio: "12 / 7",
    designViewport: { width: 1440, height: 840 },
    minimumViewport: {
      desktop: { width: 960, height: 600 },
      mobile: { width: 320, height: 480 },
    },
    contentBoxMaxWidthPx: 1440,
    contentBoxMaxHeightPx: 860,
    supportsFullscreenDefault: true,
  },
  [DISPLAY_PROFILE.FLEXIBLE]: {
    sizingMode: "fill",
    preferredAspectRatio: null,
    // Matches the PRE-EXISTING universal box exactly
    // (min(92vw,1100px) x min(100%,720px)) — every game without strong
    // evidence for a different shape keeps today's ACTUAL current
    // behavior, not a guessed new one.
    designViewport: { width: 1100, height: 720 },
    minimumViewport: {
      desktop: { width: 960, height: 600 },
      mobile: { width: 320, height: 568 },
    },
    contentBoxMaxWidthPx: 1100,
    contentBoxMaxHeightPx: 720,
    supportsFullscreenDefault: true,
  },
};

// Default host/provider control contract — every game gets this UNLESS
// its own entry below overrides a specific field with real evidence (see
// the inventory doc). Fullscreen defaults from the profile itself, not
// this shared object, since it's a per-shape rather than a per-game-kind
// decision.
const DEFAULT_HOST_CONTROLS = { close: true, favorite: true, gameInfo: true };
const DEFAULT_PROVIDER_CONTROLS = { close: false, fullscreen: false, sound: false, help: false, history: false };

// Per-game overrides, keyed by the exact favId CasinoCatalog.jsx computes
// (`bgaming:<slug>`) — kept here rather than inline on the catalog data so
// this file stays the one place display behavior is decided. Empty for now:
// the removed BetSwirl/placeholder-provider games were the only ones with
// confirmed-by-evidence overrides; add a `bgaming:<slug>` entry here once a
// specific BGaming title needs one.
const GAME_OVERRIDES = {};

// Resolves the final, fully-merged display metadata for one game object
// (as found in CasinoCatalog.jsx's ALL_GAMES — has `favId`, `kind`,
// `key`, `providerId`). Pure function: the same game object always yields
// the same result, so it's unit-testable without rendering anything.
export function getGameDisplayMetadata(game) {
  const override = (game && GAME_OVERRIDES[game.favId]) || {};
  const displayProfile = override.displayProfile ?? DISPLAY_PROFILE.FLEXIBLE;
  const profile = VIEWPORT_PROFILES[displayProfile];
  return {
    id: game?.favId ?? null,
    provider: game?.providerId ?? game?.studio ?? "bgaming",
    implementation: "iframe",
    displayProfile,
    sizingMode: profile.sizingMode,
    preferredAspectRatio: profile.preferredAspectRatio,
    designViewport: profile.designViewport,
    minimumViewport: profile.minimumViewport,
    contentBoxMaxWidthPx: profile.contentBoxMaxWidthPx,
    contentBoxMaxHeightPx: profile.contentBoxMaxHeightPx,
    supportsFullscreen: profile.supportsFullscreenDefault,
    providerControls: { ...DEFAULT_PROVIDER_CONTROLS, ...(override.providerControls ?? {}) },
    hostControls: {
      ...DEFAULT_HOST_CONTROLS,
      fullscreen: profile.supportsFullscreenDefault,
      ...(override.hostControls ?? {}),
    },
  };
}
