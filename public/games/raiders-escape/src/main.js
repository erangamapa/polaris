/**
 * Raider's Escape — entry point
 */

import { loadAssets } from './assets.js';
import { Game } from './game.js';

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('gameCanvas'));

const ui = {
  balanceValue: document.getElementById('balanceValue'),
  multValue: document.getElementById('multValue'),
  multStatus: document.getElementById('multStatus'),
  multOverlay: document.getElementById('multOverlay'),
  history: document.getElementById('history'),
  fairChip: document.getElementById('fairChip'),
  fairHash: document.getElementById('fairHash'),
  betInput: /** @type {HTMLInputElement} */ (document.getElementById('betInput')),
  autoCashInput: /** @type {HTMLInputElement} */ (document.getElementById('autoCashInput')),
  btnHalf: document.getElementById('btnHalf'),
  btnDouble: document.getElementById('btnDouble'),
  btnMax: document.getElementById('btnMax'),
  btnAutoToggle: document.getElementById('btnAutoToggle'),
  btnRun: /** @type {HTMLButtonElement} */ (document.getElementById('btnRun')),
  btnCash: /** @type {HTMLButtonElement} */ (document.getElementById('btnCash')),
  btnFairness: document.getElementById('btnFairness'),
  btnCloseFair: document.getElementById('btnCloseFair'),
  btnMusic: document.getElementById('btnMusic'),
  btnSound: document.getElementById('btnSound'),
  btnSafe: document.getElementById('btnSafe'),
  btnHelp: document.getElementById('btnHelp'),
  helpModal: document.getElementById('helpModal'),
  btnCloseHelp: document.getElementById('btnCloseHelp'),
  fairModal: document.getElementById('fairModal'),
  nextRoundOverlay: document.getElementById('nextRoundOverlay'),
  btnNextRound: document.getElementById('btnNextRound'),
  crashFate: document.getElementById('crashFate'),
  crashFateMult: document.getElementById('crashFateMult'),
  crashFateSub: document.getElementById('crashFateSub'),
  dlgServerHash: document.getElementById('dlgServerHash'),
  dlgClientSeed: document.getElementById('dlgClientSeed'),
  dlgNonce: document.getElementById('dlgNonce'),
  dlgLastCrash: document.getElementById('dlgLastCrash'),
};

const game = new Game(canvas, ui);

const CANVAS_W = 960;
const CANVAS_H = 540;

/**
 * Uniform cover-fit inside `.stage-canvas-clip` (inset leaves thin black bars
 * top/bottom). Scale is uniform — no sprite distortion; sides may clip.
 */
function syncCanvasCover() {
  const box = /** @type {HTMLElement | null} */ (document.querySelector('.stage-canvas-clip'));
  if (!box || !canvas) return;

  const boxW = box.clientWidth;
  const boxH = box.clientHeight;
  if (boxW <= 0 || boxH <= 0) return;

  const scale = Math.max(boxW / CANVAS_W, boxH / CANVAS_H);
  const cssW = CANVAS_W * scale;
  const cssH = CANVAS_H * scale;

  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.style.left = `${(boxW - cssW) / 2}px`;
  canvas.style.top = `${(boxH - cssH) / 2}px`;

  // Canvas-space insets for the clipped (invisible) edges — keep HUD inside view
  const cropX = Math.max(0, (cssW - boxW) / (2 * scale));
  const cropY = Math.max(0, (cssH - boxH) / (2 * scale));
  game.setCoverCrop(cropX, cropY);
}

async function boot() {
  try {
    await loadAssets();
    await game.init();
    syncCanvasCover();
    window.addEventListener('resize', syncCanvasCover);
    if (typeof ResizeObserver !== 'undefined') {
      const box = document.querySelector('.stage-canvas-clip');
      if (box) new ResizeObserver(syncCanvasCover).observe(box);
    }
  } catch (err) {
    console.error('[Raider\'s Escape] Failed to start:', err);
    if (ui.multStatus) ui.multStatus.textContent = 'Failed to load assets';
  }
}

boot();
