/**
 * Fighter entity: state machine + animation + health.
 * States: IDLE | ATTACKING | HIT_REACTION | SPECIAL
 */

import { AnimationManager } from './animation-manager.js';
import { FIGHTER_STATE, HEALTH, TIMING } from './constants.js';

export class Fighter {
  /**
   * @param {{
   *   name: string,
   *   x: number,
   *   y: number,
   *   facing: 1 | -1,
   *   drawScale: number,
   *   isPlayer: boolean,
   * }} opts
   */
  constructor(opts) {
    this.name = opts.name;
    this.homeX = opts.x;
    this.x = opts.x;
    this.y = opts.y;
    this.facing = opts.facing;
    this.drawScale = opts.drawScale;
    this.isPlayer = opts.isPlayer;

    this.health = HEALTH.MAX_BOXES;
    this.maxHealth = HEALTH.MAX_BOXES;
    this.state = FIGHTER_STATE.IDLE;
    this.anim = new AnimationManager();
    this.flashTimer = 0;
    this.hitFlash = 0;

    /** @type {null | {
     *   elapsed: number,
     *   total: number,
     *   impactAt: number,
     *   impactFired: boolean,
     *   keyframes: Array<{ t: number, x: number }>,
     *   onImpact?: () => void,
     *   onComplete?: () => void,
     * }} */
    this.motion = null;
  }

  /** @param {Record<string, import('./assets.js').AnimationDef>} defs */
  registerAnimations(defs) {
    for (const [name, def] of Object.entries(defs)) {
      this.anim.register(name, def);
    }
    this.anim.play('idle');
  }

  /** @param {number} dt */
  update(dt) {
    this.anim.update(dt);
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);
    this._updateMotion(dt);
  }

  /** @param {number} dt */
  _updateMotion(dt) {
    if (!this.motion) return;

    this.motion.elapsed += dt;
    const { elapsed, keyframes, impactAt } = this.motion;

    // Interpolate position along kick lunge keyframes
    let a = keyframes[0];
    let b = keyframes[keyframes.length - 1];
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (elapsed >= keyframes[i].t && elapsed <= keyframes[i + 1].t) {
        a = keyframes[i];
        b = keyframes[i + 1];
        break;
      }
      if (elapsed > keyframes[i + 1].t) {
        a = keyframes[i + 1];
        b = keyframes[i + 1];
      }
    }

    const span = Math.max(1, b.t - a.t);
    const u = Math.max(0, Math.min(1, (elapsed - a.t) / span));
    const eased = easeInOutCubic(u);
    this.x = a.x + (b.x - a.x) * eased;

    if (!this.motion.impactFired && elapsed >= impactAt) {
      this.motion.impactFired = true;
      this.motion.onImpact?.();
    }

    if (elapsed >= this.motion.total) {
      const done = this.motion.onComplete;
      this.motion = null;
      this.x = this.homeX;
      this.setIdle();
      done?.();
    }
  }

  setIdle() {
    this.state = FIGHTER_STATE.IDLE;
    this.x = this.homeX;
    this.anim.play('idle', { loop: true });
  }

  /**
   * Win-bet kick: wind up, lunge toward target, hold contact, recover.
   * @param {number} targetX — opponent x (kick aims here)
   * @param {{ onImpact?: () => void, onComplete?: () => void }} [opts]
   */
  playKickAttack(targetX, opts = {}) {
    this._playLungeAttack(targetX, opts);
  }

  /**
   * Loss-round punch: same lunge motion, uses attack sprite (punch pose for 2P).
   * @param {number} targetX — player x (punch aims here)
   * @param {{ onImpact?: () => void, onComplete?: () => void }} [opts]
   */
  playPunchAttack(targetX, opts = {}) {
    this._playLungeAttack(targetX, opts);
  }

  /**
   * Shared wind-up → lunge → hold → recover toward targetX.
   * @param {number} targetX
   * @param {{ onImpact?: () => void, onComplete?: () => void }} [opts]
   */
  _playLungeAttack(targetX, opts = {}) {
    this.state = FIGHTER_STATE.ATTACKING;

    const windup = TIMING.KICK_WINDUP;
    const lunge = TIMING.KICK_LUNGE;
    const hold = TIMING.KICK_HOLD;
    const recover = TIMING.KICK_RECOVER;
    const total = windup + lunge + hold + recover;
    const reachX = targetX - this.facing * TIMING.KICK_REACH;

    this.motion = {
      elapsed: 0,
      total,
      impactAt: windup + lunge,
      impactFired: false,
      onImpact: opts.onImpact,
      onComplete: opts.onComplete,
      keyframes: [
        { t: 0, x: this.homeX },
        { t: windup, x: this.homeX - this.facing * 28 },
        { t: windup + lunge, x: reachX },
        { t: windup + lunge + hold, x: reachX },
        { t: total, x: this.homeX },
      ],
    };

    this.anim.play('attack', { loop: false });
  }

  /**
   * Generic attack (used by opponent / fallback).
   * @param {(() => void) | { onImpact?: () => void, onComplete?: () => void }} [arg]
   */
  playAttack(arg) {
    const opts = typeof arg === 'function' ? { onComplete: arg } : arg ?? {};
    this.state = FIGHTER_STATE.ATTACKING;
    // SOUND: play attack whoosh / punch SFX here

    let impactFired = false;
    const fireImpact = () => {
      if (impactFired) return;
      impactFired = true;
      opts.onImpact?.();
    };

    const duration = TIMING.ATTACK_DURATION;
    if (opts.onImpact) {
      window.setTimeout(fireImpact, Math.floor(duration * 0.45));
    }

    this.anim.play('attack', {
      loop: false,
      onComplete: () => {
        fireImpact();
        this.setIdle();
        opts.onComplete?.();
      },
    });
  }

  /**
   * @param {() => void} [onComplete]
   */
  playHitReaction(onComplete) {
    this.state = FIGHTER_STATE.HIT_REACTION;
    this.hitFlash = 120;
    // SOUND: play hit / impact SFX here
    this.anim.play('hit', {
      loop: false,
      onComplete: () => {
        this.setIdle();
        onComplete?.();
      },
    });
  }

  /**
   * @param {() => void} [onComplete]
   */
  playSpecial(onComplete) {
    this.state = FIGHTER_STATE.SPECIAL;
    this.flashTimer = 200;
    this.anim.play('special', {
      loop: false,
      onComplete: () => {
        this.setIdle();
        onComplete?.();
      },
    });
  }

  /**
   * @param {number} [amount]
   * @returns {number}
   */
  takeDamage(amount = 1) {
    this.health = Math.max(0, this.health - amount);
    return this.health;
  }

  reset() {
    this.health = this.maxHealth;
    this.motion = null;
    this.x = this.homeX;
    this.setIdle();
    this.flashTimer = 0;
    this.hitFlash = 0;
  }

  get isBusy() {
    return (
      this.state === FIGHTER_STATE.ATTACKING ||
      this.state === FIGHTER_STATE.HIT_REACTION ||
      this.state === FIGHTER_STATE.SPECIAL
    );
  }
}

/** @param {number} t */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
