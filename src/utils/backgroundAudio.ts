/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Singleton Background Audio Controller for The Everyday Editz.
 *
 * - Generates a seamless, click-free 16-second warm boutique ambient loop in-memory
 *   (zero external MP3 404s, zero extra dependencies, instant start).
 * - Guarantees a single HTMLAudioElement instance across the entire app lifecycle
 *   so navigating between pages never duplicates or restarts playback.
 * - Automatically starts playback on page load unless the user explicitly paused/muted.
 * - Falls back cleanly to starting on the first user gesture (pointerdown/touchstart/click/keydown)
 *   whenever browser autoplay policies block immediate unmuted playback.
 * - Persists explicit user pause/mute preference in localStorage and never overrides it.
 * - Supports temporary polite ducking when video reels play with audio enabled.
 */

const USER_PAUSED_STORAGE_KEY = 'edz_bg_audio_user_paused';
const TARGET_VOLUME = 0.18;

export interface BackgroundAudioSnapshot {
  isPlaying: boolean;
  isUserPaused: boolean;
  isAwaitingInteraction: boolean;
}

type Listener = () => void;

/**
 * Synthesizes a gentle, warm, seamless 16-second ambient boutique pad WAV Blob.
 * Progression: Fmaj7 -> Em7 -> Dm9 -> Cmaj7 (4s each), soft filtered harmonics,
 * cross-faded at boundaries so looping is 100% click-free.
 */
function createAmbientBoutiqueWavUrl(): string {
  const sampleRate = 22050;
  const durationSec = 16;
  const numSamples = sampleRate * durationSec;
  const pcm = new Int16Array(numSamples);

  // Warm boutique chord frequencies (Hz) — mellow mid-low register (no piercing highs)
  const chords: number[][] = [
    [174.61, 220.0, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
    [164.81, 196.0, 246.94, 293.66], // Em7   (E3, G3, B3, D4)
    [146.83, 174.61, 220.0, 329.63], // Dm9   (D3, F3, A3, E4)
    [130.81, 196.0, 246.94, 329.63], // Cmaj7 (C3, G3, B3, E4)
  ];

  const chordDuration = durationSec / chords.length; // 4s per chord
  const fadeTime = 1.1; // smooth 1.1s crossfade between chords

  const renderChordSample = (t: number, notes: number[]): number => {
    let sum = 0;
    for (let n = 0; n < notes.length; n++) {
      const freq = notes[n];
      const phase = 2 * Math.PI * freq * t;
      // Soft Rhodes/pad timbre: warm fundamental + gentle 2nd harmonic + very faint shimmer
      const detune = 2 * Math.PI * (freq * 1.0022) * t;
      const fundamental = 0.62 * Math.sin(phase) + 0.24 * Math.sin(detune);
      const secondHarmonic = 0.11 * Math.sin(2 * phase);
      const thirdHarmonic = 0.03 * Math.sin(3 * phase);
      sum += fundamental + secondHarmonic + thirdHarmonic;
    }
    return sum / notes.length;
  };

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const chordIndex = Math.floor(t / chordDuration) % chords.length;
    const prevChordIndex = (chordIndex + chords.length - 1) % chords.length;
    const localT = t - chordIndex * chordDuration;

    let sample = renderChordSample(t, chords[chordIndex]);

    // Smooth cosine crossfade from previous chord at start of each 4s bar (including bar 0 -> seamless loop!)
    if (localT < fadeTime) {
      const mix = 0.5 - 0.5 * Math.cos((Math.PI * localT) / fadeTime);
      const prevSample = renderChordSample(t, chords[prevChordIndex]);
      sample = prevSample * (1 - mix) + sample * mix;
    }

    // Gentle breathing swell (0.25 Hz -> 4-second cycle matching bar boundary)
    const breathe = 0.78 + 0.22 * Math.sin(2 * Math.PI * 0.25 * t - Math.PI / 2);

    // Subtle warm bass bloom on chord changes (octaved down softly)
    const bassFreq = chords[chordIndex][0] * 0.5;
    const bassEnv = Math.sin(Math.PI * Math.min(1, localT / chordDuration));
    const bass = 0.18 * bassEnv * Math.sin(2 * Math.PI * bassFreq * t);

    const finalSample = Math.max(-1, Math.min(1, (sample * 0.72 + bass) * breathe * 0.55));
    pcm[i] = Math.round(finalSample * 32767);
  }

  // Encode standard 44-byte RIFF/WAVE header + 16-bit mono PCM payload
  const dataByteLength = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeAscii(36, 'data');
  view.setUint32(40, dataByteLength, true);

  let byteOffset = 44;
  for (let i = 0; i < pcm.length; i++) {
    view.setInt16(byteOffset, pcm[i], true);
    byteOffset += 2;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

class BackgroundAudioController {
  private audio: HTMLAudioElement | null = null;
  private initialized = false;
  private isPlaying = false;
  private isUserPaused = false;
  private isAwaitingInteraction = false;
  private mediaDucked = false;
  private pausedByVisibility = false;
  private interactionListenersAttached = false;
  private listeners = new Set<Listener>();
  private snapshot: BackgroundAudioSnapshot = {
    isPlaying: false,
    isUserPaused: false,
    isAwaitingInteraction: false,
  };

  constructor() {
    this.isUserPaused = this.readUserPausedPreference();
    this.syncSnapshot();
  }

  private readUserPausedPreference(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(USER_PAUSED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private writeUserPausedPreference(paused: boolean) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(USER_PAUSED_STORAGE_KEY, paused ? 'true' : 'false');
    } catch {
      // Ignore storage errors in private browsing
    }
  }

  private syncSnapshot() {
    this.snapshot = {
      isPlaying: this.isPlaying,
      isUserPaused: this.isUserPaused,
      isAwaitingInteraction: this.isAwaitingInteraction,
    };
  }

  private emit() {
    this.syncSnapshot();
    this.listeners.forEach((cb) => cb());
  }

  public subscribe = (cb: Listener): (() => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  public getSnapshot = (): BackgroundAudioSnapshot => {
    return this.snapshot;
  };

  private ensureAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (this.audio) return this.audio;

    const audio = new Audio();
    audio.src = createAmbientBoutiqueWavUrl();
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = TARGET_VOLUME;
    audio.setAttribute('playsinline', 'true');

    audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.isAwaitingInteraction = false;
      this.emit();
    });

    audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.emit();
    });

    this.audio = audio;
    return audio;
  }

  private handleFirstUserInteraction = (event: Event) => {
    // If user explicitly paused or clicked the audio toggle button itself, let the toggle button handle it
    if (this.isUserPaused) {
      this.detachInteractionFallback();
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target && typeof target.closest === 'function' && target.closest('[data-audio-toggle="true"]')) {
      return;
    }

    if (this.mediaDucked) {
      this.detachInteractionFallback();
      return;
    }

    this.detachInteractionFallback();
    this.attemptPlayback(false);
  };

  private attachInteractionFallback() {
    if (typeof window === 'undefined' || this.interactionListenersAttached || this.isUserPaused) return;
    this.interactionListenersAttached = true;
    this.isAwaitingInteraction = true;
    this.emit();

    const opts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener('pointerdown', this.handleFirstUserInteraction, opts);
    window.addEventListener('touchstart', this.handleFirstUserInteraction, opts);
    window.addEventListener('click', this.handleFirstUserInteraction, opts);
    window.addEventListener('keydown', this.handleFirstUserInteraction, opts);
  }

  private detachInteractionFallback() {
    if (typeof window === 'undefined' || !this.interactionListenersAttached) return;
    this.interactionListenersAttached = false;
    const opts: AddEventListenerOptions = { capture: true };
    window.removeEventListener('pointerdown', this.handleFirstUserInteraction, opts);
    window.removeEventListener('touchstart', this.handleFirstUserInteraction, opts);
    window.removeEventListener('click', this.handleFirstUserInteraction, opts);
    window.removeEventListener('keydown', this.handleFirstUserInteraction, opts);
  }

  private handleVisibilityChange = () => {
    if (typeof document === 'undefined' || !this.audio) return;
    if (document.hidden) {
      if (!this.audio.paused) {
        this.pausedByVisibility = true;
        this.audio.pause();
      }
    } else if (this.pausedByVisibility) {
      this.pausedByVisibility = false;
      if (!this.isUserPaused && !this.mediaDucked) {
        this.attemptPlayback(true);
      }
    }
  };

  private attemptPlayback(allowFallbackOnBlock: boolean) {
    if (this.isUserPaused || this.mediaDucked) return;
    const audio = this.ensureAudioElement();
    if (!audio) return;

    if (!audio.paused) {
      this.isPlaying = true;
      this.isAwaitingInteraction = false;
      this.detachInteractionFallback();
      this.emit();
      return;
    }

    audio.muted = false;
    audio.volume = TARGET_VOLUME;

    try {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            if (this.isUserPaused || this.mediaDucked) {
              audio.pause();
              return;
            }
            this.isPlaying = true;
            this.isAwaitingInteraction = false;
            this.detachInteractionFallback();
            this.emit();
          })
          .catch(() => {
            this.isPlaying = false;
            if (allowFallbackOnBlock && !this.isUserPaused) {
              this.attachInteractionFallback();
            } else {
              this.emit();
            }
          });
      }
    } catch {
      this.isPlaying = false;
      if (allowFallbackOnBlock && !this.isUserPaused) {
        this.attachInteractionFallback();
      } else {
        this.emit();
      }
    }
  }

  /**
   * Initializes singleton audio playback once on website load.
   * Safe against React StrictMode double mounts and route transitions.
   */
  public initAutoPlay() {
    if (typeof window === 'undefined') return;
    if (this.initialized) return;
    this.initialized = true;

    // Clear any stale manual pause preference now that audio runs quietly without a manual UI toggle
    this.isUserPaused = false;
    this.writeUserPausedPreference(false);

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.attemptPlayback(true);
  }

  public playByUser() {
    this.isUserPaused = false;
    this.mediaDucked = false;
    this.pausedByVisibility = false;
    this.writeUserPausedPreference(false);
    this.detachInteractionFallback();
    this.attemptPlayback(true);
  }

  public pauseByUser() {
    this.isUserPaused = true;
    this.pausedByVisibility = false;
    this.isAwaitingInteraction = false;
    this.writeUserPausedPreference(true);
    this.detachInteractionFallback();
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
    this.isPlaying = false;
    this.emit();
  }

  public toggle() {
    if (this.isPlaying) {
      this.pauseByUser();
    } else {
      this.playByUser();
    }
  }

  /**
   * Temporarily pauses background audio when a video reel plays unmuted,
   * and resumes cleanly afterward only if the user did not manually pause.
   */
  public setMediaDucking(shouldDuck: boolean) {
    if (this.mediaDucked === shouldDuck) return;
    this.mediaDucked = shouldDuck;

    if (shouldDuck) {
      if (this.audio && !this.audio.paused) {
        this.audio.pause();
      }
    } else if (!this.isUserPaused && !document.hidden) {
      this.attemptPlayback(true);
    }
  }
}

export const backgroundAudio = new BackgroundAudioController();
