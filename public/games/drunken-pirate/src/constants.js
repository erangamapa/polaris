/** Shared game constants (browser + Node RTP simulator). */
export const HIT_PROB = 0.485;
export const MISS_PERSON_PROB = 0.515;
export const MIN_BET = 0.01;
export const MAX_BET = 100;
export const START_BALANCE = 1000;
export const SEASON_STEP = 1.2;
export const PULL_MS = 35;
export const SNAP_MS = 45;
export const FLIGHT_MS = 160;
export const SETTLE_MS = 500;
export const OVERLAY_MS = 1400;
export const FACE_CENSOR_MS = 1280;
export const LOSE_SFX_DELAY_MS = 180;
export const HELP_KEY = "drunkenArcherHelpSeen";
export const CLIENT_SEED_KEY = "drunkenPirateClientSeed";

export const STREAK_TRIGGER_HITS = 5;
export const STREAK_SLOW_MO_MULT = 3.2;
export const STREAK_CLAPS_VOL = [0, 0, 0, 0, 0.26, 0.58];
export const STREAK_CLAPS_PEAK_VOL = 0.92;
export const STREAK_SAFE_MULT = 32;
export const WHEEL_SLICE_COUNT = 6;
export const WHEEL_SLICES = ["skull", "apple", "skull", "skull", "apple", "skull"];
export const WHEEL_APPLE_PROB = WHEEL_SLICES.filter((s) => s === "apple").length / WHEEL_SLICE_COUNT;
export const STREAK_JACKPOT_MULT = 96;
export const BUYIN_COST_MULT = 10;
export const BUYIN_APPLE_MULT = 30;
export const WHEEL_BUYIN_TITLE = "Ship's Wheel (Bonus Spin)";
export const WHEEL_SPIN_MS = 5800;
export const WHEEL_RESULT_HOLD_MS = 2000;
export const WHEEL_CINEMATIC_FINAL_MS = 2400;
export const WHEEL_CINEMATIC_HURT_BEAT_MS = 700;
export const WHEEL_STREAK_INTRO_MS = 1100;
export const WHEEL_SLICE_DEG = 360 / WHEEL_SLICE_COUNT;
export const ROUND_HISTORY_MAX = 16;

export const TAVERN_NAMES = [
  "The Drunken Duck",
  "The Wobbly Arrow",
  "Ye Olde Bullseye",
  "The Tipsy Target",
  "The Merry Bowman",
  "The Golden Quiver",
  "The Rusty Crossbow",
  "The Frothy Flagon"
];
