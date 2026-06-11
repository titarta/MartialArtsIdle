/**
 * Audio manifest — single source of truth for all sound IDs and their file paths.
 *
 * Files live under public/audio/ so they are served as static assets (not bundled).
 * Prefer .ogg first (smaller, better loop), .mp3 as fallback for Safari/iOS.
 *
 * Paths are prefixed with BASE_URL so they resolve correctly on GitHub Pages
 * (base /MartialArtsIdle/) as well as root-served dev/native builds.
 *
 * Override model
 * ──────────────────────────────────────────────────────────────────────────
 * audio.override.json (committed via the Designer) can patch any entry.
 * BGM record keys are prefixed "bgm_" (e.g. "bgm_cultivation").
 * SFX record keys are the SFX id directly (e.g. "ui_click").
 * Supported patch fields:
 *   - volume     — number 0..1 (BGM + SFX)
 *   - loop       — boolean (BGM only)
 *   - src        — string[] of file URLs (single sample; legacy + non-variant SFX)
 *   - variations — { src: string[] }[] (multi-sample pool; e.g. crystal-tap variants)
 *
 * Variation pool model
 * ──────────────────────────────────────────────────────────────────────────
 * Some sounds are randomised at playback to avoid the machine-gun feel — every
 * crystal tap picks one of N samples at random. A SFX entry can declare either
 * `src` (single sample) OR `variations: [{ src }, ...]`. AudioManager normalises
 * single-src entries to a one-element variation list internally.
 *
 * A pool can also be played BY INDEX rather than at random. Pass
 * `playSfx(id, { variant: n })` to pick variant n (1-based, clamped). This is how
 * Consecutive Focus escalates: rung 1..5 maps to focus_cultivate variants 1..5.
 */

import audioOverride from '../data/config/audio.override.json';

const BASE = import.meta.env.BASE_URL;

const _overrides = audioOverride.records || {};

// Ensure override src paths have the correct BASE_URL prefix.
// Stored paths may be relative ("audio/sfx/foo.ogg") or legacy absolute ("/audio/sfx/foo.ogg").
function _prefixSrc(paths) {
  return paths.map(p => {
    if (p.startsWith('http') || p.startsWith(BASE)) return p;
    return BASE + p.replace(/^\//, '');
  });
}

function _applyBgm(id, cfg) {
  const patch = _overrides[`bgm_${id}`];
  if (!patch) return cfg;
  return {
    ...cfg,
    ...(patch.volume !== undefined && { volume: patch.volume }),
    ...(patch.loop   !== undefined && { loop:   patch.loop   }),
    ...(patch.src    !== undefined && { src:    _prefixSrc(patch.src) }),
  };
}

function _applySfx(id, cfg) {
  const patch = _overrides[id];
  if (!patch) return cfg;
  // When the override declares variations, it fully replaces the base entry's
  // src/variations — we don't merge per-variant. (Keeps the model simple: the
  // designer either uploads variants or doesn't.)
  const next = {
    ...cfg,
    ...(patch.volume !== undefined && { volume: patch.volume }),
  };
  if (patch.variations !== undefined) {
    // Keep the array index-stable: the designer pads unfilled slots with null so
    // indexed playback (variant = rung) maps slot N to index N-1. Preserve those
    // nulls (don't compact) and let AudioManager handle them: it skips nulls on a
    // random pick and falls back to the nearest filled slot on an indexed pick.
    // Malformed entries also normalise to null.
    next.variations = patch.variations
      .map(v => (v && Array.isArray(v.src) && v.src.length > 0) ? { ...v, src: _prefixSrc(v.src) } : null);
    delete next.src;
  } else if (patch.src !== undefined) {
    next.src = _prefixSrc(patch.src);
    delete next.variations;
  }
  return next;
}

function sfx(stem, ...exts) {
  return exts.map(e => `${BASE}audio/sfx/${stem}.${e}`);
}

/**
 * Build N variation entries for a base stem, e.g. sfxVariants('crystal_tap', 4, 'ogg', 'mp3')
 * → [{src: [..._1.ogg, _1.mp3]}, {src: [..._2.ogg, _2.mp3]}, ... up to _N].
 * Each Howl falls back through its own ogg/mp3 chain (browser format support).
 */
function sfxVariants(stem, count, ...exts) {
  return Array.from({ length: count }, (_, i) => ({
    src: exts.map(e => `${BASE}audio/sfx/${stem}_${i + 1}.${e}`),
  }));
}

// ── Background music ─────────────────────────────────────────────────────────
// One continuous track plays everywhere (`cultivation`). The old per-screen
// `world` / `menu` / `combat` swaps were retired. Do not reintroduce them.

const _BGM_BASE = {
  /** The single continuous main track. Plays on every screen. */
  cultivation: {
    src:    [`${BASE}audio/bgm/cultivation.ogg`, `${BASE}audio/bgm/cultivation.mp3`],
    loop:   true,
    volume: 1.0,
  },
};

export const BGM_TRACKS = Object.fromEntries(
  Object.entries(_BGM_BASE).map(([id, cfg]) => [id, _applyBgm(id, cfg)])
);

// ── Sound effects ─────────────────────────────────────────────────────────────

const _SFX_BASE = {
  // ── UI ────────────────────────────────────────────────────────────────────
  ui_click:       { src: sfx('ui_click',       'ogg', 'mp3') },
  ui_notify:      { src: sfx('ui_notify',      'ogg', 'mp3') },

  // ── Cultivation ───────────────────────────────────────────────────────────
  // Peak (sub-realm) breakthrough: the lightweight 2.6s banner.
  cult_breakthrough:   { src: sfx('cult_breakthrough',   'ogg', 'mp3') },
  // Major breakthrough cinematic, split into four beats (see CharacterEvolutionOverlay):
  //   start:      the moment the cinematic begins (player pressed Breakthrough)
  //   transition: the morph beat (old dissolves, new tier descends)
  //   loop:       LOOPS after the morph completes, until the player taps continue
  //   continue:   the resolve when the player taps to dismiss
  cult_breakthrough_start:      { src: sfx('cult_breakthrough_start',      'ogg', 'mp3') },
  cult_breakthrough_transition: { src: sfx('cult_breakthrough_transition', 'ogg', 'mp3') },
  cult_breakthrough_loop:       { src: sfx('cult_breakthrough_loop',       'ogg', 'mp3') },
  cult_breakthrough_continue:   { src: sfx('cult_breakthrough_continue',   'ogg', 'mp3') },
  // Focus-cultivation escalating LOOP, played BY INDEX (variant = focus level).
  // Level 1 = the plain hold; each Consecutive Focus rung climbed = the next
  // level (App.jsx maps rung N → level N+1), capped at 5. Designer can leave
  // higher levels empty to reuse a lower sample.
  focus_cultivate:     { variations: sfxVariants('focus_cultivate', 5, 'ogg', 'mp3') },
  // Instant "tick" fired at each focus-level transition (paired with the loop
  // above). One per level (1..5), played by index: level N → variant N.
  focus_tick:          { variations: sfxVariants('focus_tick', 5, 'ogg', 'mp3') },

  // ── Qi Crystal ────────────────────────────────────────────────────────────
  // Tapped constantly to collect the reservoir, so a 4-sample random pool
  // avoids the machine-gun repeat feel (same model as divine_qi_collect).
  crystal_tap:         { variations: sfxVariants('crystal_tap', 4, 'ogg', 'mp3') },
  crystal_tap_max:     { src: sfx('crystal_tap_max',     'ogg', 'mp3') },
  crystal_level_up:    { src: sfx('crystal_level_up',    'ogg', 'mp3') },
  // Crystal evolution, split into four beats (see CrystalEvolutionOverlay):
  //   start:    pickup/lift as the evolution begins
  //   break:    the old crystal shatters (~18% of the play)
  //   rebuild:  the new crystal bursts in (~68%). Keeps the legacy id crystal_evolve.
  //   continue: the resolve when the player taps to dismiss
  crystal_evolve_start:    { src: sfx('crystal_evolve_start',    'ogg', 'mp3') },
  crystal_evolve_break:    { src: sfx('crystal_evolve_break',    'ogg', 'mp3') },
  crystal_evolve:          { src: sfx('crystal_evolve',          'ogg', 'mp3') },
  crystal_evolve_continue: { src: sfx('crystal_evolve_continue', 'ogg', 'mp3') },
  // Divine Qi orbs are tapped repeatedly, so a 3-sample pool (random) avoids the
  // machine-gun repeat feel (same model as combat hits).
  divine_qi_collect:   { variations: sfxVariants('divine_qi_collect', 3, 'ogg', 'mp3') },

  // ── Sect (Producers) ────────────────────────────────────────────────────────
  producer_tier_up:    { src: sfx('producer_tier_up',    'ogg', 'mp3') },

  // ── Qi Sparks ─────────────────────────────────────────────────────────────
  spark_pattern_tap:   { src: sfx('spark_pattern_tap',   'ogg', 'mp3') },
  spark_pattern_clear: { src: sfx('spark_pattern_clear', 'ogg', 'mp3') },
  spark_pattern_miss:  { src: sfx('spark_pattern_miss',  'ogg', 'mp3') },
};

export const SFX = Object.fromEntries(
  Object.entries(_SFX_BASE).map(([id, cfg]) => [id, _applySfx(id, cfg)])
);

/** All SFX ids as a typed union helper — useful for autocomplete when calling playSfx(). */
export const SFX_ID = /** @type {const} */ (Object.keys(SFX));
