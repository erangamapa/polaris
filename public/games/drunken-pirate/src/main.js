import * as C from "./constants.js";
import { createInitialState } from "./state.js";
import { RoundPhase, BuyinPhase, createStateMachine } from "./state-machine.js";
import { createFairness } from "./fairness.js";
import { knockOutDarkBackground } from "./assets.js";
import { formatMoney, clampBet, formatHistoryMult } from "./ui.js";
import { attachSimulateApi } from "./game.js";
import "./audio.js";
import "./wheel.js";
import "./render.js";
import "./flight.js";

const {
  HIT_PROB,
  SEASON_STEP,
  PULL_MS,
  SNAP_MS,
  FLIGHT_MS,
  SETTLE_MS,
  OVERLAY_MS,
  FACE_CENSOR_MS,
  LOSE_SFX_DELAY_MS,
  HELP_KEY,
  STREAK_TRIGGER_HITS,
  STREAK_SLOW_MO_MULT,
  STREAK_CLAPS_VOL,
  STREAK_CLAPS_PEAK_VOL,
  STREAK_SAFE_MULT,
  WHEEL_SLICE_COUNT,
  WHEEL_SLICES,
  STREAK_JACKPOT_MULT,
  BUYIN_COST_MULT,
  BUYIN_APPLE_MULT,
  WHEEL_SPIN_MS,
  WHEEL_RESULT_HOLD_MS,
  WHEEL_CINEMATIC_FINAL_MS,
  WHEEL_CINEMATIC_HURT_BEAT_MS,
  WHEEL_STREAK_INTRO_MS,
  WHEEL_SLICE_DEG,
  ROUND_HISTORY_MAX,
  TAVERN_NAMES
} = C;

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const balanceDisplay = document.getElementById("balanceDisplay");
  const multDisplay = document.getElementById("multDisplay");
  const potentialDisplay = document.getElementById("potentialDisplay");
  const betInput = document.getElementById("betInput");
  const btnShoot = document.getElementById("btnShoot");
  const btnCheatFifthHit = document.getElementById("btnCheatFifthHit");
  const btnCheatFifthHitWin = document.getElementById("btnCheatFifthHitWin");
  const btnCash = document.getElementById("btnCash");
  const toastEl = document.getElementById("toast");
  const helpModal = document.getElementById("helpModal");
  const rtpModal = document.getElementById("rtpModal");
  const rtpServerHash = document.getElementById("rtpServerHash");
  const rtpServerSeed = document.getElementById("rtpServerSeed");
  const rtpNonce = document.getElementById("rtpNonce");
  const rtpLastRoll = document.getElementById("rtpLastRoll");
  const rtpWheelNonce = document.getElementById("rtpWheelNonce");
  const rtpLastWheelRoll = document.getElementById("rtpLastWheelRoll");
  const clientSeedInput = document.getElementById("clientSeedInput");
  const resultBanner = document.getElementById("resultBanner");
  const resultTitle = document.getElementById("resultTitle");
  const resultSub = document.getElementById("resultSub");
  const roundHistoryEl = document.getElementById("roundHistory");
  const wheelModal = document.getElementById("wheelModal");
  const wheelModalInner = document.getElementById("wheelModalInner");
  const sceneStage = document.getElementById("sceneStage");
  const wheelStreakBanner = document.getElementById("wheelStreakBanner");
  const wheelTitle = document.getElementById("wheelTitle");
  const wheelSub = document.getElementById("wheelSub");
  const wheelStreakInfo = document.getElementById("wheelStreakInfo");
  const wheelCanvas = document.getElementById("wheelCanvas");
  const wheelCtx = wheelCanvas.getContext("2d");
  const wheelActions = document.getElementById("wheelActions");
  const btnWheelTake = document.getElementById("btnWheelTake");
  const btnWheelGamble = document.getElementById("btnWheelGamble");
  const btnWheelBuyin = document.getElementById("btnWheelBuyin");
  const wheelBuyinConfirmModal = document.getElementById("wheelBuyinConfirmModal");
  const wheelBuyinConfirmCost = document.getElementById("wheelBuyinConfirmCost");
  const wheelBuyinConfirmBet = document.getElementById("wheelBuyinConfirmBet");
  const wheelBuyinConfirmPrize = document.getElementById("wheelBuyinConfirmPrize");
  const wheelBuyinConfirmPrizeAmt = document.getElementById("wheelBuyinConfirmPrizeAmt");
  const btnWheelBuyinConfirm = document.getElementById("btnWheelBuyinConfirm");
  const btnWheelBuyinCancel = document.getElementById("btnWheelBuyinCancel");
  const wheelResultReveal = document.getElementById("wheelResultReveal");

  const characterImg = new Image();
  const characterBlinkImg = new Image();
  const characterHitImg = new Image();
  const characterLoseImg = new Image();
  const characterLoseBandageImg = new Image();
  const characterLoseBruiseImg = new Image();
  const bowImg = new Image();
  const muzzleImg = new Image();
  const appleImg = new Image();
  const appleHitImg = new Image();
  const bgImg = new Image();
  const bgVideo = document.createElement("video");
  bgVideo.muted = true;
  bgVideo.defaultMuted = true;
  bgVideo.loop = true;
  bgVideo.playsInline = true;
  bgVideo.setAttribute("playsinline", "");
  bgVideo.setAttribute("webkit-playsinline", "");
  bgVideo.preload = "auto";
  const bgWheelAppleVideo = document.createElement("video");
  bgWheelAppleVideo.muted = true;
  bgWheelAppleVideo.defaultMuted = true;
  bgWheelAppleVideo.loop = false;
  bgWheelAppleVideo.playsInline = true;
  bgWheelAppleVideo.setAttribute("playsinline", "");
  bgWheelAppleVideo.setAttribute("webkit-playsinline", "");
  bgWheelAppleVideo.preload = "auto";
  let charSprite = null;
  let charBlinkSprite = null;
  let charHitSprite = null;
  let charLoseSprite = null;
  let charLoseBandageSprite = null;
  let charLoseBruiseSprite = null;
  let bowSprite = null;
  let muzzleSprite = null;
  let appleSprite = null;
  let appleHitSprite = null;
  let bgSprite = null;
  let bgVideoReady = false;
  let wheelAppleVideoReady = false;
  let assetsReady = { character: false, characterBlink: false, characterHit: false, characterLose: false, characterLoseBandage: false, characterLoseBruise: false, bow: false, muzzle: false, apple: false, appleHit: false, bg: false };
  // Tavern background already includes the character — don't draw character.png on top
  const SCENE_HAS_CHARACTER = false;

  characterImg.onload = () => {
    try { charSprite = knockOutDarkBackground(characterImg, 35); }
    catch (e) { charSprite = characterImg; }
    assetsReady.character = true;
  };
  characterBlinkImg.onload = () => {
    try { charBlinkSprite = knockOutDarkBackground(characterBlinkImg, 35); }
    catch (e) { charBlinkSprite = characterBlinkImg; }
    assetsReady.characterBlink = true;
  };
  characterHitImg.onload = () => {
    try { charHitSprite = knockOutDarkBackground(characterHitImg, 35); }
    catch (e) { charHitSprite = characterHitImg; }
    assetsReady.characterHit = true;
  };
  characterLoseImg.onload = () => {
    try { charLoseSprite = knockOutDarkBackground(characterLoseImg, 35); }
    catch (e) { charLoseSprite = characterLoseImg; }
    assetsReady.characterLose = true;
  };
  characterLoseBandageImg.onload = () => {
    try { charLoseBandageSprite = knockOutDarkBackground(characterLoseBandageImg, 35); }
    catch (e) { charLoseBandageSprite = characterLoseBandageImg; }
    assetsReady.characterLoseBandage = true;
  };
  characterLoseBruiseImg.onload = () => {
    try { charLoseBruiseSprite = knockOutDarkBackground(characterLoseBruiseImg, 35); }
    catch (e) { charLoseBruiseSprite = characterLoseBruiseImg; }
    assetsReady.characterLoseBruise = true;
  };
  bowImg.onload = () => {
    try { bowSprite = knockOutDarkBackground(bowImg, 28); }
    catch (e) { bowSprite = bowImg; }
    assetsReady.bow = true;
  };
  muzzleImg.onload = () => {
    try { muzzleSprite = knockOutDarkBackground(muzzleImg, 28); }
    catch (e) { muzzleSprite = muzzleImg; }
    assetsReady.muzzle = true;
  };
  appleImg.onload = () => {
    try { appleSprite = knockOutDarkBackground(appleImg, 45); }
    catch (e) { appleSprite = appleImg; }
    assetsReady.apple = true;
  };
  appleHitImg.onload = () => {
    // Keep full apple-hit art — knockOut eats the bullet hole and dark shading.
    appleHitSprite = appleHitImg;
    assetsReady.appleHit = true;
  };
  characterImg.onerror = () => { assetsReady.character = false; };
  characterBlinkImg.onerror = () => { assetsReady.characterBlink = false; };
  characterHitImg.onerror = () => { assetsReady.characterHit = false; };
  characterLoseImg.onerror = () => { assetsReady.characterLose = false; };
  characterLoseBandageImg.onerror = () => { assetsReady.characterLoseBandage = false; };
  characterLoseBruiseImg.onerror = () => { assetsReady.characterLoseBruise = false; };
  bowImg.onerror = () => { assetsReady.bow = false; };
  muzzleImg.onerror = () => { assetsReady.muzzle = false; };
  appleImg.onerror = () => { assetsReady.apple = false; };
  appleHitImg.onerror = () => { assetsReady.appleHit = false; };
  bgImg.onload = () => {
    bgSprite = bgImg;
    assetsReady.bg = true;
  };
  bgImg.onerror = () => { assetsReady.bg = false; };
  bgVideo.addEventListener("loadeddata", () => {
    bgVideoReady = true;
    assetsReady.bg = true;
    ensureBgVideoPlaying();
  });
  bgVideo.addEventListener("error", () => { bgVideoReady = false; });
  bgWheelAppleVideo.addEventListener("loadeddata", () => {
    wheelAppleVideoReady = true;
  });
  bgWheelAppleVideo.addEventListener("error", () => { wheelAppleVideoReady = false; });
  characterImg.src = "character.png";
  characterBlinkImg.src = "character-blink.png";
  characterHitImg.src = "character-hit.png";
  characterLoseImg.src = "character-lose.png";
  characterLoseBandageImg.src = "character-lose-bandage.png";
  characterLoseBruiseImg.src = "character-lose-bruise.png";
  bowImg.src = "pistol.png";
  muzzleImg.src = "muzzle.png";
  appleImg.src = "apple.png";
  appleHitImg.src = "apple-hit.png";
  bgImg.src = "background.png";
  bgVideo.src = "background.mp4";
  bgVideo.load();
  bgWheelAppleVideo.src = "wheel-apple-cinematic.mp4";
  bgWheelAppleVideo.load();

  const wheelImg = new Image();
  const wheelAppleImg = new Image();
  const wheelSkullImg = new Image();
  let wheelSprite = null;
  let wheelAppleSprite = null;
  let wheelSkullSprite = null;
  let wheelAssetsReady = { wheel: false, apple: false, skull: false };

  wheelImg.onload = () => {
    try { wheelSprite = knockOutDarkBackground(wheelImg, 22); }
    catch (e) { wheelSprite = wheelImg; }
    wheelAssetsReady.wheel = true;
    if (wheelModal.classList.contains("open")) drawWheelFrame(state.wheelRotation || 0);
  };
  wheelAppleImg.onload = () => {
    try { wheelAppleSprite = knockOutDarkBackground(wheelAppleImg, 45); }
    catch (e) { wheelAppleSprite = wheelAppleImg; }
    wheelAssetsReady.apple = true;
    if (wheelModal.classList.contains("open")) drawWheelFrame(state.wheelRotation || 0);
  };
  wheelSkullImg.onload = () => {
    try { wheelSkullSprite = knockOutDarkBackground(wheelSkullImg, 45); }
    catch (e) { wheelSkullSprite = wheelSkullImg; }
    wheelAssetsReady.skull = true;
    if (wheelModal.classList.contains("open")) drawWheelFrame(state.wheelRotation || 0);
  };
  wheelImg.onerror = () => { wheelAssetsReady.wheel = false; };
  wheelAppleImg.onerror = () => { wheelAssetsReady.apple = false; };
  wheelSkullImg.onerror = () => { wheelAssetsReady.skull = false; };
  wheelImg.src = "wheel.png";
  wheelAppleImg.src = "wheel-apple.png";
  wheelSkullImg.src = "wheel-skull.png";

  const sfxShot = new Audio("pistol-shot.mp3");
  const sfxAppleHit = new Audio("apple-hit.mp3");
  const sfxFaceHit = new Audio("ow.mp3");
  const sfxCashOut = new Audio("cash-out.mp3");
  const sfxWheelSpin = new Audio("wheel-spin.mp3");
  const sfxWheelLand = new Audio("wheel-land.mp3");
  const sfxWheelAppleLand = new Audio("wheel-apple-land.mp3");
  const sfxWheelSkullLand = new Audio("wheel-skull-land.mp3");
  const sfxStreakClaps = new Audio("streak-claps.mp3");
  const bgMusic = new Audio("ambient.mp3");
  bgMusic.loop = true;
  bgMusic.preload = "auto";
  const AMBIENT_VOL = 0.18;
  const SFX_VOL = 0.85;
  const WHEEL_SPIN_SFX_VOL = 0.9;
  const WHEEL_LAND_SFX_VOL = 0.95;
  const WHEEL_APPLE_LAND_SFX_VOL = 0.88;
  const WHEEL_SKULL_LAND_SFX_VOL = 0.92;
  [sfxShot, sfxAppleHit, sfxFaceHit, sfxCashOut, sfxWheelSpin, sfxWheelLand, sfxWheelAppleLand, sfxWheelSkullLand, sfxStreakClaps, bgMusic].forEach((a) => {
    a.load();
  });

  const MUSIC_MUTE_KEY = "drunkenPirateMusicMuted";
  const SOUND_MUTE_KEY = "drunkenPirateSoundMuted";
  const btnMuteMusic = document.getElementById("btnMuteMusic");
  const btnMuteSound = document.getElementById("btnMuteSound");
  const icoMusic = document.getElementById("icoMusic");
  const icoSound = document.getElementById("icoSound");
  const labelMusic = document.getElementById("labelMusic");
  const labelSound = document.getElementById("labelSound");

  function loadMutePref(key) {
    try {
      return localStorage.getItem(key) === "1";
    } catch (e) {
      return false;
    }
  }

  let musicMuted = loadMutePref(MUSIC_MUTE_KEY);
  let soundMuted = loadMutePref(SOUND_MUTE_KEY);
  let musicStarted = false;

  // Web Audio keeps lose "ow" audible even after a short delay (HTMLAudio play()
  // from setTimeout is often blocked once the click gesture expires).
  let sfxCtx = null;
  let loseHitBuffer = null;
  let masterGain = null;
  let streakTensionNodes = null;
  let clapsLooping = false;
  let clapsLoopVol = 0.75;
  // ow.mp3 has ~140ms leading silence
  const LOSE_HIT_OFFSET = 0.14;

  function effectiveSfxVolume() {
    return soundMuted ? 0 : SFX_VOL;
  }

  function syncMuteUi() {
    btnMuteMusic.classList.toggle("is-muted", musicMuted);
    btnMuteMusic.setAttribute("aria-pressed", musicMuted ? "true" : "false");
    btnMuteMusic.title = musicMuted ? "Unmute music" : "Mute music";
    icoMusic.textContent = musicMuted ? "🔇" : "🎵";
    labelMusic.textContent = musicMuted ? "Music off" : "Music";

    btnMuteSound.classList.toggle("is-muted", soundMuted);
    btnMuteSound.setAttribute("aria-pressed", soundMuted ? "true" : "false");
    btnMuteSound.title = soundMuted ? "Unmute sound" : "Mute sound";
    icoSound.textContent = soundMuted ? "🔇" : "🔊";
    labelSound.textContent = soundMuted ? "Sound off" : "Sound";
  }

  function applyAudioLevels() {
    const sfxV = effectiveSfxVolume();
    sfxShot.volume = sfxV;
    sfxAppleHit.volume = sfxV;
    sfxFaceHit.volume = Math.min(1, sfxV);
    sfxCashOut.volume = sfxV;
    sfxWheelSpin.volume = Math.min(1, sfxV * WHEEL_SPIN_SFX_VOL);
    sfxWheelLand.volume = Math.min(1, sfxV * WHEEL_LAND_SFX_VOL);
    sfxWheelAppleLand.volume = Math.min(1, sfxV * WHEEL_APPLE_LAND_SFX_VOL);
    sfxWheelSkullLand.volume = Math.min(1, sfxV * WHEEL_SKULL_LAND_SFX_VOL);
    sfxStreakClaps.volume = clapsLooping
      ? Math.min(1, sfxV * clapsLoopVol)
      : sfxV;
    if (masterGain) masterGain.gain.value = sfxV * 1.8;
    bgMusic.volume = musicMuted ? 0 : AMBIENT_VOL;
    syncMuteUi();
  }

  function persistAudioPrefs() {
    try {
      localStorage.setItem(MUSIC_MUTE_KEY, musicMuted ? "1" : "0");
      localStorage.setItem(SOUND_MUTE_KEY, soundMuted ? "1" : "0");
    } catch (e) {}
  }

  function getSfxCtx() {
    if (!sfxCtx) sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!masterGain) {
      masterGain = sfxCtx.createGain();
      masterGain.gain.value = effectiveSfxVolume() * 1.8;
      masterGain.connect(sfxCtx.destination);
    }
    return sfxCtx;
  }

  function unlockSfx() {
    const ctx = getSfxCtx();
    if (ctx.state === "suspended") ctx.resume();
    ensureBgVideoPlaying();
  }

  function ensureMusicPlaying() {
    if (musicMuted) return;
    unlockSfx();
    ensureBgVideoPlaying();
    bgMusic.volume = AMBIENT_VOL;
    if (!musicStarted || bgMusic.paused) {
      const p = bgMusic.play();
      if (p && typeof p.catch === "function") {
        p.then(() => { musicStarted = true; }).catch(() => {});
      } else {
        musicStarted = true;
      }
    }
  }

  fetch("ow.mp3")
    .then((r) => r.arrayBuffer())
    .then((ab) => getSfxCtx().decodeAudioData(ab))
    .then((buf) => { loseHitBuffer = buf; })
    .catch(() => {});

  applyAudioLevels();

  btnMuteMusic.addEventListener("click", () => {
    musicMuted = !musicMuted;
    persistAudioPrefs();
    applyAudioLevels();
    if (musicMuted) {
      bgMusic.pause();
    } else {
      ensureMusicPlaying();
    }
  });

  btnMuteSound.addEventListener("click", () => {
    soundMuted = !soundMuted;
    persistAudioPrefs();
    applyAudioLevels();
    unlockSfx();
  });

  function playSfx(audio) {
    try {
      if (effectiveSfxVolume() <= 0) return;
      unlockSfx();
      ensureMusicPlaying();
      audio.pause();
      audio.currentTime = 0;
      audio.volume = effectiveSfxVolume();
      const p = audio.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) { /* ignore autoplay blocks */ }
  }

  function startClapsLoop(vol) {
    if (vol != null) clapsLoopVol = vol;
    if (effectiveSfxVolume() <= 0) return;
    unlockSfx();
    clapsLooping = true;
    try {
      sfxStreakClaps.loop = true;
      sfxStreakClaps.volume = Math.min(1, effectiveSfxVolume() * clapsLoopVol);
      const p = sfxStreakClaps.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) { /* ignore */ }
  }

  function stopClapsLoop() {
    clapsLooping = false;
    try {
      sfxStreakClaps.loop = false;
      sfxStreakClaps.pause();
      sfxStreakClaps.currentTime = 0;
    } catch (e) { /* ignore */ }
  }

  function playStreakClaps(hitNumber) {
    if (hitNumber >= STREAK_TRIGGER_HITS) {
      startClapsLoop(STREAK_CLAPS_VOL[hitNumber] || clapsLoopVol);
      return;
    }
    const vol = STREAK_CLAPS_VOL[hitNumber] || 0;
    if (vol <= 0 || effectiveSfxVolume() <= 0) return;
    unlockSfx();
    try {
      sfxStreakClaps.loop = false;
      sfxStreakClaps.volume = Math.min(1, effectiveSfxVolume() * vol);
      sfxStreakClaps.currentTime = 0;
      const p = sfxStreakClaps.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) { /* ignore */ }
  }

  function playCrowdCheer() {
    if (effectiveSfxVolume() <= 0) return;
    unlockSfx();
    const ctx = getSfxCtx();
    const dest = masterGain || ctx.destination;
    const t0 = ctx.currentTime + 0.02;
    const vol = effectiveSfxVolume() * 0.38;
    for (let i = 0; i < 6; i++) {
      const len = Math.floor(ctx.sampleRate * 0.09);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < len; j++) data[j] = (Math.random() * 2 - 1) * (1 - j / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 700 + i * 180;
      f.Q.value = 0.75;
      const at = t0 + i * 0.045;
      g.gain.setValueAtTime(0.001, at);
      g.gain.linearRampToValueAtTime(vol * (0.65 + i * 0.07), at + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
      src.connect(f);
      f.connect(g);
      g.connect(dest);
      src.start(at);
      src.stop(at + 0.2);
    }
  }

  function triggerStreakShake() {
    if (!sceneStage) return;
    sceneStage.classList.remove("streak-shake");
    void sceneStage.offsetWidth;
    sceneStage.classList.add("streak-shake");
    setTimeout(() => sceneStage.classList.remove("streak-shake"), 420);
  }

  function startStreakTensionLayer() {
    if (streakTensionNodes || musicMuted || effectiveSfxVolume() <= 0) return;
    unlockSfx();
    const ctx = getSfxCtx();
    const dest = masterGain || ctx.destination;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 52;
    lfo.type = "sine";
    lfo.frequency.value = 2.4;
    lfoGain.gain.value = 0.045;
    gain.gain.value = 0.001;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    lfo.start();
    gain.gain.setTargetAtTime(0.055 * effectiveSfxVolume(), ctx.currentTime, 0.35);
    streakTensionNodes = { osc, gain, lfo, lfoGain };
  }

  function stopStreakTensionLayer() {
    if (!streakTensionNodes) return;
    const ctx = getSfxCtx();
    const { osc, gain, lfo, lfoGain } = streakTensionNodes;
    streakTensionNodes = null;
    try {
      gain.gain.setTargetAtTime(0.001, ctx.currentTime, 0.2);
      setTimeout(() => {
        try { osc.stop(); lfo.stop(); } catch (e) { /* ignore */ }
        try { osc.disconnect(); gain.disconnect(); lfo.disconnect(); lfoGain.disconnect(); } catch (e2) { /* ignore */ }
      }, 280);
    } catch (e) { /* ignore */ }
  }

  function onStreakAppleLand(nextHit) {
    if (nextHit >= 4) playStreakClaps(nextHit);
    if (nextHit >= 3) {
      triggerStreakShake();
      playCrowdCheer();
    }
  }

  function onStreakHitRegistered(hitCount) {
    if (hitCount >= 4) startStreakTensionLayer();
    if (hitCount === STREAK_TRIGGER_HITS) stopStreakTensionLayer();
  }

  function flightTimings(f) {
    if (!f || !f.slowMo) {
      return { pullMs: PULL_MS, snapMs: SNAP_MS, flightMs: FLIGHT_MS, settleMs: SETTLE_MS };
    }
    return {
      pullMs: PULL_MS * 2.4,
      snapMs: SNAP_MS * 2.4,
      flightMs: FLIGHT_MS * STREAK_SLOW_MO_MULT,
      settleMs: SETTLE_MS * 2.1
    };
  }

  function stopWheelSpinSfx() {
    try {
      sfxWheelSpin.pause();
      sfxWheelSpin.currentTime = 0;
    } catch (e) { /* ignore */ }
  }

  function playWheelSpinSfx() {
    if (effectiveSfxVolume() <= 0) return;
    unlockSfx();
    ensureMusicPlaying();
    try {
      sfxWheelSpin.pause();
      sfxWheelSpin.currentTime = 0;
      sfxWheelSpin.volume = Math.min(1, effectiveSfxVolume() * WHEEL_SPIN_SFX_VOL);
      const p = sfxWheelSpin.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) { /* ignore */ }
  }

  function playWheelLandSfx(outcome) {
    stopWheelSpinSfx();
    if (effectiveSfxVolume() <= 0) return;
    unlockSfx();
    ensureMusicPlaying();
    const isSkull = outcome === "skull";
    const isApple = outcome === "apple";
    const audio = isSkull ? sfxWheelSkullLand : (isApple ? sfxWheelAppleLand : sfxWheelLand);
    const volMult = isSkull
      ? WHEEL_SKULL_LAND_SFX_VOL
      : (isApple ? WHEEL_APPLE_LAND_SFX_VOL : WHEEL_LAND_SFX_VOL);
    try {
      sfxWheelLand.pause();
      sfxWheelLand.currentTime = 0;
      sfxWheelAppleLand.pause();
      sfxWheelAppleLand.currentTime = 0;
      sfxWheelSkullLand.pause();
      sfxWheelSkullLand.currentTime = 0;
      audio.pause();
      audio.currentTime = 0;
      audio.volume = Math.min(1, effectiveSfxVolume() * volMult);
      const p = audio.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) { /* ignore */ }
  }

  function playLoseExhale() {
    if (effectiveSfxVolume() <= 0) return;
    unlockSfx();
    const ctx = getSfxCtx();
    const start = () => {
      if (loseHitBuffer) {
        const src = ctx.createBufferSource();
        src.buffer = loseHitBuffer;
        src.connect(masterGain || ctx.destination);
        src.start(ctx.currentTime, LOSE_HIT_OFFSET);
        return;
      }
      try {
        sfxFaceHit.volume = effectiveSfxVolume();
        sfxFaceHit.currentTime = LOSE_HIT_OFFSET;
        sfxFaceHit.play().catch(() => {});
      } catch (e) {}
    };
    if (ctx.state === "suspended") {
      ctx.resume().then(start).catch(start);
    } else {
      start();
    }
  }

  function firePistolShot() {
    unlockSfx();
    state.muzzleFired = true;
    state.muzzleFlash = 1;
    state.pistolRecoil = 1;
    playSfx(sfxShot);
  }

  let cheatForceWheelApple = false;

  const state = createInitialState();

  function wheelBuyinCostAmount() {
    return Math.round(state.bet * BUYIN_COST_MULT * 100) / 100;
  }

  const fairnessApi = createFairness({
    rtpServerHash,
    rtpServerSeed,
    rtpNonce,
    rtpLastRoll,
    rtpWheelNonce,
    rtpLastWheelRoll,
    clientSeedInput,
    getCheatForceWheelApple: () => cheatForceWheelApple,
    setCheatForceWheelApple: (v) => { cheatForceWheelApple = v; }
  });

  const {
    fairness,
    randomSeed,
    loadClientSeed,
    saveClientSeed,
    updateFairnessUi,
    commitServerSeed,
    revealServerSeed,
    rollWheelSlice,
    rollOutcome
  } = fairnessApi;

  const {
    setRoundPhase,
    setBuyinPhase,
    logPhaseContext,
    canShoot,
    canCashOut,
    canTakeWheel,
    canGambleWheel,
    canBuyIn,
    isWheelBlockedForBetting
  } = createStateMachine(state, {
    wheelModal,
    wheelBuyinConfirmModal,
    wheelBuyinCostAmount
  });

  const LOSE_VARIANTS = ["patch", "bandage", "bruise"];

  function pickLoseVariant() {
    return LOSE_VARIANTS[Math.floor(Math.random() * LOSE_VARIANTS.length)];
  }

  function getLoseSprites() {
    return {
      patch: charLoseSprite || (assetsReady.characterLose ? characterLoseImg : null),
      bandage: charLoseBandageSprite || (assetsReady.characterLoseBandage ? characterLoseBandageImg : null),
      bruise: charLoseBruiseSprite || (assetsReady.characterLoseBruise ? characterLoseBruiseImg : null)
    };
  }

  function getLoseSprite(variant) {
    const s = getLoseSprites();
    if (variant === "bandage") return s.bandage || s.patch || s.bruise;
    if (variant === "bruise") return s.bruise || s.patch || s.bandage;
    return s.patch || s.bandage || s.bruise;
  }

  function wheelBuyinPrizeAmount() {
    return Math.round(state.bet * BUYIN_APPLE_MULT * 100) / 100;
  }

  function openWheelBuyinConfirm() {
    const cost = wheelBuyinCostAmount();
    const prize = wheelBuyinPrizeAmount();
    wheelBuyinConfirmCost.textContent = BUYIN_COST_MULT + "× bet (" + formatMoney(cost) + ")";
    wheelBuyinConfirmBet.textContent = formatMoney(state.bet);
    wheelBuyinConfirmPrize.textContent = BUYIN_APPLE_MULT + "× bet";
    wheelBuyinConfirmPrizeAmt.textContent = formatMoney(prize);
    btnWheelBuyinConfirm.textContent = "Spin — " + formatMoney(cost);
    wheelBuyinConfirmModal.classList.add("open");
    setBuyinPhase(BuyinPhase.CONFIRMING, "openWheelBuyinConfirm");
    updateUI();
  }

  function closeWheelBuyinConfirm() {
    wheelBuyinConfirmModal.classList.remove("open");
    setBuyinPhase(null, "closeWheelBuyinConfirm");
    updateUI();
  }

  function logicalSize() {
    return { w: canvas.width / state.dpr, h: canvas.height / state.dpr };
  }

  /** Character framed mid-body: legs cropped off bottom; apple on head. */
  function sceneLayout() {
    const { w, h } = logicalSize();
    const cx = w * 0.5;
    // Scale up and plant feet below the canvas so legs are cut off
    const charH = h * 1.12;
    const feetY = h * 1.22;
    const charTop = feetY - charH;
    const headR = charH * 0.085;
    const headY = charTop + charH * 0.125;
    const appleR = headR * 0.72;
    const appleY = headY - headR * 0.68;
    const chinY = headY + headR * 0.75;
    const foreheadY = headY - headR * 0.5;
    const shoulderY = headY + headR * 1.15;
    const hipY = feetY - charH * 0.38;
    return {
      w, h, cx, charH, feetY, hipY, charTop,
      headR, headY, headX: cx,
      bodyW: charH * 0.34,
      appleX: cx, appleY, appleR,
      chinY, foreheadY, shoulderY
    };
  }

  /** Steady pistol aim point — FPS forward. */
  function getPOVHandPose(layout, pullAmount) {
    const pose = getPistolPose(layout);
    return {
      handX: pose.px,
      handY: pose.py,
      nockX: pose.muzzleX,
      nockY: pose.muzzleY,
      wobbleX: 0,
      wobbleY: 0,
      pull: pullAmount
    };
  }

  function pushRoundHistory(type, label) {
    state.roundHistory.push({ type, label });
    while (state.roundHistory.length > ROUND_HISTORY_MAX) {
      state.roundHistory.shift();
    }
    renderRoundHistory();
  }

  function renderRoundHistory() {
    if (!roundHistoryEl) return;
    roundHistoryEl.textContent = "";
    state.roundHistory.forEach((entry) => {
      const chip = document.createElement("span");
      chip.className = "round-history-chip " + (entry.type === "loss" ? "is-loss" : "is-win");
      chip.textContent = entry.label;
      roundHistoryEl.appendChild(chip);
    });
    roundHistoryEl.scrollLeft = roundHistoryEl.scrollWidth;
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  function openHelp(startSlide) {
    setHelpSlide(startSlide == null ? 0 : startSlide);
    helpModal.classList.add("open");
    syncHelpSlideVideos();
  }
  function closeHelp() {
    helpModal.classList.remove("open");
    pauseHelpSlideVideos();
    try { localStorage.setItem(HELP_KEY, "1"); } catch (e) { /* ignore */ }
    ensureMusicPlaying();
    ensureBgVideoPlaying();
  }

  const helpCarouselTrack = document.getElementById("helpCarouselTrack");
  const helpCarouselViewport = document.getElementById("helpCarouselViewport");
  const helpCarouselDots = document.getElementById("helpCarouselDots");
  const btnCloseHelp = document.getElementById("btnCloseHelp");
  const helpSlides = helpCarouselTrack ? Array.from(helpCarouselTrack.querySelectorAll(".help-slide")) : [];
  const helpSlideVideos = helpCarouselTrack ? Array.from(helpCarouselTrack.querySelectorAll(".help-art-video")) : [];
  let helpSlideIndex = 0;
  let helpTouchStartX = 0;
  let helpTouchStartY = 0;

  function isMobileViewport() {
    return window.matchMedia("(max-width: 640px)").matches;
  }

  function pauseHelpSlideVideos() {
    helpSlideVideos.forEach((video) => {
      try { video.pause(); } catch (e) { /* ignore */ }
    });
  }

  function syncHelpSlideVideos() {
    helpSlideVideos.forEach((video) => {
      const slide = video.closest(".help-slide");
      const active = slide && slide.getAttribute("aria-hidden") === "false";
      if (!active) {
        try { video.pause(); } catch (e) { /* ignore */ }
        return;
      }
      try {
        video.currentTime = 0;
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (e) { /* ignore */ }
    });
  }

  function setHelpSlide(index) {
    if (!helpSlides.length) return;
    helpSlideIndex = Math.max(0, Math.min(index, helpSlides.length - 1));
    helpCarouselTrack.style.transform = "translateX(-" + (helpSlideIndex * 100) + "%)";
    helpSlides.forEach((slide, i) => {
      slide.setAttribute("aria-hidden", i === helpSlideIndex ? "false" : "true");
    });
    if (helpCarouselDots) {
      helpCarouselDots.querySelectorAll("button").forEach((dot, i) => {
        dot.classList.toggle("active", i === helpSlideIndex);
        dot.setAttribute("aria-selected", i === helpSlideIndex ? "true" : "false");
      });
    }
    const isLast = helpSlideIndex === helpSlides.length - 1;
    if (btnCloseHelp) btnCloseHelp.hidden = !isLast;
    if (helpModal.classList.contains("open")) syncHelpSlideVideos();
  }

  function initHelpCarousel() {
    if (!helpCarouselDots || !helpSlides.length) return;
    helpCarouselDots.textContent = "";
    helpSlides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.role = "tab";
      dot.setAttribute("aria-label", "Slide " + (i + 1));
      dot.addEventListener("click", () => setHelpSlide(i));
      helpCarouselDots.appendChild(dot);
    });
    setHelpSlide(0);

    if (helpCarouselViewport) {
      helpCarouselViewport.addEventListener("touchstart", (e) => {
        if (!e.touches || !e.touches.length) return;
        helpTouchStartX = e.touches[0].clientX;
        helpTouchStartY = e.touches[0].clientY;
      }, { passive: true });

      helpCarouselViewport.addEventListener("touchend", (e) => {
        if (!e.changedTouches || !e.changedTouches.length) return;
        const dx = e.changedTouches[0].clientX - helpTouchStartX;
        const dy = e.changedTouches[0].clientY - helpTouchStartY;
        if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        if (dx < 0) setHelpSlide(helpSlideIndex + 1);
        else setHelpSlide(helpSlideIndex - 1);
      }, { passive: true });
    }
  }

  function maybeShowFirstTimeHelp() {
    try {
      if (!localStorage.getItem(HELP_KEY) && isMobileViewport()) openHelp(0);
    } catch (e) {
      if (isMobileViewport()) openHelp(0);
    }
  }

  function openRtp() {
    updateFairnessUi();
    rtpModal.classList.add("open");
  }

  function closeRtp() {
    rtpModal.classList.remove("open");
  }

  function wheelRotationForSlice(sliceIndex) {
    const sliceCenter = sliceIndex * WHEEL_SLICE_DEG + WHEEL_SLICE_DEG * 0.5;
    return 360 - sliceCenter;
  }

  function resizeWheelCanvas() {
    const rect = wheelCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const side = Math.min(rect.width, rect.height);
    const px = Math.max(320, Math.round(Math.min(side, 420) * dpr));
    if (wheelCanvas.width !== px || wheelCanvas.height !== px) {
      wheelCanvas.width = px;
      wheelCanvas.height = px;
    }
  }

  function drawWheelFrame(rotationDeg, highlightSlice) {
    resizeWheelCanvas();
    const size = wheelCanvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size * 0.47;
    const rimInnerR = size * 0.34;
    const iconR = size * 0.395;
    const iconSize = size * 0.22;
    const wheelArtSize = size * 0.96;
    const hl = highlightSlice != null ? highlightSlice : -1;
    wheelCtx.clearRect(0, 0, size, size);

    wheelCtx.save();
    wheelCtx.translate(cx, cy);
    wheelCtx.rotate((rotationDeg * Math.PI) / 180);

    const wheelArt = wheelSprite || (wheelAssetsReady.wheel ? wheelImg : null);
    if (wheelArt) {
      wheelCtx.drawImage(
        wheelArt,
        -wheelArtSize / 2,
        -wheelArtSize / 2,
        wheelArtSize,
        wheelArtSize
      );
    } else {
      wheelCtx.beginPath();
      wheelCtx.arc(0, 0, outerR + size * 0.02, 0, Math.PI * 2);
      wheelCtx.fillStyle = "rgba(62, 38, 22, 0.9)";
      wheelCtx.fill();
      wheelCtx.strokeStyle = "rgba(232, 197, 71, 0.55)";
      wheelCtx.lineWidth = Math.max(3, size * 0.01);
      wheelCtx.stroke();
    }

    for (let i = 0; i < WHEEL_SLICE_COUNT; i++) {
      const start = (i * WHEEL_SLICE_DEG - 90) * Math.PI / 180;
      const end = ((i + 1) * WHEEL_SLICE_DEG - 90) * Math.PI / 180;
      const isApple = WHEEL_SLICES[i] === "apple";
      const isHighlight = hl === i;
      wheelCtx.beginPath();
      wheelCtx.arc(0, 0, outerR, start, end);
      wheelCtx.arc(0, 0, rimInnerR, end, start, true);
      wheelCtx.closePath();
      wheelCtx.fillStyle = isHighlight
        ? (isApple ? "rgba(80, 200, 120, 0.55)" : "rgba(200, 70, 60, 0.55)")
        : (isApple ? "rgba(36, 110, 62, 0.14)" : "rgba(100, 28, 24, 0.14)");
      wheelCtx.fill();
      if (isHighlight) {
        wheelCtx.strokeStyle = "rgba(255, 230, 140, 0.95)";
        wheelCtx.lineWidth = Math.max(3, size * 0.01);
        wheelCtx.stroke();
      }
    }

    for (let i = 0; i < WHEEL_SLICE_COUNT; i++) {
      const start = (i * WHEEL_SLICE_DEG - 90) * Math.PI / 180;
      const end = ((i + 1) * WHEEL_SLICE_DEG - 90) * Math.PI / 180;
      const mid = (start + end) / 2;
      const ix = Math.cos(mid) * iconR;
      const iy = Math.sin(mid) * iconR;
      const isApple = WHEEL_SLICES[i] === "apple";
      const icon = isApple
        ? (wheelAppleSprite || (wheelAssetsReady.apple ? wheelAppleImg : null))
        : (wheelSkullSprite || (wheelAssetsReady.skull ? wheelSkullImg : null));
      const isHighlight = hl === i;
      const drawIconSize = isHighlight ? iconSize * 1.12 : iconSize;
      if (icon && (icon.naturalWidth || icon.width)) {
        wheelCtx.save();
        wheelCtx.translate(ix, iy);
        const iconRot = mid + Math.PI / 2;
        wheelCtx.rotate(iconRot);
        wheelCtx.shadowColor = isHighlight ? "rgba(255, 220, 120, 0.85)" : "rgba(0, 0, 0, 0.55)";
        wheelCtx.shadowBlur = isHighlight ? size * 0.028 : size * 0.012;
        wheelCtx.drawImage(icon, -drawIconSize / 2, -drawIconSize / 2, drawIconSize, drawIconSize);
        wheelCtx.restore();
      } else {
        wheelCtx.fillStyle = isApple ? "#c44" : "#ddd";
        wheelCtx.font = "bold " + Math.round(iconSize * 0.55) + "px sans-serif";
        wheelCtx.textAlign = "center";
        wheelCtx.textBaseline = "middle";
        wheelCtx.fillText(isApple ? "🍎" : "☠", ix, iy);
      }
    }

    wheelCtx.restore();

    wheelCtx.beginPath();
    wheelCtx.arc(cx, cy, outerR + size * 0.008, 0, Math.PI * 2);
    wheelCtx.strokeStyle = "rgba(232, 197, 71, 0.65)";
    wheelCtx.lineWidth = Math.max(4, size * 0.012);
    wheelCtx.stroke();
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /** Single smooth ease-out: velocity falls continuously from fast start to zero at landing. */
  function wheelSpinEase(t) {
    const clamped = Math.min(1, Math.max(0, t));
    return 1 - Math.pow(1 - clamped, 3.6);
  }

  function clearWheelResultReveal() {
    wheelResultReveal.textContent = "";
    wheelResultReveal.className = "wheel-result-reveal";
  }

  function showWheelResultReveal(sliceIndex) {
    stopClapsLoop();
    const outcome = WHEEL_SLICES[sliceIndex];
    state.wheelRevealing = true;
    if (state.wheelMode === "buyin") {
      setBuyinPhase(BuyinPhase.REVEALING, "showWheelResultReveal");
    } else {
      setRoundPhase(RoundPhase.WHEEL_REVEALING, "showWheelResultReveal");
    }
    state.wheelRevealSlice = sliceIndex;
    wheelResultReveal.textContent = outcome === "apple" ? "Ahoy!" : "Skulls";
    wheelResultReveal.className = "wheel-result-reveal show "
      + (outcome === "apple" ? "is-apple" : "is-skull");
    playWheelLandSfx(outcome);
    drawWheelFrame(state.wheelRotation, sliceIndex);
  }

  function hideWheelResultReveal() {
    state.wheelRevealing = false;
    state.wheelRevealSlice = null;
    clearWheelResultReveal();
  }

  function updateWheelModalCopy() {
    if (state.wheelMode === "streak") {
      wheelTitle.textContent = "Ship's Wheel Gamble";
      wheelSub.textContent = "5 hits · 32× — take the loot or spin!";
      const pot = state.roundBet * STREAK_SAFE_MULT;
      wheelStreakInfo.textContent = "At stake: " + formatMoney(pot)
        + " · Gamble for " + STREAK_JACKPOT_MULT + "× (1-in-3)";
      wheelStreakInfo.style.display = "block";
      wheelActions.className = "wheel-actions streak";
      wheelActions.style.display = "grid";
      btnWheelTake.textContent = "Take " + STREAK_SAFE_MULT + "×";
      btnWheelGamble.textContent = "Gamble";
    } else if (state.wheelMode === "buyin") {
      wheelTitle.textContent = "";
      wheelSub.textContent = "";
      wheelStreakInfo.textContent = "";
      wheelStreakInfo.style.display = "none";
      wheelActions.style.display = "none";
    }
  }

  /** Short drumroll + cheer sting for 5-hit wheel intro (SFX only — no music ducking). */
  function playWheelStreakStinger() {
    if (effectiveSfxVolume() <= 0) return;
    unlockSfx();
    const ctx = getSfxCtx();
    const dest = masterGain || ctx.destination;
    const t0 = ctx.currentTime + 0.02;
    const vol = effectiveSfxVolume() * 0.42;

    for (let i = 0; i < 9; i++) {
      const hitAt = t0 + i * 0.075;
      const osc = ctx.createOscillator();
      const hitGain = ctx.createGain();
      osc.type = i < 6 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(90 + i * 14, hitAt);
      hitGain.gain.setValueAtTime(vol * (i < 6 ? 0.55 : 0.75), hitAt);
      hitGain.gain.exponentialRampToValueAtTime(0.001, hitAt + 0.14);
      osc.connect(hitGain);
      hitGain.connect(dest);
      osc.start(hitAt);
      osc.stop(hitAt + 0.16);
    }

    setTimeout(() => {
      if (effectiveSfxVolume() <= 0) return;
      try {
        sfxCashOut.pause();
        sfxCashOut.currentTime = 0;
        sfxCashOut.volume = Math.min(1, effectiveSfxVolume() * 0.55);
        sfxCashOut.play().catch(() => {});
      } catch (e) { /* ignore */ }
    }, 620);
  }

  function clearWheelStreakIntro() {
    clearTimeout(state.wheelIntroTimer);
    state.wheelIntroTimer = null;
    state.wheelIntro = false;
    wheelModal.classList.remove("streak-intro", "intro-ready");
    if (sceneStage) sceneStage.classList.remove("wheel-gold-pulse");
  }

  function finishWheelStreakIntro() {
    state.wheelIntro = false;
    state.wheelIntroTimer = null;
    wheelModal.classList.remove("streak-intro");
    wheelModal.classList.add("intro-ready");
    if (sceneStage) sceneStage.classList.remove("wheel-gold-pulse");
    finishWheelModalOpen();
  }

  function lockWheelStageSize() {
    const stage = wheelCanvas ? wheelCanvas.parentElement : null;
    if (!stage || stage.dataset.sizeLocked === "1") return;
    const rect = stage.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    stage.style.width = rect.width + "px";
    stage.style.height = rect.height + "px";
    stage.style.flex = "none";
    stage.dataset.sizeLocked = "1";
  }

  function unlockWheelStageSize() {
    const stage = wheelCanvas ? wheelCanvas.parentElement : null;
    if (!stage) return;
    stage.style.width = "";
    stage.style.height = "";
    stage.style.flex = "";
    delete stage.dataset.sizeLocked;
  }

  function clearWheelSpinUi() {
    wheelModalInner.classList.remove("wheel-spinning", "wheel-revealing");
    unlockWheelStageSize();
  }

  function redrawWheelCanvas() {
    resizeWheelCanvas();
    drawWheelFrame(state.wheelRotation || 0, state.wheelRevealSlice);
  }

  function finishWheelModalOpen() {
    hideWheelResultReveal();
    state.wheelRotation = state.wheelRotation || 0;
    unlockWheelStageSize();
    wheelModalInner.classList.remove("wheel-spinning", "wheel-revealing");
    requestAnimationFrame(() => {
      redrawWheelCanvas();
      requestAnimationFrame(redrawWheelCanvas);
    });
    updateUI();
  }

  function openWheelModal() {
    updateWheelModalCopy();
    clearWheelStreakIntro();
    hideWheelResultReveal();
    state.wheelRotation = state.wheelRotation || 0;
    wheelModalInner.classList.remove("wheel-spinning");
    wheelModal.classList.add("open");
    requestAnimationFrame(() => {
      redrawWheelCanvas();
    });

    const runStreakIntro = state.wheelMode === "streak" && state.wheelOffer;
    if (runStreakIntro) {
      state.wheelIntro = true;
      wheelModal.classList.remove("intro-ready");
      wheelModal.classList.add("streak-intro");
      if (sceneStage) sceneStage.classList.add("wheel-gold-pulse");
      try { playWheelStreakStinger(); } catch (e) { /* ignore */ }
      clearTimeout(state.wheelIntroTimer);
      state.wheelIntroTimer = setTimeout(finishWheelStreakIntro, WHEEL_STREAK_INTRO_MS);
      updateUI();
      return;
    }

    finishWheelModalOpen();
  }

  function closeWheelModal() {
    clearWheelStreakIntro();
    wheelModal.classList.remove("open");
    clearWheelSpinUi();
    hideWheelResultReveal();
    updateUI();
  }

  function takeWheelLoot() {
    if (!canTakeWheel()) return;
    stopClapsLoop();
    state.wheelOffer = false;
    state.wheelMode = null;
    closeWheelModal();
    cashOut();
  }

  async function spinWheel() {
    if (state.wheelSpinning) return;
    if (state.wheelMode !== "streak" && state.wheelMode !== "buyin") return;

    unlockSfx();
    ensureMusicPlaying();
    if (state.wheelMode === "streak" && state.wheelOffer) {
      state.wheelStreakGambled = true;
      state.wheelOffer = false;
      setRoundPhase(RoundPhase.GAMBLED, "gambleCommit");
      stopClapsLoop();
    }
    lockWheelStageSize();
    state.wheelSpinning = true;
    if (state.wheelMode === "buyin") {
      setBuyinPhase(BuyinPhase.SPINNING, "spinWheel");
    } else {
      setRoundPhase(RoundPhase.WHEEL_SPINNING, "spinWheel");
    }
    wheelModalInner.classList.add("wheel-spinning");
    wheelModalInner.classList.remove("wheel-revealing");
    clearWheelResultReveal();
    if (state.wheelMode === "buyin") {
      wheelTitle.textContent = "";
      wheelSub.textContent = "";
      wheelStreakInfo.textContent = "";
      wheelStreakInfo.style.display = "none";
    }
    updateUI();

    let slice;
    try {
      slice = await rollWheelSlice();
    } catch (err) {
      state.wheelSpinning = false;
      stopClapsLoop();
      clearWheelSpinUi();
      updateUI();
      throw err;
    }
    state.wheelSlice = slice;

    const fullTurns = 5 + Math.floor(Math.random() * 3);
    const targetRot = wheelRotationForSlice(slice);
    const from = state.wheelRotation;
    const minTravel = fullTurns * 360;
    let to = from + minTravel;
    let endMod = ((to % 360) + 360) % 360;
    let adjust = targetRot - endMod;
    if (adjust < 0) adjust += 360;
    to += adjust;
    while (to < from + 720) to += 360;

    state.wheelSpinStart = performance.now();
    state.wheelSpinFrom = from;
    state.wheelSpinTo = to;

    playWheelSpinSfx();
    if (state.wheelMode === "streak" && clapsLooping) {
      clapsLoopVol = STREAK_CLAPS_VOL[STREAK_TRIGGER_HITS];
    }

    return new Promise((resolve) => {
      function tick(now) {
        const elapsed = now - state.wheelSpinStart;
        const t = Math.min(1, elapsed / WHEEL_SPIN_MS);
        const eased = wheelSpinEase(t);
        if (clapsLooping && state.wheelMode === "streak") {
          const rampVol = STREAK_CLAPS_VOL[STREAK_TRIGGER_HITS]
            + (STREAK_CLAPS_PEAK_VOL - STREAK_CLAPS_VOL[STREAK_TRIGGER_HITS]) * eased;
          clapsLoopVol = rampVol;
          sfxStreakClaps.volume = Math.min(1, effectiveSfxVolume() * rampVol);
        }
        state.wheelRotation = state.wheelSpinFrom + (state.wheelSpinTo - state.wheelSpinFrom) * eased;
        drawWheelFrame(state.wheelRotation);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          wheelModalInner.classList.remove("wheel-spinning");
          wheelModalInner.classList.add("wheel-revealing");
          showWheelResultReveal(slice);
          resolve();
        }
      }
      requestAnimationFrame(tick);
    }).then(() => new Promise((resolve) => {
      setTimeout(resolve, WHEEL_RESULT_HOLD_MS);
    })).then(() => {
      clearWheelSpinUi();
      hideWheelResultReveal();
      resolveWheelOutcome();
    });
  }

  function gambleWheel() {
    if (!canGambleWheel()) return;
    spinWheel().catch((err) => {
      console.error("Wheel spin failed:", err);
      state.wheelSpinning = false;
      if (state.wheelMode === "buyin") {
        setBuyinPhase(null, "spinFailed");
      } else if (state.wheelStreakGambled) {
        setRoundPhase(RoundPhase.GAMBLED, "spinFailed");
      } else {
        setRoundPhase(RoundPhase.WHEEL_OFFER, "spinFailed");
      }
      clearWheelSpinUi();
      updateUI();
      showToast("Wheel spin failed — try again");
    });
  }

  function resolveWheelStreakApple() {
    const win = Math.round(state.roundBet * STREAK_JACKPOT_MULT * 100) / 100;
    state.wheelMode = null;
    playWheelCinematic("hit", {
      finalTitle: "Bullseye!",
      finalSub: STREAK_JACKPOT_MULT + "× · " + formatMoney(win),
      finalType: "hit",
      onFinish: () => {
        playSfx(sfxCashOut);
        pushRoundHistory("win", formatHistoryMult(STREAK_JACKPOT_MULT));
        state.balance = Math.round((state.balance + win) * 100) / 100;
        pulseBalance();
        advanceSeason();
        resetRound();
      }
    });
  }

  function resolveWheelStreakSkull() {
    state.wheelMode = null;
    playWheelCinematic("hitPerson", {
      finalTitle: "Better luck next time!",
      finalSub: "",
      finalType: "miss",
      onFinish: () => {
        endRoundLost();
      }
    });
  }

  function resolveWheelBuyinApple() {
    const prize = Math.round(state.bet * BUYIN_APPLE_MULT * 100) / 100;
    state.wheelMode = null;
    playWheelCinematic("hit", {
      finalTitle: "Bullseye!",
      finalSub: "Won " + formatMoney(prize),
      finalType: "hit",
      onFinish: () => {
        playSfx(sfxCashOut);
        pushRoundHistory("win", formatHistoryMult(BUYIN_APPLE_MULT));
        state.balance = Math.round((state.balance + prize) * 100) / 100;
        pulseBalance();
        state.wheelBuyinPaid = 0;
        setBuyinPhase(null, "buyinAppleWin");
        revealServerSeed();
        updateUI();
      }
    });
  }

  function resolveWheelBuyinSkull() {
    const lost = state.wheelBuyinPaid;
    state.wheelMode = null;
    playWheelCinematic("hitPerson", {
      finalTitle: "Better luck next time!",
      finalSub: lost > 0 ? "Lost " + formatMoney(lost) : "",
      finalType: "miss",
      onFinish: () => {
        pushRoundHistory("loss", "LOSS");
        state.wheelBuyinPaid = 0;
        setBuyinPhase(null, "buyinSkullLoss");
        revealServerSeed();
        updateUI();
      }
    });
  }

  function playWheelCinematic(outcome, opts) {
    const { finalTitle, finalSub, finalType, onFinish } = opts;
    closeWheelModal();
    hideWheelResultReveal();
    state.wheelOffer = false;
    state.wheelSpinning = false;
    state.wheelCinematic = true;
    if (state.wheelMode === "buyin" || state.wheelBuyinPaid > 0) {
      setBuyinPhase(BuyinPhase.CINEMATIC, "playWheelCinematic");
    } else {
      setRoundPhase(RoundPhase.WHEEL_CINEMATIC, "playWheelCinematic");
    }
    stopWheelAppleCinematicVideo();

    state.faceCensored = false;
    state.faceHurt = false;
    state.faceHurtVariant = "patch";
    state.appleDamaged = false;
    state.appleWobble = 0;
    state.flinch = 0;
    state.eyesOpen = true;
    state.blinkEnd = 0;
    clearTimeout(state.faceCensorTimer);
    state.faceCensorTimer = null;

    let wheelVideoPromise = null;
    if (outcome === "hit") {
      wheelVideoPromise = startWheelAppleCinematicVideo();
    }

    startFlight(outcome, {
      cinematic: true,
      wheelVideoPromise,
      onCinematicComplete: () => {
        stopWheelAppleCinematicVideo();
        showOverlay(finalType, finalTitle, finalSub || "", WHEEL_CINEMATIC_FINAL_MS);
        setTimeout(() => {
          state.wheelCinematic = false;
          if (onFinish) onFinish();
          updateUI();
        }, WHEEL_CINEMATIC_FINAL_MS);
      }
    });
    updateUI();
  }

  function resolveWheelOutcome() {
    const outcome = WHEEL_SLICES[state.wheelSlice];
    if (state.wheelMode === "streak") {
      if (outcome === "apple") resolveWheelStreakApple();
      else resolveWheelStreakSkull();
    } else if (state.wheelMode === "buyin") {
      if (outcome === "apple") resolveWheelBuyinApple();
      else resolveWheelBuyinSkull();
    }
  }

  function promptWheelBuyin() {
    if (!canBuyIn()) return;
    if (wheelBuyinConfirmModal.classList.contains("open")) return;
    const cost = wheelBuyinCostAmount();
    if (state.balance < cost - 1e-9) {
      showToast("Need " + formatMoney(cost) + " to play");
      return;
    }
    openWheelBuyinConfirm();
  }

  async function confirmWheelBuyin() {
    if (state.roundActive || state.animating || state.wheelSpinning || state.wheelOffer) return;
    if (state.roundPhase !== RoundPhase.IDLE) return;
    const cost = wheelBuyinCostAmount();
    if (state.balance < cost - 1e-9) {
      showToast("Need " + formatMoney(cost) + " to play");
      closeWheelBuyinConfirm();
      return;
    }
    closeWheelBuyinConfirm();
    unlockSfx();
    ensureMusicPlaying();
    if (fairness.revealed) await commitServerSeed();
    state.balance = Math.round((state.balance - cost) * 100) / 100;
    state.wheelBuyinPaid = cost;
    pulseBalance();
    state.wheelMode = "buyin";
    openWheelModal();
    spinWheel().catch((err) => {
      console.error("Wheel spin failed:", err);
      state.wheelSpinning = false;
      setBuyinPhase(null, "buyinSpinFailed");
      clearWheelSpinUi();
      state.balance = Math.round((state.balance + cost) * 100) / 100;
      state.wheelBuyinPaid = 0;
      state.wheelMode = null;
      closeWheelModal();
      pulseBalance();
      updateUI();
      showToast("Wheel spin failed — bet refunded");
    });
  }

  function pulseBalance() {
    balanceDisplay.classList.add("pulse");
    setTimeout(() => balanceDisplay.classList.remove("pulse"), 220);
  }

  function updateUI() {
    balanceDisplay.textContent = formatMoney(state.balance);
    multDisplay.textContent = state.multiplier.toFixed(2) + "×";
    multDisplay.className = "value mult"
      + (state.hits >= 4 ? " mult-streak-hot" : state.hits >= 3 ? " mult-streak-warm" : "");
    const pot = state.roundActive ? state.roundBet * state.multiplier : 0;
    potentialDisplay.textContent = formatMoney(pot);
    betInput.value = state.bet.toFixed(2);
    const wheelBlocked = isWheelBlockedForBetting();
    betInput.disabled = state.roundActive || state.animating || wheelBlocked;
    document.querySelectorAll(".btn-quick").forEach((b) => {
      b.disabled = state.roundActive || state.animating || wheelBlocked;
    });
    btnShoot.disabled = !canShoot();
    btnCash.disabled = !canCashOut();
    const buyinCost = wheelBuyinCostAmount();
    btnWheelBuyin.disabled = !canBuyIn();
    const wheelChoiceLocked = state.wheelIntro || state.wheelSpinning
      || !canTakeWheel() && !canGambleWheel();
    btnWheelTake.disabled = !canTakeWheel();
    btnWheelGamble.disabled = !canGambleWheel();
  }

  function advanceSeason() {
    state.progress += SEASON_STEP;
    if (state.progress >= 100) {
      state.progress = 0;
      state.tavernIndex = (state.tavernIndex + 1) % TAVERN_NAMES.length;
    }
  }

  function showOverlay(type, title, sub, durationMs) {
    resultBanner.className = "result-banner show " + type;
    resultTitle.className = "result-title " + type;
    resultTitle.textContent = title;
    resultSub.textContent = sub || "";
    clearTimeout(state.overlayTimer);
    state.overlayTimer = setTimeout(() => {
      resultBanner.className = "result-banner";
      resultTitle.className = "result-title";
      resultTitle.textContent = "Ready";
      resultSub.textContent = "";
    }, durationMs != null ? durationMs : OVERLAY_MS);
  }

  function resetRound() {
    revealServerSeed();
    state.roundActive = false;
    state.roundBet = 0;
    state.hits = 0;
    state.multiplier = 1;
    state.stuckArrows = [];
    state.thumpStars = [];
    state.flight = null;
    state.arrow = null;
    state.arrowTrail = [];
    state.animating = false;
    state.handPull = 0;
    state.flinch = 0;
    state.appleDamaged = false;
    state.appleWobble = 0;
    state.wheelOffer = false;
    state.wheelStreakGambled = false;
    state.wheelMode = null;
    state.wheelSpinning = false;
    state.wheelSlice = null;
    state.wheelBuyinPaid = 0;
    state.wheelRevealing = false;
    state.wheelRevealSlice = null;
    state.wheelCinematic = false;
    state.wheelIntro = false;
    clearTimeout(state.wheelIntroTimer);
    state.wheelIntroTimer = null;
    stopStreakTensionLayer();
    stopClapsLoop();
    stopWheelAppleCinematicVideo();
    setBuyinPhase(null, "resetRound");
    setRoundPhase(RoundPhase.IDLE, "resetRound");
    // Keep face censor through the umph SFX — cleared by timer / next shot
    updateUI();
  }

  function endRoundLost() {
    setRoundPhase(RoundPhase.ENDED, "endRoundLost");
    pushRoundHistory("loss", "LOSS");
    advanceSeason();
    resetRound();
  }

  function spawnParticles(x, y, count, colors) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 5;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 2.5,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        star: Math.random() < 0.45
      });
    }
  }

  function getCharSway() {
    const flinchOff = state.flinch * 6;
    return Math.sin(state.charSway) * 3.5 + Math.sin(state.charShiver) * 1.6 + flinchOff;
  }

  function spawnThump(x, y, scale) {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.45;
      state.thumpStars.push({
        x, y,
        vx: Math.cos(a) * 2.5,
        vy: Math.sin(a) * 2.5 - 1,
        life: 0.7,
        size: 10 + i * 2,
        rot: Math.random() * Math.PI
      });
    }
  }

  function ensureBgVideoPlaying() {
    if (!bgVideoReady && bgVideo.readyState < 2) return;
    if (bgVideo.paused) {
      const p = bgVideo.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  }

  function startWheelAppleCinematicVideo() {
    if (!wheelAppleVideoReady) return Promise.resolve();

    state.wheelAppleVideoActive = true;
    unlockSfx();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(fallbackTimer);
        bgWheelAppleVideo.removeEventListener("ended", onEnded);
        resolve();
      };
      const onEnded = () => finish();
      const durSec = Number.isFinite(bgWheelAppleVideo.duration) && bgWheelAppleVideo.duration > 0
        ? bgWheelAppleVideo.duration
        : 8;
      const fallbackTimer = setTimeout(finish, durSec * 1000 + 500);

      bgWheelAppleVideo.addEventListener("ended", onEnded, { once: true });
      try {
        bgWheelAppleVideo.pause();
        bgWheelAppleVideo.currentTime = 0;
        const p = bgWheelAppleVideo.play();
        if (p && typeof p.catch === "function") p.catch(() => finish());
      } catch (e) {
        finish();
      }
    });
  }

  function stopWheelAppleCinematicVideo() {
    state.wheelAppleVideoActive = false;
    try {
      bgWheelAppleVideo.pause();
      bgWheelAppleVideo.currentTime = 0;
    } catch (e) { /* ignore */ }
  }

  function updateCharacterBlink(now) {
    if (state.faceHurt || state.appleDamaged || state.faceCensored) return;
    if (!state.blinkNextAt) state.blinkNextAt = now + 1400 + Math.random() * 900;
    if (!state.blinkEnd && now >= state.blinkNextAt) {
      state.eyesOpen = false;
      state.blinkEnd = now + 150;
      state.blinkNextAt = now + 2800 + Math.random() * 1400;
    }
    if (state.blinkEnd && now >= state.blinkEnd) {
      state.eyesOpen = true;
      state.blinkEnd = 0;
    }
  }

  function drawBackground(layout) {
    const { w, h } = layout;
    const anchorBottom = typeof window !== "undefined"
      && window.matchMedia("(max-width: 640px)").matches;

    function drawCover(img, iw, ih) {
      const scale = Math.max(w / Math.max(iw, 1), h / Math.max(ih, 1));
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (w - dw) / 2;
      const dy = anchorBottom ? h - dh : (h - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    if (state.wheelAppleVideoActive
      && wheelAppleVideoReady
      && bgWheelAppleVideo.readyState >= 2
      && bgWheelAppleVideo.videoWidth > 0) {
      drawCover(bgWheelAppleVideo, bgWheelAppleVideo.videoWidth, bgWheelAppleVideo.videoHeight);
      return;
    }

    ensureBgVideoPlaying();
    if (bgVideoReady && bgVideo.readyState >= 2 && bgVideo.videoWidth > 0) {
      drawCover(bgVideo, bgVideo.videoWidth, bgVideo.videoHeight);
      return;
    }

    const sprite = bgSprite || (assetsReady.bg ? bgImg : null);
    if (sprite) {
      drawCover(sprite, sprite.naturalWidth || sprite.width, sprite.naturalHeight || sprite.height);
    } else {
      ctx.fillStyle = "#1a1008";
      ctx.fillRect(0, 0, w, h);
    }
  }

  function getPistolPose(layout) {
    const narrow = layout.w < 440 || (typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);
    const sceneAspect = layout.w / Math.max(layout.h, 1);
    const shortScene = sceneAspect > 1.08;
    let bowScale = narrow ? 0.72 : 0.88;
    if (shortScene) bowScale *= 0.88;
    const bowW = layout.w * bowScale;
    const sprite = bowSprite || bowImg;
    const aspect = sprite
      ? (sprite.naturalWidth || sprite.width) / Math.max(sprite.naturalHeight || sprite.height || 1, 1)
      : 1;
    const bowH = bowW / Math.max(aspect, 0.01);
    const px = layout.w * 0.5;
    // Anchor to bottom edge so width-based gun size doesn't float up on short canvases
    const py = layout.h + bowH * 0.16;
    // Sharp upward pop on fire (no tip/tilt)
    const kick = Math.max(0, state.pistolRecoil || 0);
    const recoilY = -layout.h * 0.04 * kick;
    const rot = 0;
    const drawX = -bowW * 0.5;
    const drawY = -bowH * 0.82;
    // Nest boom on the barrel mouth so pistol can overlap it
    const localX = 0;
    const localY = drawY + bowH * 0.22;
    return {
      px, py: py + recoilY, rot, bowW, bowH, drawX, drawY,
      muzzleX: px + localX,
      muzzleY: py + recoilY + localY
    };
  }

  function drawPOVHand(layout, pullAmount, hideArrow) {
    const sprite = bowSprite || (assetsReady.bow ? bowImg : null);
    const pose = getPistolPose(layout);

    // Boom first (under the gun), then pistol on top
    if (state.muzzleFlash > 0) {
      const boom = muzzleSprite || (assetsReady.muzzle ? muzzleImg : null);
      if (boom) {
        const t = state.muzzleFlash;
        const size = layout.w * (0.3 + (1 - t) * 0.08);
        const iw = boom.naturalWidth || boom.width;
        const ih = boom.naturalHeight || boom.height;
        const aspect = iw / Math.max(ih, 1);
        let dw = size;
        let dh = size;
        if (aspect > 1) dh = size / aspect;
        else dw = size * aspect;
        ctx.save();
        ctx.globalAlpha = Math.min(1, t * 1.45);
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(boom, pose.muzzleX - dw * 0.5, pose.muzzleY - dh * 0.65, dw, dh);
        ctx.restore();
      }
    }

    if (sprite) {
      ctx.save();
      ctx.translate(pose.px, pose.py);
      ctx.drawImage(sprite, pose.drawX, pose.drawY, pose.bowW, pose.bowH);
      ctx.restore();
    }
    void pullAmount;
    void hideArrow;
  }

  function getCharacterFaceBox(layout) {
    const sway = getCharSway();
    const bob = Math.sin(state.charSway * 2) * 0.8 + Math.sin(state.shoulderTwitch) * 0.6;
    const drawH = layout.charH;
    const charTop = layout.feetY - drawH + bob;
    // Full face coverage — hairline to chin (dropped slightly for chin)
    const cx = layout.cx + sway;
    const cy = charTop + drawH * 0.20;
    const w = drawH * 0.36;
    const h = drawH * 0.42;
    return { cx, cy, w, h, x: cx - w * 0.5, y: cy - h * 0.42, sway, bob };
  }

  function drawFaceMosaic(layout) {
    if (!state.faceCensored) return;
    const face = getCharacterFaceBox(layout);
    // Tight square on the face — just brushes the apple, doesn't swallow it
    const side = face.w * 0.92;
    const cx = face.cx;
    const cy = face.cy - layout.appleR * 0.08;
    const w = side;
    const h = side;
    const x = cx - w * 0.5;
    const y = cy - h * 0.48;
    const cols = 10;
    const rows = 10;

    const dpr = state.dpr || 1;
    const sx = Math.max(0, Math.floor(x * dpr));
    const sy = Math.max(0, Math.floor(y * dpr));
    const sw = Math.max(1, Math.min(Math.floor(w * dpr), canvas.width - sx));
    const sh = Math.max(1, Math.min(Math.floor(h * dpr), canvas.height - sy));
    if (sw < 2 || sh < 2) return;

    const tmp = document.createElement("canvas");
    tmp.width = cols;
    tmp.height = rows;
    const tctx = tmp.getContext("2d");
    tctx.imageSmoothingEnabled = false;
    try {
      tctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, cols, rows);
    } catch (e) {
      return;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(tmp, 0, 0, cols, rows, x, y, w, h);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= cols; i++) {
      const gx = x + (i / cols) * w;
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }
    for (let j = 0; j <= rows; j++) {
      const gy = y + (j / rows) * h;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** POV arrow shaft pointing toward victim. */
  function drawPOVArrowShaft(x, y, angle, layout, scaleMul, lengthFrac) {
    const s = (layout.h / 400) * (scaleMul || 1);
    const len = layout.h * (lengthFrac || 0.5);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.strokeStyle = "#7a5a18";
    ctx.lineWidth = 5 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len);
    ctx.stroke();

    ctx.fillStyle = "#ccc";
    ctx.beginPath();
    ctx.moveTo(-5 * s, -len);
    ctx.lineTo(5 * s, -len);
    ctx.lineTo(0, -len - 14 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#dd3333";
    ctx.beginPath();
    ctx.moveTo(-8 * s, 6 * s);
    ctx.lineTo(-14 * s, 18 * s);
    ctx.lineTo(-4 * s, 10 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8 * s, 6 * s);
    ctx.lineTo(14 * s, 18 * s);
    ctx.lineTo(4 * s, 10 * s);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }


  function drawHumanCharacter(layout, dt, now) {
    const sway = getCharSway();
    const { headX } = layout;
    const hx = headX + sway;

    // Background.png already has the tavern character baked in
    if (!SCENE_HAS_CHARACTER) {
      const openSprite = charSprite || (assetsReady.character ? characterImg : null);
      const closedSprite = charBlinkSprite || (assetsReady.characterBlink ? characterBlinkImg : null);
      const hitSprite = charHitSprite || (assetsReady.characterHit ? characterHitImg : null);
      const loseSprite = getLoseSprite(state.faceHurtVariant);
      const sprite = state.faceHurt
        ? (loseSprite || openSprite)
        : state.appleDamaged
          ? (hitSprite || openSprite)
          : (state.eyesOpen ? (openSprite || closedSprite) : (closedSprite || openSprite));
      const { cx, charH, feetY } = layout;
      if (sprite) {
        const iw = sprite.naturalWidth || sprite.width;
        const ih = sprite.naturalHeight || sprite.height;
        const aspect = iw / Math.max(ih, 1);
        const drawH = charH;
        const drawW = drawH * aspect;
        const bob = Math.sin(state.charSway * 2) * 0.8 + Math.sin(state.shoulderTwitch) * 0.6;
        ctx.save();
        // Feet planted below frame — legs cropped by canvas edge
        ctx.translate(cx + sway, feetY);
        if (state.flinch > 0.02) {
          ctx.rotate(state.flinch * 0.08);
        }
        ctx.drawImage(sprite, -drawW * 0.5, -drawH + bob, drawW, drawH);
        ctx.restore();
      }
    }

    layout._spriteHx = hx;
    void now;
  }

  function drawApple(layout) {
    const { appleX, appleY, appleR, charH } = layout;
    const s = charH / 280;
    const wobble = state.appleWobble > 0 ? Math.sin(state.appleWobble) * 0.18 : 0;
    const sway = getCharSway();
    const bob = Math.sin(state.charSway * 2) * 0.8 + Math.sin(state.shoulderTwitch) * 0.6;
    const ax = appleX + sway + Math.sin(state.appleWobble * 0.8) * 3 * s;
    // Bandage wrap sits taller — nudge apple down so it rests on the wraps
    const bandageNudge = (state.faceHurt && state.faceHurtVariant === "bandage")
      ? appleR * 0.45
      : 0;
    const ay = appleY + bob + bandageNudge;
    const sprite = state.appleDamaged
      ? (appleHitSprite || (assetsReady.appleHit ? appleHitImg : null))
      : (appleSprite || (assetsReady.apple ? appleImg : null));

    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(wobble);

    if (sprite) {
      const iw = sprite.naturalWidth || sprite.width;
      const ih = sprite.naturalHeight || sprite.height;
      const size = appleR * 2.85;
      const aspect = iw / Math.max(ih, 1);
      let dw = size;
      let dh = size;
      if (aspect > 1) dh = size / aspect;
      else dw = size * aspect;
      // Anchor so apple rests on the hair
      ctx.drawImage(sprite, -dw * 0.5, -dh * 0.78, dw, dh);
    } else {
      const grad = ctx.createRadialGradient(-appleR * 0.35, -appleR * 0.35, appleR * 0.1, 0, 0, appleR);
      grad.addColorStop(0, "#ff6666");
      grad.addColorStop(0.55, "#ee2222");
      grad.addColorStop(1, "#881010");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, appleR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawStuckArrows(layout) {
    // No arrows — pistol impacts only
    void layout;
  }

  function drawFlyingArrow(layout) {
    // No visible bullet — impact only
    void layout;
    void state.arrow;
  }

  function drawParticles(dt) {
    state.particles = state.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18;
      if (p.life <= 0) return false;
      ctx.globalAlpha = p.life / p.maxLife;
      if (p.star) {
        ctx.font = `bold ${p.size * 2.8}px serif`;
        ctx.fillStyle = p.color;
        ctx.fillText("★", p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return true;
    });
  }

  function drawThumpStars(dt) {
    state.thumpStars = state.thumpStars.filter((st) => {
      st.life -= dt;
      st.x += st.vx;
      st.y += st.vy;
      if (st.life <= 0) return false;
      ctx.globalAlpha = st.life;
      ctx.font = `bold ${st.size}px serif`;
      ctx.fillStyle = "#ffe08a";
      ctx.fillText("★", st.x, st.y);
      ctx.globalAlpha = 1;
      return true;
    });
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function isWheelBonusActive() {
    return wheelModal.classList.contains("open");
  }

  function render(now) {
    const dt = Math.min(0.05, (now - state.lastTime) / 1000 || 0.016);
    state.lastTime = now;

    state.charSway += dt * 1.5;
    state.charShiver += dt * 9;
    state.handFidget += dt * 3.5;
    state.shoulderTwitch += dt * 5.5;
    state.drunkPhase += dt * 2.2;
    if (Math.random() < 0.012) state.drunkNoise = (Math.random() - 0.5) * 8;
    state.drunkNoise *= 0.94;

    if (state.muzzleFlash > 0) {
      state.muzzleFlash = Math.max(0, state.muzzleFlash - dt * 2.8);
    }
    if (state.pistolRecoil > 0) {
      // Fast settle so it reads as a pop, not a slow lean
      state.pistolRecoil = Math.max(0, state.pistolRecoil - dt * 7.5);
    }

    if (state.appleWobble > 0) {
      state.appleWobble += dt * 9;
      if (state.appleWobble > Math.PI * 4) state.appleWobble = 0;
    }

    if (state.flinch > 0.01) state.flinch *= Math.pow(0.9, dt * 60);
    else state.flinch = 0;

    const layout = sceneLayout();
    updateFlight(now, layout);
    updateCharacterBlink(now);

    ctx.clearRect(0, 0, layout.w, layout.h);
    drawBackground(layout);
    if (!isWheelBonusActive()) {
      drawHumanCharacter(layout, dt, now);
      drawApple(layout);
      drawFaceMosaic(layout);
      drawStuckArrows(layout);
      drawPOVHand(layout, state.handPull, !!state.arrow);
      drawFlyingArrow(layout);
      drawParticles(dt);
      drawThumpStars(dt);
    }
  }

  function computeFlightTarget(outcome, layout) {
    const sway = getCharSway();
    const appleX = layout.appleX + sway;
    const appleY = layout.appleY;
    const hx = layout.headX + sway;
    const bob = Math.sin(state.charSway * 2) * 0.8 + Math.sin(state.shoulderTwitch) * 0.6;

    if (outcome === "hit") {
      return {
        endX: appleX + (Math.random() - 0.5) * layout.appleR * 0.25,
        endY: appleY + bob,
        endAngle: -Math.PI / 2
      };
    }

    // Face hit only
    const face = getCharacterFaceBox(layout);
    return {
      endX: face.cx + (Math.random() - 0.5) * face.w * 0.2,
      endY: face.cy + (Math.random() - 0.5) * face.h * 0.15,
      endAngle: (Math.random() - 0.5) * 0.3
    };
  }

  function startFlight(outcome, flightOpts) {
    const opts = flightOpts || {};
    if (state.flight) {
      if (state.flight.settleTimer) clearTimeout(state.flight.settleTimer);
      if (state.flight.loseSfxTimer) clearTimeout(state.flight.loseSfxTimer);
    }
    const layout = sceneLayout();
    const { endX, endY, endAngle } = computeFlightTarget(outcome, layout);

    state.appleDamaged = false;
    state.appleWobble = 0;
    clearTimeout(state.faceCensorTimer);
    state.faceCensorTimer = null;
    state.faceCensored = false;
    state.faceHurt = false;
    state.faceHurtVariant = "patch";
    state.muzzleFlash = 0;
    state.muzzleFired = false;
    state.pistolRecoil = 0;
    unlockSfx();
    state.flight = {
      startTime: performance.now(),
      outcome,
      endX, endY, endAngle,
      landed: false,
      landTime: 0,
      settleTimer: null,
      cinematic: !!opts.cinematic,
      wheelVideoPromise: opts.wheelVideoPromise || null,
      onCinematicComplete: opts.onCinematicComplete || null,
      slowMo: !opts.cinematic && state.hits === STREAK_TRIGGER_HITS - 1
    };
    state.animating = true;
    if (!opts.cinematic) {
      setRoundPhase(RoundPhase.SHOOTING, "startFlight");
    }
    state.arrowTrail = [];
    state.arrow = null;
    updateUI();
  }

  function updateFlight(now, layout) {
    const f = state.flight;
    if (!f) return;

    const elapsed = now - f.startTime;
    const timing = flightTimings(f);
    const total = timing.pullMs + timing.snapMs + timing.flightMs;

    // Hard failsafe: never leave Shoot locked if clocks desync
    if (elapsed > total + timing.settleMs + 2500 && !f._completing) {
      f._completing = true;
      completeFlight(layout);
      return;
    }

    if (f.landed) {
      if (now - f.landTime >= timing.settleMs) {
        completeFlight(layout);
      }
      return;
    }

    if (elapsed < timing.pullMs) {
      state.handPull = elapsed / timing.pullMs;
      state.arrow = null;
      return;
    }

    if (elapsed < timing.pullMs + timing.snapMs) {
      state.handPull = 1 - (elapsed - timing.pullMs) / timing.snapMs;
      state.arrow = null;
      if (!state.muzzleFired) firePistolShot();
      return;
    }

    if (!state.muzzleFired) firePistolShot();

    if (elapsed < total) {
      state.handPull = 0;
      const flyT = (elapsed - timing.pullMs - timing.snapMs) / timing.flightMs;
      const e = 1 - Math.pow(1 - flyT, 2.3);
      const pose = getPOVHandPose(layout, 0);
      const start = { x: pose.nockX, y: pose.nockY };
      const midX = (start.x + f.endX) / 2;
      const midY = (start.y + f.endY) / 2 - layout.h * 0.05;
      const u = 1 - e;
      let x = u * u * start.x + 2 * u * e * midX + e * e * f.endX;
      let y = u * u * start.y + 2 * u * e * midY + e * e * f.endY;
      const wobble = Math.sin(flyT * 24 + elapsed * 0.02) * layout.w * 0.02 * (1 - flyT * 0.5);
      x += wobble;
      const nx = 2 * u * (midX - start.x) + 2 * e * (f.endX - midX);
      const ny = 2 * u * (midY - start.y) + 2 * e * (f.endY - midY);
      state.arrow = {
        x: Number.isFinite(x) ? x : f.endX,
        y: Number.isFinite(y) ? y : f.endY,
        vx: Number.isFinite(nx) ? nx : 0,
        vy: Number.isFinite(ny) ? ny : -1
      };
      state.arrowTrail.push({ x: state.arrow.x, y: state.arrow.y });
      if (state.arrowTrail.length > 14) state.arrowTrail.shift();
      return;
    }

    if (f.landed) return;
    f.landed = true;
    f.landTime = now;
    state.handPull = 0;
    state.arrow = null;
    state.arrowTrail = [];

    if (f.outcome === "hit") {
      state.appleWobble = 0.05;
      state.appleDamaged = true;
      playSfx(sfxAppleHit);
      if (!f.cinematic) onStreakAppleLand(state.hits + 1);
      spawnParticles(f.endX, f.endY, 24, ["#ffe08a", "#ff8a3a", "#6dca8a", "#fff", "#e8c547"]);
    } else {
      state.flinch = 1;
      state.faceHurtVariant = pickLoseVariant();
      state.faceCensored = true;
      if (!f.cinematic) {
        showOverlay("miss", "Try again", "", FACE_CENSOR_MS);
      }
      clearTimeout(state.faceCensorTimer);
      state.faceCensorTimer = setTimeout(() => {
        state.faceCensored = false;
        state.faceHurt = true;
        state.faceCensorTimer = null;
      }, FACE_CENSOR_MS);
      spawnThump(f.endX, f.endY);
      if (!f.loseSfxPlayed) {
        f.loseSfxPlayed = true;
        clearTimeout(f.loseSfxTimer);
        f.loseSfxTimer = setTimeout(() => playLoseExhale(), LOSE_SFX_DELAY_MS);
      }
      spawnParticles(layout.headX, layout.headY, 16, ["#c44", "#822", "#aaa", "#666"]);
      document.body.classList.add("flash-red");
      setTimeout(() => document.body.classList.remove("flash-red"), 500);
    }

    clearTimeout(f.settleTimer);
    f.settleTimer = setTimeout(() => {
      if (state.flight === f) completeFlight(layout);
    }, timing.settleMs);
  }

  function completeFlight(layout) {
    const f = state.flight;
    if (!f) return;
    if (f.settleTimer) clearTimeout(f.settleTimer);
    const wasSlowMo = !!f.slowMo;

    state.flight = null;
    state.arrow = null;
    state.arrowTrail = [];
    state.handPull = 0;
    state.animating = false;

    if (f.cinematic) {
      const done = f.onCinematicComplete;
      if (f.outcome === "hit") {
        const finishHitCinematic = () => { if (done) done(); };
        if (f.wheelVideoPromise) {
          f.wheelVideoPromise.then(finishHitCinematic);
        } else {
          setTimeout(finishHitCinematic, 450);
        }
      } else {
        const shotMs = PULL_MS + SNAP_MS + FLIGHT_MS + SETTLE_MS;
        const wait = Math.max(0, FACE_CENSOR_MS - shotMs) + WHEEL_CINEMATIC_HURT_BEAT_MS;
        setTimeout(() => { if (done) done(); }, wait);
      }
      updateUI();
      return;
    }

    if (f.outcome === "hit") {
      state.hits += 1;
      state.multiplier = Math.pow(2, state.hits);
      onStreakHitRegistered(state.hits);
      showOverlay("hit", "Bullseye!", "+" + state.multiplier.toFixed(2) + "×");
      if (state.hits === STREAK_TRIGGER_HITS) {
        state.wheelOffer = true;
        state.wheelMode = "streak";
        setRoundPhase(RoundPhase.WHEEL_OFFER, "streakTrigger");
        const wheelDelay = wasSlowMo ? 1100 : 450;
        setTimeout(() => openWheelModal(), wheelDelay);
      } else {
        setRoundPhase(RoundPhase.ROUND_ACTIVE, "hit");
      }
    } else {
      stopStreakTensionLayer();
      endRoundLost();
    }
    updateUI();
  }

  function resizeCanvas() {
    const stage = canvas.parentElement;
    const rect = stage.getBoundingClientRect();
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * state.dpr);
    canvas.height = Math.round(rect.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
  }

  async function cheatFifthHit() {
    logPhaseContext("cheatFifthHit:before");
    if (state.animating || state.wheelSpinning || state.wheelCinematic || state.wheelIntro) return;
    if (wheelBuyinConfirmModal.classList.contains("open")) return;

    unlockSfx();
    ensureBgVideoPlaying();
    ensureMusicPlaying();

    if (state.wheelOffer) {
      state.wheelOffer = false;
      state.wheelMode = null;
      closeWheelModal();
    }
    if (state.flight && state.flight.settleTimer) clearTimeout(state.flight.settleTimer);
    state.flight = null;
    state.arrow = null;
    state.arrowTrail = [];
    state.animating = false;
    state.handPull = 0;
    state.flinch = 0;
    state.faceCensored = false;
    state.faceHurt = false;
    clearTimeout(state.faceCensorTimer);
    state.faceCensorTimer = null;

    if (!state.roundActive) {
      if (state.balance < state.bet - 1e-9) {
        showToast("Need balance for test round");
        return;
      }
      if (fairness.revealed) await commitServerSeed();
      state.roundBet = state.bet;
      state.balance = Math.round((state.balance - state.roundBet) * 100) / 100;
      state.roundActive = true;
      setRoundPhase(RoundPhase.ROUND_ACTIVE, "cheatFifthHit");
      pulseBalance();
    }

    state.hits = STREAK_TRIGGER_HITS - 1;
    state.multiplier = Math.pow(2, state.hits);
    state.appleDamaged = false;
    state.appleWobble = 0;
    startStreakTensionLayer();
    updateUI();
    startFlight("hit");
    logPhaseContext("cheatFifthHit:after");
  }

  async function cheatFifthHitWin() {
    logPhaseContext("cheatFifthHitWin:before");
    if (state.animating || state.wheelSpinning || state.wheelCinematic || state.wheelIntro) return;
    if (wheelBuyinConfirmModal.classList.contains("open")) return;

    unlockSfx();
    ensureBgVideoPlaying();
    ensureMusicPlaying();

    if (state.wheelOffer) {
      state.wheelOffer = false;
      state.wheelMode = null;
      closeWheelModal();
    }
    if (state.flight && state.flight.settleTimer) clearTimeout(state.flight.settleTimer);
    if (state.flight && state.flight.loseSfxTimer) clearTimeout(state.flight.loseSfxTimer);
    state.flight = null;
    state.arrow = null;
    state.arrowTrail = [];
    state.animating = false;
    state.handPull = 0;
    state.flinch = 0;
    state.faceCensored = false;
    state.faceHurt = false;
    clearTimeout(state.faceCensorTimer);
    state.faceCensorTimer = null;

    if (!state.roundActive) {
      if (state.balance < state.bet - 1e-9) {
        showToast("Need balance for test round");
        return;
      }
      if (fairness.revealed) await commitServerSeed();
      state.roundBet = state.bet;
      state.balance = Math.round((state.balance - state.roundBet) * 100) / 100;
      state.roundActive = true;
      setRoundPhase(RoundPhase.ROUND_ACTIVE, "cheatFifthHitWin");
      pulseBalance();
    }

    state.hits = STREAK_TRIGGER_HITS;
    state.multiplier = STREAK_SAFE_MULT;
    state.wheelOffer = true;
    state.wheelMode = "streak";
    setRoundPhase(RoundPhase.WHEEL_OFFER, "cheatFifthHitWin");
    state.appleDamaged = false;
    state.appleWobble = 0;
    startStreakTensionLayer();
    cheatForceWheelApple = true;

    clearWheelStreakIntro();
    updateWheelModalCopy();
    hideWheelResultReveal();
    state.wheelRotation = state.wheelRotation || 0;
    clearWheelSpinUi();
    wheelModal.classList.add("open", "intro-ready");
    finishWheelModalOpen();
    updateUI();

    setTimeout(() => {
      if (state.wheelOffer && state.wheelMode === "streak" && !state.wheelSpinning && !state.wheelIntro) {
        gambleWheel();
      }
    }, 350);
    logPhaseContext("cheatFifthHitWin:after");
  }

  async function shoot() {
    if (!canShoot()) return;
    unlockSfx();
    ensureBgVideoPlaying();
    ensureMusicPlaying();
    if (!state.roundActive) {
      if (state.balance < state.bet - 1e-9) {
        showToast("Not enough balance");
        return;
      }
      if (fairness.revealed) await commitServerSeed();
      state.roundBet = state.bet;
      state.balance = Math.round((state.balance - state.roundBet) * 100) / 100;
      state.roundActive = true;
      state.hits = 0;
      state.multiplier = 1;
      setRoundPhase(RoundPhase.ROUND_ACTIVE, "shoot");
      pulseBalance();
    }
    startFlight(await rollOutcome());
  }

  function cashOut() {
    if (!canCashOut()) return;
    if (state.wheelOffer) {
      state.wheelOffer = false;
      state.wheelMode = null;
      closeWheelModal();
    }
    if (state.flight && state.flight.settleTimer) clearTimeout(state.flight.settleTimer);
    state.flight = null;
    state.arrow = null;
    state.arrowTrail = [];
    state.animating = false;
    state.handPull = 0;
    state.flinch = 0;
    setRoundPhase(RoundPhase.ENDED, "cashOut");
    playSfx(sfxCashOut);
    const win = Math.round(state.roundBet * state.multiplier * 100) / 100;
    pushRoundHistory("win", formatHistoryMult(state.multiplier));
    state.balance = Math.round((state.balance + win) * 100) / 100;
    pulseBalance();
    showOverlay("cash", "Cashed out", "You won " + state.multiplier.toFixed(2) + "× · " + formatMoney(win));
    advanceSeason();
    resetRound();
  }

  attachSimulateApi();

  betInput.addEventListener("change", () => {
    state.bet = clampBet(parseFloat(betInput.value));
    updateUI();
  });

  document.querySelectorAll(".btn-quick[data-bet]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.bet = clampBet(parseFloat(btn.dataset.bet));
      updateUI();
    });
  });

  document.getElementById("btnDouble").addEventListener("click", () => {
    state.bet = clampBet(state.bet * 2);
    updateUI();
  });

  btnShoot.addEventListener("click", shoot);
  btnCheatFifthHit.addEventListener("click", () => { cheatFifthHit(); });
  btnCheatFifthHitWin.addEventListener("click", () => { cheatFifthHitWin(); });
  btnCash.addEventListener("click", cashOut);
  btnWheelTake.addEventListener("click", takeWheelLoot);
  btnWheelGamble.addEventListener("click", gambleWheel);
  btnWheelBuyin.addEventListener("click", () => { promptWheelBuyin(); });
  btnWheelBuyinConfirm.addEventListener("click", () => { confirmWheelBuyin(); });
  btnWheelBuyinCancel.addEventListener("click", () => { closeWheelBuyinConfirm(); });
  wheelBuyinConfirmModal.addEventListener("click", (e) => {
    if (e.target === wheelBuyinConfirmModal) closeWheelBuyinConfirm();
  });
  document.getElementById("btnHelp").addEventListener("click", () => openHelp(0));
  document.getElementById("btnCloseHelp").addEventListener("click", closeHelp);
  document.getElementById("btnRtp").addEventListener("click", openRtp);
  document.getElementById("btnCloseRtp").addEventListener("click", closeRtp);
  helpModal.addEventListener("click", (e) => {
    if (e.target === helpModal) closeHelp();
  });
  rtpModal.addEventListener("click", (e) => {
    if (e.target === rtpModal) closeRtp();
  });
  wheelModal.addEventListener("click", (e) => {
    if (e.target === wheelModal && !state.wheelSpinning && state.wheelMode === "buyin") {
      state.wheelMode = null;
      state.wheelBuyinPaid = 0;
      closeWheelModal();
    }
  });
  clientSeedInput.addEventListener("change", () => {
    fairness.clientSeed = clientSeedInput.value.trim() || randomSeed();
    clientSeedInput.value = fairness.clientSeed;
    saveClientSeed();
    updateFairnessUi();
  });

  document.addEventListener("keydown", (e) => {
    const modalOpen = helpModal.classList.contains("open")
      || rtpModal.classList.contains("open")
      || wheelBuyinConfirmModal.classList.contains("open")
      || wheelModal.classList.contains("open");
    if (e.code === "Space" && !modalOpen) {
      e.preventDefault();
      shoot();
    }
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    render(performance.now());
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      resizeCanvas();
      render(performance.now());
    });
  }

  initHelpCarousel();
  resizeCanvas();
  updateUI();
  ensureBgVideoPlaying();
  fairness.clientSeed = loadClientSeed();
  commitServerSeed().then(updateFairnessUi).catch(() => {});
  maybeShowFirstTimeHelp();

  function loop(now) {
    try {
      render(now);
    } catch (err) {
      console.error("Render error:", err);
      // Never let a draw glitch kill the game loop (was freezing Shoot).
      if (state.animating && state.flight) {
        try { completeFlight(sceneLayout()); } catch (e2) {
          state.flight = null;
          state.animating = false;
          state.arrow = null;
          state.handPull = 0;
          if (state.roundPhase === RoundPhase.SHOOTING) {
            setRoundPhase(state.roundActive ? RoundPhase.ROUND_ACTIVE : RoundPhase.IDLE, "renderFailsafe");
          }
          updateUI();
        }
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);