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
 *   - variations — { src: string[] }[] (multi-sample pool; combat hit variants)
 *
 * Variation pool model
 * ──────────────────────────────────────────────────────────────────────────
 * Some sounds are randomised at playback to avoid the machine-gun feel — every
 * combat hit picks one of N samples at random. A SFX entry can declare either
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
    // Designer pads unfilled slots with null so indexes stay stable in the JSON;
    // strip those (and any malformed entries) before the manager sees them.
    next.variations = patch.variations
      .filter(v => v && Array.isArray(v.src) && v.src.length > 0)
      .map(v => ({ ...v, src: _prefixSrc(v.src) }));
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
 * Build N variation entries for a base stem, e.g. sfxVariants('combat_hit_player', 3, 'ogg', 'mp3')
 * → [{src: [..._1.ogg, _1.mp3]}, {src: [..._2.ogg, _2.mp3]}, {src: [..._3.ogg, _3.mp3]}].
 * Each Howl falls back through its own ogg/mp3 chain (browser format support).
 */
function sfxVariants(stem, count, ...exts) {
  return Array.from({ length: count }, (_, i) => ({
    src: exts.map(e => `${BASE}audio/sfx/${stem}_${i + 1}.${e}`),
  }));
}

// ── Background music ─────────────────────────────────────────────────────────
// v1 plays ONE continuous track everywhere (`cultivation`); `combat` is reserved
// for the combat-arena that ships with the v2 combat update. The old per-screen
// `world` / `menu` swaps were retired. Do not reintroduce them.

const _BGM_BASE = {
  /** The single continuous main track. Plays on every v1 screen. */
  cultivation: {
    src:    [`${BASE}audio/bgm/cultivation.ogg`, `${BASE}audio/bgm/cultivation.mp3`],
    loop:   true,
    volume: 1.0,
  },
  /** v2 (combat): high-energy loop for the combat-arena. Hidden until combat ships. */
  combat: {
    src:    [`${BASE}audio/bgm/combat.ogg`, `${BASE}audio/bgm/combat.mp3`],
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
  // Consecutive Focus: one sample per rung (1..5). Unlike combat pools (random),
  // this is played BY INDEX: rung N → variant N, so the loop escalates as the
  // player holds focus. See AudioManager.playSfx({ variant }). Designer can leave
  // higher rungs empty to reuse a single sample, or fill all 5 for a full ladder.
  focus_cultivate:     { variations: sfxVariants('focus_cultivate', 5, 'ogg', 'mp3') },

  // ── Combat ────────────────────────────────────────────────────────────────
  // Hit / dodge / death sounds use 3-variant pools so consecutive triggers don't
  // sound identical. Once-per-fight sounds (technique / heal / victory / defeat)
  // stay single-sample.
  combat_hit_player:   { variations: sfxVariants('combat_hit_player', 3, 'ogg', 'mp3') },
  combat_hit_enemy:    { variations: sfxVariants('combat_hit_enemy',  3, 'ogg', 'mp3') },
  combat_critical:     { variations: sfxVariants('combat_critical',   3, 'ogg', 'mp3') },
  combat_dodge:        { variations: sfxVariants('combat_dodge',      3, 'ogg', 'mp3') },
  combat_enemy_die:    { variations: sfxVariants('combat_enemy_die',  3, 'ogg', 'mp3') },
  combat_technique:    { src: sfx('combat_technique',    'ogg', 'mp3') },
  combat_heal:         { src: sfx('combat_heal',         'ogg', 'mp3') },
  combat_victory:      { src: sfx('combat_victory',      'ogg', 'mp3') },
  combat_defeat:       { src: sfx('combat_defeat',       'ogg', 'mp3') },

  // ── Qi Crystal ────────────────────────────────────────────────────────────
  crystal_tap:         { src: sfx('crystal_tap',         'ogg', 'mp3') },
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

  // ── Items / Crafting ──────────────────────────────────────────────────────
  item_craft:          { src: sfx('item_craft',          'ogg', 'mp3') },
  item_upgrade:        { src: sfx('item_upgrade',        'ogg', 'mp3') },
  item_equip:          { src: sfx('item_equip',          'ogg', 'mp3') },
  item_unequip:        { src: sfx('item_unequip',        'ogg', 'mp3') },
  item_pill_use:       { src: sfx('item_pill_use',       'ogg', 'mp3') },
};

export const SFX = Object.fromEntries(
  Object.entries(_SFX_BASE).map(([id, cfg]) => [id, _applySfx(id, cfg)])
);

/** All SFX ids as a typed union helper — useful for autocomplete when calling playSfx(). */
export const SFX_ID = /** @type {const} */ (Object.keys(SFX));
