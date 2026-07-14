// ============================================================================
// VECTOR SIX — Dice Engine / Provably Fair Adapter (demo mode)
// ----------------------------------------------------------------------------
// Pure logic module: no DOM, no framework. Uses only the Web Crypto API
// (crypto.getRandomValues / crypto.subtle), available natively in browsers
// and Node.js 19+. This is the ONLY place that touches randomness or hashing
// so a production build can swap it for a signed backend call behind the
// same function signatures.
//
// Loaded as a plain classic <script> (not type="module") so the prototype
// runs straight off a double-clicked index.html with no local server —
// browsers block ES module imports over file://. This file exposes its API
// on `window.VectorSixEngine` for the browser, while also remaining
// importable from Node's test runner via a small CommonJS/ESM interop tail.
//
// Gameplay model: the player freely taps any 1-5 of the six die faces as
// "winning faces" — there are no named risk modes. Chance and payout are a
// pure function of how many faces are currently selected (fewer faces
// covered = bigger multiplier), and update live on every tap.
// ============================================================================

// ---- Game constants --------------------------------------------------------
const RTP = 0.98;
const HOUSE_EDGE = 0.02;
const CALCULATION_VERSION = "VECTOR-SIX-PF-v1";

// Streak Bonus economy: every LIVE bet actually settles against a slightly
// lower base RTP than the reference 98% — the shaved-off edge is what funds
// the milestone streak rewards below. RTP is not simply lowered without
// anything paid back: the difference is redirected into occasional bonus
// payouts instead of being spread evenly across every roll. The original
// RTP/getMultiplier family above is left completely untouched (still a
// valid 98%-RTP reference implementation) so nothing that already depends
// on it changes; getAdjustedMultiplier is the function the live game
// actually uses.
//
// IMPORTANT: the size of that cut is NOT a single flat number. How likely a
// streak is to reach any given milestone depends enormously on win chance —
// a 5-faces-covered streak reaches 10 wins ~9.8 MILLION times more often
// than a 1-face streak does. A flat cut (and a flat reward table) either
// starves safe selections of any real bonus or lets risky-looking-but-easy
// selections push total RTP over 100% (verified: flat 10/25/50/100% rewards
// with a flat 2% cut push 5-face total RTP to ~105%). See ECONOMY-AUDIT.md
// for the full derivation. The fix: the milestone reward table is
// face-count-aware (below), and the multiplier cut is COMPUTED per face
// count from that table so every face count lands at exactly 98% total RTP.

// Streak milestones: consecutive wins with the SAME selected faces. Bonus is
// a percentage of bet, looked up per how many faces are currently covered
// (fewer faces covered = harder to reach a milestone = bigger % reward).
// Bonus is paid immediately, on top of the normal payout, the instant the
// milestone is reached. Values are tuned (see ECONOMY-AUDIT.md) so that,
// combined with the matching getAdjustedMultiplier cut below, EVERY face
// count nets out to exactly 98% total RTP.
const STREAK_MILESTONES_BY_FACES = {
  1: [
    { streak: 3, bonusPct: 0.25 },
    { streak: 5, bonusPct: 0.75 },
    { streak: 7, bonusPct: 2.00 },
    { streak: 10, bonusPct: 5.00 },
  ],
  2: [
    { streak: 3, bonusPct: 0.15 },
    { streak: 5, bonusPct: 0.40 },
    { streak: 7, bonusPct: 0.90 },
    { streak: 10, bonusPct: 1.80 },
  ],
  3: [
    { streak: 3, bonusPct: 0.10 },
    { streak: 5, bonusPct: 0.25 },
    { streak: 7, bonusPct: 0.50 },
    { streak: 10, bonusPct: 1.00 },
  ],
  4: [
    { streak: 3, bonusPct: 0.03 },
    { streak: 5, bonusPct: 0.07 },
    { streak: 7, bonusPct: 0.15 },
    { streak: 10, bonusPct: 0.30 },
  ],
  5: [
    { streak: 3, bonusPct: 0.015 },
    { streak: 5, bonusPct: 0.035 },
    { streak: 7, bonusPct: 0.07 },
    { streak: 10, bonusPct: 0.15 },
  ],
};

// Milestone win-counts are identical across every face count (only the
// bonusPct varies) — used by the count-only helpers below (which don't need
// to know which face-count table is active, just the streak thresholds).
const STREAK_MILESTONE_STREAKS = [3, 5, 7, 10];

// A player must cover at least 1 face (or there is nothing to win on) and at
// most 5 (covering all 6 would mean an automatic win at a sub-1x multiplier,
// which is never a meaningful bet — so one face is always left uncovered).
const MIN_SELECTED_FACES = 1;
const MAX_SELECTED_FACES = 5;

// No hard cap on Roll Again chaining in demo mode. Set a finite number to add
// a production safety cap without touching any other logic.
const MAX_ROLL_AGAIN = Infinity;

// ---- Numeric helpers (avoid floating point display errors) ----------------
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function floor2(n) {
  // Correct binary floating-point noise at a resolution far finer than the
  // 2dp we care about, THEN floor — keeps genuine sub-cent fractions
  // flooring down correctly while fixing representation error.
  const corrected = Math.round(n * 1e8) / 1e8;
  return Math.floor(corrected * 100) / 100;
}

function formatCurrency(n) {
  const safe = Number.isFinite(n) ? n : 0;
  const fixed = round2(safe);
  return `$${fixed.toFixed(2)}`;
}

// ---- Face selection / maths --------------------------------------------------
function isValidFaceSelection(faces) {
  if (!Array.isArray(faces)) return false;
  const unique = new Set(faces);
  if (unique.size !== faces.length) return false; // no duplicates
  if (unique.size < MIN_SELECTED_FACES || unique.size > MAX_SELECTED_FACES) return false;
  for (const f of unique) {
    if (!Number.isInteger(f) || f < 1 || f > 6) return false;
  }
  return true;
}

// Chance/multiplier are a pure function of how many faces are covered —
// WHICH faces they are never matters, only the count.
function getChance(coveredCount) {
  return coveredCount / 6;
}

// Precise multiplier, used internally for settlement.
function getMultiplier(coveredCount) {
  const chance = getChance(coveredCount);
  if (chance <= 0) return 0;
  return RTP / chance;
}

// Multiplier rounded DOWN to 2dp, used for display only.
function getDisplayMultiplier(coveredCount) {
  return floor2(getMultiplier(coveredCount));
}

function getPotentialPayout(stake, coveredCount) {
  return round2(stake * getMultiplier(coveredCount));
}

// ---- Streak Bonus economy: RTP-impact math ---------------------------------
// A "streak cycle" starts the instant a fresh streak begins (streak state 0,
// about to attempt streak 1) and ends the instant it resets to 0 — either on
// a loss, or immediately after the 10-win milestone pays (per spec, streak
// resets right after that payout). See ECONOMY-AUDIT.md for the full
// derivation; these are pure renewal-reward formulas over that cycle.

// E[rolls per cycle]. P(loss lands exactly on roll k) = p^(k-1)*q for
// k = 1..9; if the first 9 rolls are all wins the cycle is forced to end at
// roll 10 regardless (10-win milestone or a loss there both give length 10).
function expectedCycleLength(p) {
  const q = 1 - p;
  let sum = 0;
  for (let k = 1; k <= 9; k++) {
    sum += k * Math.pow(p, k - 1) * q;
  }
  sum += 10 * Math.pow(p, 9);
  return sum;
}

// E[bonus paid per cycle], bonus expressed as a fraction of bet.
// P(reach milestone m in a fresh cycle) = p^m (only the first m rolls need
// to all be wins; nothing after that changes whether the bonus already
// fired), so this is just a sum of milestone_pct * p^milestone.
function expectedStreakBonusPerCycle(p, milestones) {
  let sum = 0;
  for (const m of milestones) {
    sum += m.bonusPct * Math.pow(p, m.streak);
  }
  return sum;
}

// Long-run streak-bonus RTP contribution (fraction of every dollar wagered
// at this face count that flows out as streak bonuses on average) for the
// currently configured milestone table at `coveredCount` faces.
function getStreakRTPContribution(coveredCount) {
  const p = getChance(coveredCount);
  const milestones = STREAK_MILESTONES_BY_FACES[coveredCount];
  if (!p || !milestones || !milestones.length) return 0;
  const eCycle = expectedCycleLength(p);
  const eBonus = expectedStreakBonusPerCycle(p, milestones);
  return eBonus / eCycle;
}

// ---- Streak Bonus economy: adjusted multiplier -----------------------------
// Same shape as getMultiplier/getDisplayMultiplier/getPotentialPayout above,
// but the cut applied is COMPUTED per face count so that
// (base RTP at this multiplier) + (streak RTP contribution) == RTP (98%)
// exactly, for every face count. This is what the running game actually
// uses. Do not replace this with a flat constant — see ECONOMY-AUDIT.md for
// why a flat cut breaks RTP at both ends of the face-count range.
function getAdjustedMultiplier(coveredCount) {
  const chance = getChance(coveredCount);
  if (chance <= 0) return 0;
  const streakRTP = getStreakRTPContribution(coveredCount);
  return (RTP - streakRTP) / chance;
}

function getAdjustedDisplayMultiplier(coveredCount) {
  return floor2(getAdjustedMultiplier(coveredCount));
}

function getBasePotentialWin(stake, coveredCount) {
  return round2(stake * getAdjustedMultiplier(coveredCount));
}

function evaluateRoll(selectedFaces, rolledFace) {
  return selectedFaces.includes(rolledFace);
}

// ---- Streak Bonus mechanic --------------------------------------------------
// Pure helpers only — no state is held here. The app layer tracks the
// running streak count and which face-selection it was built on; these
// functions just answer questions about a given streak count / bet amount.

// Highest milestone already reached at or below `currentStreak`, or null.
// Only the streak-count thresholds matter here (identical across every face
// count), so this does not need a coveredCount argument.
function getCurrentStreakMilestone(currentStreak) {
  let reached = null;
  for (const streak of STREAK_MILESTONE_STREAKS) {
    if (currentStreak >= streak) reached = { streak };
  }
  return reached;
}

// The next not-yet-reached milestone, or null if currentStreak is already at
// or past the highest one (10 -- the app resets the streak to 0 right after
// paying that reward, per the MVP spec, so this is a transient state).
function getNextStreakMilestone(currentStreak) {
  for (const streak of STREAK_MILESTONE_STREAKS) {
    if (currentStreak < streak) return { streak };
  }
  return null;
}

// `streakCount` may be a milestone's streak number (3/5/7/10) or a full
// milestone object (as returned by getCurrentStreakMilestone) -- accepting
// either keeps call sites simple. `coveredCount` (1-5) selects which
// face-count-specific reward table to look the percentage up in — REQUIRED,
// since the same streak number pays a different % at different face counts
// (see ECONOMY-AUDIT.md: this is the core fix, not optional).
function getStreakBonusForMilestone(streakCountOrMilestone, betAmount, coveredCount) {
  const streakNumber =
    typeof streakCountOrMilestone === "object" && streakCountOrMilestone !== null
      ? streakCountOrMilestone.streak
      : streakCountOrMilestone;
  const table = STREAK_MILESTONES_BY_FACES[coveredCount];
  if (!table || !(betAmount > 0)) return 0;
  const milestone = table.find((m) => m.streak === streakNumber);
  if (!milestone) return 0;
  return round2(betAmount * milestone.bonusPct);
}

function isStreakMilestone(streakCount) {
  return STREAK_MILESTONE_STREAKS.includes(streakCount);
}

// Order-independent identity for a face selection -- used to detect whether
// a proposed new selection is actually DIFFERENT from the one a streak was
// built on (same faces in a different tap order must never count as a
// change).
function faceSignature(faces) {
  if (!Array.isArray(faces)) return "";
  return [...faces].sort((a, b) => a - b).join(",");
}

// True only when there's an active streak (currentStreak > 0) AND the
// proposed next selection actually differs from the current one. Changing
// bet amount, or re-tapping the exact same faces, never warrants a warning.
function shouldWarnBeforeChangingFaces(currentStreak, selectedFaces, nextSelectedFaces) {
  if (!(currentStreak > 0)) return false;
  return faceSignature(selectedFaces) !== faceSignature(nextSelectedFaces);
}

// ---- Crypto helpers ---------------------------------------------------------
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex) {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

function getCrypto() {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error(
      "Web Crypto API is unavailable. VECTOR SIX demo mode requires crypto.getRandomValues and crypto.subtle."
    );
  }
  return c;
}

function generateServerSeed() {
  const crypto = getCrypto();
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function generateClientSeed() {
  const crypto = getCrypto();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function sha256Hex(inputHexOrString) {
  const crypto = getCrypto();
  const enc = new TextEncoder().encode(inputHexOrString);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return bytesToHex(new Uint8Array(digest));
}

async function hmacSha256Hex(keyHex, message) {
  const crypto = getCrypto();
  const keyBytes = hexToBytes(keyHex);
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return bytesToHex(new Uint8Array(sig));
}

function buildEntropyMessage(clientSeed, nonce) {
  return `VECTOR-SIX:${clientSeed}:${nonce}`;
}

async function computeEntropyHash(serverSeed, clientSeed, nonce) {
  return hmacSha256Hex(serverSeed, buildEntropyMessage(clientSeed, nonce));
}

// First 52 bits (13 hex chars) of the entropy hash -> die face 1-6.
function faceFromEntropyHash(entropyHash) {
  const hex13 = entropyHash.slice(0, 13);
  const intValue = parseInt(hex13, 16);
  const faceIndex = intValue % 6; // 0-5
  return faceIndex + 1; // 1-6
}

// Full independent roll generation. Nothing except serverSeed/clientSeed/nonce
// may influence the output — no stake, faces, coverage count, balance,
// streak, Roll Again / Secure Half choice, or prior results are ever passed
// in here.
async function generateRoll({ serverSeed, clientSeed, nonce }) {
  const entropyHash = await computeEntropyHash(serverSeed, clientSeed, nonce);
  const face = faceFromEntropyHash(entropyHash);
  return { entropyHash, face, calculationVersion: CALCULATION_VERSION };
}

// Creates a fresh, hashed, not-yet-revealed seed commitment.
async function createSeedCommitment() {
  const serverSeed = generateServerSeed();
  const serverSeedHash = await sha256Hex(serverSeed);
  return { serverSeed, serverSeedHash };
}

// ---- Verification -----------------------------------------------------------
const VERIFY_STATUS = {
  VERIFIED: "VERIFIED",
  MISSING_DATA: "MISSING_DATA",
  SEED_HASH_MISMATCH: "SEED_HASH_MISMATCH",
  ENTROPY_MISMATCH: "ENTROPY_MISMATCH",
  RESULT_MISMATCH: "RESULT_MISMATCH",
};

async function verifyRoll({
  serverSeed,
  serverSeedHash,
  clientSeed,
  nonce,
  entropyHash,
  face,
}) {
  if (
    !serverSeed ||
    !serverSeedHash ||
    !clientSeed ||
    nonce === undefined ||
    nonce === null ||
    !entropyHash ||
    face === undefined ||
    face === null
  ) {
    return { verified: false, status: VERIFY_STATUS.MISSING_DATA };
  }

  const computedHash = await sha256Hex(serverSeed);
  if (computedHash !== serverSeedHash) {
    return { verified: false, status: VERIFY_STATUS.SEED_HASH_MISMATCH, computedHash };
  }

  const computedEntropy = await computeEntropyHash(serverSeed, clientSeed, nonce);
  if (computedEntropy !== entropyHash) {
    return { verified: false, status: VERIFY_STATUS.ENTROPY_MISMATCH, computedEntropy };
  }

  const computedFace = faceFromEntropyHash(computedEntropy);
  if (computedFace !== face) {
    return { verified: false, status: VERIFY_STATUS.RESULT_MISMATCH, computedFace };
  }

  return { verified: true, status: VERIFY_STATUS.VERIFIED, computedHash, computedEntropy, computedFace };
}

// ---- Secure Half (pure payout split — NOT a random event) ------------------
// Splits an active payout into a secured half + remaining active half,
// preserving the exact original total to the cent (no seed, face, or odds
// involvement whatsoever).
function splitSecureHalf(activePayout) {
  const securedHalf = round2(activePayout / 2);
  const remainingActive = round2(activePayout - securedHalf);
  return { securedHalf, remainingActive };
}

// ---- Public API surface -----------------------------------------------------
const VectorSixEngine = {
  RTP,
  HOUSE_EDGE,
  CALCULATION_VERSION,
  MIN_SELECTED_FACES,
  MAX_SELECTED_FACES,
  MAX_ROLL_AGAIN,
  STREAK_MILESTONES_BY_FACES,
  STREAK_MILESTONE_STREAKS,
  round2,
  floor2,
  formatCurrency,
  isValidFaceSelection,
  getChance,
  getMultiplier,
  getDisplayMultiplier,
  getPotentialPayout,
  expectedCycleLength,
  expectedStreakBonusPerCycle,
  getStreakRTPContribution,
  getAdjustedMultiplier,
  getAdjustedDisplayMultiplier,
  getBasePotentialWin,
  getCurrentStreakMilestone,
  getNextStreakMilestone,
  getStreakBonusForMilestone,
  isStreakMilestone,
  faceSignature,
  shouldWarnBeforeChangingFaces,
  evaluateRoll,
  generateServerSeed,
  generateClientSeed,
  sha256Hex,
  buildEntropyMessage,
  computeEntropyHash,
  faceFromEntropyHash,
  generateRoll,
  createSeedCommitment,
  VERIFY_STATUS,
  verifyRoll,
  splitSecureHalf,
};

// Dual-mode export: CommonJS for Node's test runner, global for the browser.
// (Kept as a plain classic script — not type="module" — so index.html works
// when opened directly via file:// with no local server.)
if (typeof module !== "undefined" && module.exports) {
  module.exports = VectorSixEngine;
} else {
  globalThis.VectorSixEngine = VectorSixEngine;
}
