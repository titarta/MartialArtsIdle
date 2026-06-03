/**
 * Audio timeline config for the multi-beat cinematics (crystal evolution +
 * major breakthrough). The cinematics read the per-sound trigger times from
 * here so the dev Audio Lab (?audioLab) can retune them without code edits.
 *
 * Model.
 * Each cinematic has a fixed `playMs` (matches the CSS animation length) and a
 * set of reference `beats` (the visual keyframes, as % of playMs) for the Lab
 * to draw against. `sounds[]` are the editable one-shots fired during the
 * "playing" phase, each at `t` ms from the overlay mount. A sound's `t` can be
 * BEFORE its beat so a riser/buildup peaks on the beat.
 *
 * The loop + continue sounds are event-driven (fire on settle / on tap), not on
 * this timeline; their trigger logic lives in the overlay code. They are listed
 * per cinematic under `events` purely so the Lab can show the full sound set
 * (they have no editable `t`).
 *
 * The Audio Lab writes a localStorage override (sound `t` values only); the
 * cinematics read it live via getAudioTimeline() so every replay uses the
 * latest tuning. Export from the Lab and bake the values back into DEFAULTS.
 */

const STORAGE_KEY = 'mai_audio_timeline';

export const AUDIO_TIMELINE_DEFAULTS = {
  crystal: {
    label:  'Crystal Evolution',
    replay: 'mai:crystal-evolve',
    playMs: 3800, // matches cesOld/cesNew 3.8s in App.css
    beats: [
      { label: 'Lift',    pct: 0 },
      { label: 'Shatter', pct: 18 },
      { label: 'Impact',  pct: 68 },
      { label: 'Settle',  pct: 100 },
    ],
    sounds: [
      { id: 'crystal_evolve_start', label: 'Start',   t: 0 },
      { id: 'crystal_evolve_break', label: 'Break',   t: 700 },
      { id: 'crystal_evolve',       label: 'Rebuild', t: 2580 },
    ],
    // Event-driven, not time-tuned (fired by the overlay on a discrete event).
    // Shown in the Lab for completeness so the full sound set is visible.
    events: [
      { id: 'crystal_evolve_continue', label: 'Continue', when: 'on tap' },
    ],
  },
  breakthrough: {
    label:  'Major Breakthrough',
    replay: 'mai:char-evolve',
    playMs: 4200, // matches cheOld/cheNew 4.2s in App.css
    beats: [
      { label: 'Charge',    pct: 22 },
      { label: 'New form',  pct: 62 },
      { label: 'Complete',  pct: 100 },
    ],
    sounds: [
      { id: 'cult_breakthrough_start',      label: 'Start',      t: 0 },
      { id: 'cult_breakthrough_transition', label: 'Transition', t: 2600 },
    ],
    // Event-driven, not time-tuned (fired by the overlay on a discrete event).
    // Shown in the Lab for completeness so the full sound set is visible.
    events: [
      { id: 'cult_breakthrough_loop',     label: 'Loop',     when: 'on settle, until tap' },
      { id: 'cult_breakthrough_continue', label: 'Continue', when: 'on tap' },
    ],
  },
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Defaults merged with the dev Audio Lab's localStorage override (sound `t`
 * values, matched by sound id). Read fresh each call so a replay always picks
 * up the latest tuning. Safe in any environment (no localStorage = defaults).
 */
export function getAudioTimeline() {
  const out = clone(AUDIO_TIMELINE_DEFAULTS);
  try {
    if (typeof localStorage === 'undefined') return out;
    const ov = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!ov) return out;
    for (const key of Object.keys(out)) {
      const ovSounds = ov[key]?.sounds;
      if (!Array.isArray(ovSounds)) continue;
      for (const s of out[key].sounds) {
        const o = ovSounds.find((x) => x && x.id === s.id);
        if (o && Number.isFinite(o.t)) s.t = Math.max(0, Math.round(o.t));
      }
    }
  } catch { /* malformed override, fall back to defaults */ }
  return out;
}

/** Persist the Lab's tuning (full timeline object). Dev tool only. */
export function saveAudioTimeline(timeline) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(timeline)); } catch { /* non-fatal */ }
}

/** Clear the override so the cinematics fall back to the baked defaults. */
export function resetAudioTimeline() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* non-fatal */ }
}
