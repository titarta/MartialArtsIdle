/**
 * Crystal Discovery — mechanic-tier grant table.
 *
 * Restored 2026-06-18. This table (and its App.jsx listener) was deleted as
 * collateral in cb480f5 "cleanup: nuke old systems", which severed the only
 * grant path for the mechanic-tier T1 sparks. The mechanic cards are flagged
 * `retired: true` in qiSparks.js ON PURPOSE: they are NOT random spark
 * offerings. They are unlocked deterministically by crystal progression, here.
 *
 * Each crystal visual tier (2..10) grants a mechanic-tier T1 spark when the
 * crystal evolves into it. `useQiCrystal` returns `{previousTier, newTier}`
 * on every level-up loop; HomeScreen.handleCrystalEvolve re-broadcasts that as
 * the `mai:crystal-tier-crossed` window event, and App.jsx walks every tier
 * crossed and calls `qiSparks.grant(sparkId)` for each entry below.
 *
 * Discovery order (interaction cost climbs with tier):
 *   T2 (L10) -> Crystal Reservoir   tap the crystal; natural extension of the tap loop
 *   T3 (L20) -> Consecutive Focus   hold-to-cultivate gains a stepped ladder; no new surface
 *   T4 (L30) -> Divine Qi           first active distraction: orb taps in the scene
 *   T5 (L40) -> Pattern Click       most attention-heavy: dot sequencing mini-game
 *   T6+ (L50+) reserved for v2 mechanics; absence here means no grant on those evolutions.
 *
 * `qiSparks.grant` is idempotent for mechanics, so running this on every tier
 * evolution is safe: mechanics already owned at an equal-or-higher tier are
 * skipped.
 */
export const CRYSTAL_TIER_GRANTS = {
  2: 'crystal_click_t1',
  3: 'consecutive_focus_t1',
  4: 'divine_qi_t1',
  5: 'pattern_click_t1',
};

/**
 * Spark id → tutorial-card id. When a mechanic is granted by a live crystal
 * evolution, App.jsx fires the matching card so the new mechanic explains
 * itself (the backfill path deliberately does NOT fire these: a player who
 * already owns the mechanic shouldn't be re-taught it). Card copy + ids live
 * in data/tutorialCards.js (TUTORIAL_IDS.MECH_*).
 */
export const CRYSTAL_TIER_TUTORIALS = {
  crystal_click_t1:     'mech_crystal_reservoir',
  consecutive_focus_t1: 'mech_consecutive_focus',
  divine_qi_t1:         'mech_divine_qi',
  pattern_click_t1:     'mech_tracing_meridians',
};

/**
 * Walk every tier crossed in a single evolution event and return the ordered
 * list of spark ids to grant. Empty if no thresholds were crossed.
 *
 * Example: previousTier=1, newTier=4 -> ['crystal_click_t1','consecutive_focus_t1','divine_qi_t1'].
 */
export function sparksToGrantOnEvolution(previousTier, newTier) {
  const out = [];
  for (let t = Math.max(2, (previousTier ?? 0) + 1); t <= (newTier ?? 0); t++) {
    const sparkId = CRYSTAL_TIER_GRANTS[t];
    if (sparkId) out.push(sparkId);
  }
  return out;
}
