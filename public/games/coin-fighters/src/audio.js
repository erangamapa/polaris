/**
 * Lightweight SFX + background music for Coin Fighters.
 */

const MUSIC_VOL = 0.35;
const SFX_VOL = 0.85;
const RESULT_VOL = 0.9;
/** Win clip is quieter in the source file — nudge up to sit with you-lose. */
const YOU_WIN_VOL = 1;
const MUSIC_MUTE_KEY = 'coin-fighters-music-muted';
const SFX_MUTE_KEY = 'coin-fighters-sfx-muted';
/** Tiny silent WAV — unlock autoplay without playing combat SFX. */
const SILENT_UNLOCK_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';

/** @type {HTMLAudioElement | null} */
let kickSound = null;
/** @type {HTMLAudioElement | null} */
let punchSound = null;
/** @type {HTMLAudioElement | null} */
let youWinSound = null;
/** @type {HTMLAudioElement | null} */
let youLoseSound = null;
/** @type {HTMLAudioElement | null} */
let coinsCollectSound = null;
/** @type {HTMLAudioElement | null} */
let coinSpinSound = null;
/** @type {HTMLAudioElement | null} */
let fightMusic = null;
/** @type {HTMLAudioElement | null} */
let unlockClip = null;
let unlocked = false;
let musicStarted = false;
/** Bumped on mute so in-flight play() promises cannot restart BGM. */
let musicPlayId = 0;
let musicMuted = loadPref(MUSIC_MUTE_KEY);
let sfxMuted = loadPref(SFX_MUTE_KEY);

/**
 * Preload combat, result, and BGM clips.
 * @returns {Promise<void>}
 */
export async function loadAudio() {
  const loadOne = (src, volume = SFX_VOL) =>
    new Promise((resolve, reject) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.loop = false;
      audio.volume = volume;
      audio.addEventListener('canplaythrough', () => resolve(audio), { once: true });
      audio.addEventListener('error', () => reject(new Error(`Failed to load: ${src}`)), {
        once: true,
      });
      audio.load();
    });

  try {
    [kickSound, punchSound, youWinSound, youLoseSound, coinsCollectSound, coinSpinSound, fightMusic] =
      await Promise.all([
        loadOne('assets/kick-sound.mp3'),
        loadOne('assets/punch-sound.mp3'),
        loadOne('assets/you-win.mp3', YOU_WIN_VOL),
        loadOne('assets/you-lose.mp3', RESULT_VOL),
        loadOne('assets/coins-collect.mp3', RESULT_VOL),
        loadOne('assets/coin-spin.mp3', SFX_VOL),
        loadOne('assets/retro-fight-music.mp3', MUSIC_VOL),
      ]);
    for (const sfx of [
      kickSound,
      punchSound,
      youWinSound,
      youLoseSound,
      coinsCollectSound,
      coinSpinSound,
    ]) {
      if (sfx) sfx.loop = false;
    }
    if (fightMusic) {
      fightMusic.loop = true;
      applyMusicMute();
    }
  } catch (err) {
    console.warn('[Coin Fighters] Audio unavailable:', err);
    kickSound = kickSound ?? null;
    punchSound = punchSound ?? null;
    youWinSound = youWinSound ?? null;
    youLoseSound = youLoseSound ?? null;
    coinsCollectSound = coinsCollectSound ?? null;
    coinSpinSound = coinSpinSound ?? null;
    fightMusic = fightMusic ?? null;
  }
}

/** Unlock audio after first user gesture (browser autoplay policy). */
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;

  try {
    if (!unlockClip) {
      unlockClip = new Audio(SILENT_UNLOCK_WAV);
      unlockClip.loop = false;
      unlockClip.volume = 0.001;
    }
    const play = unlockClip.play();
    const after = () => {
      try {
        unlockClip?.pause();
        if (unlockClip) unlockClip.currentTime = 0;
      } catch {
        // no-op
      }
      // Never leave combat one-shots running from an older unlock path
      stopCombatSounds();
    };
    if (play && typeof play.then === 'function') {
      play.then(after).catch(() => {
        unlocked = false;
      });
    } else {
      after();
    }
  } catch {
    unlocked = false;
  }
}

/** Start looping retro fight BGM (no-ops if already playing / muted). */
export function startFightMusic() {
  if (!fightMusic) return;
  if (musicMuted) {
    musicStarted = true;
    applyMusicMute();
    return;
  }
  if (musicStarted && !fightMusic.paused) {
    applyMusicMute();
    return;
  }
  try {
    fightMusic.loop = true;
    applyMusicMute();
  } catch {
    // no-op
  }
}

function applyMusicMute() {
  if (!fightMusic) return;
  if (musicMuted) {
    musicPlayId += 1;
    fightMusic.volume = 0;
    fightMusic.muted = true;
    try {
      fightMusic.pause();
    } catch {
      // no-op
    }
    return;
  }

  fightMusic.muted = false;
  fightMusic.volume = MUSIC_VOL;
  if (!(musicStarted || unlocked)) return;

  const playId = musicPlayId;
  const play = fightMusic.play();
  if (play && typeof play.then === 'function') {
    play
      .then(() => {
        if (playId !== musicPlayId || musicMuted) {
          try {
            fightMusic.pause();
          } catch {
            // no-op
          }
          return;
        }
        musicStarted = true;
        unlocked = true;
      })
      .catch(() => {
        // Blocked until a user gesture — retry via unlockAudio / pointerdown
      });
  } else {
    musicStarted = true;
  }
}

/** @returns {boolean} */
export function isMusicMuted() {
  return musicMuted;
}

/** @returns {boolean} */
export function isSfxMuted() {
  return sfxMuted;
}

/** @param {boolean} muted */
export function setMusicMuted(muted) {
  musicMuted = !!muted;
  savePref(MUSIC_MUTE_KEY, musicMuted);
  applyMusicMute();
  return musicMuted;
}

/** @param {boolean} muted */
export function setSfxMuted(muted) {
  sfxMuted = !!muted;
  savePref(SFX_MUTE_KEY, sfxMuted);
  if (sfxMuted) stopCombatSounds();
  return sfxMuted;
}

/** Toggle BGM mute. @returns {boolean} new muted state */
export function toggleMusicMuted() {
  return setMusicMuted(!musicMuted);
}

/** Toggle SFX mute. @returns {boolean} new muted state */
export function toggleSfxMuted() {
  return setSfxMuted(!sfxMuted);
}

/** Hard-stop kick/punch one-shots (idle / unlock cleanup). */
export function stopCombatSounds() {
  for (const sound of [kickSound, punchSound]) {
    if (!sound) continue;
    try {
      sound.loop = false;
      sound.pause();
      sound.currentTime = 0;
    } catch {
      // no-op
    }
  }
}

/**
 * Play a one-shot from a clone so unlock/pause on the master clip cannot
 * leave a shared element looping or stuck mid-buffer.
 * @param {HTMLAudioElement | null} sound
 */
function playSound(sound) {
  if (!sound || sfxMuted) return;
  try {
    sound.loop = false;
    const node = /** @type {HTMLAudioElement} */ (sound.cloneNode(true));
    node.loop = false;
    node.volume = sound.volume;
    node.play().catch(() => {
      // Ignore if browser blocks until next gesture
    });
  } catch {
    // no-op
  }
}

/** Play kick SFX when the player connects a winning kick. */
export function playKickSound() {
  playSound(kickSound);
}

/** Play punch SFX when 2P connects a losing-round punch. */
export function playPunchSound() {
  playSound(punchSound);
}

/** Play when the YOU WIN overlay appears. */
export function playYouWinSound() {
  playSound(youWinSound);
}

/** Play when the YOU LOSE overlay / banner appears. */
export function playYouLoseSound() {
  playSound(youLoseSound);
}

/** Play when the player cashes out a climb. */
export function playCoinsCollectSound() {
  playSound(coinsCollectSound);
}

/** Play when the coin flip spin starts. */
export function playCoinSpinSound() {
  if (!coinSpinSound || sfxMuted) return;
  try {
    // Play on the master element (not a clone) so skip/land can stop it.
    coinSpinSound.loop = false;
    coinSpinSound.pause();
    coinSpinSound.currentTime = 0;
    coinSpinSound.play().catch(() => {
      // Ignore if browser blocks until next gesture
    });
  } catch {
    // no-op
  }
}

/** Stop the coin spin SFX (skip / land). */
export function stopCoinSpinSound() {
  if (!coinSpinSound) return;
  try {
    coinSpinSound.loop = false;
    coinSpinSound.pause();
    coinSpinSound.currentTime = 0;
  } catch {
    // no-op
  }
}

/** Pause/stop all audio on iframe teardown (BOY-36 §14/§16). */
export function releaseAudio() {
  stopCoinSpinSound();
  stopCombatSounds();
  if (fightMusic) {
    try {
      fightMusic.pause();
      fightMusic.currentTime = 0;
    } catch {
      /* no-op */
    }
  }
  musicStarted = false;
}

/** @param {string} key */
function loadPref(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/** @param {string} key @param {boolean} value */
function savePref(key, value) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}
