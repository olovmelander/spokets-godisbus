/**
 * Voice playback system for character dialogue and narrator voices.
 * Plays ElevenLabs-generated Swedish audio files located in /audio/voices/{key}.mp3.
 * Gracefully falls back if audio files are missing, blocked, or offline.
 */

let currentAudio: HTMLAudioElement | null = null;
let currentKey: string | null = null;
let currentVolume = 1;
let soundEnabled = true;

let userUnlocked = false;
let pendingKey: string | null = null;
let pendingAt = 0;

if (typeof window !== 'undefined') {
  const unlock = () => {
    userUnlocked = true;
    if (pendingKey && Date.now() - pendingAt < 6000) {
      const k = pendingKey;
      pendingKey = null;
      playVoice(k);
    } else {
      pendingKey = null;
    }
  };
  for (const event of ['pointerdown', 'keydown', 'touchstart']) {
    window.addEventListener(event, unlock, { capture: true });
  }
}

export function setVoiceSettings(enabled: boolean, volume: number): void {
  soundEnabled = enabled;
  currentVolume = Math.max(0, Math.min(1, volume));
  if (currentAudio) {
    try {
      currentAudio.volume = currentVolume;
    } catch {
      // ignore
    }
  }
}

/** Plays a voice line by its key, e.g. 'stolenBag', 'scene_morning', etc. */
export function playVoice(key: string): void {
  if (!soundEnabled || currentVolume <= 0 || typeof Audio === 'undefined') return;

  // Stop any currently playing voice line
  stopVoice();

  try {
    const base = import.meta.env.BASE_URL || '/';
    const audio = new Audio(`${base}audio/voices/${key}.mp3`);
    audio.volume = currentVolume;
    currentAudio = audio;
    currentKey = key;

    audio.onended = () => {
      if (currentAudio === audio) {
        currentAudio = null;
        currentKey = null;
      }
    };

    audio.onerror = () => {
      if (currentAudio === audio) {
        currentAudio = null;
        currentKey = null;
      }
    };

    const promise = audio.play();
    if (promise !== undefined) {
      promise.catch((err) => {
        // Autoplay restriction: queue line to play on player's first interaction
        if (!userUnlocked && (err?.name === 'NotAllowedError' || String(err).includes('NotAllowed'))) {
          pendingKey = key;
          pendingAt = Date.now();
        }
        if (currentAudio === audio) {
          currentAudio = null;
          currentKey = null;
        }
      });
    }
  } catch {
    // Audio constructor or environment error
  }
}

/** Stops any currently playing voice line. */
export function stopVoice(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // ignore
    }
    currentAudio = null;
    currentKey = null;
  }
}

/** Returns the currently playing line key, or null if none. */
export function playingVoice(): string | null {
  return currentKey;
}
