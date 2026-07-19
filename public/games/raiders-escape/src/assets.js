/**
 * Load + chroma-key assets for Raider's Escape.
 */

export const assets = {
  loaded: false,
  jungle: /** @type {HTMLImageElement | null} */ (null),
  boulder: /** @type {HTMLCanvasElement | null} */ (null),
  /** Seamless ruins stone floor texture (PNG). */
  floorTile: /** @type {HTMLImageElement | HTMLCanvasElement | null} */ (null),
  /** @type {HTMLCanvasElement[]} */
  runFrames: [],
  /** Horizontal sprite sheet (keyed + size-unified + foot-aligned). */
  runSheet: /** @type {HTMLCanvasElement | null} */ (null),
  /** Looping run footstep / chase bed. */
  runSfx: /** @type {HTMLAudioElement | null} */ (null),
  /** One-shot gasp when the scared pose hits. */
  scaredSfx: /** @type {HTMLAudioElement | null} */ (null),
  /** One-shot rope stretch when climb starts. */
  ropeClimbSfx: /** @type {HTMLAudioElement | null} */ (null),
  /** One-shot coin collect on cash-out (same as Coin Fighters). */
  cashOutSfx: /** @type {HTMLAudioElement | null} */ (null),
  /** Looping ambient / temple music bed. */
  music: /** @type {HTMLAudioElement | null} */ (null),
  /** Crash hit recoil pose (keyed + cropped). */
  scared: /** @type {HTMLCanvasElement | null} */ (null),
  /** Crash KO pose lying on floor (keyed + cropped). */
  die: /** @type {HTMLCanvasElement | null} */ (null),
  /** Idle / pre-run seated starting stance (keyed + cropped). */
  start: /** @type {HTMLCanvasElement | null} */ (null),
  /** Scrolling ground prop — overgrown stone monolith. */
  monolith: /** @type {HTMLCanvasElement | null} */ (null),
  /** Scrolling ground prop — mossy carved stone head. */
  stoneHead: /** @type {HTMLCanvasElement | null} */ (null),
  /** Scrolling ground prop — circular eye stone. */
  circleStone: /** @type {HTMLCanvasElement | null} */ (null),
  /** Scrolling ground prop — triangular mossy dolmen. */
  triangleStone: /** @type {HTMLCanvasElement | null} */ (null),
  /** Scrolling ground prop — rectangular carved stele. */
  rectangleStone: /** @type {HTMLCanvasElement | null} */ (null),
  /** Cash-out: back POV stop pose. */
  escapeBack: /** @type {HTMLCanvasElement | null} */ (null),
  /** Cash-out ending video (green screen keyed at draw time). */
  escapeEnd: /** @type {HTMLVideoElement | null} */ (null),
};

/** Bust cache when frames are replaced. */
const ASSET_VER = 'run-v39';
/** Two-frame run loop (idle A ↔ idle B). */
export const RUN_FRAME_COUNT = 2;

/**
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = `${src}?v=${ASSET_VER}`;
  });
}

/** Primary greenscreen (~#00E000 / #0BE104). */
const KEY_R = 10;
const KEY_G = 224;
const KEY_B = 8;
const KEY_DIST2 = 100 * 100;

/**
 * Key out greenscreen, near-white, OR near-black studio backgrounds.
 * @param {HTMLImageElement | HTMLCanvasElement} img
 * @returns {HTMLCanvasElement}
 */
function keyOutGreen(img) {
  const c = document.createElement('canvas');
  const w = /** @type {any} */ (img).naturalWidth || img.width;
  const h = /** @type {any} */ (img).naturalHeight || img.height;
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return c;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const dr = r - KEY_R;
    const dg = g - KEY_G;
    const db = b - KEY_B;
    const dist2 = dr * dr + dg * dg + db * db;
    const neonKey = dist2 < KEY_DIST2;
    const fringeKey = g > 150 && r < 110 && b < 110 && g > r * 1.7 && g > b * 1.7;
    const whiteKey =
      r > 215 && g > 215 && b > 215 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25;
    // Pure black backdrops on escape frames (avoid eating dark boots: keep threshold tight)
    const blackKey = r < 10 && g < 10 && b < 10;
    if (neonKey || fringeKey || whiteKey || blackKey) {
      px[i + 3] = 0;
    }
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/**
 * Trim transparent padding so floor-pinning uses real sprite feet/body.
 * @param {HTMLCanvasElement} src
 * @returns {HTMLCanvasElement}
 */
function cropOpaque(src) {
  const bb = opaqueBounds(src);
  if (!bb) return src;
  const w = bb.maxX - bb.minX + 1;
  const h = bb.maxY - bb.minY + 1;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return src;
  ctx.drawImage(src, bb.minX, bb.minY, w, h, 0, 0, w, h);
  return out;
}

/**
 * @param {HTMLCanvasElement} src
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number } | null}
 */
function opaqueBounds(src) {
  const ctx = src.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const { width: w, height: h } = src;
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * Pack run frames into identical canvases:
 * - normalize to one on-screen height (cluster median; never upscale tiny outliers)
 * - pin feet to one baseline so the loop stays planted
 * @param {HTMLCanvasElement[]} keyed
 * @param {number} [pad=6]
 * @returns {HTMLCanvasElement[]}
 */
function packRunFramesFootAligned(keyed, pad = 6) {
  const bounds = keyed.map((f) => opaqueBounds(f));
  if (bounds.some((b) => !b)) return keyed;

  /** @type {{ minX: number, minY: number, maxX: number, maxY: number }[]} */
  const bbs = /** @type {any} */ (bounds);
  const heights = bbs.map((b) => b.maxY - b.minY + 1);
  const sortedH = [...heights].sort((a, b) => a - b);
  const mid = sortedH.length >> 1;
  const roughMedian =
    sortedH.length % 2 === 1
      ? sortedH[mid]
      : Math.round((sortedH[mid - 1] + sortedH[mid]) / 2);

  // Ignore undersized outliers (e.g. a 1024px ref mixed with 1536px gens) so
  // we don't upscale them and make that frame look huge.
  const cluster = heights.filter((h) => h >= roughMedian * 0.9);
  const clusterSorted = [...cluster].sort((a, b) => a - b);
  const cMid = clusterSorted.length >> 1;
  const targetH =
    clusterSorted.length === 0
      ? roughMedian
      : clusterSorted.length % 2 === 1
        ? clusterSorted[cMid]
        : Math.round((clusterSorted[cMid - 1] + clusterSorted[cMid]) / 2);

  const scaled = bbs.map((b) => {
    const contentW = b.maxX - b.minX + 1;
    const contentH = b.maxY - b.minY + 1;
    // Force every frame to the same content height
    const scale = targetH / contentH;
    return {
      b,
      contentW,
      contentH,
      sw: Math.max(1, Math.round(contentW * scale)),
      sh: targetH,
    };
  });

  let maxScaledW = 0;
  for (const s of scaled) maxScaledW = Math.max(maxScaledW, s.sw);

  const cw = maxScaledW + pad * 2;
  const ch = targetH + pad * 2;
  const footY = ch - pad - 1;

  return keyed.map((src, i) => {
    const { b, contentW, contentH, sw, sh } = scaled[i];
    const out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;
    const octx = out.getContext('2d');
    if (!octx) return src;
    octx.imageSmoothingEnabled = false;
    const dx = Math.floor((cw - sw) / 2);
    const dy = footY - (sh - 1);
    octx.drawImage(src, b.minX, b.minY, contentW, contentH, dx, dy, sw, sh);
    return out;
  });
}

/**
 * @param {HTMLCanvasElement[]} frames
 * @returns {HTMLCanvasElement}
 */
function buildSpriteSheet(frames) {
  const fw = frames[0]?.width || 1;
  const fh = frames[0]?.height || 1;
  const sheet = document.createElement('canvas');
  sheet.width = fw * frames.length;
  sheet.height = fh;
  const ctx = sheet.getContext('2d');
  if (!ctx) return sheet;
  ctx.imageSmoothingEnabled = false;
  frames.forEach((f, i) => {
    ctx.drawImage(f, i * fw, 0);
  });
  return sheet;
}

export async function loadAssets() {
  const runPaths = Array.from({ length: RUN_FRAME_COUNT }, (_, i) => `assets/run-${i + 1}.png`);
  const paths = [
    'assets/jungle-bg.png',
    'assets/boulder.png',
    'assets/raider-scared.png',
    'assets/raider-die.png',
    'assets/raider-start.png',
    'assets/bg-monolith.png',
    'assets/bg-head.png',
    'assets/bg-circle.png',
    'assets/bg-triangle.png',
    'assets/bg-rectangle.png',
    'assets/floor-ruins.png',
    'assets/escape-back.png',
    ...runPaths,
  ];
  const loaded = await Promise.all(paths.map((p) => loadImage(p)));
  const jungle = loaded[0];
  const boulderRaw = loaded[1];
  const scaredRaw = loaded[2];
  const dieRaw = loaded[3];
  const startRaw = loaded[4];
  const monolithRaw = loaded[5];
  const stoneHeadRaw = loaded[6];
  const circleRaw = loaded[7];
  const triangleRaw = loaded[8];
  const rectangleRaw = loaded[9];
  const floorRaw = loaded[10];
  const escapeBackRaw = loaded[11];
  const runImgs = loaded.slice(12, 12 + RUN_FRAME_COUNT);

  assets.jungle = jungle;
  assets.boulder = cropOpaque(keyOutGreen(boulderRaw));
  assets.scared = cropOpaque(keyOutGreen(scaredRaw));
  assets.die = cropOpaque(keyOutGreen(dieRaw));
  assets.start = cropOpaque(keyOutGreen(startRaw));
  assets.monolith = cropOpaque(keyOutGreen(monolithRaw));
  assets.stoneHead = cropOpaque(keyOutGreen(stoneHeadRaw));
  assets.circleStone = cropOpaque(keyOutGreen(circleRaw));
  assets.triangleStone = cropOpaque(keyOutGreen(triangleRaw));
  assets.rectangleStone = cropOpaque(keyOutGreen(rectangleRaw));
  assets.floorTile = floorRaw;
  assets.escapeBack = cropOpaque(keyOutGreen(escapeBackRaw));

  // Run cycle: key bg, unify size + pin feet, build sprite sheet
  const keyed = runImgs.map((img) => keyOutGreen(img));
  assets.runFrames = packRunFramesFootAligned(keyed);
  assets.runSheet = buildSpriteSheet(assets.runFrames);

  // Cash-out ending video (green keyed at draw time)
  const escapeEnd = document.createElement('video');
  escapeEnd.preload = 'auto';
  escapeEnd.muted = true;
  escapeEnd.playsInline = true;
  escapeEnd.loop = false;
  escapeEnd.src = `assets/escape-end.mp4?v=${ASSET_VER}`;
  assets.escapeEnd = escapeEnd;
  await new Promise((resolve) => {
    const done = () => resolve(undefined);
    escapeEnd.addEventListener('canplaythrough', done, { once: true });
    escapeEnd.addEventListener('error', done, { once: true });
    // Kick load; resolve even if already buffered
    escapeEnd.load();
    if (escapeEnd.readyState >= 3) done();
  });

  const runSfx = new Audio(`assets/raider-running.mp3?v=${ASSET_VER}`);
  runSfx.loop = true;
  runSfx.preload = 'auto';
  runSfx.volume = 0.55;
  assets.runSfx = runSfx;

  const scaredSfx = new Audio(`assets/raider-scared.mp3?v=${ASSET_VER}`);
  scaredSfx.preload = 'auto';
  scaredSfx.volume = 0.75;
  assets.scaredSfx = scaredSfx;

  const ropeClimbSfx = new Audio(`assets/rope-climb.mp3?v=${ASSET_VER}`);
  ropeClimbSfx.preload = 'auto';
  ropeClimbSfx.volume = 0.392;
  assets.ropeClimbSfx = ropeClimbSfx;

  const cashOutSfx = new Audio(`assets/coins-collect.mp3?v=${ASSET_VER}`);
  cashOutSfx.preload = 'auto';
  cashOutSfx.volume = 0.75;
  assets.cashOutSfx = cashOutSfx;

  const music = new Audio(`assets/music.mp3?v=${ASSET_VER}`);
  music.loop = false;
  music.preload = 'auto';
  music.volume = 0.35;
  assets.music = music;
  // Kick decode early so first play can seek past the quiet intro reliably
  try {
    music.load();
  } catch {
    /* ignore */
  }

  assets.loaded = true;
}
