/**
 * Sprite-based animation manager with frame interpolation.
 * Supports sprite sheets, single-image procedural idle, and video frame sequences.
 */

export class AnimationManager {
  constructor() {
    /** @type {Map<string, import('./assets.js').AnimationDef>} */
    this.definitions = new Map();
    this.currentName = 'idle';
    this.frameIndex = 0;
    this.elapsed = 0;
    this.loop = true;
    this.finished = false;
    this.onComplete = null;
  }

  /**
   * @param {string} name
   * @param {import('./assets.js').AnimationDef} def
   */
  register(name, def) {
    this.definitions.set(name, def);
  }

  /**
   * @param {string} name
   * @param {{ loop?: boolean, onComplete?: () => void }} [opts]
   */
  play(name, opts = {}) {
    if (this.currentName === name && !this.finished && opts.loop !== false) {
      return;
    }

    this.currentName = name;
    this.frameIndex = 0;
    this.elapsed = 0;
    this.loop = opts.loop ?? this.definitions.get(name)?.loop ?? true;
    this.finished = false;
    this.onComplete = opts.onComplete ?? null;
  }

  /** @param {number} dt ms since last tick */
  update(dt) {
    const def = this.definitions.get(this.currentName);
    if (!def) return;

    if (def.frameImages?.length) {
      this._updateSequence(def, dt);
      return;
    }

    if (def.procedural) {
      this._updateProcedural(def, dt);
      return;
    }

    const frames = def.frames;
    if (!frames?.length) return;

    this.elapsed += dt;
    const frame = frames[this.frameIndex];
    const duration = frame.duration ?? def.frameDuration ?? 80;

    if (this.elapsed >= duration) {
      this.elapsed -= duration;
      this.frameIndex += 1;

      if (this.frameIndex >= frames.length) {
        if (this.loop) {
          this.frameIndex = 0;
        } else {
          this.frameIndex = frames.length - 1;
          this.finished = true;
          this.onComplete?.();
          this.onComplete = null;
        }
      }
    }
  }

  /**
   * @param {import('./assets.js').AnimationDef} def
   * @param {number} dt
   */
  _updateSequence(def, dt) {
    const total = def.frameImages?.length ?? 0;
    if (!total) return;

    this.elapsed += dt;
    const duration = def.frameDuration ?? 1000 / 24;

    if (this.elapsed >= duration) {
      this.elapsed -= duration;
      this.frameIndex += 1;

      if (this.frameIndex >= total) {
        if (this.loop) {
          this.frameIndex = 0;
        } else {
          this.frameIndex = total - 1;
          this.finished = true;
          this.onComplete?.();
          this.onComplete = null;
        }
      }
    }
  }

  /** @param {import('./assets.js').AnimationDef | undefined} def @param {number} dt */
  _updateProcedural(def, dt) {
    if (!def?.proceduralFrames?.length) return;
    if (this.finished) return;

    this.elapsed += dt;
    const duration = def.frameDuration ?? 100;
    const total = def.proceduralFrames.length;

    if (this.elapsed >= duration) {
      this.elapsed -= duration;

      if (this.loop) {
        this.frameIndex = (this.frameIndex + 1) % total;
        return;
      }

      if (this.frameIndex < total - 1) {
        this.frameIndex += 1;
      } else {
        this.finished = true;
        this.onComplete?.();
        this.onComplete = null;
      }
    }
  }

  /** @returns {import('./assets.js').DrawFrame} */
  getCurrentFrame() {
    const def = this.definitions.get(this.currentName);
    if (!def) {
      return { sx: 0, sy: 0, sw: 0, sh: 0, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    }

    if (def.frameImages?.length) {
      const img = def.frameImages[this.frameIndex] ?? def.frameImages[0];
      return {
        sx: 0,
        sy: 0,
        sw: img.width,
        sh: img.height,
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        alpha: 1,
      };
    }

    if (def.procedural && def.proceduralFrames?.length) {
      const t = def.proceduralFrames[this.frameIndex];
      return {
        sx: 0,
        sy: 0,
        sw: def.frameW,
        sh: def.frameH,
        offsetX: t.offsetX ?? 0,
        offsetY: t.offsetY ?? 0,
        scaleX: t.scaleX ?? 1,
        scaleY: t.scaleY ?? 1,
        rotation: t.rotation ?? 0,
        alpha: t.alpha ?? 1,
      };
    }

    const frame = def.frames?.[this.frameIndex] ?? def.frames?.[0];
    if (!frame) {
      return {
        sx: 0,
        sy: 0,
        sw: def.frameW,
        sh: def.frameH,
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        alpha: 1,
      };
    }

    return {
      sx: frame.x,
      sy: frame.y,
      sw: def.frameW,
      sh: def.frameH,
      offsetX: frame.offsetX ?? 0,
      offsetY: frame.offsetY ?? 0,
      scaleX: frame.scaleX ?? 1,
      scaleY: frame.scaleY ?? 1,
      rotation: frame.rotation ?? 0,
      alpha: frame.alpha ?? 1,
    };
  }

  get sheet() {
    return this.definitions.get(this.currentName)?.sheet ?? null;
  }

  get image() {
    const def = this.definitions.get(this.currentName);
    if (!def) return null;
    if (def.frameImages?.length) {
      return def.frameImages[this.frameIndex] ?? def.frameImages[0];
    }
    return def.image ?? null;
  }

  isPlaying(name) {
    return this.currentName === name && !this.finished;
  }
}
