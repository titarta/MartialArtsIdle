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
let bgmGain       = 1;      // active track's own gain (its Designer volume override)
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
// sounds collapse to a one-element array; variation pools (e.g. crystal taps)
// hold one Howl per uploaded sample so playSfx can pick at random.
const sfxCache    = {};

// Subscribers for settings changes (useAudio hooks)
const subscribers = new Set();

// ── Internal helpers ──────────────────────────────────────────────────────────

function effectiveBgmVol() {
  if (settings.masterMuted || settings.bgmMuted) return 0;
  // bgmGain folds in the active track's own volume (its Designer override,
  // merged into BGM_TRACKS by sounds.js) the same way SFX fold in _maiGain,
  // so a per-track volume set in the Designer actually caps BGM playback.
  return settings.masterVol * settings.bgmVol * bgmGain;
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
  // non-preloaded track creates a fresh Howl whose old instance becomes an
  // orphan (no longer in bgmHowl, can't be paused on tab hide, plays through
  // until its scheduled stop fires).
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
  const rawVariations = config.variations?.length
    ? config.variations
    : (config.src ? [{ src: config.src }] : []);

  // Build an INDEX-STABLE array: empty / malformed slots become null
  // placeholders rather than being compacted away. Indexed playback (the
  // `variant` option) maps slot N → index N-1, so compacting would shift every
  // later sample up by one (the focus-rung off-by-one). Random playback skips
  // the nulls at pick time instead.
  const howls = rawVariations.map((variant, i) => {
    if (!variant || !Array.isArray(variant.src) || variant.src.length === 0) return null;
    // Per-sample gain, baked onto the Howl and folded into the channel mix at
    // play time (see _sfxGain). A variant's own `volume` wins, else the
    // sound-wide volume, else unity — so the designer can trim one sample of a
    // pool independently (e.g. each Consecutive Focus tick) without touching
    // the rest of the pool.
    const gain = variant.volume ?? config.volume ?? 1.0;
    const howl = new Howl({
      src:    variant.src,
      volume: gain,
      html5:  false,
      preload: false,
      onloaderror: (_id, err) => {
        console.error(`[Audio] SFX "${sfxId}"${rawVariations.length > 1 ? ` variant ${i + 1}` : ''} failed to load (tried: ${variant.src.join(', ')}):`, err);
      },
      onplayerror: (_id, err) => {
        console.error(`[Audio] SFX "${sfxId}"${rawVariations.length > 1 ? ` variant ${i + 1}` : ''} failed to play:`, err);
      },
    });
    howl._maiGain = gain;
    return howl;
  });

  if (!howls.some(Boolean)) {
    console.warn(`[Audio] SFX "${sfxId}" has no audio sources`);
    sfxCache[sfxId] = [];
    return sfxCache[sfxId];
  }

  sfxCache[sfxId] = howls;
  return howls;
}

// Resolve which Howl in a variation pool a request maps to. With a 1-based
// `variant` it picks slot N, falling back to the nearest filled slot below it
// (the pool is index-stable with null placeholders); without one it picks at
// random among the filled slots. Returns null if the pool is empty.
function _resolveVariantHowl(howls, variant) {
  if (!howls || howls.length === 0) return null;
  if (Number.isFinite(variant)) {
    let idx = Math.min(howls.length, Math.max(1, Math.round(variant))) - 1;
    while (idx >= 0 && !howls[idx]) idx--;
    return idx >= 0 ? howls[idx] : (howls.find(Boolean) || null);
  }
  const filled = howls.filter(Boolean);
  if (filled.length === 0) return null;
  return filled.length === 1 ? filled[0] : filled[Math.floor(Math.random() * filled.length)];
}

// The per-sample volume trim baked onto a Howl in _getSfxHowls. Folded into the
// channel mix at play time so per-sound / per-variant volumes actually apply —
// playSfx/crossfade set the howl volume to the channel mix, which would
// otherwise overwrite the trim. Defaults to unity for any howl without one.
function _sfxGain(howl) {
  return (howl && typeof howl._maiGain === 'number') ? howl._maiGain : 1;
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
   * @param {string} trackId - Key from BGM_TRACKS (e.g. 'cultivation')
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
    // Pick up this track's own gain so effectiveBgmVol() caps to the Designer
    // volume. Set before targetVol below and before any later fade/resume.
    bgmGain   = BGM_TRACKS[trackId]?.volume ?? 1;

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
   * random.
   *
   * @param {string} sfxId - Key from SFX (e.g. 'ui_click', 'crystal_tap')
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

    const howl = _resolveVariantHowl(howls, variant);
    if (!howl) return undefined;

    // Set howl-group volume + rate BEFORE play() — setting these on the id
    // returned by play() races when the howl is still loading (id is a placeholder).
    // Fold the per-sample gain into the channel mix so per-sound / per-variant
    // volumes actually bite (otherwise this line would overwrite them).
    howl.volume(vol * _sfxGain(howl));
    // Set loop on the howl group before play(). Always set it explicitly (even
    // to false) so a cached howl can't carry stale loop state from a prior
    // looped play into a later one-shot.
    howl.loop(!!loop);
    howl.rate(rate ?? 1);
    return howl.play();
  },

  /**
   * Stop every playing instance of a SFX. Used to end a looped sound (e.g. the
   * breakthrough hold loop) when the player continues. No-op if never played.
   *
   * @param {string} sfxId - Key from SFX.
   * @param {{ fade?: number }} [opts] fade>0 fades out over that many ms (and
   *   then stops) instead of cutting instantly, so a loop does not click off.
   */
  stopSfx(sfxId, { fade = 0 } = {}) {
    const howls = sfxCache[sfxId];
    if (!howls) return;
    for (const howl of howls) {
      if (!howl) continue;
      if (fade > 0) _fadeOutAndStop(howl, fade);
      else { try { howl.stop(); } catch { /* non-fatal */ } }
    }
  },

  /**
   * Crossfade a looping SFX to a new variant. Used by Consecutive Focus so
   * climbing a level glides between the loop samples instead of hard-cutting.
   * Fades any currently-playing instance(s) of this SFX down to silence (and
   * stops them) while fading the target variant up from silence, both over
   * `duration` ms. Safe to call from a stopped state (it just fades the new
   * loop in). Returns the new Howler sound id, or undefined.
   *
   * @param {string} sfxId
   * @param {{ variant?: number, rate?: number, duration?: number }} [opts]
   */
  crossfadeSfxLoop(sfxId, { variant, rate, duration = 350 } = {}) {
    if (!unlocked) return undefined;
    ensureContextRunning();

    const howls = _getSfxHowls(sfxId);
    if (!howls || howls.length === 0) return undefined;

    const target = _resolveVariantHowl(howls, variant);
    if (!target) return undefined;

    const vol = effectiveSfxVol();
    // Muted: nothing audible to blend, just make sure no instance lingers.
    if (vol === 0) {
      for (const h of howls) { if (h) { try { h.stop(); } catch { /* non-fatal */ } } }
      return undefined;
    }

    // Fade out + stop every OTHER playing instance (the loop we are leaving).
    for (const h of howls) {
      if (h && h !== target) _fadeOutAndStop(h, duration);
    }

    // Bring the target up. If it is already playing (a null slot can make the
    // fallback land on the same sample), cancel any pending stop and ride its
    // volume back to full instead of restarting it.
    _cancelPendingStop(target);
    target.loop(true);
    target.rate(rate ?? 1);
    // Fold the per-sample gain in so a per-level loop volume (e.g. a louder
    // pinnacle focus loop) carries through the crossfade, not just the mix.
    const targetVol = vol * _sfxGain(target);
    if (target.playing()) {
      target.fade(target.volume(), targetVol, duration);
      return undefined;
    }
    target.volume(0);
    const id = target.play();
    target.fade(0, targetVol, duration);
    return id;
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
      this.preloadBgm(['cultivation']);
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
        if (howl && howl.state() === 'unloaded') howl.load();
      }
    }
  },
};

export default AudioManager;
