/**
 * Hit sparks, floating damage numbers, screen shake, impact flashes.
 */

export class EffectsSystem {
  constructor() {
    /** @type {Array<{ x: number, y: number, life: number, maxLife: number, size: number, vx: number, vy: number, color: string }>} */
    this.sparks = [];
    /** @type {Array<{ x: number, y: number, text: string, color: string, life: number, maxLife: number, vy: number }>} */
    this.floatTexts = [];
    /** @type {Array<{ x: number, y: number, text: string, color: string, life: number, maxLife: number, vy: number, scale: number }>} */
    this.multiplierPopups = [];
    /** @type {Array<{ life: number, maxLife: number, color: string, strength: number }>} */
    this.flashes = [];
    this.shake = { intensity: 0, duration: 0, elapsed: 0 };
    this.specialBanner = { active: false, life: 0, maxLife: 1800, text: 'SPECIAL ATTACK READY!' };
    /** Center Nx bust tint — red flash after breaking a streak */
    this.multiplierTint = { active: false, life: 0, maxLife: 500 };
  }

  /** @param {number} dt */
  update(dt) {
    this.sparks = this.sparks.filter((s) => {
      s.life -= dt;
      s.x += s.vx * (dt / 16);
      s.y += s.vy * (dt / 16);
      s.vy += 0.15;
      return s.life > 0;
    });

    this.floatTexts = this.floatTexts.filter((t) => {
      t.life -= dt;
      t.y += t.vy * (dt / 16);
      return t.life > 0;
    });

    this.multiplierPopups = this.multiplierPopups.filter((p) => {
      p.life -= dt;
      p.y += p.vy * (dt / 16);
      // Pop in then ease
      const t = 1 - p.life / p.maxLife;
      p.scale = t < 0.15 ? 0.6 + (t / 0.15) * 0.55 : 1.05 - Math.min(0.15, (t - 0.15) * 0.2);
      return p.life > 0;
    });

    this.flashes = this.flashes.filter((f) => {
      f.life -= dt;
      return f.life > 0;
    });

    if (this.shake.duration > 0) {
      this.shake.elapsed += dt;
      if (this.shake.elapsed >= this.shake.duration) {
        this.shake.intensity = 0;
        this.shake.duration = 0;
        this.shake.elapsed = 0;
      }
    }

    if (this.specialBanner.active) {
      this.specialBanner.life -= dt;
      if (this.specialBanner.life <= 0) {
        this.specialBanner.active = false;
      }
    }

    if (this.multiplierTint.active) {
      this.multiplierTint.life -= dt;
      if (this.multiplierTint.life <= 0) {
        this.multiplierTint.active = false;
      }
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} [count]
   */
  spawnSparks(x, y, count = 14) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 2 + Math.random() * 5;
      this.sparks.push({
        x,
        y,
        life: 280 + Math.random() * 200,
        maxLife: 400,
        size: 2 + Math.random() * 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: Math.random() > 0.4 ? '#fff8a0' : '#ffaa33',
      });
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} amount
   * @param {'dealt' | 'received'} kind
   */
  spawnDamageNumber(x, y, amount, kind) {
    this.floatTexts.push({
      x,
      y,
      text: String(amount),
      color: kind === 'dealt' ? '#44ff77' : '#ff4455',
      life: 900,
      maxLife: 900,
      vy: -2.2,
    });
  }

  /**
   * Bet multiplier popup — left side between HUD and fighter head.
   * @param {number} value
   * @param {boolean} [won]
   * @param {{ x?: number, y?: number }} [pos]
   */
  spawnMultiplierPopup(value, won = true, pos = {}) {
    const n = Number(value) || 0;
    const text =
      n >= 100 ? `${Math.round(n)}x` : Number.isInteger(n) ? `${n}.00x` : `${n.toFixed(2)}x`;

    this.multiplierPopups.push({
      x: pos.x ?? 118,
      y: pos.y ?? 268,
      text,
      color: won ? '#ffe566' : '#ff6b6b',
      life: 1400,
      maxLife: 1400,
      vy: -0.4,
      scale: 0.6,
    });
  }

  /** @param {number} [strength] 0–1 @param {number} [duration] ms */
  triggerFlash(strength = 0.55, duration = 120) {
    this.flashes.push({
      life: duration,
      maxLife: duration,
      color: '#ffffff',
      strength,
    });
  }

  /** @param {number} intensity @param {number} duration ms */
  triggerShake(intensity = 8, duration = 200) {
    this.shake.intensity = intensity;
    this.shake.duration = duration;
    this.shake.elapsed = 0;
  }

  /**
   * @param {number} [duration]
   * @param {string} [text]
   */
  showSpecialBanner(duration = 1800, text = 'SPECIAL ATTACK READY!') {
    this.specialBanner.active = true;
    this.specialBanner.life = duration;
    this.specialBanner.maxLife = duration;
    this.specialBanner.text = text;
  }

  /** Brief red tint on the center multiplier after busting a climb. */
  triggerMultiplierBustFlash(duration = 500) {
    this.multiplierTint.active = true;
    this.multiplierTint.life = duration;
    this.multiplierTint.maxLife = duration;
  }

  getShakeOffset() {
    if (this.shake.intensity <= 0) return { x: 0, y: 0 };
    const fade = 1 - this.shake.elapsed / this.shake.duration;
    const i = this.shake.intensity * fade;
    return {
      x: (Math.random() - 0.5) * 2 * i,
      y: (Math.random() - 0.5) * 2 * i,
    };
  }
}
