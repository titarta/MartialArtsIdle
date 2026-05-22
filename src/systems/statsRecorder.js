/**
 * statsRecorder.js — module-level singleton for the stats data layer.
 *
 * Hooks (useCultivation, useQiCrystal, useProducers, etc.) call the
 * `recordStat` / `eventStat` / `peakStat` helpers below without needing
 * a useStats prop threaded through. useStats binds itself on mount via
 * `bindRecorder`; until it binds, every call is a safe no-op (handy for
 * pre-mount offline calc paths, tests, or hot-reload windows).
 *
 * Only one live binding at a time — useStats is intended to mount once
 * at the App level, like useDailyBonus.
 */

let live = null;

export function bindRecorder(recorder) {
  live = recorder;
}

export function unbindRecorder(recorder) {
  if (live === recorder) live = null;
}

/** Increment a counter by `delta`. Honours `lifetimeOnly` declarations
 *  in statsKeys.js (lifetime-only keys never touch the run bucket). */
export function recordStat(key, delta = 1) {
  live?.record(key, delta);
}

/** Convenience — record(key, 1). */
export function eventStat(key) {
  live?.event(key);
}

/** Record a peak value — only stores if greater than the existing value.
 *  Updates both run and lifetime buckets independently. */
export function peakStat(key, value) {
  live?.recordPeak(key, value);
}
