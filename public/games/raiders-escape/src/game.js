/**
 * Raider's Escape — Crash loop: run from boulder, cash out before impact.
 */

import { assets } from './assets.js';
import { Fairness } from './fairness.js';

const WALLET_KEY = 'raiders-escape-balance';
const MUSIC_MUTE_KEY = 'raiders-escape-music-muted';
const SOUND_MUTE_KEY = 'raiders-escape-sound-muted';
const START_BALANCE = 1000;
const MUSIC_VOL = 0.35;
/** Skip quiet intro so the bed starts with audible content. */
const MUSIC_START_S = 3;
const SFX_VOL = 0.55;
/** Rope climb SFX — softer than other one-shots. */
const ROPE_CLIMB_VOL = Math.min(1, (SFX_VOL + 0.15) * 0.7 * 0.8);
const MIN_BET = 1;
const MAX_BET = 500;
const PHASE = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  CRASHED: 'CRASHED',
  CASHED: 'CASHED',
};

const W = 960;
const H = 540;
const FLOOR_Y = 455;
const GROWTH = 0.000075; // multiplier growth per ms → ~9.2s to 2×
const HISTORY_MAX = 12;
/** On-screen runner height (source frames are ~1024px tall). */
const RUNNER_TARGET_H = 230;
const RUNNER_X = W * 0.62;
const BOULDER_PARK_X = 110;
/** How far left of runner center the outstretched hands sit (scared pose). */
const RUNNER_HAND_REACH = 64;
/** Fixed boulder diameter — does not grow with tension. */
const BOULDER_SIZE = 300;
/** Boulder center at impact: cropped rim touches hands. */
const BOULDER_HIT_X = RUNNER_X - RUNNER_HAND_REACH - BOULDER_SIZE / 2;
/** Constant spin rate (rad per ms) — same on run, win roll, and lose roll. */
const BOULDER_SPIN = 0.004;
const CRASH_LUNGE_MS = 520;
/** Mario-style hurt blink while showing scared pose after impact. */
const CRASH_SCARED_FLASH_MS = 1500;
/** Hold die pose on the floor before returning to idle. */
const CRASH_DEAD_HOLD_MS = 1400;
/** Blink period for hurt flash (visible/invisible). */
const HURT_FLASH_PERIOD_MS = 90;
/** Standing scared pose height (matches run scale). */
const SCARED_TARGET_H = 230;
/** Lying die pose width so she reads clearly on the floor. */
const DIE_TARGET_W = 300;
/** Seated start stance height (shorter than standing run). */
const START_TARGET_H = Math.round(RUNNER_TARGET_H * 0.78 * 0.95 * 0.95);
/** Sink start stance so boots / hat meet the floor line. */
const START_FLOOR_SINK = 22;
/** Per-kind size + floor plant for scrolling ruin props. */
const BG_PROP_STYLE = {
  monolith: { h: Math.round(310 * 0.7), sink: 28 },
  stoneHead: { h: Math.round(310 * 0.5), sink: 4 },
  circleStone: { h: Math.round(310 * 0.45), sink: 4 },
  triangleStone: { h: Math.round(310 * 0.55 * 0.7), sink: 6 },
  rectangleStone: { h: Math.round(310 * 0.65), sink: 8 },
};
/** Min / max ms between background prop spawns while running. */
const BG_PROP_GAP_MIN_MS = 5000;
const BG_PROP_GAP_MAX_MS = 10000;
/** Floor parallax factor (matches ground scroll). */
const FLOOR_SCROLL = 0.35;
/** Ruin prop kinds that randomly mix while running. */
const BG_PROP_KINDS = /** @type {const} */ ([
  'monolith',
  'stoneHead',
  'circleStone',
  'triangleStone',
  'rectangleStone',
]);
/** Floor pin for die pose — sink so back/hips meet the stone. */
const DIE_FLOOR_SINK = 38;
/** How far she (and the branch tip) climb by video end (canvas px). */
const ESCAPE_CLIMB_PX = 420;
/** Climb video on-screen height — slightly larger than run so she matches presence. */
const ESCAPE_CLIMB_TARGET_H = Math.round(RUNNER_TARGET_H * 1.1);
/** Gap between branch tip and floor when climb = 0. */
const ESCAPE_BRANCH_GAP = 48;
/** Chunky branch pixel size. */
const ESCAPE_ROPE_PX = 4;
/** End-video playback speed (2 = half duration). */
const ESCAPE_PLAYBACK_RATE = 2;
/**
 * After climb video starts, wait this long before the boulder rolls past.
 */
const ESCAPE_BOULDER_DELAY_MS = 3000;
/** How long the win boulder roll takes (park → past her feet → off-screen). */
const ESCAPE_BOULDER_ROLL_MS = 1800;
/** Pre-climb beat timings (kept snappy). */
const ESCAPE_RUN_MS = 480;
const ESCAPE_STOP_MS = 300;
/** Cash-out escape stages before / during climb video. */
const ESCAPE_STAGE = {
  RUN: 'run',
  STOP: 'stop',
  CLIMB: 'climb',
};
/** Run flipbook — constant rate so pace never telegraphs the crash. */
const RUN_FRAME_MS = 220;

export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Record<string, any>} ui
   */
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    this.ui = ui;
    this.fairness = new Fairness();

    this.phase = PHASE.IDLE;
    this.balance = this._loadBalance();
    this.bet = 10;
    this.activeStake = 0;
    this.multiplier = 1;
    this.crashPoint = 1;
    this.autoCashEnabled = false;
    this.autoCashAt = 2;
    this.runTime = 0;
    /** 0-based index into assets.runFrames (cycles 0→10). */
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.bgScroll = 0;
    this.bgScroll2 = 0;
    /** @type {Array<{ x: number, kind: keyof typeof BG_PROP_STYLE }>} world-X of ground props */
    this.bgProps = [];
    /** Ms until next ground-prop spawn while scrolling */
    this.bgPropTimer = 2500;
    /** Last spawned prop kind — never repeat back-to-back */
    this.bgPropLastKind = /** @type {keyof typeof BG_PROP_STYLE | null} */ (null);
    /** When on, crash never triggers — cash out anytime */
    this.safeMode = false;
    this.boulderAngle = 0;
    /** Crash lunge progress 0→CRASH_LUNGE_MS; -1 when not crashing */
    this.crashAnimT = -1;
    /** Ms since climb video started; boulder roll starts after ESCAPE_BOULDER_DELAY_MS. -1 inactive. */
    this.escapeBoulderT = -1;
    /** Ms since boulder impact; -1 before hit. */
    this.crashHitT = -1;
    /** @type {'none' | 'scared' | 'dead'} */
    this.deathPose = 'none';
    this.shake = 0;
    this.musicMuted = this._loadMutePref(MUSIC_MUTE_KEY, false);
    this.soundMuted = this._loadMutePref(SOUND_MUTE_KEY, false);
    this.musicStarted = false;
    /** Guards overlapping play/seek attempts */
    this._musicStarting = false;
    this._musicEndedBound = false;
    this._musicUnlockBound = false;
    this.flash = 0;
    /** @type {Array<{ x: number, y: number, vx: number, vy: number, life: number, color: string }>} */
    this.particles = [];
    /** @type {Array<{ mult: number, win: boolean }>} */
    this.history = [];
    /** Canvas-space inset from cover-crop (left/right clipped edges). */
    this.coverCropX = 0;
    /** Canvas-space inset from cover-crop (top/bottom clipped edges). */
    this.coverCropY = 0;
    this.running = false;
    this.lastTs = 0;
    this._cashedMult = 1;
    /** performance.now() until which Run stays locked after cash-out */
    this.runLockedUntil = 0;
    /** True while cash-out escape sequence is active */
    this.escapePlaying = false;
    /** @type {string} */
    this.escapeStage = ESCAPE_STAGE.RUN;
    /** Ms into the current pre-climb stage */
    this.escapeStageT = 0;
    /** Waiting for Next Round after end video */
    this.awaitingNextRound = false;
    /** Offscreen buffer for chroma-keying the end video. */
    this._escapeKeyCanvas = /** @type {HTMLCanvasElement | null} */ (null);
    this._escapeKeyCtx = /** @type {CanvasRenderingContext2D | null} */ (null);

    this._bindUi();
  }

  async init() {
    await this.fairness.initSession();
    this._syncFairUi();
    this._syncWalletUi();
    this._syncHistoryUi();
    this._syncAudioUi();
    this._applyAudioLevels();
    this._setStatus('Place a bet to run');
    this.running = true;
    requestAnimationFrame((t) => {
      this.lastTs = t;
      this._loop(t);
    });
  }

  _bindUi() {
    const {
      betInput,
      autoCashInput,
      btnHalf,
      btnDouble,
      btnMax,
      btnAutoToggle,
      btnRun,
      btnCash,
      btnFairness,
      btnCloseFair,
      fairModal,
      fairChip,
      btnMusic,
      btnSound,
      btnNextRound,
      btnSafe,
      btnHelp,
      helpModal,
      btnCloseHelp,
    } = this.ui;

    betInput?.addEventListener('change', () => {
      this.bet = this._clampBet(Number(betInput.value));
      this._syncWalletUi();
    });
    autoCashInput?.addEventListener('change', () => {
      this.autoCashAt = Math.max(1.01, Math.min(1000, Number(autoCashInput.value) || 2));
      if (autoCashInput) autoCashInput.value = this.autoCashAt.toFixed(2);
    });
    btnHalf?.addEventListener('click', () => {
      this.bet = this._clampBet(Math.floor(this._readBet() / 2));
      this._syncWalletUi();
    });
    btnDouble?.addEventListener('click', () => {
      this.bet = this._clampBet(this._readBet() * 2);
      this._syncWalletUi();
    });
    btnMax?.addEventListener('click', () => {
      this.bet = this._clampBet(Math.min(500, this.balance));
      this._syncWalletUi();
    });
    btnAutoToggle?.addEventListener('click', () => {
      this.autoCashEnabled = !this.autoCashEnabled;
      if (btnAutoToggle) {
        btnAutoToggle.setAttribute('aria-pressed', this.autoCashEnabled ? 'true' : 'false');
        btnAutoToggle.textContent = this.autoCashEnabled ? 'ON' : 'OFF';
      }
    });
    btnRun?.addEventListener('click', () => {
      this._ensureMusic();
      this.startRound();
    });
    btnNextRound?.addEventListener('click', () => this.nextRound());
    btnCash?.addEventListener('click', () => this.cashOut());
    btnMusic?.addEventListener('click', () => {
      this.musicMuted = !this.musicMuted;
      this._persistMutePrefs();
      this._syncAudioUi();
      this._applyAudioLevels();
      if (!this.musicMuted) this._ensureMusic();
    });
    btnSound?.addEventListener('click', () => {
      this.soundMuted = !this.soundMuted;
      this._persistMutePrefs();
      this._syncAudioUi();
      this._applyAudioLevels();
      if (this.soundMuted) this._stopRunSfx();
      else if (this.phase === PHASE.RUNNING) this._startRunSfx();
    });
    btnSafe?.addEventListener('click', () => {
      this.safeMode = !this.safeMode;
      this._syncSafeUi();
    });
    this._syncSafeUi();
    this._bindMusicUnlock();
    const openFair = () => {
      this._syncFairDialog();
      if (fairModal) fairModal.hidden = false;
    };
    btnFairness?.addEventListener('click', openFair);
    fairChip?.addEventListener('click', openFair);
    btnCloseFair?.addEventListener('click', () => {
      if (fairModal) fairModal.hidden = true;
    });
    fairModal?.addEventListener('click', (e) => {
      if (e.target === fairModal) fairModal.hidden = true;
    });

    const openHelp = () => {
      if (helpModal) helpModal.hidden = false;
    };
    const closeHelp = () => {
      if (helpModal) helpModal.hidden = true;
    };
    btnHelp?.addEventListener('click', openHelp);
    btnCloseHelp?.addEventListener('click', closeHelp);
    helpModal?.addEventListener('click', (e) => {
      if (e.target === helpModal) closeHelp();
    });

    window.addEventListener('keydown', (e) => {
      const tag = (e.target && /** @type {HTMLElement} */ (e.target).tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        if (btnRun && !btnRun.disabled) {
          this._ensureMusic();
          this.startRound();
        }
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (btnCash && !btnCash.disabled) this.cashOut();
      }
    });
  }

  /**
   * @param {string} key
   * @param {boolean} fallback
   */
  _loadMutePref(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      if (v === null) return fallback;
      return v === '1' || v === 'true';
    } catch {
      return fallback;
    }
  }

  _persistMutePrefs() {
    try {
      localStorage.setItem(MUSIC_MUTE_KEY, this.musicMuted ? '1' : '0');
      localStorage.setItem(SOUND_MUTE_KEY, this.soundMuted ? '1' : '0');
    } catch {
      /* ignore quota / private mode */
    }
  }

  _syncAudioUi() {
    const { btnMusic, btnSound } = this.ui;
    if (btnMusic) {
      btnMusic.setAttribute('aria-pressed', this.musicMuted ? 'true' : 'false');
      btnMusic.classList.toggle('is-muted', this.musicMuted);
      btnMusic.title = this.musicMuted ? 'Unmute music' : 'Mute music';
    }
    if (btnSound) {
      btnSound.setAttribute('aria-pressed', this.soundMuted ? 'true' : 'false');
      btnSound.classList.toggle('is-muted', this.soundMuted);
      btnSound.title = this.soundMuted ? 'Unmute sound' : 'Mute sound';
    }
  }

  _syncSafeUi() {
    const btn = this.ui.btnSafe;
    if (!btn) return;
    btn.setAttribute('aria-pressed', this.safeMode ? 'true' : 'false');
    btn.classList.toggle('is-on', this.safeMode);
    btn.title = this.safeMode
      ? 'Safe mode on — boulder never hits'
      : 'Safe mode — boulder never hits';
  }

  _applyAudioLevels() {
    const music = assets.music;
    if (music) music.volume = this.musicMuted ? 0 : MUSIC_VOL;
    const sfx = assets.runSfx;
    if (sfx) sfx.volume = this.soundMuted ? 0 : SFX_VOL;
    const gasp = assets.scaredSfx;
    if (gasp) gasp.volume = this.soundMuted ? 0 : Math.min(1, SFX_VOL + 0.2);
    const rope = assets.ropeClimbSfx;
    if (rope) rope.volume = this.soundMuted ? 0 : ROPE_CLIMB_VOL;
    const cash = assets.cashOutSfx;
    if (cash) cash.volume = this.soundMuted ? 0 : Math.min(1, SFX_VOL + 0.2);
  }

  /** Retry music on any gesture — browsers block autoplay until then. */
  _bindMusicUnlock() {
    if (this._musicUnlockBound) return;
    this._musicUnlockBound = true;
    const tryPlay = () => {
      if (!this.musicMuted) this._ensureMusic();
    };
    document.addEventListener('pointerdown', tryPlay, { capture: true });
    document.addEventListener('keydown', tryPlay, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.musicMuted) this._ensureMusic();
    });
  }

  /**
   * @param {HTMLAudioElement} a
   * @returns {Promise<void>}
   */
  _waitMusicReady(a) {
    if (a.readyState >= 1 && Number.isFinite(a.duration) && a.duration > 0) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('music load failed'));
      };
      const cleanup = () => {
        a.removeEventListener('loadedmetadata', done);
        a.removeEventListener('canplay', done);
        a.removeEventListener('error', fail);
        window.clearTimeout(timer);
      };
      a.addEventListener('loadedmetadata', done);
      a.addEventListener('canplay', done);
      a.addEventListener('error', fail);
      const timer = window.setTimeout(done, 2500);
    });
  }

  /**
   * @param {HTMLAudioElement} a
   * @param {number} t
   * @returns {Promise<void>}
   */
  _seekMusic(a, t) {
    return new Promise((resolve) => {
      const dur = a.duration;
      if (!Number.isFinite(dur) || dur <= t + 0.05) {
        resolve();
        return;
      }
      if (Math.abs(a.currentTime - t) < 0.05) {
        resolve();
        return;
      }
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        a.removeEventListener('seeked', finish);
        window.clearTimeout(timer);
        resolve();
      };
      a.addEventListener('seeked', finish);
      try {
        a.currentTime = t;
      } catch {
        finish();
        return;
      }
      const timer = window.setTimeout(finish, 500);
    });
  }

  _ensureMusic() {
    const a = assets.music;
    if (!a || this.musicMuted) return;
    a.volume = MUSIC_VOL;
    // Already audible — nothing to do
    if (!a.paused && this.musicStarted) return;
    if (this._musicStarting) return;

    this._musicStarting = true;
    void (async () => {
      try {
        await this._waitMusicReady(a);
        // Manual loop so every pass skips the quiet intro
        a.loop = false;
        if (!this._musicEndedBound) {
          this._musicEndedBound = true;
          a.addEventListener('ended', () => {
            if (this.musicMuted) return;
            this.musicStarted = false;
            this._ensureMusic();
          });
        }
        await this._seekMusic(a, MUSIC_START_S);
        // If seek didn't stick (common before decode), nudge once more
        if (a.currentTime < MUSIC_START_S - 0.25) {
          await this._seekMusic(a, MUSIC_START_S);
        }
        await a.play();
        this.musicStarted = true;
      } catch {
        this.musicStarted = false;
      } finally {
        this._musicStarting = false;
      }
    })();
  }

  async startRound() {
    if (this.phase === PHASE.RUNNING) return;
    if (this.phase === PHASE.CASHED || this.phase === PHASE.CRASHED) return;
    if (this.awaitingNextRound) return;
    if (this.balance < MIN_BET) {
      this.balance = START_BALANCE;
      this._saveBalance();
      this._syncWalletUi();
    }
    let amount = this._clampBet(this._readBet());
    amount = Math.min(amount, Math.floor(this.balance));
    if (amount < MIN_BET) {
      this._setStatus('Not enough balance');
      return;
    }
    this.bet = amount;
    this._syncWalletUi();

    this.balance -= amount;
    this.activeStake = amount;
    this.bet = amount;
    this._saveBalance();
    this._syncWalletUi();

    const { crashPoint, hash } = await this.fairness.nextCrash();
    this.crashPoint = crashPoint;
    this.multiplier = 1;
    this.runTime = 0;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.crashAnimT = -1;
    this.crashHitT = -1;
    this.deathPose = 'none';
    this._stopEscapeEnd();
    this.awaitingNextRound = false;
    this._setNextRoundVisible(false);
    // Clear any leftover fate tablet immediately
    this._hideEscapeFate(true);
    this.shake = 0;
    this.flash = 0;
    this.particles = [];
    this.phase = PHASE.RUNNING;
    this._setButtons(true);
    this._setStatus('Running…');
    this._setMultClass('');
    if (this.ui.fairHash) this.ui.fairHash.textContent = `${hash.slice(0, 10)}…`;
    this._startRunSfx();
  }

  cashOut() {
    if (this.phase !== PHASE.RUNNING) return;
    this._stopRunSfx();
    this._playCashOutSfx();
    const payout = this.activeStake * this.multiplier;
    this.balance += payout;
    this._cashedMult = this.multiplier;
    this.activeStake = 0;
    this.phase = PHASE.CASHED;
    this.awaitingNextRound = false;
    this._setNextRoundVisible(false);
    this._saveBalance();
    this._syncWalletUi();
    this._setButtons(false);
    if (this.ui.btnRun) this.ui.btnRun.disabled = true;
    this._setStatus(`Escaped at ${this._cashedMult.toFixed(2)}×`);
    this._setMultClass('is-win');
    this.flash = 0.45;
    this._burst(RUNNER_X, FLOOR_Y - 140, '#e8c76a', 28);
    this._burst(RUNNER_X, FLOOR_Y - 160, '#39ff9a', 18);
    this._pushHistory(this._cashedMult, true);
    this._showEscapeFate();
    this._startEscapeEnd();
  }

  /** Reset after win celebration — character returns, ready to bet/run. */
  nextRound() {
    if (this.phase !== PHASE.CASHED && !this.awaitingNextRound) return;
    this.awaitingNextRound = false;
    this.phase = PHASE.IDLE;
    this._stopEscapeEnd();
    this._hideEscapeFate();
    this._setNextRoundVisible(false);
    this._setStatus('Place a bet to run');
    this._setMultClass('');
    this.multiplier = 1;
    this._syncMultUi();
    this._setButtons(false);
    if (this.ui.btnRun) this.ui.btnRun.disabled = false;
  }

  /** @param {boolean} show */
  _setNextRoundVisible(show) {
    const el = this.ui.nextRoundOverlay;
    if (!el) return;
    el.hidden = !show;
  }

  _crash() {
    this._stopRunSfx();
    this.phase = PHASE.CRASHED;
    this.crashAnimT = 0;
    this.crashHitT = -1;
    this.deathPose = 'none';
    this.activeStake = 0;
    this._setButtons(false);
    // Keep Run locked until the death sequence finishes
    if (this.ui.btnRun) this.ui.btnRun.disabled = true;
    this._setStatus(`Crashed @ ${this.crashPoint.toFixed(2)}×`);
    this._setMultClass('is-danger');
    this.shake = 18;
    this.flash = 0.7;
    this._burst(RUNNER_X - 40, FLOOR_Y - 100, '#c4a574', 36);
    this._burst(RUNNER_X, FLOOR_Y - 120, '#8a6040', 24);
    this._pushHistory(this.crashPoint, false);
    this._syncWalletUi();
  }

  _finishCrashToIdle() {
    if (this.phase !== PHASE.CRASHED) return;
    this.phase = PHASE.IDLE;
    this.crashAnimT = -1;
    this.crashHitT = -1;
    this.deathPose = 'none';
    this._setStatus('Place a bet to run');
    this._setMultClass('');
    this.multiplier = 1;
    this._syncMultUi();
    if (this.ui.btnRun) this.ui.btnRun.disabled = false;
  }

  /**
   * Cash-out tablet replaces the live multiplier overlay.
   */
  _showEscapeFate() {
    const el = this.ui.crashFate;
    const mult = this.ui.crashFateMult;
    const sub = this.ui.crashFateSub;
    if (!el) return;
    if (mult) mult.textContent = `${Number(this._cashedMult).toFixed(2)}×`;
    if (sub) sub.textContent = `Hit @ ${Number(this.crashPoint).toFixed(2)}×`;
    if (this.ui.multOverlay) this.ui.multOverlay.hidden = true;
    el.hidden = false;
    el.removeAttribute('hidden');
    el.classList.remove('is-out');
    el.classList.remove('is-in');
    void el.offsetWidth;
    el.classList.add('is-in');
  }

  /**
   * Hide the escape tablet and restore the live multiplier overlay.
   * @param {boolean} [instant]
   */
  _hideEscapeFate(instant = false) {
    const el = this.ui.crashFate;
    if (this.ui.multOverlay) this.ui.multOverlay.hidden = false;
    if (!el) return;
    if (el.hidden && !el.classList.contains('is-in') && !el.classList.contains('is-out')) return;
    if (instant) {
      el.hidden = true;
      el.classList.remove('is-in', 'is-out');
      return;
    }
    if (el.hidden) return;
    el.classList.remove('is-in');
    el.classList.add('is-out');
    window.setTimeout(() => {
      el.hidden = true;
      el.classList.remove('is-out');
    }, 280);
  }

  /** @param {number} ts */
  _loop(ts) {
    if (!this.running) return;
    // Clamp both ends — negative dt from rAF/performance skew breaks timers.
    const dt = Math.max(0, Math.min(40, ts - this.lastTs));
    this.lastTs = ts;
    this._update(dt);
    this._draw();
    requestAnimationFrame((t) => this._loop(t));
  }

  /** @param {number} dt */
  _update(dt) {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 0.05);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 0.0012);

    // World scroll only while running — freeze bg + floor on cash-out until next round
    if (this.phase === PHASE.RUNNING) {
      const scrollSpeed = 0.22;
      this.bgScroll += dt * scrollSpeed;
      this.bgScroll2 += dt * scrollSpeed * 0.55;
      this._updateBgProps(dt);
    }

    if (this.phase === PHASE.CRASHED && this.crashAnimT >= 0) {
      const prev = this.crashAnimT;
      this.crashAnimT = Math.min(CRASH_LUNGE_MS, this.crashAnimT + dt);
      // Impact: boulder reaches the runner → scared + Mario flash
      if (prev < CRASH_LUNGE_MS && this.crashAnimT >= CRASH_LUNGE_MS && this.crashHitT < 0) {
        this.crashHitT = 0;
        this.deathPose = 'scared';
        this.shake = Math.max(this.shake, 14);
        this._playScaredSfx();
      }
    }

    if (this.crashHitT >= 0 && this.phase === PHASE.CRASHED) {
      this.crashHitT += dt;
      if (this.deathPose === 'scared' && this.crashHitT >= CRASH_SCARED_FLASH_MS) {
        this.deathPose = 'dead';
      } else if (
        this.deathPose === 'dead'
        && this.crashHitT >= CRASH_SCARED_FLASH_MS + CRASH_DEAD_HOLD_MS
      ) {
        this._finishCrashToIdle();
      }
    }

    if (this.phase === PHASE.RUNNING) {
      this.runTime += dt;
      this.multiplier = Math.exp(GROWTH * this.runTime);
      if (this.multiplier >= this.crashPoint) {
        if (this.safeMode) {
          // Safe mode: boulder never hits — keep running past the crash point
          this._syncMultUi();
        } else {
          this.multiplier = this.crashPoint;
          this._syncMultUi();
          this._crash();
        }
      } else {
        if (this.autoCashEnabled && this.multiplier >= this.autoCashAt) {
          this.cashOut();
        } else {
          this._syncMultUi();
          // Stay gold for the whole run — no “about to lose” color telegraph
        }
      }
      this._advanceRunFrame(dt);
      this.boulderAngle += dt * BOULDER_SPIN;
    } else if (this.phase === PHASE.CASHED) {
      // Pre-climb poses + climb video; boulder keeps run spin and rolls after delay
      this._updateEscapeEnd(dt);
      this.boulderAngle += dt * BOULDER_SPIN;
      if (this.escapeBoulderT >= 0) this.escapeBoulderT += dt;
      if (this.escapePlaying && this.escapeStage === ESCAPE_STAGE.RUN) {
        // Keep corridor scrolling briefly while she runs into the stop
        const scrollSpeed = 0.22;
        this.bgScroll += dt * scrollSpeed;
        this.bgScroll2 += dt * scrollSpeed * 0.55;
        this._updateBgProps(dt);
        this._advanceRunFrame(dt);
      }
    } else if (this.phase === PHASE.IDLE) {
      // Seated start stance — no run cycle until Run
    } else if (this.phase === PHASE.CRASHED) {
      // Same spin as the run — only the roll toward her changes
      this.boulderAngle += dt * BOULDER_SPIN;
    }

    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.vy += 0.02 * dt;
      return p.life > 0;
    });
  }

  _startRunSfx() {
    const a = assets.runSfx;
    if (!a || this.soundMuted) return;
    try {
      a.loop = true;
      a.currentTime = 0;
      a.playbackRate = 1;
      a.volume = SFX_VOL;
      void a.play();
    } catch {
      /* autoplay may be blocked until a gesture — RUN is a click */
    }
  }

  _playScaredSfx() {
    const a = assets.scaredSfx;
    if (!a || this.soundMuted) return;
    try {
      a.pause();
      a.currentTime = 0;
      a.volume = Math.min(1, SFX_VOL + 0.2);
      void a.play();
    } catch {
      /* ignore playback errors */
    }
  }

  _playCashOutSfx() {
    const a = assets.cashOutSfx;
    if (!a || this.soundMuted) return;
    try {
      a.pause();
      a.currentTime = 0;
      a.volume = Math.min(1, SFX_VOL + 0.2);
      void a.play();
    } catch {
      /* ignore playback errors */
    }
  }

  _playRopeClimbSfx() {
    const a = assets.ropeClimbSfx;
    if (!a || this.soundMuted) return;
    this._stopRopeClimbSfx();
    try {
      a.loop = false;
      a.currentTime = 0;
      a.volume = ROPE_CLIMB_VOL;
      // After full play, restart and run an extra 1s
      this._ropeClimbOnEnded = () => {
        this._ropeClimbOnEnded = null;
        try {
          a.currentTime = 0;
          void a.play();
          this._ropeClimbExtraTimer = window.setTimeout(() => {
            this._ropeClimbExtraTimer = 0;
            this._stopRopeClimbSfx();
          }, 1000);
        } catch {
          /* ignore */
        }
      };
      a.addEventListener('ended', this._ropeClimbOnEnded, { once: true });
      void a.play();
    } catch {
      /* ignore playback errors */
    }
  }

  _stopRopeClimbSfx() {
    if (this._ropeClimbExtraTimer) {
      window.clearTimeout(this._ropeClimbExtraTimer);
      this._ropeClimbExtraTimer = 0;
    }
    const a = assets.ropeClimbSfx;
    if (!a) return;
    if (this._ropeClimbOnEnded) {
      a.removeEventListener('ended', this._ropeClimbOnEnded);
      this._ropeClimbOnEnded = null;
    }
    a.pause();
    try {
      a.currentTime = 0;
    } catch {
      /* ignore */
    }
  }

  _stopRunSfx() {
    const a = assets.runSfx;
    if (!a) return;
    a.pause();
    try {
      a.currentTime = 0;
      a.playbackRate = 1;
    } catch {
      /* ignore seek errors */
    }
  }

  _draw() {
    const ctx = this.ctx;
    const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(sx, sy);

    this._drawBackground(ctx);
    this._drawTempleOverlay(ctx);
    this._drawGround(ctx);
    this._drawBgProps(ctx);
    this._drawBoulder(ctx);
    this._drawRunner(ctx);
    this._drawParticles(ctx);

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,230,180,${this.flash * 0.55})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  /**
   * Seamless horizontal parallax. Odd tiles are mirrored so left/right edges
   * always meet themselves (jungle art is not a true seamless tile).
   * @param {CanvasRenderingContext2D} ctx
   * @param {HTMLImageElement} img
   * @param {number} scrollPx
   * @param {number} tileW
   * @param {number} y
   * @param {number} drawH
   */
  _drawLoopedBg(ctx, img, scrollPx, tileW, y, drawH) {
    if (tileW <= 0) return;
    const startTile = Math.floor(scrollPx / tileW) - 1;
    const endTile = startTile + Math.ceil(W / tileW) + 3;
    for (let i = startTile; i <= endTile; i++) {
      const x = i * tileW - scrollPx;
      if (x >= W || x + tileW <= 0) continue;
      const flip = (i & 1) !== 0;
      if (flip) {
        ctx.save();
        ctx.translate(x + tileW, y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, tileW, drawH);
        ctx.restore();
      } else {
        ctx.drawImage(img, x, y, tileW, drawH);
      }
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  _drawBackground(ctx) {
    const img = assets.jungle;
    if (!img) {
      ctx.fillStyle = '#0a2a1a';
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const scale = H / img.naturalHeight;
    const drawW = img.naturalWidth * scale;

    ctx.globalAlpha = 1;
    this._drawLoopedBg(ctx, img, this.bgScroll * FLOOR_SCROLL, drawW, 0, H);

    // Far mist layer (slower parallax)
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.filter = 'blur(1px) saturate(1.1)';
    const mistW = drawW * 1.05;
    this._drawLoopedBg(ctx, img, this.bgScroll2 * 0.18, mistW, -20, H * 1.08);
    ctx.filter = 'none';
    ctx.restore();

    // Warm temple vignette
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(8, 20, 16, 0.15)');
    g.addColorStop(0.55, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(10, 8, 4, 0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /** @param {CanvasRenderingContext2D} ctx */
  _drawTempleOverlay(ctx) {
    // Top of playfield — just under the black letterbox
    const histY = Math.max(2, Math.ceil(this.coverCropY) + 2);
    const histH = 28;
    ctx.fillStyle = 'rgba(8, 18, 14, 0.72)';
    ctx.fillRect(0, histY, W, histH);
    ctx.strokeStyle = 'rgba(232, 199, 106, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, histY + histH);
    ctx.lineTo(W, histY + histH);
    ctx.stroke();

    this._drawHistoryRail(ctx, histY, histH);
  }

  /**
   * @param {number} cropX
   * @param {number} cropY
   */
  setCoverCrop(cropX, cropY) {
    this.coverCropX = Math.max(0, cropX);
    this.coverCropY = Math.max(0, cropY);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} histY
   * @param {number} histH
   */
  _drawHistoryRail(ctx, histY = 0, histH = 28) {
    const chipH = 20;
    const chipY = histY + (histH - chipH) / 2;
    const chipCy = chipY + chipH / 2;
    // Keep chips inside the visible (uncropped) horizontal band
    const edge = 10;
    const padL = edge + this.coverCropX;
    const padR = edge + this.coverCropX;
    const innerLeft = padL;
    const innerRight = W - padR;
    const innerW = Math.max(0, innerRight - innerLeft);

    if (this.history.length === 0) {
      ctx.fillStyle = 'rgba(138, 154, 144, 0.75)';
      ctx.font = '600 12px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No rounds yet', innerLeft + innerW / 2, chipCy);
      return;
    }

    // Oldest → newest, left → right. If the rail is full, drop oldest off the left.
    const chipW = 64;
    const gap = 6;
    const stride = chipW + gap;
    const maxVisible = Math.max(1, Math.floor((innerW + gap) / stride));
    const start = Math.max(0, this.history.length - maxVisible);
    let x = innerLeft;

    ctx.font = '700 12px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = start; i < this.history.length; i++) {
      const h = this.history[i];
      const win = h.win;
      ctx.fillStyle = win ? 'rgba(20, 60, 40, 0.9)' : 'rgba(60, 20, 24, 0.9)';
      ctx.strokeStyle = win ? 'rgba(57, 255, 154, 0.55)' : 'rgba(255, 100, 100, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, chipY, chipW, chipH, 8);
      } else {
        ctx.rect(x, chipY, chipW, chipH);
      }
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = win ? '#39ff9a' : '#ff8a8a';
      ctx.fillText(`${h.mult.toFixed(2)}×`, x + chipW / 2, chipCy + 0.5);
      x += stride;
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  _drawGround(ctx) {
    const tile = assets.floorTile;
    const y0 = FLOOR_Y;
    const groundH = H - y0;
    const scroll = this.bgScroll * FLOOR_SCROLL;

    ctx.imageSmoothingEnabled = false;

    if (!tile) {
      const g = ctx.createLinearGradient(0, y0 - 20, 0, H);
      g.addColorStop(0, 'rgba(40, 44, 50, 0.0)');
      g.addColorStop(0.15, 'rgba(48, 52, 58, 0.85)');
      g.addColorStop(1, '#1a1c20');
      ctx.fillStyle = g;
      ctx.fillRect(0, y0 - 20, W, groundH + 20);
    } else {
      const tw = /** @type {HTMLImageElement} */ (tile).naturalWidth || tile.width;
      const th = /** @type {HTMLImageElement} */ (tile).naturalHeight || tile.height;
      // Uniform scale to fill floor height — nearest-neighbor, no blur
      const scale = groundH / th;
      const dw = tw * scale;
      const dh = groundH;
      // Continuous horizontal loop synced to corridor scroll
      const startX = -(((scroll % dw) + dw) % dw);

      for (let x = startX; x < W; x += dw) {
        ctx.drawImage(tile, x, y0, dw, dh);
      }

      // Soft fade into jungle just above the floor lip
      const fade = ctx.createLinearGradient(0, y0 - 18, 0, y0 + 4);
      fade.addColorStop(0, 'rgba(10, 14, 12, 0)');
      fade.addColorStop(0.65, 'rgba(18, 20, 24, 0.35)');
      fade.addColorStop(1, 'rgba(22, 24, 28, 0.55)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, y0 - 18, W, 22);
    }

    // Full-floor 32-bit dirt + moss (scroll with floor)
    this._drawDirtChunks(ctx, scroll);

    // Soft floor lip (same Y — runner / boulder still align)
    ctx.fillStyle = 'rgba(28, 22, 16, 0.85)';
    ctx.fillRect(0, FLOOR_Y - 2, W, 2);
    ctx.fillStyle = 'rgba(90, 70, 45, 0.4)';
    ctx.fillRect(0, FLOOR_Y, W, 1);
    ctx.fillStyle = 'rgba(20, 16, 12, 0.45)';
    ctx.fillRect(0, FLOOR_Y + 1, W, 1);
  }

  /**
   * Spawn / cull ground props while the corridor scrolls.
   * @param {number} dt
   */
  _updateBgProps(dt) {
    this.bgPropTimer -= dt;
    if (this.bgPropTimer <= 0) {
      const scroll = this.bgScroll * FLOOR_SCROLL;
      const pool = BG_PROP_KINDS.filter((k) => k !== this.bgPropLastKind);
      const pickFrom = pool.length ? pool : BG_PROP_KINDS;
      const kind = pickFrom[Math.floor(Math.random() * pickFrom.length)];
      this.bgPropLastKind = kind;
      this.bgProps.push({ x: scroll + W + 60, kind });
      this.bgPropTimer =
        BG_PROP_GAP_MIN_MS + Math.random() * (BG_PROP_GAP_MAX_MS - BG_PROP_GAP_MIN_MS);
    }
    const scroll = this.bgScroll * FLOOR_SCROLL;
    this.bgProps = this.bgProps.filter((p) => {
      const spr = assets[p.kind];
      const style = BG_PROP_STYLE[p.kind] || BG_PROP_STYLE.monolith;
      const maxW = spr && spr.height ? (spr.width * style.h) / spr.height : style.h;
      return p.x - scroll > -maxW - 40;
    });
  }

  /**
   * Overgrown ruins sitting on the floor, scrolling with the ground
   * (behind boulder / runner). Random mix of monolith, head, circle, triangle.
   * @param {CanvasRenderingContext2D} ctx
   */
  _drawBgProps(ctx) {
    if (!this.bgProps.length) return;

    const scroll = this.bgScroll * FLOOR_SCROLL;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const p of this.bgProps) {
      const spr = assets[p.kind];
      if (!spr || !spr.height) continue;
      const style = BG_PROP_STYLE[p.kind] || BG_PROP_STYLE.monolith;
      const scale = style.h / spr.height;
      const dw = spr.width * scale;
      const dh = spr.height * scale;
      const x = p.x - scroll;
      if (x >= W || x + dw <= 0) continue;
      const y = FLOOR_Y - dh + style.sink;
      ctx.drawImage(spr, x, y, dw, dh);
    }
    ctx.restore();
  }

  /**
   * Cover the entire floor band with packed 32-bit dirt + green moss spots.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} scroll
   */
  _drawDirtChunks(ctx, scroll) {
    ctx.imageSmoothingEnabled = false;
    const y0 = FLOOR_Y;
    const groundH = H - y0;

    // Clip so dirt never paints over the runner above the floor lip
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y0, W, groundH);
    ctx.clip();

    // Solid earth underlay so stone never peeks through
    ctx.fillStyle = '#4a3426';
    ctx.fillRect(0, y0, W, groundH);

    const cell = 10;
    const cols = Math.ceil(W / cell) + 4;
    const rows = Math.ceil(groundH / cell) + 1;
    const scrollCells = Math.floor(scroll / cell);
    const scrollFrac = scroll - scrollCells * cell;

    for (let row = 0; row < rows; row++) {
      for (let col = -2; col < cols; col++) {
        const worldCol = col + scrollCells;
        // Keep hash unsigned — signed XOR breaks `%` and crashes the draw mid-frame
        const h = ((worldCol * 374761393 + row * 668265263) ^ 0x9e3779b9) >>> 0;
        const sx = col * cell - scrollFrac + (h % 5) - 2;
        const sy = y0 + row * cell + (((h >>> 8) % 5) - 2);

        // Pixel size mix across the whole floor
        const sizeRoll = (h >>> 4) & 0xf;
        let px = 3;
        if (sizeRoll >= 13) px = 6;
        else if (sizeRoll >= 9) px = 5;
        else if (sizeRoll >= 5) px = 4;
        else if (sizeRoll >= 2) px = 3;
        else px = 2;

        const variety = (h >>> 12) & 7;
        // ~1 in 9 cells is moss / grass instead of dirt
        const isGreen = ((h >>> 20) % 9) === 0;
        this._stampDirtClump(ctx, sx, sy, px, variety, h, isGreen);

        // Second micro-fill so gaps between cells disappear
        if (((h >>> 16) & 3) !== 0) {
          const sx2 = sx + 4 + ((h >>> 18) % 4);
          const sy2 = sy + 3 + ((h >>> 22) % 4);
          const green2 = ((h >>> 24) % 14) === 0;
          this._stampDirtClump(ctx, sx2, sy2, 2 + (h & 1), (variety + 2) & 7, (h ^ 0xa511e9b3) >>> 0, green2);
        }
      }
    }

    ctx.restore();
  }

  /**
   * Draw one chunky dirt (or moss) pile as filled pixel blocks.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} px
   * @param {number} variety
   * @param {number} seed
   * @param {boolean} [green=false]
   */
  _stampDirtClump(ctx, x, y, px, variety, seed, green = false) {
    // Varied browns: dry dust → clay → mud → dark soil → warm ochre
    const dirt = [
      '#3a281c', '#4a3226', '#5c4030', '#6e4a34', '#7a563c',
      '#8a6040', '#6b4428', '#523828', '#9a7048', '#45301e',
      '#7d5a38', '#5a3820', '#8b6a4a', '#2e2018', '#a07850',
    ];
    // Jungle moss / grass tufts
    const moss = [
      '#2a5a28', '#3a6e30', '#1e4a20', '#4a7a38', '#2e6230',
      '#558040', '#1a3c18', '#6a9048', '#3d6834',
    ];
    const pebble = ['#6a6058', '#524840', '#8a8070', '#7a7060'];
    const palette = green ? moss : dirt;

    /** @type {number[][]} */
    const shapes = [
      // low mound
      [
        [0, 1], [1, 1], [2, 1], [3, 1],
        [1, 0], [2, 0],
        [0, 2], [1, 2], [2, 2],
      ],
      // wider scatter
      [
        [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
        [1, 0], [2, 0], [3, 0],
        [1, 2], [2, 2], [3, 2],
        [5, 1],
      ],
      // tall-ish clod
      [
        [1, 2], [2, 2], [3, 2],
        [0, 1], [1, 1], [2, 1], [3, 1],
        [1, 0], [2, 0],
        [2, -1],
      ],
      // broken rubble + dirt
      [
        [0, 1], [1, 1], [2, 1],
        [1, 0],
        [3, 1], [4, 0], [4, 1],
        [0, 2], [2, 2],
      ],
      // big patch
      [
        [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],
        [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1],
        [1, 0], [2, 0], [3, 0], [4, 0],
        [1, 3], [2, 3], [3, 3], [4, 3],
        [2, -1], [3, -1],
      ],
      // single speck / pebble
      [[0, 0], [1, 0], [0, 1]],
      // long smear
      [
        [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1],
        [1, 0], [2, 0], [4, 0], [5, 0],
        [2, 2], [3, 2], [4, 2],
      ],
      // irregular heap / moss tuft
      [
        [1, 2], [2, 2], [3, 2], [4, 2],
        [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1],
        [1, 0], [2, 0], [3, 0],
        [2, -1],
        [2, 3], [3, 3],
      ],
    ];

    const cells = shapes[variety % shapes.length];
    const plen = palette.length;
    for (let c = 0; c < cells.length; c++) {
      const [cx, cy] = cells[c];
      ctx.fillStyle = palette[((seed + c * 17) >>> 0) % plen];
      ctx.fillRect(Math.round(x + cx * px), Math.round(y + cy * px), px, px);
    }

    // Occasional stone pebble on dirt (not moss)
    if (!green && (seed & 0xf) > 11) {
      const [cx, cy] = cells[seed % cells.length];
      ctx.fillStyle = pebble[seed % pebble.length];
      ctx.fillRect(Math.round(x + cx * px), Math.round(y + (cy - 1) * px), px, px);
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  _drawBoulder(ctx) {
    const boulder = assets.boulder;
    if (!boulder) return;

    let x = BOULDER_PARK_X;
    if (this.phase === PHASE.CRASHED && this.crashAnimT >= 0) {
      const u = Math.min(1, this.crashAnimT / CRASH_LUNGE_MS);
      const e = u * u;
      x = BOULDER_PARK_X + (BOULDER_HIT_X - BOULDER_PARK_X) * e;
    } else if (this.phase === PHASE.CASHED && (this.escapePlaying || this.awaitingNextRound)) {
      x = this._winBoulderX();
    }

    const size = BOULDER_SIZE;
    // Center so the cropped rock rests on the floor line (not floating)
    const y = FLOOR_Y - size * 0.48;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.boulderAngle);
    ctx.drawImage(boulder, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  /** 0→1 progress through the cash-out climb video (0 during pre-climb beats). */
  _escapeProgress() {
    if (this.awaitingNextRound && !this.escapePlaying) return 1;
    if (this.escapeStage !== ESCAPE_STAGE.CLIMB) return 0;
    const v = assets.escapeEnd;
    if (!v || !(v.duration > 0)) return 0;
    return Math.min(1, Math.max(0, v.currentTime / v.duration));
  }

  /**
   * Win boulder X: parked for ESCAPE_BOULDER_DELAY_MS after climb starts, then
   * rolls past at constant spin (she's already climbing / clear of the path).
   */
  _winBoulderX() {
    if (this.escapeBoulderT < 0) return BOULDER_PARK_X;
    const t = this.escapeBoulderT - ESCAPE_BOULDER_DELAY_MS;
    if (t <= 0) return BOULDER_PARK_X;

    const u = Math.min(1, t / ESCAPE_BOULDER_ROLL_MS);
    const exitX = W + BOULDER_SIZE * 0.6;
    // Ease past her former feet around 45%, then continue off-screen
    if (u < 0.45) {
      const p = u / 0.45;
      const e = p * p;
      return BOULDER_PARK_X + (RUNNER_X - BOULDER_PARK_X) * e;
    }
    const p = (u - 0.45) / 0.55;
    return RUNNER_X + (exitX - RUNNER_X) * p;
  }

  /** Start cash-out: quick run → back POV → climb video. */
  _startEscapeEnd() {
    this.escapePlaying = true;
    this.escapeStage = ESCAPE_STAGE.RUN;
    this.escapeStageT = 0;
    // Boulder timer starts when climb video begins
    this.escapeBoulderT = -1;
    this.frameTimer = 0;
    const v = assets.escapeEnd;
    if (v) {
      try {
        v.pause();
        v.currentTime = 0;
        v.playbackRate = ESCAPE_PLAYBACK_RATE;
      } catch {
        /* ignore */
      }
    }
  }

  /** Begin the climb video (after back POV). */
  _startEscapeClimbVideo() {
    this.escapeStage = ESCAPE_STAGE.CLIMB;
    this.escapeStageT = 0;
    this.escapeBoulderT = 0;
    this._playRopeClimbSfx();
    const v = assets.escapeEnd;
    if (!v) {
      this._onEscapeEndFinished();
      return;
    }
    try {
      v.pause();
      v.currentTime = 0;
      v.playbackRate = ESCAPE_PLAYBACK_RATE;
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => this._onEscapeEndFinished());
    } catch {
      this._onEscapeEndFinished();
    }
  }

  /** Pause and rewind ending video / reset pre-climb. */
  _stopEscapeEnd() {
    this.escapePlaying = false;
    this.escapeStage = ESCAPE_STAGE.RUN;
    this.escapeStageT = 0;
    this.escapeBoulderT = -1;
    this._stopRopeClimbSfx();
    const v = assets.escapeEnd;
    if (!v) return;
    try {
      v.pause();
      v.currentTime = 0;
      v.playbackRate = 1;
    } catch {
      /* ignore */
    }
  }

  /**
   * Advance pre-climb beats, then watch climb video end → Next Round.
   * @param {number} dt
   */
  _updateEscapeEnd(dt) {
    if (!this.escapePlaying || this.awaitingNextRound) return;

    if (this.escapeStage === ESCAPE_STAGE.CLIMB) {
      const v = assets.escapeEnd;
      if (!v) {
        this._onEscapeEndFinished();
        return;
      }
      if (v.ended || (v.duration > 0 && v.currentTime >= v.duration - 0.05)) {
        this._onEscapeEndFinished();
      }
      return;
    }

    this.escapeStageT += dt;
    if (this.escapeStage === ESCAPE_STAGE.RUN && this.escapeStageT >= ESCAPE_RUN_MS) {
      this.escapeStage = ESCAPE_STAGE.STOP;
      this.escapeStageT = 0;
    } else if (this.escapeStage === ESCAPE_STAGE.STOP && this.escapeStageT >= ESCAPE_STOP_MS) {
      this._startEscapeClimbVideo();
    }
  }

  _onEscapeEndFinished() {
    if (this.awaitingNextRound) return;
    this.escapePlaying = false;
    this.awaitingNextRound = true;
    this._setNextRoundVisible(true);
    this._setStatus('Escaped — next round?');
    this._burst(RUNNER_X, FLOOR_Y - 120, '#e8c76a', 12);
  }

  /**
   * Play run frames in order, then loop — constant rate (no crash telegraph).
   * @param {number} dt
   */
  _advanceRunFrame(dt) {
    const n = assets.runFrames.length || 2;
    if (n < 1) return;
    this.frameTimer += dt;
    // One step max per tick — never skip frames
    if (this.frameTimer < RUN_FRAME_MS) return;
    this.frameTimer -= RUN_FRAME_MS;
    this.frameIndex = (this.frameIndex + 1) % n;
  }

  /** @param {CanvasRenderingContext2D} ctx */
  _drawRunner(ctx) {
    ctx.imageSmoothingEnabled = false;

    if (this.phase === PHASE.CRASHED) {
      this._drawCrashRunner(ctx);
      return;
    }

    if (this.phase === PHASE.CASHED && (this.escapePlaying || this.awaitingNextRound)) {
      this._drawEscapeEnd(ctx);
      return;
    }

    if (this.phase === PHASE.IDLE) {
      this._drawStartStance(ctx);
      return;
    }

    const frames = assets.runFrames;
    if (!frames.length) return;
    const n = frames.length;
    const idx = ((this.frameIndex % n) + n) % n;
    const spr = frames[idx];
    if (!spr || !spr.height) return;
    const scale = RUNNER_TARGET_H / spr.height;
    const dw = spr.width * scale;
    const dh = spr.height * scale;
    let x = RUNNER_X;
    let y = FLOOR_Y - dh + 8;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr, x - dw / 2, y, dw, dh);
    ctx.restore();
  }

  /**
   * Pre-run seated stance (hat on the ground).
   * @param {CanvasRenderingContext2D} ctx
   */
  _drawStartStance(ctx) {
    const spr = assets.start;
    if (!spr || !spr.height) {
      // Fallback: first run frame if start asset missing
      const frames = assets.runFrames;
      const fb = frames[0];
      if (!fb) return;
      const scale = RUNNER_TARGET_H / fb.height;
      const dw = fb.width * scale;
      const dh = fb.height * scale;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(fb, RUNNER_X - dw / 2, FLOOR_Y - dh + 8, dw, dh);
      ctx.restore();
      return;
    }
    const scale = START_TARGET_H / spr.height;
    const dw = spr.width * scale;
    const dh = spr.height * scale;
    const y = FLOOR_Y - dh + START_FLOOR_SINK;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr, RUNNER_X - dw / 2, y, dw, dh);
    ctx.restore();
  }

  /**
   * Cash-out: run → back POV → climb video.
   * @param {CanvasRenderingContext2D} ctx
   */
  _drawEscapeEnd(ctx) {
    const stage = this.awaitingNextRound ? ESCAPE_STAGE.CLIMB : this.escapeStage;

    if (stage === ESCAPE_STAGE.RUN) {
      this._drawEscapeSprite(ctx, this._escapeRunSprite());
      return;
    }

    if (stage === ESCAPE_STAGE.STOP) {
      this._drawEscapeSprite(ctx, assets.escapeBack || this._escapeRunSprite());
      return;
    }

    // Climb video
    const v = assets.escapeEnd;
    if (!v || v.readyState < 2 || !v.videoWidth) {
      this._drawEscapeSprite(ctx, assets.escapeBack || this._escapeRunSprite());
      return;
    }

    const scale = ESCAPE_CLIMB_TARGET_H / v.videoHeight;
    const dw = Math.max(1, Math.round(v.videoWidth * scale));
    const dh = Math.max(1, Math.round(v.videoHeight * scale));

    const u = this._escapeProgress();
    const climb = u * ESCAPE_CLIMB_PX;
    const x = RUNNER_X - dw / 2;
    const y = FLOOR_Y - dh + 8 - climb;

    this._drawClimbBranch(ctx, climb, 1);

    if (!this._escapeKeyCanvas) {
      this._escapeKeyCanvas = document.createElement('canvas');
      this._escapeKeyCtx = this._escapeKeyCanvas.getContext('2d', { willReadFrequently: true });
    }
    const oc = this._escapeKeyCanvas;
    const octx = this._escapeKeyCtx;
    if (!octx) return;

    if (oc.width !== dw || oc.height !== dh) {
      oc.width = dw;
      oc.height = dh;
    }

    octx.imageSmoothingEnabled = false;
    octx.clearRect(0, 0, dw, dh);
    octx.drawImage(v, 0, 0, dw, dh);

    // Key ~RGB(54,170,46) green screen at draw resolution
    const img = octx.getImageData(0, 0, dw, dh);
    const px = img.data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      if (g > 110 && g > r + 35 && g > b + 35) {
        px[i + 3] = 0;
      }
    }
    octx.putImageData(img, 0, 0);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(oc, x, y);
    ctx.restore();
  }

  /** @returns {HTMLCanvasElement | null} */
  _escapeRunSprite() {
    const frames = assets.runFrames;
    if (!frames.length) return null;
    const n = frames.length;
    const idx = ((this.frameIndex % n) + n) % n;
    return frames[idx] || null;
  }

  /**
   * Draw a still escape pose planted on the floor.
   * @param {CanvasRenderingContext2D} ctx
   * @param {HTMLCanvasElement | null | undefined} spr
   */
  _drawEscapeSprite(ctx, spr) {
    if (!spr || !spr.height) return;
    const scale = RUNNER_TARGET_H / spr.height;
    const dw = spr.width * scale;
    const dh = spr.height * scale;
    const x = RUNNER_X - dw / 2;
    const y = FLOOR_Y - dh + 8;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr, x, y, dw, dh);
    ctx.restore();
  }

  /**
   * Straight woody branch hanging from the top, tip floating above the floor.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} climb — rises with her during climb video
   * @param {number} [drop=1] — 0→1 how far the branch has dropped in (reach beat)
   */
  _drawClimbBranch(ctx, climb, drop = 1) {
    ctx.imageSmoothingEnabled = false;
    const px = ESCAPE_ROPE_PX;
    const cx = Math.round(RUNNER_X / px) * px;
    const d = Math.max(0, Math.min(1, drop));
    const restTip = FLOOR_Y - ESCAPE_BRANCH_GAP - Math.round(climb);
    // Start fully above the frame, drop down to restTip
    const startTip = this.coverCropY - 40;
    const tipY = Math.round(startTip + (restTip - startTip) * d);
    const top = Math.min(Math.floor(this.coverCropY) - Math.round(climb), tipY - px);
    if (tipY <= top) return;

    // Bark palette — straight branch, no zigzag
    const barkDark = '#3a2818';
    const barkMid = '#5c4030';
    const barkLight = '#7a5638';
    const barkHi = '#9a7048';
    const moss = '#3a5a28';

    const halfW = px; // 8px wide total
    for (let y = top; y < tipY; y += px) {
      const step = Math.floor((y - top) / px);
      // Straight column with bark shading (left light → right dark)
      ctx.fillStyle = barkLight;
      ctx.fillRect(cx - halfW, y, px, px);
      ctx.fillStyle = barkMid;
      ctx.fillRect(cx, y, px, px);
      ctx.fillStyle = barkDark;
      ctx.fillRect(cx + px - 1, y, 1, px);
      // Sparse bark notches / moss flecks (not a weave)
      if ((step % 7) === 2) {
        ctx.fillStyle = barkHi;
        ctx.fillRect(cx - halfW, y, px, px);
      }
      if ((step % 11) === 5) {
        ctx.fillStyle = moss;
        ctx.fillRect(cx - halfW + 1, y, 2, px);
      }
    }

    // Tapered tip floating above the ground
    const tip = tipY - px;
    ctx.fillStyle = barkMid;
    ctx.fillRect(cx - px / 2, tip, px, px);
    ctx.fillStyle = barkLight;
    ctx.fillRect(cx - 1, tip - px, 2, px);

    // Top stub where it enters the canopy / frame
    ctx.fillStyle = barkMid;
    ctx.fillRect(cx - halfW - px, top, px * 4, px * 2);
    ctx.fillStyle = barkLight;
    ctx.fillRect(cx - halfW - px, top, px * 4, px);
  }

  /** @param {CanvasRenderingContext2D} ctx */
  _drawCrashRunner(ctx) {
    const x = RUNNER_X;

    // Before impact: keep last run frame while boulder lunges in
    if (this.deathPose === 'none') {
      const frames = assets.runFrames;
      const spr = frames[((this.frameIndex % frames.length) + frames.length) % frames.length];
      if (!spr) return;
      const scale = RUNNER_TARGET_H / spr.height;
      const dw = spr.width * scale;
      const dh = spr.height * scale;
      const y = FLOOR_Y - dh + 8;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spr, x - dw / 2, y, dw, dh);
      ctx.restore();
      return;
    }

    if (this.deathPose === 'scared') {
      const spr = assets.scared;
      if (!spr) return;
      // Mario hurt flash: blink on/off for the scared window
      const blinkOn = Math.floor(this.crashHitT / HURT_FLASH_PERIOD_MS) % 2 === 0;
      if (!blinkOn) return;
      const scale = SCARED_TARGET_H / spr.height;
      const dw = spr.width * scale;
      const dh = spr.height * scale;
      const y = FLOOR_Y - dh + 8;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spr, x - dw / 2, y, dw, dh);
      ctx.restore();
      return;
    }

    // Dead: lying on the floor
    const spr = assets.die;
    if (!spr) return;
    const scale = DIE_TARGET_W / spr.width;
    const dw = spr.width * scale;
    const dh = spr.height * scale;
    // Sink into the ground line — cropped bottom = body contact
    const y = FLOOR_Y - dh + DIE_FLOOR_SINK;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr, x - dw / 2, y, dw, dh);
    ctx.restore();
  }

  /** @param {CanvasRenderingContext2D} ctx */
  _drawParticles(ctx) {
    for (const p of this.particles) {
      const a = Math.max(0, Math.min(1, p.life / 600));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {string} color
   * @param {number} n
   */
  _burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 1,
        life: 400 + Math.random() * 500,
        color,
      });
    }
  }

  _setButtons(running) {
    if (this.ui.btnRun) this.ui.btnRun.disabled = running;
    if (this.ui.btnCash) this.ui.btnCash.disabled = !running;
    if (this.ui.betInput) this.ui.betInput.disabled = running;
    if (this.ui.btnHalf) this.ui.btnHalf.disabled = running;
    if (this.ui.btnDouble) this.ui.btnDouble.disabled = running;
    if (this.ui.btnMax) this.ui.btnMax.disabled = running;
  }

  _syncMultUi() {
    if (this.ui.multValue) {
      this.ui.multValue.textContent = `${this.multiplier.toFixed(2)}×`;
    }
  }

  /** @param {string} text */
  _setStatus(text) {
    if (this.ui.multStatus) this.ui.multStatus.textContent = text;
  }

  /** @param {string} cls */
  _setMultClass(cls) {
    if (!this.ui.multValue) return;
    this.ui.multValue.classList.remove('is-hot', 'is-danger', 'is-win');
    if (cls) this.ui.multValue.classList.add(cls);
  }

  _syncWalletUi() {
    if (this.ui.balanceValue) {
      this.ui.balanceValue.textContent = this.balance.toFixed(2);
    }
    if (this.ui.betInput && document.activeElement !== this.ui.betInput) {
      this.ui.betInput.value = String(this.bet);
    }
  }

  _syncFairUi() {
    if (this.ui.fairHash) this.ui.fairHash.textContent = this.fairness.shortHash();
  }

  _syncFairDialog() {
    if (this.ui.dlgServerHash) this.ui.dlgServerHash.textContent = this.fairness.serverSeedHash || '—';
    if (this.ui.dlgClientSeed) this.ui.dlgClientSeed.textContent = this.fairness.clientSeed || '—';
    if (this.ui.dlgNonce) this.ui.dlgNonce.textContent = String(this.fairness.nonce);
    if (this.ui.dlgLastCrash) {
      this.ui.dlgLastCrash.textContent = this.fairness.lastCrash
        ? `${this.fairness.lastCrash.toFixed(2)}×`
        : '—';
    }
  }

  /**
   * @param {number} mult
   * @param {boolean} win
   */
  _pushHistory(mult, win) {
    // Append newest on the right; drop oldest on the left when full
    this.history.push({ mult, win });
    while (this.history.length > HISTORY_MAX) this.history.shift();
    this._syncHistoryUi();
  }

  _syncHistoryUi() {
    // History is drawn on the canvas top rail — keep DOM node empty/hidden
    const el = this.ui.history;
    if (el) el.innerHTML = '';
  }

  _readBet() {
    const raw = this.ui.betInput?.value;
    const n = raw === '' || raw == null ? this.bet : Number(raw);
    return Number.isFinite(n) ? n : this.bet;
  }

  /** @param {number} n */
  _clampBet(n) {
    if (!Number.isFinite(n)) return 10;
    return Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(n)));
  }

  _loadBalance() {
    try {
      const v = Number(localStorage.getItem(WALLET_KEY));
      // Treat missing / empty / depleted wallet as a fresh start
      if (Number.isFinite(v) && v >= MIN_BET) return v;
    } catch {
      /* ignore */
    }
    return START_BALANCE;
  }

  _saveBalance() {
    try {
      localStorage.setItem(WALLET_KEY, String(this.balance));
    } catch {
      /* ignore */
    }
  }
}
