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
  fairModal: document.getElementById('fairModal'),
  dlgServerHash: document.getElementById('dlgServerHash'),
  dlgClientSeed: document.getElementById('dlgClientSeed'),
  dlgNonce: document.getElementById('dlgNonce'),
  dlgLastCrash: document.getElementById('dlgLastCrash'),
};

const game = new Game(canvas, ui);

/** Pin HUD overlays to the canvas box (not the letterboxed stage). */
function syncHudToCanvas() {
  const stage = canvas.parentElement;
  const topbar = document.querySelector('.stage-topbar');
  const mult = document.querySelector('.mult-overlay');
  const audio = document.querySelector('.audio-dock');
  const fair = document.querySelector('.fair-chip');
  if (!stage || !topbar) return;

  const sr = stage.getBoundingClientRect();
  const cr = canvas.getBoundingClientRect();
  const left = cr.left - sr.left;
  const top = cr.top - sr.top;
  const width = cr.width;
  const height = cr.height;
  // Canvas history rail ≈ 18–58px of 540 → ~3.3%–11%
  const railTop = top + height * (18 / 540);
  const railH = height * (40 / 540);

  topbar.style.left = `${left}px`;
  topbar.style.top = `${railTop}px`;
  topbar.style.width = `${width}px`;
  topbar.style.height = `${railH}px`;
  topbar.style.right = 'auto';

  if (mult) {
    mult.style.left = `${left}px`;
    mult.style.top = `${top}px`;
    mult.style.width = `${width}px`;
    mult.style.height = `${height}px`;
    mult.style.right = 'auto';
    mult.style.bottom = 'auto';
  }
  if (audio) {
    audio.style.left = `${left + 8}px`;
    audio.style.bottom = `${sr.height - (top + height) + 8}px`;
    audio.style.right = 'auto';
    audio.style.top = 'auto';
  }
  if (fair) {
    fair.style.right = `${sr.width - (left + width) + 8}px`;
    fair.style.bottom = `${sr.height - (top + height) + 8}px`;
    fair.style.left = 'auto';
    fair.style.top = 'auto';
  }
}

async function boot() {
  try {
    await loadAssets();
    await game.init();
    syncHudToCanvas();
    window.addEventListener('resize', syncHudToCanvas);
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(syncHudToCanvas).observe(canvas);
    }
  } catch (err) {
    console.error('[Raider\'s Escape] Failed to start:', err);
    if (ui.multStatus) ui.multStatus.textContent = 'Failed to load assets';
  }
}

boot();
