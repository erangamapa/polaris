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
const SFX_VOL = 0.55;
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
/** Floor pin for die pose — keep small so she sits on dirt, not through it. */
const DIE_FLOOR_SINK = 6;
/** Run flipbook: idle ~10 FPS, panic down to ~18 FPS as crash approaches. */
const RUN_FRAME_MS_IDLE = 220;
const RUN_FRAME_MS_PANIC = 140;

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
    this.boulderAngle = 0;
    /** Crash lunge progress 0→CRASH_LUNGE_MS; -1 when not crashing */
    this.crashAnimT = -1;
    /** Ms since boulder impact; -1 before hit. */
    this.crashHitT = -1;
    /** @type {'none' | 'scared' | 'dead'} */
    this.deathPose = 'none';
    this.shake = 0;
    this.musicMuted = this._loadMutePref(MUSIC_MUTE_KEY, false);
    this.soundMuted = this._loadMutePref(SOUND_MUTE_KEY, false);
    this.musicStarted = false;
    this.flash = 0;
    /** @type {Array<{ x: number, y: number, vx: number, vy: number, life: number, color: string }>} */
    this.particles = [];
    /** @type {Array<{ mult: number, win: boolean }>} */
    this.history = [];
    this.running = false;
    this.lastTs = 0;
    this._cashedMult = 1;

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

  _applyAudioLevels() {
    const music = assets.music;
    if (music) music.volume = this.musicMuted ? 0 : MUSIC_VOL;
    const sfx = assets.runSfx;
    if (sfx) sfx.volume = this.soundMuted ? 0 : SFX_VOL;
  }

  _ensureMusic() {
    const a = assets.music;
    if (!a || this.musicMuted) return;
    try {
      a.loop = true;
      if (a.paused || !this.musicStarted) {
        void a.play().then(() => {
          this.musicStarted = true;
        }).catch(() => {
          /* autoplay blocked until gesture */
        });
      }
    } catch {
      /* ignore */
    }
  }

  async startRound() {
    if (this.phase === PHASE.RUNNING) return;
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
    const payout = this.activeStake * this.multiplier;
    this.balance += payout;
    this._cashedMult = this.multiplier;
    this.activeStake = 0;
    this.phase = PHASE.CASHED;
    this._saveBalance();
    this._syncWalletUi();
    this._setButtons(false);
    this._setStatus(`Escaped at ${this._cashedMult.toFixed(2)}×`);
    this._setMultClass('is-win');
    this.flash = 0.45;
    this._burst(RUNNER_X, FLOOR_Y - 140, '#e8c76a', 28);
    this._burst(RUNNER_X, FLOOR_Y - 160, '#39ff9a', 18);
    this._pushHistory(this._cashedMult, true);
    window.setTimeout(() => {
      if (this.phase === PHASE.CASHED) {
        this.phase = PHASE.IDLE;
        this._setStatus('Place a bet to run');
        this._setMultClass('');
        this.multiplier = 1;
        this._syncMultUi();
      }
    }, 1600);
  }

  _crash() {
    this._stopRunSfx();
    this.phase = PHASE.CRASHED;
    this.crashAnimT = 0;
    this.crashHitT = -1;
    this.deathPose = 'none';
    this.activeStake = 0;
    this._setButtons(false);
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

    const tension = this._tension();

    const scrollSpeed = 0.18 + tension * 0.55;
    // Do not wrap scroll — wrapping on a non-period length caused a visible hitch
    this.bgScroll += dt * scrollSpeed;
    this.bgScroll2 += dt * scrollSpeed * 0.55;

    if (this.phase === PHASE.CRASHED && this.crashAnimT >= 0) {
      const prev = this.crashAnimT;
      this.crashAnimT = Math.min(CRASH_LUNGE_MS, this.crashAnimT + dt);
      // Impact: boulder reaches the runner → scared + Mario flash
      if (prev < CRASH_LUNGE_MS && this.crashAnimT >= CRASH_LUNGE_MS && this.crashHitT < 0) {
        this.crashHitT = 0;
        this.deathPose = 'scared';
        this.shake = Math.max(this.shake, 14);
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
        this.multiplier = this.crashPoint;
        this._syncMultUi();
        this._crash();
      } else {
        if (this.autoCashEnabled && this.multiplier >= this.autoCashAt) {
          this.cashOut();
        } else {
          this._syncMultUi();
          // Stay gold for the whole run — no “about to lose” color telegraph
        }
      }
      this._advanceRunFrame(dt, tension);
      this._syncRunSfxRate(tension);
      this.boulderAngle += dt * (0.004 + tension * 0.012);
      if (tension > 0.35 && Math.random() < dt * 0.006 * tension) {
        this.shake = Math.max(this.shake, 1.5 + tension * 5);
      }
      // Dust kicks as panic rises
      if (tension > 0.2 && Math.random() < dt * 0.02 * tension) {
        this._burst(RUNNER_X - 30, FLOOR_Y - 8, '#c4a574', 3 + Math.floor(tension * 5));
      }
    } else if (this.phase === PHASE.IDLE) {
      this._advanceRunFrame(dt, 0.12);
      this.boulderAngle += dt * 0.0015;
    } else if (this.phase === PHASE.CRASHED) {
      this.boulderAngle += dt * 0.014;
    } else {
      this.boulderAngle += dt * 0.002;
    }

    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.vy += 0.02 * dt;
      return p.life > 0;
    });
  }

  /** 0→1 how close the round is to crashing. */
  _tension() {
    if (this.phase === PHASE.CRASHED) return 1;
    if (this.phase !== PHASE.RUNNING) return 0.12;
    return Math.min(1, (this.multiplier - 1) / Math.max(0.01, this.crashPoint - 1));
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

  /** @param {number} tension */
  _syncRunSfxRate(tension) {
    const a = assets.runSfx;
    if (!a || a.paused || this.soundMuted) return;
    // Slight panic speed-up as crash nears (1.0 → ~1.25)
    a.playbackRate = 1 + Math.max(0, Math.min(1, tension)) * 0.25;
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
    this._drawLoopedBg(ctx, img, this.bgScroll * 0.35, drawW, 0, H);

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
    // Top bar — scrolling multiplier history
    ctx.fillStyle = 'rgba(8, 18, 14, 0.72)';
    ctx.fillRect(0, 18, W, 40);
    ctx.strokeStyle = 'rgba(232, 199, 106, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.lineTo(W, 18);
    ctx.moveTo(0, 58);
    ctx.lineTo(W, 58);
    ctx.stroke();

    this._drawHistoryRail(ctx);
  }

  /** @param {CanvasRenderingContext2D} ctx */
  _drawHistoryRail(ctx) {
    const bandY = 38;
    // Leave room for in-frame brand (left) + wallet (right)
    if (this.history.length === 0) return;

    // Newest-first, each round once — never wrap/repeat chips.
    const chipW = 64;
    const gap = 8;
    const stride = chipW + gap;
    const padL = 210;
    const padR = 150;
    let x = padL;

    ctx.font = '700 13px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const h of this.history) {
      if (x + chipW > W - padR) break;
      const cx = x + chipW / 2;
      const win = h.win;
      ctx.fillStyle = win ? 'rgba(20, 60, 40, 0.9)' : 'rgba(60, 20, 24, 0.9)';
      ctx.strokeStyle = win ? 'rgba(57, 255, 154, 0.55)' : 'rgba(255, 100, 100, 0.5)';
      ctx.lineWidth = 1.5;
      const rx = x + 4;
      const ry = bandY - 12;
      const rw = chipW - 8;
      const rh = 24;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(rx, ry, rw, rh, 10);
      } else {
        ctx.rect(rx, ry, rw, rh);
      }
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = win ? '#39ff9a' : '#ff8a8a';
      ctx.fillText(`${h.mult.toFixed(2)}×`, cx, bandY);
      x += stride;
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  _drawGround(ctx) {
    const g = ctx.createLinearGradient(0, FLOOR_Y - 20, 0, H);
    g.addColorStop(0, 'rgba(60, 42, 22, 0.0)');
    g.addColorStop(0.2, 'rgba(50, 36, 18, 0.75)');
    g.addColorStop(1, '#1a120a');
    ctx.fillStyle = g;
    ctx.fillRect(0, FLOOR_Y - 20, W, H - (FLOOR_Y - 20));

    ctx.strokeStyle = 'rgba(232, 199, 106, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_Y);
    ctx.lineTo(W, FLOOR_Y);
    ctx.stroke();
  }

  /** @param {CanvasRenderingContext2D} ctx */
  _drawBoulder(ctx) {
    const boulder = assets.boulder;
    if (!boulder) return;

    // Stay parked on the left until the player loses (crash), then lunge
    let x = BOULDER_PARK_X;
    if (this.phase === PHASE.CRASHED && this.crashAnimT >= 0) {
      const u = Math.min(1, this.crashAnimT / CRASH_LUNGE_MS);
      const e = u * u;
      x = BOULDER_PARK_X + (BOULDER_HIT_X - BOULDER_PARK_X) * e;
    }

    const size = BOULDER_SIZE;
    // Center so the cropped rock rests on the floor line (not sunk into dirt)
    const y = FLOOR_Y - size * 0.52;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.boulderAngle);
    ctx.drawImage(boulder, -size / 2, -size / 2, size, size);
    ctx.restore();

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, FLOOR_Y + 6, size * 0.38, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Play frames 1→8 in order, then loop. Speeds up with tension (panic run).
   * @param {number} dt
   * @param {number} [tension=0]
   */
  _advanceRunFrame(dt, tension = 0) {
    const n = assets.runFrames.length || 2;
    if (n < 1) return;
    const t = Math.max(0, Math.min(1, tension));
    const frameMs = RUN_FRAME_MS_IDLE + (RUN_FRAME_MS_PANIC - RUN_FRAME_MS_IDLE) * t;
    this.frameTimer += dt;
    // One step max per tick — never skip frames
    if (this.frameTimer < frameMs) return;
    this.frameTimer -= frameMs;
    this.frameIndex = (this.frameIndex + 1) % n;
  }

  /** @param {CanvasRenderingContext2D} ctx */
  _drawRunner(ctx) {
    ctx.imageSmoothingEnabled = false;

    if (this.phase === PHASE.CRASHED) {
      this._drawCrashRunner(ctx);
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

    if (this.phase === PHASE.CASHED) {
      y -= 8;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr, x - dw / 2, y, dw, dh);
    ctx.restore();

    // Soft ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, FLOOR_Y + 4, dw * 0.28, 10, 0, 0, Math.PI * 2);
    ctx.fill();
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
      this._drawRunnerShadow(ctx, x, dw * 0.28);
      return;
    }

    if (this.deathPose === 'scared') {
      const spr = assets.scared;
      if (!spr) return;
      // Mario hurt flash: blink on/off for the scared window
      const blinkOn = Math.floor(this.crashHitT / HURT_FLASH_PERIOD_MS) % 2 === 0;
      if (!blinkOn) {
        this._drawRunnerShadow(ctx, x, 48);
        return;
      }
      const scale = SCARED_TARGET_H / spr.height;
      const dw = spr.width * scale;
      const dh = spr.height * scale;
      const y = FLOOR_Y - dh + 8;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spr, x - dw / 2, y, dw, dh);
      ctx.restore();
      this._drawRunnerShadow(ctx, x, dw * 0.28);
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
    this._drawRunnerShadow(ctx, x, dw * 0.42);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} rx
   */
  _drawRunnerShadow(ctx, x, rx) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, FLOOR_Y + 4, rx, 10, 0, 0, Math.PI * 2);
    ctx.fill();
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
    this.history.unshift({ mult, win });
    if (this.history.length > HISTORY_MAX) this.history.length = HISTORY_MAX;
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
