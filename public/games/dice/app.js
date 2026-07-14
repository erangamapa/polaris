// ============================================================================
// VECTOR SIX — application layer
// State machine + rendering + interaction wiring. Uses vector-six-engine.js
// for all maths and provably-fair cryptography. No framework, no build step.
//
// Loaded as a plain classic <script> (not type="module") — index.html
// includes vector-six-engine.js before this file, which attaches its API to
// window.VectorSixEngine. Classic scripts (unlike ES modules) load fine over
// file://, so the prototype runs straight off a double-clicked index.html
// with no local server required.
//
// Wrapped in an IIFE below: classic (non-module) scripts all share ONE
// top-level lexical scope across a page, so a bare top-level `const RTP`
// here would collide with vector-six-engine.js's own top-level `const RTP`
// and throw "Identifier 'RTP' has already been declared" — a SyntaxError
// that silently kills this entire script before any event listener
// attaches. The IIFE gives this file its own function scope so its
// destructured names only shadow, never redeclare, the engine's globals.
//
// Gameplay model: there are no named risk modes. The player freely taps any
// 1-5 of the six die faces as "winning faces" — chance and multiplier are a
// pure function of how many faces are currently covered, recalculated live
// on every tap. Selection persists across rounds so the player can adjust
// and re-bet instantly.
//
// Post-result flow (instant settle — no Cash Out, no Roll-Again chaining):
// every roll is a single, independent, immediately-settled bet. On a win,
// profit is added to balance the moment the dice animation finishes. On a
// loss, the bet (already deducted when the roll started) simply stays
// deducted — nothing further happens. There is no held "active payout", no
// decision screen, and no transition/countdown of any kind: the result is
// shown inline in the payout card, the six face buttons unlock immediately,
// and the player can roll again right away. Faces are ONLY locked while the
// dice is actively rolling.
//
// Layout model: the primary screen is just "pick faces -> see live payout
// preview -> roll", with a fixed bet panel on the right. Admin-style
// technical fields (round id, nonce, seed hash, full history) live behind
// the Fairness / History modals rather than on the main gameplay surface.
// ============================================================================
(function () {
"use strict";

const {
  RTP,
  CALCULATION_VERSION,
  MIN_SELECTED_FACES,
  MAX_SELECTED_FACES,
  STREAK_MILESTONES_BY_FACES,
  isValidFaceSelection,
  round2,
  formatCurrency,
  getChance,
  // The live game settles against the Streak Bonus economy's face-count-
  // aware adjusted RTP (see vector-six-engine.js getAdjustedMultiplier /
  // ECONOMY-AUDIT.md), not the original 98% reference RTP -- renaming the
  // imports at the destructure means every existing call site below
  // (performRoll, the preview/bet-panel maths) picks up the adjusted
  // numbers automatically, with zero other lines touched.
  getAdjustedMultiplier: getMultiplier,
  getAdjustedDisplayMultiplier: getDisplayMultiplier,
  getBasePotentialWin: getPotentialPayout,
  getNextStreakMilestone,
  getStreakBonusForMilestone,
  isStreakMilestone,
  faceSignature,
  shouldWarnBeforeChangingFaces,
  evaluateRoll,
  generateClientSeed,
  createSeedCommitment,
  generateRoll,
  verifyRoll,
} = window.VectorSixEngine;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

const el = {
  balanceValue: $("balanceValue"),
  depositBtn: $("depositBtn"),
  soundToggle: $("soundToggle"),
  helpBtn: $("helpBtn"),
  rtpBadge: $("rtpBadge"),

  openFairnessBtn: $("openFairnessBtn"),

  coverageCount: $("coverageCount"),

  facePicker: $("facePicker"),
  faceCountHint: $("faceCountHint"),
  faceMetaRow: $("faceMetaRow"),

  streakCard: $("streakCard"),
  streakCount: $("streakCount"),
  streakMidTarget: $("streakMidTarget"),
  streakTimeline: $("streakTimeline"),
  streakStatusMsg: $("streakStatusMsg"),
  bsStreakBonusRow: $("bsStreakBonusRow"),
  bsStreakBonusAmount: $("bsStreakBonusAmount"),
  bsStreakBonusSub: $("bsStreakBonusSub"),
  viewStreakBtn: $("viewStreakBtn"),
  streakDetailModal: $("streakDetailModal"),
  closeStreakDetailModal: $("closeStreakDetailModal"),
  streakDetailTable: $("streakDetailTable"),

  dieObject: $("dieObject"),
  dieCube: $("dieCube"),
  resultCopy: $("resultCopy"),
  streakLine: $("streakLine"),

  previewPotentialWin: $("previewPotentialWin"),
  previewBottomLabel: $("previewBottomLabel"),
  previewFormula: $("previewFormula"),

  historyList: $("historyList"),
  historyModal: $("historyModal"),
  openHistoryBtn: $("openHistoryBtn"),
  closeHistoryModal: $("closeHistoryModal"),

  rrChips: $("rrChips"),

  betPanel: $("betPanel"),
  tabManual: $("tabManual"),
  tabAuto: $("tabAuto"),
  manualBetBody: $("manualBetBody"),
  autoBetBody: $("autoBetBody"),

  betMinus: $("betMinus"),
  betPlus: $("betPlus"),
  betInput: $("betInput"),
  quickAmounts: $("quickAmounts"),
  quickAmountsMobile: $("quickAmountsMobile"),

  midMode: $("midMode"),
  midChance: $("midChance"),
  midMultiplier: $("midMultiplier"),
  midPayout: $("midPayout"),

  ctaZone: $("ctaZone"),
  mainCta: $("mainCta"),

  fairnessModal: $("fairnessModal"),
  closeFairnessModal: $("closeFairnessModal"),
  modalCalcVersion: $("modalCalcVersion"),
  modalRoundId: $("modalRoundId"),
  modalNonce: $("modalNonce"),
  modalSeedHash: $("modalSeedHash"),
  modalClientSeed: $("modalClientSeed"),
  modalFace: $("modalFace"),
  modalServerSeed: $("modalServerSeed"),
  modalEntropyHash: $("modalEntropyHash"),
  verifyRollBtn: $("verifyRollBtn"),
  verifyResult: $("verifyResult"),

  helpModal: $("helpModal"),
  closeHelpModal: $("closeHelpModal"),

  streakResetModal: $("streakResetModal"),
  closeStreakResetModal: $("closeStreakResetModal"),
  streakResetBody: $("streakResetBody"),
  streakResetSub: $("streakResetSub"),
  keepStreakBtn: $("keepStreakBtn"),
  resetStreakBtn: $("resetStreakBtn"),
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const prefersReducedMotion =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function safeParseAmount(raw, fallback) {
  const cleaned = String(raw).replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? round2(n) : fallback;
}

// Purely ambient flavor text reacting to how many faces are covered right
// now — used only for the compact history labels, never shown as its own
// selectable mode or colored badge on the primary screen.
const FLAVOR_BY_COUNT = {
  5: { word: "Safe", tier: "tier-safe" },
  4: { word: "Steady", tier: "tier-safe" },
  3: { word: "Balanced", tier: "tier-balanced" },
  2: { word: "Bold", tier: "tier-bold" },
  1: { word: "Sniper", tier: "tier-sniper" },
};

function flavorFor(count) {
  return FLAVOR_BY_COUNT[count] || { word: "Pick a face", tier: "tier-none" };
}

function pulse(elements) {
  if (prefersReducedMotion) return;
  elements.forEach((node) => {
    if (!node) return;
    node.classList.remove("value-pulse");
    void node.offsetWidth; // restart animation
    node.classList.add("value-pulse");
  });
}

// ---------------------------------------------------------------------------
// Global mutable state
// ---------------------------------------------------------------------------
// Only two states now that every roll settles instantly: READY (idle, can
// edit faces/bet amount and roll) and ROLLING (dice animating — the ONLY
// time controls are locked). There is no decision screen, no loss screen,
// and no separate "cashed out" screen to transition through.
const GameState = Object.freeze({
  READY: "READY",
  ROLLING: "ROLLING",
});

let balance = 1000;
// Freeform face selection — persists across rounds by design (see tests.mjs
// "Face selection persists after a settled run instead of resetting").
// Starts empty by explicit request: the player can freely uncheck every
// face (toggleFace no longer enforces a minimum), and an empty selection
// is the default state on page load, not a preselected pair.
let selectedFaces = [];
let betAmount = 10.0;

// ---------------------------------------------------------------------------
// Streak Bonus mechanic
// ---------------------------------------------------------------------------
// Persists ACROSS separate rolls, as long as the player keeps winning with
// the exact same selected faces:
//   - every winning roll increments it by 1
//   - any losing roll resets it to 0
//   - changing the face selection while a streak is active resets it to 0
//     IMMEDIATELY and SILENTLY — no confirmation, no modal. The "Changing
//     faces resets streak." rule text already shown in the Streak Bonus
//     card is the only warning the player gets, per design.
//   - changing the bet amount never touches it
let currentStreak = 0;
// faceSignature() of the exact selection the current streak was built on;
// null whenever currentStreak is 0.
let streakFaceSignature = null;
// Running MINIMUM bet placed since the current streak began; null whenever
// currentStreak is 0. Milestone bonuses are paid against this value, not
// the bet amount on the milestone-winning roll itself -- otherwise a player
// could grind a streak at a tiny bet and spike it right before a milestone
// to inflate the payout (see ECONOMY-AUDIT.md section 11). Seeded to the
// stake of the roll that starts the streak, then narrowed on every
// subsequent winning roll: raising your bet mid-streak never raises your
// eventual bonus; lowering it permanently caps every later milestone in
// that streak at the lower amount. Shares the same reset lifecycle as
// currentStreak / streakFaceSignature (loss, confirmed face change, or the
// automatic reset right after the 10-win milestone pays).
let streakMinBet = null;

// Set only while the streak-reset confirmation modal is open: the change
// the player attempted (a face toggle or a bet amount edit) that would
// reset an active streak, deferred until they confirm. { type: "face",
// apply: fn } or { type: "bet", apply: fn }. Cleared on either button click
// (or on close/escape/backdrop, which is treated the same as "Keep
// streak" -- the attempted change is simply dropped).
let pendingStreakChange = null;

// ---------------------------------------------------------------------------
// True 3D die cube — rotation model
// ---------------------------------------------------------------------------
// The cube has six permanently-numbered physical faces (see index.html:
// cf-front=1, cf-back=6, cf-right=2, cf-left=5, cf-top=3, cf-bottom=4,
// following the standard opposite-faces-sum-to-7 die convention). To reveal
// a given face we never redraw pips — we rotate the whole cube so that
// face's panel ends up pointing at the camera. FACE_REST_ROT is the (x, y)
// rotation, in degrees, at which each face is flush with the front of the
// cube (derived as the inverse of that face's own fixed placement
// transform in styles.css).
const FACE_REST_ROT = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
};
// Absolute, ever-increasing rotation applied to #dieCube. Kept persistent
// (never reset to 0) so every roll spins strictly forward from wherever the
// cube currently sits — no snapping backward, no visible reset "jump".
let dieRotX = 0;
let dieRotY = 0;

// Returns the next absolute angle (in degrees) that is (a) further forward
// than `current`, (b) equal to `restOffset` modulo 360, and (c) has at
// least `extraTurns` full rotations of run-up for a satisfying tumble.
function nextDieAngle(current, restOffset, extraTurns) {
  const base = Math.floor(current / 360) * 360;
  let target = base + ((restOffset % 360) + 360) % 360;
  while (target <= current) target += 360;
  target += 360 * extraTurns;
  return target;
}

// Instant (non-animated) snap to the nearest equivalent angle — used only
// for idle-state resets, where there is no motion to keep continuous.
function snapDieAngle(current, restOffset) {
  const base = Math.floor(current / 360) * 360;
  return base + ((restOffset % 360) + 360) % 360;
}

function setDieTransform(x, y, animate) {
  el.dieCube.style.transition = animate ? "" : "none";
  el.dieCube.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
  if (!animate) {
    // Force a reflow so the "transition: none" actually applies before the
    // next animated transform is set, avoiding an unwanted snap-animation.
    void el.dieCube.offsetHeight;
    el.dieCube.style.transition = "";
  }
}

let gameState = GameState.READY;
let isBusy = false;
// The most recently SETTLED roll, or null before the very first roll. This
// is the single source of truth for "what happened last" — there is no
// multi-roll "run" object anymore, since nothing chains or stays held open.
// Kept set (not nulled) even after the player edits bet/faces post-result,
// since the CTA's "ROLL AGAIN" vs "ROLL" label only cares whether ANY
// roll has ever happened -- see resultVisible below for what actually gates
// the payout card's win/loss display.
let lastResult = null;
// True only while lastResult's win/loss outcome should still be shown on
// the main payout card. Set true the instant a roll settles, and false the
// instant the player changes their bet amount or face selection afterward
// -- at that point the old result no longer describes what they're about
// to play, so the card should show a fresh "Potential Win" calculation for
// the NEW selection/bet instead of a stale "YOU WON"/"YOU LOST".
let resultVisible = false;

let clientSeed = generateClientSeed();
let nonce = 0;
let seedQueue = [];

const sessionPrefix = clientSeed.slice(0, 6).toUpperCase();
let rollCounter = 0;
function nextRollId() {
  rollCounter += 1;
  return `VS-${sessionPrefix}-${String(rollCounter).padStart(4, "0")}`;
}

const history = []; // most-recent-first settled rolls
const rollLog = []; // most-recent-first individual rolls (for the results strip)
const MAX_HISTORY = 60;

// ---------------------------------------------------------------------------
// Seed queue (pre-committed hashes)
// ---------------------------------------------------------------------------
async function ensureSeedQueue() {
  while (seedQueue.length < 2) {
    seedQueue.push(await createSeedCommitment());
  }
}
async function rotateSeedQueue() {
  seedQueue.shift();
  seedQueue.push(await createSeedCommitment());
}

// ---------------------------------------------------------------------------
// Core roll pipeline — the ONLY function that produces a game outcome.
// ---------------------------------------------------------------------------
async function performRoll({ stake, faces }) {
  await ensureSeedQueue();
  const commitment = seedQueue[0];

  nonce += 1;
  const thisNonce = nonce;

  const { entropyHash, face } = await generateRoll({
    serverSeed: commitment.serverSeed,
    clientSeed,
    nonce: thisNonce,
  });

  await rotateSeedQueue();

  const won = evaluateRoll(faces, face);
  const multiplier = getMultiplier(faces.length);
  const displayMultiplier = getDisplayMultiplier(faces.length);

  return {
    runId: nextRollId(),
    timestamp: Date.now(),
    nonce: thisNonce,
    serverSeed: commitment.serverSeed,
    serverSeedHash: commitment.serverSeedHash,
    clientSeed,
    entropyHash,
    face,
    won,
    stake,
    faces: [...faces],
    chance: getChance(faces.length),
    multiplier,
    displayMultiplier,
    payout: won ? round2(stake * multiplier) : 0,
    calculationVersion: CALCULATION_VERSION,
  };
}

// ---------------------------------------------------------------------------
// Die animation
// ---------------------------------------------------------------------------
function clearFaceResultHighlights() {
  el.facePicker.querySelectorAll(".face-btn.face-hit, .face-btn.face-miss").forEach((b) => {
    b.classList.remove("face-hit", "face-miss");
  });
}

async function animateDieRoll(rollData) {
  el.dieObject.classList.remove("result-win", "result-loss");
  el.dieObject.classList.add("rolling");
  clearFaceResultHighlights();

  const duration = prefersReducedMotion ? 60 : 720 + Math.random() * 380; // 700-1100ms

  const rest = FACE_REST_ROT[rollData.face];
  if (prefersReducedMotion) {
    // Skip the tumble entirely — jump straight to the resting face.
    dieRotX = nextDieAngle(dieRotX, rest.x, 0);
    dieRotY = nextDieAngle(dieRotY, rest.y, 0);
    setDieTransform(dieRotX, dieRotY, false);
  } else {
    // 2-3 extra full turns per axis so the cube visibly tumbles through
    // several real faces before it settles — this is what makes it read
    // as an actual 3D object being thrown, not a flat sprite spinning.
    const extraTurnsX = 2 + Math.floor(Math.random() * 2);
    const extraTurnsY = 3 + Math.floor(Math.random() * 2);
    dieRotX = nextDieAngle(dieRotX, rest.x, extraTurnsX);
    dieRotY = nextDieAngle(dieRotY, rest.y, extraTurnsY);
    setDieTransform(dieRotX, dieRotY, true);
  }

  await sleep(duration);

  el.dieObject.classList.remove("rolling");
  el.dieObject.classList.add(rollData.won ? "result-win" : "result-loss");

  // Call out the landed face in the "Pick Your Winning Faces" row itself —
  // enlarged either way, green if it was one of your covered faces (a
  // win), red if it wasn't (a miss). Only this one face is touched; the
  // rest of your selection is left exactly as it was.
  const landedBtn = el.facePicker.querySelector(`.face-btn[data-face="${rollData.face}"]`);
  if (landedBtn) landedBtn.classList.add(rollData.won ? "face-hit" : "face-miss");
  await sleep(40);
}

// ---------------------------------------------------------------------------
// History + recent results strip
// ---------------------------------------------------------------------------
function pushRollLog(rollData) {
  rollLog.unshift(rollData);
  if (rollLog.length > MAX_HISTORY) rollLog.length = MAX_HISTORY;
}

function pushRollHistory(result, outcome) {
  history.unshift({
    rollId: result.runId,
    faces: [...result.faces],
    finalFace: result.face,
    outcome, // 'WIN' | 'LOSS'
    payout: outcome === "WIN" ? result.totalPayout : 0,
    streak: result.streakAfterRoll,
  });
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
}

// Recent Results now lives in the sidebar as 4 compact circular chips,
// most-recent-first: just the rolled face number + W/L, no multiplier
// detail (that stays behind View History, same as before). Always renders
// exactly 4 slots so the card never changes height as rolls come in --
// missing slots render as a muted empty placeholder. Real chips still open
// the fairness modal on click, same interaction as the old pills.
function renderRecentChips() {
  const SLOTS = 4;
  el.rrChips.innerHTML = "";
  for (let i = 0; i < SLOTS; i++) {
    const r = rollLog[i];
    if (!r) {
      const empty = document.createElement("div");
      empty.className = "rr-chip empty";
      empty.innerHTML = `<span class="rr-chip-face mono">—</span>`;
      el.rrChips.appendChild(empty);
      continue;
    }
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `rr-chip ${r.won ? "win" : "loss"}`;
    chip.title = "Previous rolls do not affect future rolls. Click for fairness details.";
    chip.innerHTML = `<span class="rr-chip-face mono">${r.face}</span><span class="rr-chip-wl">${r.won ? "W" : "L"}</span>`;
    chip.addEventListener("click", () => openFairnessModal(r));
    el.rrChips.appendChild(chip);
  }
}

function renderHistoryList() {
  if (history.length === 0) {
    el.historyList.innerHTML = `<div class="history-empty">No rolls yet.</div>`;
    return;
  }
  const rows = history
    .slice(0, 15)
    .map((h) => `
      <div class="recent-row ${h.outcome === "WIN" ? "win" : "loss"}">
        <span class="recent-face mono">${h.finalFace}</span>
        <span class="r-mode">${flavorFor(h.faces.length).word} · ${h.streak} win${h.streak === 1 ? "" : "s"}</span>
        <span class="r-mult">${formatCurrency(h.payout)}</span>
      </div>`)
    .join("");
  el.historyList.innerHTML = rows;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function updateBalanceDisplay(delta) {
  el.balanceValue.textContent = formatCurrency(balance);
  el.balanceValue.classList.remove("flash-up", "flash-down");
  if (delta) {
    void el.balanceValue.offsetWidth;
    el.balanceValue.classList.add(delta > 0 ? "flash-up" : "flash-down");
  }
}

// ---------------------------------------------------------------------------
// Face selection — freeform, 1 to MAX_SELECTED_FACES, no fixed modes.
// ---------------------------------------------------------------------------
function updateFaceButtons() {
  el.facePicker.querySelectorAll(".face-btn").forEach((btn) => {
    const face = parseInt(btn.dataset.face, 10);
    const selected = selectedFaces.includes(face);
    btn.classList.toggle("selected", selected);
    btn.setAttribute("aria-pressed", String(selected));
  });

  const count = selectedFaces.length;
  el.coverageCount.textContent = `${count} of 6`;

  // Hint stays blank in normal operation — it only ever carries transient
  // error/limit copy (max reached), set directly by toggleFace(). Any
  // state-changing render() call clears it again.
  el.faceCountHint.textContent = "";
  el.faceCountHint.classList.toggle("complete", count > 0);
}

// Always reflects the *next* roll — i.e. the current face selection and bet
// amount. This is now the ONLY place Chance/Multiplier/Coverage/Potential
// Win detail is rendered (the main payout card no longer repeats a stats
// row — see renderPayoutCard()), so the Bet Summary panel is the single
// source of truth for full math detail. There is no separate "settled"
// mode anymore: since every roll settles instantly and the screen never
// leaves this normal state, this is simply always live.
function updateStageAndBetbarMaths() {
  const count = selectedFaces.length;
  const chance = count > 0 ? getChance(count) : 0;
  const displayMultiplier = count > 0 ? getDisplayMultiplier(count) : 0;
  const potentialPayout = count > 0 ? getPotentialPayout(betAmount, count) : 0;

  el.midMode.textContent = count > 0 ? `${count} of 6 faces` : "—";
  el.midChance.textContent = count > 0 ? `${(chance * 100).toFixed(2)}%` : "—";
  el.midMultiplier.textContent = count > 0 ? `${displayMultiplier.toFixed(2)}x` : "—";
  el.midPayout.textContent = count > 0 ? formatCurrency(potentialPayout) : "$0.00";

  // Mobile-only compact meta row directly under the title -- same live
  // numbers as the Bet Summary panel above, just surfaced where a mobile
  // player can see them without scrolling to the sidebar.
  el.faceMetaRow.textContent =
    count > 0
      ? `${count} selected · ${(chance * 100).toFixed(2)}% chance · ${displayMultiplier.toFixed(2)}x multiplier`
      : "Select faces · Chance — · Multiplier —";

  el.betInput.value = betAmount.toFixed(2);
  updateActiveQuickAmount();

  // "⭐ Next streak bonus: +$X" only when the NEXT roll (at the current bet
  // amount) would be exactly one win away from a milestone — kept quiet
  // otherwise so the Bet Summary doesn't get noisy every round.
  const nextMilestoneForBet = getNextStreakMilestone(currentStreak);
  const oneWinAway = nextMilestoneForBet && nextMilestoneForBet.streak - currentStreak === 1;
  el.bsStreakBonusRow.style.display = oneWinAway ? "" : "none";
  if (oneWinAway) {
    el.bsStreakBonusAmount.textContent = `+${formatCurrency(getStreakBonusForMilestone(nextMilestoneForBet, getEffectiveStreakBet(), count))}`;
    el.bsStreakBonusSub.textContent = `1 win away (at ${nextMilestoneForBet.streak} wins)`;
  } else {
    el.bsStreakBonusSub.textContent = "";
  }
}

// The bet amount any milestone bonus would actually be computed against if
// the player won their next roll right now — mirrors the real settlement
// rule in settleRoll (running MINIMUM bet since the streak began), so every
// preview in the UI (Bet Summary row, Streak Bonus card captions, streak
// status line) shows the true number rather than an inflatable one. No
// active streak (or no streak-min recorded yet) simply previews off the
// current bet amount.
function getEffectiveStreakBet() {
  if (currentStreak === 0 || streakMinBet === null) return betAmount;
  return Math.min(streakMinBet, betAmount);
}

// ---------------------------------------------------------------------------
// Streak Bonus card — organic 10-dot timeline (Game 1 -> Game 10). No
// separate status sentence: the milestone dots' own (much bigger, much
// bolder) reward captions carry the "what am I working toward" signal, and
// a brief card-level glow (.reward-pulse) is the only feedback needed for
// the instant a milestone is actually paid out.
// ---------------------------------------------------------------------------
function renderStreakCard() {
  // The 10th win auto-resets the internal counter back to 0 the instant it
  // pays (see settleRoll), so reading currentStreak directly here would
  // make the crown moment's own timeline vanish in the same render that
  // earned it. While the win is still on screen (resultVisible), display
  // from the captured lastResult.streakAfterRoll instead -- it only ever
  // differs from currentStreak in that one post-milestone instant, and
  // naturally falls away the moment the player changes bet/faces or rolls
  // again (T7).
  const displayStreak =
    resultVisible && lastResult && lastResult.won
      ? Math.max(currentStreak, lastResult.streakAfterRoll)
      : currentStreak;

  el.streakCount.textContent = String(displayStreak);

  const nextMilestone = getNextStreakMilestone(displayStreak);
  const count = selectedFaces.length;
  const table = STREAK_MILESTONES_BY_FACES[count] || [];

  // Mobile-only "/ N" denominator next to the streak count (e.g. "2 / 3"),
  // written here since it shares nextMilestone with everything else in
  // this function. Blank once there's no next milestone left to show
  // (0 faces selected, or the instant right after the 10-win crown moment
  // before the next roll/interaction).
  el.streakMidTarget.textContent = nextMilestone ? `/ ${nextMilestone.streak}` : "";

  el.streakTimeline.querySelectorAll("[data-game]").forEach((dot) => {
    const game = parseInt(dot.dataset.game, 10);
    const completed = game <= displayStreak;
    const isNext = game === displayStreak + 1;
    dot.classList.toggle("completed", completed);
    dot.classList.toggle("next", isNext);

    if (dot.classList.contains("stl-milestone")) {
      const rewardSpan = dot.querySelector(".stl-reward");
      const milestoneObj = table.find((m) => m.streak === game) || { streak: game, bonusPct: 0 };
      if (completed) {
        // Already banked -- the checkmark says it all, no caption needed.
        rewardSpan.textContent = "";
      } else {
        // Every not-yet-reached milestone shows a real cash value at the
        // current effective bet -- never a bare percentage. Mixing "+$1.50"
        // on the next dot with "+40%" on a further-out one made the
        // timeline read like two different units of reward; money is the
        // only unit a player should ever need to parse here.
        rewardSpan.textContent = `+${formatCurrency(getStreakBonusForMilestone(milestoneObj, getEffectiveStreakBet(), count))}`;
      }
    }
  });

  // A brief, one-shot glow on the card the instant a milestone is paid out.
  // lastResult.milestoneHit stays set until the NEXT roll overwrites
  // lastResult, but since streak milestones are always at least 2 apart
  // (3/5/7/10), there's always a non-milestone render in between two
  // milestone hits, so classList.toggle naturally re-triggers the CSS
  // animation each time without needing extra timer bookkeeping.
  const justHitMilestone = !!(lastResult && lastResult.milestoneHit);
  el.streakCard.classList.toggle("reward-pulse", justHitMilestone);

  renderStreakStatusMsg(nextMilestone, justHitMilestone);
}

// Single compact status line spanning the full width of the streak strip --
// this replaces the old floating hint that used to live inside the payout
// card, so every bit of streak messaging now lives in one place. Shows,
// in priority order: the reward that was JUST unlocked (one render only,
// same lifetime as the card's reward-pulse glow), otherwise how many wins
// remain until the next milestone, otherwise nothing (streak is 0).
function renderStreakStatusMsg(nextMilestone, justHitMilestone) {
  if (justHitMilestone) {
    el.streakStatusMsg.textContent = `⭐ Streak reward unlocked: +${formatCurrency(lastResult.streakBonus)}`;
    el.streakStatusMsg.classList.add("show");
  } else if (currentStreak > 0 && nextMilestone) {
    const winsAway = nextMilestone.streak - currentStreak;
    const bonus = getStreakBonusForMilestone(nextMilestone, getEffectiveStreakBet(), selectedFaces.length);
    el.streakStatusMsg.textContent = `⭐ Win ${winsAway} more to unlock +${formatCurrency(bonus)}`;
    el.streakStatusMsg.classList.add("show");
  } else {
    el.streakStatusMsg.textContent = "";
    el.streakStatusMsg.classList.remove("show");
  }
}

function setControlsLocked(locked) {
  const controls = [el.betMinus, el.betPlus];
  controls.forEach((c) => (c.disabled = locked));
  el.betInput.disabled = locked;
  el.facePicker.querySelectorAll(".face-btn").forEach((b) => (b.disabled = locked));
  el.quickAmounts.querySelectorAll("button").forEach((b) => (b.disabled = locked));
  if (el.quickAmountsMobile) el.quickAmountsMobile.querySelectorAll("button").forEach((b) => (b.disabled = locked));
}

function renderDieDefaultState() {
  el.dieObject.classList.remove("result-win", "result-loss", "rolling");
  clearFaceResultHighlights();
  const rest = FACE_REST_ROT[selectedFaces[0] || 1];
  dieRotX = snapDieAngle(dieRotX, rest.x);
  dieRotY = snapDieAngle(dieRotY, rest.y);
  setDieTransform(dieRotX, dieRotY, false);
}

// Single always-visible CTA. Its label is the only thing that changes:
//   - no faces selected -> "Pick at least 1 face" (disabled)
//   - bet exceeds balance -> "INSUFFICIENT BALANCE" (disabled)
//   - rolling -> spinner + "ROLLING…" (disabled)
//   - otherwise: "ROLL" before the first-ever roll, "ROLL AGAIN" once any
//     roll has resolved (win or loss -- same label either way).
function renderCta() {
  el.mainCta.classList.remove("state-rolling");

  if (gameState === GameState.ROLLING) {
    el.mainCta.classList.add("state-rolling");
    el.mainCta.innerHTML = `<span class="spinner" aria-hidden="true"></span> ROLLING…`;
    el.mainCta.disabled = true;
    return;
  }

  const facesReady = selectedFaces.length >= MIN_SELECTED_FACES;
  const invalid = !facesReady || betAmount <= 0 || betAmount > balance;

  if (!facesReady) {
    el.mainCta.textContent = "Pick at least 1 face";
  } else if (betAmount > balance) {
    el.mainCta.textContent = "INSUFFICIENT BALANCE";
  } else if (!lastResult) {
    el.mainCta.textContent = "ROLL";
  } else {
    el.mainCta.textContent = "ROLL AGAIN";
  }
  el.mainCta.disabled = invalid || isBusy;
}

// The hero payout card. Three content modes, same DOM slots throughout (so
// nothing ever jumps in height or position, just re-labels/re-colors):
//   - idle/prospective (no roll yet, mid-roll, or the settled result has
//     gone stale -- see resultVisible): "Potential Win" + the live amount
//     the CURRENT face selection + bet would pay on the next roll.
//   - just won: "YOU WON" + the actual total payout (base win + any streak
//     bonus) as the big hero number, "Rolled N · K win streak" underneath.
//   - just lost: "YOU LOST", "Rolled N", "Streak reset" -- formula
//     de-emphasized (smaller + muted) since there's nothing to celebrate.
// Deliberately just the emotional/hero surface: label, hero amount,
// formula, helper/result copy, streak line, and the die. Chance/
// Multiplier/Coverage are NOT repeated here in any state (win or loss) --
// that full math detail lives only in the right Bet Summary panel, so
// there's exactly one source of truth for it instead of two copies going
// slightly out of sync in tone (e.g. a settled roll's actual odds vs. the
// next roll's live odds).
// A settled result stays on screen until the next roll resolves OR the
// player changes their bet amount / face selection -- at that point the
// old "YOU WON $X" no longer describes what they're about to play, so the
// card falls straight back to a live "Potential Win" calculation for the
// new selection/bet (resultVisible flips to false in commitBetAmount /
// commitFaceChange). There is still no separate decision/transition screen
// to leave it behind on.
function renderPayoutCard() {
  const count = selectedFaces.length;
  // Formula lines use the PRECISE adjusted multiplier (4dp), not the
  // floored 2dp display multiplier -- the floored version is what caused
  // the formula to visibly disagree with the actual hero/settled amount
  // (e.g. "$10 × 5.87 = $58.70" next to a real $58.74 payout), since
  // settlement itself always uses full precision (T5).
  const preciseMultiplier = count > 0 ? getMultiplier(count) : 0;

  el.previewBottomLabel.className = "payout-label";
  el.previewPotentialWin.className = "payout-hero mono";
  el.previewFormula.classList.remove("compact");

  if (!lastResult || !resultVisible || gameState === GameState.ROLLING) {
    const potential = count > 0 ? getPotentialPayout(betAmount, count) : 0;
    el.previewBottomLabel.textContent = "Potential Win";
    el.previewPotentialWin.textContent = formatCurrency(potential);
    el.previewFormula.textContent = count > 0 ? `${formatCurrency(betAmount)} × ${preciseMultiplier.toFixed(4)}` : "—";

    el.resultCopy.className = "result-copy";
    el.resultCopy.textContent =
      gameState === GameState.ROLLING
        ? "Rolling…"
        : selectedFaces.length > 0
        ? "Roll one of your selected faces to win"
        : "Tap a face above to set your win condition";
    el.streakLine.textContent = "";
  } else if (lastResult.won) {
    // "Payout $X" instead of "+$X" -- the total payout already includes the
    // stake back, so a leading "+" misleadingly implied it was pure profit
    // (T4). Streak-bonus call-outs elsewhere (Bet Summary, streak status
    // line) keep their "+" since those really are net additions on top.
    el.previewBottomLabel.textContent = "YOU WON";
    el.previewBottomLabel.classList.add("state-win");
    el.previewPotentialWin.textContent = `Payout ${formatCurrency(lastResult.totalPayout)}`;
    el.previewPotentialWin.classList.add("state-win");
    el.previewFormula.textContent = `${formatCurrency(lastResult.stake)} × ${lastResult.multiplier.toFixed(4)}`;

    el.resultCopy.className = "result-copy state-win";
    // Reads the streak value CAPTURED on this result, not the live
    // currentStreak variable -- on the 10th win the live counter is already
    // reset back to 0 internally the instant the milestone pays, so reading
    // it directly would show "0 win streak" on the very roll that earned
    // it (T7). lastResult.streakAfterRoll preserves the true value.
    el.resultCopy.textContent = `Rolled ${lastResult.face} · ${lastResult.streakAfterRoll} win streak 🔥`;
    el.streakLine.textContent = "";
  } else {
    // No "$0.00" hero on a loss -- there is nothing to hero here, so say so
    // in words instead of a dollar amount that reads like a broken payout
    // (T4). The de-emphasized formula line is kept (shows what the covered
    // faces WOULD have paid) since it still fits and gives useful context.
    el.previewBottomLabel.textContent = "YOU LOST";
    el.previewBottomLabel.classList.add("state-loss");
    el.previewPotentialWin.textContent = "No win";
    el.previewPotentialWin.classList.add("state-loss");
    el.previewFormula.textContent = `${formatCurrency(lastResult.stake)} × ${lastResult.multiplier.toFixed(4)}`;
    el.previewFormula.classList.add("compact");

    el.resultCopy.className = "result-copy state-loss";
    el.resultCopy.textContent = `Rolled ${lastResult.face}`;
    el.streakLine.textContent = "Streak reset";
  }
}

function render() {
  updateBalanceDisplay();
  updateFaceButtons();
  updateStageAndBetbarMaths();
  renderCta();
  renderPayoutCard();
  renderRecentChips();
  renderHistoryList();
  renderStreakCard();

  // Faces (and the rest of the bet controls) are ONLY locked while the dice
  // is actively rolling — the instant a roll settles, gameState is back to
  // READY and everything unlocks again, with no decision/transition screen
  // in between.
  setControlsLocked(gameState !== GameState.READY);
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------
// Settles a roll the instant the dice animation finishes: balance updates
// immediately (win -> profit added; loss -> already-deducted stake simply
// stays deducted), the streak counter updates, and the game returns
// straight to READY — no decision screen, no auto-reset timer, no
// transition of any kind.
async function settleRoll(rollData) {
  pushRollLog(rollData);

  let streakBonus = 0;
  let milestoneHit = null;

  if (rollData.won) {
    // Cross-roll streak, tied to the exact face selection.
    if (currentStreak === 0) {
      streakFaceSignature = faceSignature(rollData.faces);
      streakMinBet = rollData.stake;
    } else {
      // Running MINIMUM bet since the streak began -- raising your bet
      // mid-streak never increases a later milestone bonus, and lowering it
      // permanently caps every later milestone at the lower amount. Closes
      // the "grind cheap, spike bet right before the milestone" exploit
      // (see ECONOMY-AUDIT.md section 11).
      streakMinBet = Math.min(streakMinBet, rollData.stake);
    }
    currentStreak += 1;
    // Captured BEFORE the possible auto-reset below, so the 10th win keeps
    // reporting "10 win streak" (in lastResult, history, and the streak
    // card) instead of the internal counter's already-reset 0 (T7).
    const streakAfterRoll = currentStreak;

    if (isStreakMilestone(currentStreak)) {
      // Bonus is a percentage of the running-minimum bet during this
      // streak, NOT this roll's own stake -- see streakMinBet above.
      streakBonus = getStreakBonusForMilestone(currentStreak, streakMinBet, rollData.faces.length);
      milestoneHit = currentStreak;
      if (currentStreak >= 10) {
        // MVP simplicity: loop back to 0 immediately after the top reward.
        // The DISPLAYED streak still reads 10 for this settled render (see
        // renderStreakCard) — only the internal counter resets early.
        currentStreak = 0;
        streakFaceSignature = null;
        streakMinBet = null;
      }
    }

    const totalPayout = round2(rollData.payout + streakBonus);
    balance = round2(balance + totalPayout);

    lastResult = { ...rollData, totalPayout, streakBonus, milestoneHit, streakAfterRoll };
    pushRollHistory(lastResult, "WIN");
    updateBalanceDisplay(1);
  } else {
    // Bet was already deducted when the roll started -- nothing further to
    // settle on the balance. Any active streak breaks.
    currentStreak = 0;
    streakFaceSignature = null;
    streakMinBet = null;

    lastResult = { ...rollData, totalPayout: 0, streakBonus: 0, milestoneHit: null, streakAfterRoll: 0 };
    pushRollHistory(lastResult, "LOSS");
    updateBalanceDisplay(0);
  }

  resultVisible = true;
  gameState = GameState.READY;
  render();
}

async function onRoll() {
  if (gameState !== GameState.READY || isBusy) return;
  if (!isValidFaceSelection(selectedFaces)) return;
  const stake = betAmount;
  if (!(stake > 0) || stake > balance) return;

  isBusy = true;
  gameState = GameState.ROLLING;

  balance = round2(balance - stake);
  updateBalanceDisplay(-1);

  render();

  const faces = [...selectedFaces];
  try {
    const rollData = await performRoll({ stake, faces });
    await animateDieRoll(rollData);
    // Clear the busy flag *before* settling — settleRoll's render() call is
    // what re-enables the CTA/controls, which read `isBusy` to decide their
    // disabled state.
    isBusy = false;
    await settleRoll(rollData);
  } catch (err) {
    // A crypto/RNG failure mid-pipeline must never leave the stake gone and
    // the game stuck in ROLLING forever (T6). Refund the stake, unlock
    // everything, and surface a brief inline message instead of a silent
    // hang -- the stake was already deducted above, before this try block.
    console.error("Roll failed:", err);
    balance = round2(balance + stake);
    isBusy = false;
    gameState = GameState.READY;
    el.dieObject.classList.remove("rolling", "result-win", "result-loss");
    render();
    updateBalanceDisplay(1);
    el.resultCopy.className = "result-copy state-loss";
    el.resultCopy.textContent = "Something went wrong — your bet was refunded. Please try again.";
  }
}

// ---------------------------------------------------------------------------
// Streak reset confirmation modal
// ---------------------------------------------------------------------------
// Shared by both the face-change and bet-change paths below: currentStreak
// and selectedFaces/betAmount are all still the PRE-change values at the
// moment this opens, so "X wins away / +$Y bonus" always describes exactly
// what the player is about to give up.
function openStreakResetModal(type, apply) {
  pendingStreakChange = { type, apply };

  const nextMilestone = getNextStreakMilestone(currentStreak);
  el.streakResetBody.textContent =
    type === "face"
      ? "Changing your selected faces will reset your current streak."
      : "Changing your bet amount will reset your current streak.";

  if (nextMilestone) {
    const winsAway = nextMilestone.streak - currentStreak;
    const bonus = getStreakBonusForMilestone(nextMilestone, getEffectiveStreakBet(), selectedFaces.length);
    el.streakResetSub.textContent = `You are ${winsAway} win${winsAway === 1 ? "" : "s"} away from a +${formatCurrency(bonus)} bonus.`;
  } else {
    el.streakResetSub.textContent = "";
  }

  el.streakResetModal.classList.add("open");
}

// Used by every dismissal path (Keep streak, the × button, backdrop click,
// Escape) -- all of them mean "drop the attempted change and leave the
// streak exactly as it was." render() re-syncs any control that may have
// already shown the attempted value (e.g. a typed bet amount) back to the
// real, unchanged state.
function dismissStreakResetModal() {
  el.streakResetModal.classList.remove("open");
  pendingStreakChange = null;
  render();
}

el.keepStreakBtn.addEventListener("click", dismissStreakResetModal);
el.closeStreakResetModal.addEventListener("click", dismissStreakResetModal);
el.streakResetModal.addEventListener("click", (e) => {
  if (e.target === el.streakResetModal) dismissStreakResetModal();
});
el.resetStreakBtn.addEventListener("click", () => {
  const pending = pendingStreakChange;
  el.streakResetModal.classList.remove("open");
  pendingStreakChange = null;
  if (pending && pending.apply) pending.apply();
});

// ---------------------------------------------------------------------------
// Input handlers — bet amount / face selection
// ---------------------------------------------------------------------------
// Actually applies a confirmed (or never-needed-confirmation) bet amount
// change: sets the new bet AND, since any change reaching this point either
// had no active streak to protect or the player explicitly chose to reset
// it, clears the streak too. Resetting an already-zero streak is a
// harmless no-op, so this never needs to branch on currentStreak itself.
function commitBetAmount(amount) {
  betAmount = amount;
  currentStreak = 0;
  streakFaceSignature = null;
  streakMinBet = null;
  resultVisible = false;
  render();
  pulse([el.midPayout, el.previewPotentialWin]);
}

// Bet amount changes now reset an active streak, same as face changes --
// but every path that can change it (stepper, quick amounts, MAX, manual
// input) routes through here first so a genuine change while a streak is
// active always confirms before applying. A "change" to the SAME amount
// (e.g. re-typing the current value, blurring without editing, or tapping a
// quick chip equal to the current bet) is NOT a real change: it returns
// early before ever touching commitBetAmount, so it can never silently
// reset an active streak or clear a settled result (T1). Guarded against
// firing outside GameState.READY as belt-and-braces (T2).
function setBetAmount(next) {
  if (gameState !== GameState.READY) return;
  const clamped = Math.max(0.01, round2(next));
  if (clamped === betAmount) {
    el.betInput.value = betAmount.toFixed(2); // re-sync display only, no commit
    return;
  }
  if (currentStreak > 0) {
    openStreakResetModal("bet", () => commitBetAmount(clamped));
    return;
  }
  commitBetAmount(clamped);
}

// Highlights whichever fixed-amount quick chip (desktop or mobile row)
// matches the CURRENT bet amount exactly, so the active preset is visible
// at a glance -- purely a display concern, no separate state to track.
// The ½ / 2x mobile chips are relative actions rather than presets, so
// they're never marked active. Desktop has no .qa-active CSS rule (see
// styles.css), so running this against the desktop row too is harmless.
function updateActiveQuickAmount() {
  [el.quickAmounts, el.quickAmountsMobile].forEach((container) => {
    if (!container) return;
    container.querySelectorAll("button[data-amt]").forEach((btn) => {
      const isMax = btn.dataset.amt === "MAX";
      const matches = isMax ? false : round2(parseFloat(btn.dataset.amt)) === betAmount;
      btn.classList.toggle("qa-active", matches);
    });
  });
}

// Actually applies a confirmed (or never-needed-confirmation) face
// selection change, mirroring commitBetAmount above.
function commitFaceChange(next) {
  selectedFaces = next;
  currentStreak = 0;
  streakFaceSignature = null;
  streakMinBet = null;
  resultVisible = false;
  render();
  renderDieDefaultState();
  pulse([el.midChance, el.midMultiplier, el.midPayout, el.coverageCount, el.previewPotentialWin]);
}

// Freeform toggle: tap to add (up to MAX_SELECTED_FACES), tap again to
// remove. No fixed modes, no forced counts, no swap-out, and — per the
// instant-settle post-result flow — no blocking of any kind beyond the
// confirmation below: faces are only ever locked while the dice is
// actually rolling. If a streak is active and this tap would genuinely
// change the face selection, the change is held pending until the player
// confirms via the streak-reset modal — it is never applied silently.
function toggleFace(face) {
  if (gameState !== GameState.READY) return;

  const next = [...selectedFaces];
  const idx = next.indexOf(face);
  if (idx !== -1) {
    next.splice(idx, 1);
  } else if (next.length < MAX_SELECTED_FACES) {
    next.push(face);
  } else {
    // Already at the 5-face cap — briefly hint instead of silently no-op-ing.
    el.faceCountHint.textContent = "Max 5 faces covered — untap one first";
    return;
  }

  if (shouldWarnBeforeChangingFaces(currentStreak, selectedFaces, next)) {
    openStreakResetModal("face", () => commitFaceChange(next));
    return;
  }

  commitFaceChange(next);
}

el.betMinus.addEventListener("click", () => setBetAmount(betAmount - 1));
el.betPlus.addEventListener("click", () => setBetAmount(betAmount + 1));
el.betInput.addEventListener("change", () => setBetAmount(safeParseAmount(el.betInput.value, betAmount)));
el.betInput.addEventListener("blur", () => setBetAmount(safeParseAmount(el.betInput.value, betAmount)));

el.quickAmounts.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.amt === "MAX") {
      setBetAmount(balance);
    } else {
      setBetAmount(parseFloat(btn.dataset.amt));
    }
  });
});

// Mobile-only quick-amounts row -- same fixed-amount/MAX handling as
// desktop above, plus two RELATIVE chips (½ current bet, 2x current bet)
// that desktop doesn't have. Both still funnel through the one
// setBetAmount() gate, so the no-op guard (T1) and the streak-reset
// confirm flow apply here exactly the same as every other bet-entry path.
if (el.quickAmountsMobile) {
  el.quickAmountsMobile.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.amt === "MAX") {
        setBetAmount(balance);
      } else if (btn.dataset.half) {
        setBetAmount(betAmount / 2);
      } else if (btn.dataset.double) {
        setBetAmount(betAmount * 2);
      } else {
        setBetAmount(parseFloat(btn.dataset.amt));
      }
    });
  });
}

el.facePicker.querySelectorAll(".face-btn").forEach((btn) => {
  btn.addEventListener("click", () => toggleFace(parseInt(btn.dataset.face, 10)));
});

// ---------------------------------------------------------------------------
// CTA
// ---------------------------------------------------------------------------
el.mainCta.addEventListener("click", onRoll);

el.betPanel.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  if (gameState !== GameState.READY) return;
  // Commit any typed-but-not-yet-applied bet amount FIRST. The input's own
  // "change" event fires after this keydown handler, so calling onRoll()
  // directly used to capture the stale betAmount, then render() would
  // overwrite the input back to that stale value once the roll started --
  // the typed number just vanished (T2). Routing through setBetAmount here
  // applies it (or opens the streak-reset confirm modal) before any roll.
  setBetAmount(safeParseAmount(el.betInput.value, betAmount));
  if (pendingStreakChange) return; // confirm modal now open -- don't also roll
  onRoll();
});

// ---------------------------------------------------------------------------
// Manual Bet / Auto Bet tabs — Auto Bet is a UI placeholder only; no
// auto-betting logic exists yet, so switching to it simply hides the
// manual controls behind a "coming soon" panel rather than pretending to
// support a feature that isn't implemented.
// ---------------------------------------------------------------------------
el.tabManual.addEventListener("click", () => {
  el.tabManual.classList.add("active");
  el.tabAuto.classList.remove("active");
  el.manualBetBody.style.display = "";
  el.autoBetBody.style.display = "none";
});
el.tabAuto.addEventListener("click", () => {
  el.tabAuto.classList.add("active");
  el.tabManual.classList.remove("active");
  el.autoBetBody.style.display = "";
  el.manualBetBody.style.display = "none";
});

// ---------------------------------------------------------------------------
// Sound / deposit / menu (visual affordances)
// ---------------------------------------------------------------------------
let soundOn = true;
el.soundToggle.addEventListener("click", () => {
  soundOn = !soundOn;
  el.soundToggle.setAttribute("aria-pressed", String(soundOn));
});

el.depositBtn.addEventListener("click", () => {
  balance = round2(balance + 100);
  updateBalanceDisplay(1);
});

// ---------------------------------------------------------------------------
// Help modal
// ---------------------------------------------------------------------------
// Odds quoted in the Help modal must always come from the engine, never be
// hardcoded copy (T3) -- otherwise a future tuning pass silently makes the
// help text wrong. helpMultiplier1/5 are the two example figures used in
// prose ("1 face covered pays X, 5 faces covered pays Y").
function renderHelpOdds() {
  const m1 = $("helpMultiplier1");
  const m5 = $("helpMultiplier5");
  if (m1) m1.textContent = `${getDisplayMultiplier(1).toFixed(2)}x`;
  if (m5) m5.textContent = `${getDisplayMultiplier(5).toFixed(2)}x`;
}

function openHelpModal() {
  renderHelpOdds();
  el.helpModal.classList.add("open");
}
function closeHelpModal() {
  el.helpModal.classList.remove("open");
}
el.helpBtn.addEventListener("click", openHelpModal);
el.closeHelpModal.addEventListener("click", closeHelpModal);
el.helpModal.addEventListener("click", (e) => {
  if (e.target === el.helpModal) closeHelpModal();
});

// ---------------------------------------------------------------------------
// History modal (secondary — full roll history, off the primary screen)
// ---------------------------------------------------------------------------
function openHistoryModal() {
  renderHistoryList();
  el.historyModal.classList.add("open");
}
function closeHistoryModal() {
  el.historyModal.classList.remove("open");
}
el.openHistoryBtn.addEventListener("click", openHistoryModal);
el.closeHistoryModal.addEventListener("click", closeHistoryModal);
el.historyModal.addEventListener("click", (e) => {
  if (e.target === el.historyModal) closeHistoryModal();
});

// ---------------------------------------------------------------------------
// Streak detail modal (mobile-only entry point via #viewStreakBtn) -- the
// full rules copy + reward table for the CURRENT face selection that the
// compact mobile streak strip hides. Reuses the same milestone data
// (STREAK_MILESTONES_BY_FACES / getStreakBonusForMilestone) already driving
// the desktop 10-dot timeline, just rendered as a simple list here.
// ---------------------------------------------------------------------------
function renderStreakDetailTable() {
  const count = selectedFaces.length;
  const table = STREAK_MILESTONES_BY_FACES[count] || [];
  const displayStreak =
    resultVisible && lastResult && lastResult.won
      ? Math.max(currentStreak, lastResult.streakAfterRoll)
      : currentStreak;

  if (count === 0 || table.length === 0) {
    el.streakDetailTable.innerHTML = `<p class="modal-copy">Select faces to preview streak rewards.</p>`;
    return;
  }

  el.streakDetailTable.innerHTML = table
    .map((m) => {
      const completed = m.streak <= displayStreak;
      const bonus = getStreakBonusForMilestone(m, getEffectiveStreakBet(), count);
      return `
        <div class="streak-detail-row${completed ? " completed" : ""}">
          <span class="k">${completed ? "✓ " : ""}Win ${m.streak} in a row</span>
          <span class="v">+${formatCurrency(bonus)}</span>
        </div>`;
    })
    .join("");
}

function openStreakDetailModal() {
  renderStreakDetailTable();
  el.streakDetailModal.classList.add("open");
}
function closeStreakDetailModal() {
  el.streakDetailModal.classList.remove("open");
}
el.viewStreakBtn.addEventListener("click", openStreakDetailModal);
el.closeStreakDetailModal.addEventListener("click", closeStreakDetailModal);
el.streakDetailModal.addEventListener("click", (e) => {
  if (e.target === el.streakDetailModal) closeStreakDetailModal();
});

// ---------------------------------------------------------------------------
// Fairness modal + verification
// ---------------------------------------------------------------------------
let modalRollData = null;

function openFairnessModal(rollData) {
  modalRollData = rollData || lastResult || null;

  el.modalCalcVersion.textContent = CALCULATION_VERSION;
  el.verifyResult.classList.remove("show", "ok", "bad");
  el.verifyResult.textContent = "";

  if (modalRollData) {
    el.modalRoundId.textContent = modalRollData.runId || "—";
    el.modalNonce.textContent = String(modalRollData.nonce);
    el.modalSeedHash.textContent = modalRollData.serverSeedHash;
    el.modalClientSeed.textContent = modalRollData.clientSeed;
    el.modalFace.textContent = String(modalRollData.face);
    el.modalServerSeed.textContent = modalRollData.serverSeed;
    el.modalEntropyHash.textContent = modalRollData.entropyHash;
  } else {
    const pending = seedQueue[0];
    el.modalRoundId.textContent = "—";
    el.modalNonce.textContent = String(nonce);
    el.modalSeedHash.textContent = pending ? pending.serverSeedHash : "—";
    el.modalClientSeed.textContent = clientSeed;
    el.modalFace.textContent = "Pending next roll";
    el.modalServerSeed.textContent = "Not yet revealed";
    el.modalEntropyHash.textContent = "Not yet revealed";
  }

  el.fairnessModal.classList.add("open");
}

function closeFairnessModal() {
  el.fairnessModal.classList.remove("open");
}

el.rtpBadge.addEventListener("click", () => openFairnessModal(null));
el.openFairnessBtn.addEventListener("click", () => openFairnessModal(null));
el.closeFairnessModal.addEventListener("click", closeFairnessModal);
el.fairnessModal.addEventListener("click", (e) => {
  if (e.target === el.fairnessModal) closeFairnessModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (el.fairnessModal.classList.contains("open")) closeFairnessModal();
    if (el.helpModal.classList.contains("open")) closeHelpModal();
    if (el.historyModal.classList.contains("open")) closeHistoryModal();
    if (el.streakResetModal.classList.contains("open")) dismissStreakResetModal();
    if (el.streakDetailModal.classList.contains("open")) closeStreakDetailModal();
  }
});

el.verifyRollBtn.addEventListener("click", async () => {
  if (!modalRollData) {
    el.verifyResult.textContent = "Missing fairness data — play a roll first.";
    el.verifyResult.classList.add("show", "bad");
    return;
  }
  const verdict = await verifyRoll({
    serverSeed: modalRollData.serverSeed,
    serverSeedHash: modalRollData.serverSeedHash,
    clientSeed: modalRollData.clientSeed,
    nonce: modalRollData.nonce,
    entropyHash: modalRollData.entropyHash,
    face: modalRollData.face,
  });

  el.verifyResult.classList.remove("ok", "bad");
  if (verdict.verified) {
    el.verifyResult.textContent = "✓ Verified — this roll was fixed before you played.";
    el.verifyResult.classList.add("show", "ok");
  } else {
    const messages = {
      SEED_HASH_MISMATCH: "✗ Seed hash mismatch.",
      ENTROPY_MISMATCH: "✗ Entropy mismatch.",
      RESULT_MISMATCH: "✗ Dice result mismatch.",
      MISSING_DATA: "✗ Missing fairness data.",
    };
    el.verifyResult.textContent = messages[verdict.status] || "✗ Verification failed.";
    el.verifyResult.classList.add("show", "bad");
  }
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
async function init() {
  await ensureSeedQueue();
  renderDieDefaultState();
  renderHelpOdds();
  render();
}

init();
})();
