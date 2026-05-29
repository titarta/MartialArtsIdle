/**
 * minigames.js — the "Hidden Arts" producer-minigame registry + shared reward model.
 *
 * Design intent: each producer unlocks ONE bespoke minigame once it reaches
 * Mythic tier (100+ owned). This file is the SPINE that keeps ten bespoke games
 * from becoming ten bespoke systems:
 *   1. it maps producer id → minigame metadata, and
 *   2. it houses the single cash-out model every minigame shares.
 *
 * Reward model: a session converts a 0..1 performance score into "this many
 * minutes of your CURRENT qi/s", granted as an instant burst. Expressing the
 * payout relative to live production keeps it relevant at any realm and caps
 * how much a minigame can ever contribute.
 *
 * STATUS: tuning mockups, not balanced final content. Numbers are STARTING
 * VALUES — validate against scripts/sim-cultivation.mjs.
 */

/** Shared cash-out band. `minMinutes` floors a poor run; `maxMinutes` caps a
 *  great run so a minigame stays a top-up, never the main qi engine. */
export const REWARD_BAND = { minMinutes: 5, maxMinutes: 30 };

/** qi = ratePerSec × 60 × minutes(perf). Returns { qi, minutes }. */
export function computeReward(ratePerSec, performance01, band = REWARD_BAND) {
  const p = Math.max(0, Math.min(1, performance01 || 0));
  const minutes = band.minMinutes + (band.maxMinutes - band.minMinutes) * p;
  const qi = Math.max(0, (ratePerSec || 0) * 60 * minutes);
  return { qi, minutes };
}

/**
 * Registry. `component` selects the playable game (null = coming-soon teaser).
 * `glyph` is a calligraphy watermark; `mode` advertises the effort type.
 */
export const MINIGAMES = {
  p_disciple: {
    component: 'skirmish',
    name: 'Sect Skirmish',
    glyph: '兵',
    tagline: 'March your army through an endless gauntlet, then drill them stronger and push further.',
    mode: 'Push · train · repeat',
    ready: true,
  },
  p_herb_garden: {
    component: 'garden',
    name: 'Spirit Garden',
    glyph: '苗',
    tagline: 'Sow spirit seeds, tend the plots, return to a heavy harvest.',
    mode: 'Idle · tend & collect',
    ready: true,
  },
  p_meridian_furnace: {
    component: 'refine',
    name: 'Pill Refinement',
    glyph: '丹',
    tagline: 'Hold the flame true and fold rare reagents into a potent pill.',
    mode: 'Active · timing',
    ready: true,
  },

  // ── Coming-soon teasers (concepts only; no playable component yet) ────────
  p_treasure:       { component: null, name: 'Ancestral Echoes', glyph: '祖', tagline: 'Enshrine your ancestors for lasting blessings.',  mode: 'Idle · slotting',     ready: false },
  p_beast_pact:     { component: null, name: 'Beast Arena',      glyph: '兽', tagline: 'Pit your pacted beasts up the spirit ladder.',     mode: 'Active · battler',    ready: false },
  p_pillar:         { component: null, name: 'Pillar Ascent',    glyph: '昇', tagline: 'Climb the heavenly pillar, dodge tribulation.',    mode: 'Active · climber',    ready: false },
  p_sect_followers: { component: null, name: 'Sect Offerings',   glyph: '香', tagline: 'Marshal ten thousand disciples to the tithe.',     mode: 'Light management',    ready: false },
  p_void:           { component: null, name: 'Void Channeling',  glyph: '虛', tagline: 'Route the rift before it seals.',                  mode: 'Active · puzzle',     ready: false },
  p_dragon:         { component: null, name: 'Dragon Dream',     glyph: '龍', tagline: 'Siphon as it breathes; bank before it wakes.',     mode: 'Active · push luck',  ready: false },
  p_phoenix:        { component: null, name: 'Phoenix Pyre',     glyph: '鳳', tagline: 'Ride the flame currents and gather feathers.',      mode: 'Active · arcade',     ready: false },
};

/** Lookup helper — returns null when a producer has no minigame entry. */
export function getMinigame(producerId) {
  return MINIGAMES[producerId] ?? null;
}
