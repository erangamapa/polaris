/**
 * Lightweight SFX playback for Casino Fighters.
 */

/** @type {HTMLAudioElement | null} */
let kickSound = null;
/** @type {HTMLAudioElement | null} */
let punchSound = null;
let unlocked = false;

/**
 * Preload combat impact clips.
 * @returns {Promise<void>}
 */
export async function loadAudio() {
  const loadOne = (src) =>
    new Promise((resolve, reject) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = 0.85;
      audio.addEventListener('canplaythrough', () => resolve(audio), { once: true });
      audio.addEventListener('error', () => reject(new Error(`Failed to load: ${src}`)), {
        once: true,
      });
      audio.load();
    });

  try {
    [kickSound, punchSound] = await Promise.all([
      loadOne('assets/kick-sound.mp3'),
      loadOne('assets/punch-sound.mp3'),
    ]);
  } catch (err) {
    console.warn('[Casino Fighters] Combat SFX unavailable:', err);
    kickSound = kickSound ?? null;
    punchSound = punchSound ?? null;
  }
}

/** Unlock audio after first user gesture (browser autoplay policy). */
export function unlockAudio() {
  if (unlocked) return;
  const clip = kickSound || punchSound;
  if (!clip) return;
  unlocked = true;
  clip
    .play()
    .then(() => {
      clip.pause();
      clip.currentTime = 0;
    })
    .catch(() => {
      unlocked = false;
    });
}

/** @param {HTMLAudioElement | null} sound */
function playSound(sound) {
  if (!sound) return;
  try {
    sound.currentTime = 0;
    sound.play().catch(() => {
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
