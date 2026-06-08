/**
 * lawEngine.js — stubbed.
 *
 * The pre-pivot engine walked an active law's rolled uniques and returned
 * statMods / flags / triggers / regen / conversions for the combat tick,
 * the cultivation rate calc, and the stats panel.
 *
 * The v1 Cookie-Clicker pivot retired laws, lawUniques, the affixPools roll
 * tables, and the combat surface that consumed the engine's output. The
 * remaining call sites (useCultivation's offline-rate path + StatsTab's
 * preview pass) still ask for the bundle, so the API stays — every call
 * returns the empty bundle below and the downstream merge sees a no-op.
 */

const EMPTY_BUNDLE = Object.freeze({
  statMods: {},
  flags: {},
  conversions: [],
  regen: [],
  triggers: [],
  stacks: [],
  cdTypeMults: {},
  setCountBonus: {},
});

/** Returns the empty bundle for any input. */
export function evaluateLawUniques(_law, _ctx) {
  return EMPTY_BUNDLE;
}

/** Returns the ctx unchanged. Kept callable so the previous wide call sites
 *  don't need to learn a new shape — the engine reads zero of these fields
 *  now, so the contents don't matter. */
export function buildContext(input = {}) {
  return { ...input };
}

/** Pre-pivot helpers kept callable so any stale reference resolves to a
 *  no-op rather than throwing. */
export function evaluateCondition(_cond, _ctx) {
  return false;
}

export function shouldFireTrigger(_trigger, _eventType, _ctx, _usedOncePerFight) {
  return false;
}
