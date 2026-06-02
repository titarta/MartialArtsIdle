/**
 * AudioManager — singleton audio engine built on Howler.js.
 *
 * Responsibilities:
 *  - BGM: one active track at a time, crossfade on track change
 *  - SFX: fire-and-forget playback with per-sound volume config
 *  - Volume channels: master, bgm, sfx — each with independent mute
 *  - Settings persistence via audioSettings.js
 *  - Page Visibility: auto-pause/resume BGM when tab is hidden
 *  - Pub/sub: notifies React hooks when settings change so UI stays in sync
 *
 * Usage:
 *   AudioManager.playBgm('cultivation')
 *   AudioManager.playSfx('ui_click')
 *   AudioManager.setVolume('bgm', 0.5)
 *   AudioManager.setMuted('master', true)
 */

import { Howl, Howler } from 'howler';
import { BGM_TRACKS, SFX } from './sounds.js';
import { loadAudioSettings, saveAudioSettings } from './audioSettings.js';

// ── BGM fade duration (ms) ────────────────────────────────────────────────────
const BGM_FADE_OUT = 500;
const BGM_FADE_IN  = 500;

// ── Internal state ────────────────────────────────────────────────────────────

let settings      = loadAudioSettings();
let bgmHowl       = null;   // currently active BGM Howl instance
let bgmTrackId    = null;   // key into BGM_TRACKS
let bgmPaused     = false;  // true while tab is hidden
let adPlaying     = false;  // true while an ad has audio focus

// Browser autoplay policies block the AudioContext until a user gesture.
// We buffer any playBgm/playSfx calls before that, then flush on unlock().
let unlocked          = false;
let pendingBgmTrackId = null;

// BGM preload cache: { [trackId]: Howl } — keyed instances ready to play
const bgmCache    = {};

// Pending fade-out stop timers, keyed by Howl instance. Tracked so that a
// rapid back-to-back navigation (e.g. home → menu → home in <500ms) can
// cancel a stale stop before it kills the newly-restarted playback.
const pendingStops = new WeakMap();

// SFX cache: { [sfxId]: Howl[] } — one Howl per variation. Single-sample
// sounds collapse to a one-element array; variation pools (combat hits) hold
// one Howl per uploaded sample so playSfx can pick at random.
const sfxCache    = {};

// Combat hit SFXs — get a small random rate jitter on every play so even the
// same variation sample doesn't sound bit-perfect identical twice in a row.
// Range: ±SFX_JITTER (so 0.04 → rate falls in [0.96, 1.04]).
const COMBAT_HIT_SFX = new Set([
  'combat_hit_player', 'combat_hit_enemy', 'combat_critical',
  'combat_dodge',      'combat_enemy_die',
]);
const SFX_JITTER = 0.04;

// Subscribers for settings changes (useAudio hooks)
const subscribers = new Set();

// ── Internal helpers ──────────────────────────────────────────────────────────

function effectiveBgmVol() {
  if (settings.masterMuted || settings.bgmMuted) return 0;
  return settings.masterVol * settings.bgmVol;
}

function effectiveSfxVol() {
  if (settings.masterMuted || settings.sfxMuted) return 0;
  return settings.masterVol * settings.sfxVol;
}

function notify() {
  for (const fn of subscribers) fn({ ...settings });
}

function persist() {
  saveAudioSettings(settings);
  notify();
}

// ── BGM ───────────────────────────────────────────────────────────────────────

function _createBgmHowl(trackId) {
  if (bgmCache[trackId]) {
    // Reuse preloaded instance — reset volume so we can fade in again
    bgmCache[trackId].volume(0);
    return bgmCache[trackId];
  }

  const config = BGM_TRACKS[trackId];
  if (!config) return null;

  // Cache lazily-created howls too — without this, every navigation to a
  // non-preloaded track (menu, world) creates a fresh Howl whose old
  // instance becomes an orphan (no longer in bgmHowl, can't be paused on
  // tab hide, plays through until its scheduled stop fires).
  const howl = new Howl({
    src:    config.src,
    loop:   config.loop ?? true,
    volume: 0,
    html5:  false,
    onloaderror: (id, err) => {
      console.error(`[Audio] BGM "${trackId}" failed to load (tried: ${config.src.join(', ')}):`, err);
    },
  });
  bgmCache[trackId] = howl;
  return howl;
}

function _cancelPendingStop(howl) {
  if (!howl) return;
  const id = pendingStops.get(howl);
  if (id) {
    clearTimeout(id);
    pendingStops.delete(howl);
  }
}

function _fadeOutAndStop(howl, duration = BGM_FADE_OUT) {
  if (!howl) return;
  // Cancel any prior pending stop on this howl before scheduling a new one,
  // otherwise we'd leak timers (and a stale one could fire mid-fade).
  _cancelPendingStop(howl);
  if (howl.playing()) {
    howl.fade(howl.volume(), 0, duration);
  }
  // Schedule the stop UNCONDITIONALLY — even when !playing(). A howl whose
  // audio file is still downloading reports playing()=false but has a queued
  // play() that Howler will fire once load completes. Without this stop, that
  // queued play becomes an orphan that keeps looping forever.
  const timerId = setTimeout(() => {
    try { howl.stop(); } catch {}
    pendingStops.delete(howl);
  }, duration + 50);
  pendingStops.set(howl, timerId);
}

// ── SFX ───────────────────────────────────────────────────────────────────────

function _getSfxHowls(sfxId) {
  if (sfxCache[sfxId]) return sfxCache[sfxId];

  const config = SFX[sfxId];
  if (!config) {
    console.warn(`[Audio] Unknown SFX id: "${sfxId}"`);
    return null;
  }

  // Normalise: variation pool wins over single src; otherwise wrap src.
  // Defensive filter: drop null / malformed slots (Designer pads partially-
  // uploaded pools with null so the JSON keeps stable indexes).
  const rawVariations = config.variations?.length
    ? config.variations
    : (config.src ? [{ src: config.src }] : []);
  const variations = rawVariations.filter(v => v && Array.isArray(v.src) && v.src.length > 0);

  if (variations.length === 0) {
    console.warn(`[Audio] SFX "${sfxId}" has no audio sources`);
    sfxCache[sfxId] = [];
    return sfxCache[sfxId];
  }

  const howls = variations.map((variant, i) => new Howl({
    src:    variant.src,
    volume: config.volume ?? 1.0,
    html5:  false,
    preload: false,
    onloaderror: (_id, err) => {
      console.error(`[Audio] SFX "${sfxId}"${variations.length > 1 ? ` variant ${i + 1}` : ''} failed to load (tried: ${variant.src.join(', ')}):`, err);
    },
    onplayerror: (_id, err) => {
      console.error(`[Audio] SFX "${sfxId}"${variations.length > 1 ? ` variant ${i + 1}` : ''} failed to play:`, err);
    },
  }));

  sfxCache[sfxId] = howls;
  return howls;
}

// ── AudioContext lifecycle (iOS Safari hardening) ────────────────────────────
// iOS Safari forcibly puts the AudioContext into 'suspended' (or its own
// 'interrupted' state) when the page is backgrounded via the app switcher.
// When the player returns, the context is still suspended unless explicitly
// resumed. Howler.play() on a suspended context is a silent no-op. The fix
// is a small ladder of safeguards:
//
//   1. visibilitychange: pause BGM on hide, ensure context + resume BGM on
//      show. Same as before, with the explicit context resume added.
//   2. pagehide / pageshow: iOS bfcache path can fire these even when
//      visibilitychange does not. Idempotent; safe to layer with (1).
//   3. ensureContextRunning() as a safety net inside playBgm and playSfx
//      so a stale suspended context can never silently swallow audio
//      after a future user gesture.
//
// The original "crash sound" reported on iOS came from the AudioContext
// being yanked mid-buffer; pausing BGM proactively in pagehide silences
// the buffer before iOS can interrupt it.

function ensureContextRunning() {
  const ctx = Howler.ctx;
  if (!ctx) return;
  attachContextLifecycle();
  // 'running' is the only state where audio actually plays. Any other
  // state ('suspended', iOS-only 'interrupted', or 'closed') needs an
  // explicit resume(). Idempotent on 'running' contexts.
  if (ctx.state !== 'running') {
    ctx.resume().catch(() => {});
  }
}

// iOS fires AudioContext 'statechange' → 'interrupted' for interruptions that
// don't come with a visibilitychange (incoming call, Siri, Control Center).
// Hook it so BGM is paused on interruption and cleanly restarted when the
// context returns, independent of the page-visibility path. Attached lazily
// because Howler.ctx doesn't exist until the first sound is created.
let ctxLifecycleAttached = false;
function attachContextLifecycle() {
  const ctx = Howler.ctx;
  if (!ctx || ctxLifecycleAttached || typeof ctx.addEventListener !== 'function') return;
  ctxLifecycleAttached = true;
  ctx.addEventListener('statechange', () => {
    const st = ctx.state;
    if (st === 'interrupted' || st === 'suspended') {
      if (bgmHowl && bgmHowl.playing()) { try { bgmHowl.pause(); } catch { /* non-fatal */ } }
      bgmPaused = !!bgmHowl;
    } else if (st === 'running') {
      // Only restart when the page is actually visible; otherwise the
      // visibility/pageshow handler owns the resume and this would race it.
      if (typeof document === 'undefined' || !document.hidden) resumeBgmFromBackground();
    }
  });
}

function pauseAllBgmForBackground() {
  // Pause EVERY cached BGM howl, not just bgmHowl. A rapid screen swap
  // can leave a previous track mid-fadeout; once bgmHowl moves on, that
  // orphan keeps playing audibly in the hidden tab until its stop timer
  // eventually fires (and timers are throttled in hidden tabs).
  for (const howl of Object.values(bgmCache)) {
    if (howl.playing()) howl.pause();
  }
  bgmPaused = !!bgmHowl;
  suspendContextForBackground();
}

// Proactively suspend the whole AudioContext when backgrounding. iOS otherwise
// yanks a still-playing WebAudio buffer mid-sample on app/tab close, producing
// the "scratch" artifact (and an App Store review fail). A clean suspend halts
// the audio clock with no glitch, so when iOS then interrupts the page it finds
// an already-silent context. resume() on return (ensureContextRunning) revives it.
function suspendContextForBackground() {
  const ctx = Howler.ctx;
  if (ctx && ctx.state === 'running') {
    try { ctx.suspend(); } catch { /* non-fatal */ }
  }
}

function resumeBgmFromBackground() {
  ensureContextRunning();
  // `!bgmHowl.playing()` guards against a double-start: this can be driven by
  // BOTH the visibility/pageshow handler and the context 'statechange' handler,
  // and play() on an already-live howl would stack a second, doubled track.
  if (bgmPaused && !adPlaying && bgmHowl && !bgmHowl.playing()) {
    bgmHowl.play();
    bgmHowl.fade(bgmHowl.volume(), effectiveBgmVol(), 400);
  }
  bgmPaused = false;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseAllBgmForBackground();
    else                 resumeBgmFromBackground();
  });
}
if (typeof window !== 'undefined') {
  // iOS Safari bfcache path. Fires reliably on app-switcher background
  // and return, even in cases where visibilitychange does not.
  window.addEventListener('pagehide', pauseAllBgmForBackground);
  window.addEventListener('pageshow', resumeBgmFromBackground);
}

// ── Public API ────────────────────────────────────────────────────────────────

const AudioManager = {
  /**
   * Play a BGM track. If the same track is already playing, does nothing.
   * Crossfades from the previous track if one is active.
   *
   * @param {string} trackId - Key from BGM_TRACKS (e.g. 'cultivation', 'combat')
   * @param {{ fade?: boolean }} [opts]
   */
  playBgm(trackId, { fade = true } = {}) {
    // Defer until first user gesture — browsers block AudioContext otherwise.
    if (!unlocked) {
      pendingBgmTrackId = trackId;
      return;
    }
    // Safety net: if iOS Safari (or any browser) suspended the context
    // while the app was backgrounded and our visibility/pageshow handlers
    // missed the resume for some reason, the next BGM call still wakes it.
    ensureContextRunning();
    if (bgmTrackId === trackId && bgmHowl?.playing()) return;

    // Fade out old track simultaneously with new one fading in (true crossfade)
    if (bgmHowl) {
      _fadeOutAndStop(bgmHowl, fade ? BGM_FADE_OUT : 0);
    }

    bgmTrackId = trackId;
    const howl = _createBgmHowl(trackId);
    if (!howl) return;

    bgmHowl   = howl;
    bgmPaused = false;

    // The cached howl for this track may have lingering internal sounds from
    // a prior fade-out that's still in progress (rapid screen toggles). Cancel
    // its scheduled stop and flush any active sounds before play(), otherwise
    // play() stacks a second concurrent sound and the user hears doubled audio.
    _cancelPendingStop(howl);
    try { howl.stop(); } catch {}

    const targetVol = effectiveBgmVol();
    howl.play();

    if (fade) {
      howl.fade(0, targetVol, BGM_FADE_IN);
    } else {
      howl.volume(targetVol);
    }
  },

  /** Stop the current BGM with optional fade. */
  stopBgm({ fade = true } = {}) {
    if (!bgmHowl) return;
    _fadeOutAndStop(bgmHowl, fade ? BGM_FADE_OUT : 0);
    bgmHowl    = null;
    bgmTrackId = null;
    bgmPaused  = false;
  },

  /** The currently playing BGM track id, or null. */
  get currentBgm() { return bgmTrackId; },

  /**
   * Play a one-shot SFX. If the SFX has a variation pool, picks one variant at
   * random. Combat hit SFXs additionally get a small ±SFX_JITTER rate jitter so
   * back-to-back triggers never sound bit-perfect identical.
   *
   * @param {string} sfxId - Key from SFX (e.g. 'ui_click', 'combat_hit_player')
   * @param {{ rate?: number, variant?: number, loop?: boolean }} [opts]
   *   rate=1 is normal speed; >1 raises pitch (Pattern Click rising-pitch taps).
   *   variant picks a specific sample from a pool by 1-based index (clamped to
   *   the available count) instead of at random, used by Consecutive Focus to
   *   map rung 1..N onto focus_cultivate variants 1..N. Omit for random pools.
   *   loop=true repeats the sound until stopSfx(sfxId) is called (the
   *   breakthrough "hold" loop while the player decides to continue).
   * @returns {number|undefined} the Howler sound id, or undefined if not played.
   */
  playSfx(sfxId, { rate, variant, loop } = {}) {
    if (!unlocked) return;
    // Safety net (see playBgm). Cheap idempotent check that keeps SFX
    // alive even if a backgrounding event somehow left the context
    // suspended without our handlers seeing it.
    ensureContextRunning();

    const vol = effectiveSfxVol();
    if (vol === 0) return;

    const howls = _getSfxHowls(sfxId);
    if (!howls || howls.length === 0) return;

    let howl;
    if (Number.isFinite(variant) && howls.length > 1) {
      // Indexed pick (1-based, clamped). NOTE: a partially-uploaded override
      // pool compacts away empty slots, so for an exact rung→variant mapping
      // fill every slot (the base manifest already does).
      const idx = Math.min(howls.length, Math.max(1, Math.round(variant))) - 1;
      howl = howls[idx];
    } else {
      howl = howls.length === 1
        ? howls[0]
        : howls[Math.floor(Math.random() * howls.length)];
    }

    // Set howl-group volume + rate BEFORE play() — setting these on the id
    // returned by play() races when the howl is still loading (id is a placeholder).
    howl.volume(vol);
    // Set loop on the howl group before play(). Always set it explicitly (even
    // to false) so a cached howl can't carry stale loop state from a prior
    // looped play into a later one-shot.
    howl.loop(!!loop);
    let finalRate = rate ?? 1;
    if (COMBAT_HIT_SFX.has(sfxId)) {
      finalRate *= 1 + (Math.random() * 2 - 1) * SFX_JITTER;
    }
    howl.rate(finalRate);
    return howl.play();
  },

  /**
   * Stop every playing instance of a SFX. Used to end a looped sound (e.g. the
   * breakthrough hold loop) when the player continues. No-op if never played.
   *
   * @param {string} sfxId - Key from SFX.
   */
  stopSfx(sfxId) {
    const howls = sfxCache[sfxId];
    if (!howls) return;
    for (const howl of howls) {
      try { howl.stop(); } catch { /* non-fatal */ }
    }
  },

  /**
   * Set volume for a channel.
   *
   * @param {'master'|'bgm'|'sfx'} channel
   * @param {number} value - 0.0 … 1.0
   */
  setVolume(channel, value) {
    const clamped = Math.min(1, Math.max(0, value));
    if (channel === 'master') settings.masterVol = clamped;
    if (channel === 'bgm')    settings.bgmVol    = clamped;
    if (channel === 'sfx')    settings.sfxVol    = clamped;

    // Apply immediately to live BGM
    if ((channel === 'master' || channel === 'bgm') && bgmHowl?.playing()) {
      bgmHowl.volume(effectiveBgmVol());
    }

    persist();
  },

  /**
   * Toggle mute for a channel.
   *
   * @param {'master'|'bgm'|'sfx'} channel
   * @param {boolean} muted
   */
  setMuted(channel, muted) {
    if (channel === 'master') settings.masterMuted = muted;
    if (channel === 'bgm')    settings.bgmMuted    = muted;
    if (channel === 'sfx')    settings.sfxMuted    = muted;

    // Apply immediately to live BGM
    if (bgmHowl?.playing()) {
      bgmHowl.volume(effectiveBgmVol());
    }

    persist();
  },

  /** Returns a copy of the current settings. */
  getSettings() {
    return { ...settings };
  },

  /**
   * Subscribe to settings changes.
   * Returns an unsubscribe function.
   *
   * @param {(settings: object) => void} fn
   */
  subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },

  /**
   * Unlock audio playback after the first user gesture.
   *
   * Resumes the suspended AudioContext, preloads SFX, preloads both BGM tracks,
   * and starts any BGM that was requested before unlock. Idempotent.
   */
  unlock() {
    const firstTime = !unlocked;
    unlocked = true;

    // Resume the context. Works inside a user gesture (browser / iOS) and also
    // freely in autoplay-friendly shells (Electron with autoplayPolicy, or a
    // native WebView configured to not require a gesture).
    ensureContextRunning();

    if (firstTime) {
      // Preload everything now that the context is allowed to run.
      this.preloadBgm(['cultivation', 'combat']);
      this.preload();
    }

    // (Re)start whatever track was requested. Intentionally re-entrant: a launch
    // autoplay attempt that the platform blocked leaves the context suspended,
    // so the first user gesture calls unlock() again and THIS restarts the BGM.
    const trackId = pendingBgmTrackId || bgmTrackId;
    if (trackId && (!bgmHowl || !bgmHowl.playing())) {
      pendingBgmTrackId = null;
      this.playBgm(trackId);
    }
  },

  /**
   * Preload BGM tracks into memory so crossfades are seamless.
   * Call once at app startup (after first user gesture if required by browser).
   *
   * @param {string[]} trackIds - Keys from BGM_TRACKS to preload.
   */
  preloadBgm(trackIds) {
    for (const id of trackIds) {
      if (bgmCache[id]) continue;
      const config = BGM_TRACKS[id];
      if (!config) continue;
      bgmCache[id] = new Howl({
        src:     config.src,
        loop:    config.loop ?? true,
        volume:  0,
        html5:   false,
        preload: true,
        onloaderror: (_id, err) => {
          console.error(`[Audio] BGM preload "${id}" failed:`, err);
        },
      });
    }
  },

  /** Fade out and pause BGM before an ad takes audio focus. */
  pauseForAd() {
    if (adPlaying) return;
    adPlaying = true;
    if (bgmHowl?.playing()) {
      bgmHowl.fade(bgmHowl.volume(), 0, 300);
      setTimeout(() => { try { bgmHowl?.pause(); } catch {} }, 350);
    }
  },

  /** Resume BGM after an ad releases audio focus. */
  resumeFromAd() {
    if (!adPlaying) return;
    adPlaying = false;
    if (bgmHowl && !bgmPaused) {
      bgmHowl.play();
      bgmHowl.fade(bgmHowl.volume(), effectiveBgmVol(), 400);
    }
  },

  /**
   * Preload a set of SFX howls so the first play has no latency.
   * Call this once after the first user gesture.
   *
   * @param {string[]} [sfxIds] - Subset to preload. Defaults to all.
   */
  preload(sfxIds = Object.keys(SFX)) {
    for (const id of sfxIds) {
      const howls = _getSfxHowls(id);
      if (!howls) continue;
      for (const howl of howls) {
        if (howl.state() === 'unloaded') howl.load();
      }
    }
  },
};

export default AudioManager;
