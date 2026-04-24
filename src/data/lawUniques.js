/**
 * lawUniques.js — Law unique modifier pool.
 *
 * WIPED during the Damage & Element System Overhaul (2026-04-24).
 * The pre-overhaul ~119 uniques are archived in
 * obsidian/Deprecated_Unique_Modifiers.md. They referenced
 * essence/soul/body, psychic_damage, soul_toughness, or the 9-pool
 * type system — none survive as-is. Refill with new entries targeting
 * the 5-element / 2-damage-bucket model.
 *
 * The effect schema constants and helpers below are preserved for
 * porting; LAW_UNIQUES itself is empty.
 *
 * ── Effect schema (kept for reference) ────────────────────────────────
 *
 *   STAT       { kind: 'stat', stat, mod, value, condition? }
 *   TRIGGER    { kind: 'trigger', event, action }
 *   CONVERSION { kind: 'conversion', from, to, pct }
 *   REGEN      { kind: 'regen', resource, perSec, condition? }
 *   SPECIAL    { kind: 'special', flag, value? }
 *   STACK      { kind: 'stack', stat, mod, perStack, max, gainOn, resetOn? }
 *   ONCE_PER_FIGHT { kind: 'once', trigger, action }
 *
 * See obsidian/Unique Modifiers.md for the full schema reference.
 */

// MOD import removed — preserved here as a marker; reintroduce if/when
// new uniques are populated.
// import { MOD } from './stats';

// ─── Pools ───────────────────────────────────────────────────────────────────
// Stage 2 intentionally leaves the legacy 9-pool list in place; Stage 5
// replaces this with the new 5-element + general layout.
export const LAW_UNIQUE_POOLS = [
  'physical', 'sword', 'fist',
  'fire', 'water', 'earth',
  'spirit', 'void', 'dao',
  'general',
];

// ─── Damage categories (LEGACY — removed in Stage 3) ─────────────────────────
// Stage 3 collapses physical/elemental/psychic to physical/elemental and
// removes the typeMults primary-stat anchor. These exports are kept for
// the Stage 2 commit so module imports do not break.
export const TYPE_TO_DAMAGE_CATEGORY = {
  physical: 'physical', sword: 'physical', fist: 'physical',
  fire:     'elemental', water: 'elemental', earth: 'elemental',
  spirit:   'psychic',   void:  'psychic',   dao:   'psychic',
};

export function damageCategoryForType(type) {
  return TYPE_TO_DAMAGE_CATEGORY[type] ?? null;
}

export const DAMAGE_CATEGORY_TO_PRIMARY_STAT = {
  physical:  'body',
  elemental: 'essence',
  psychic:   'soul',
};

export function primaryStatForType(type) {
  const cat = TYPE_TO_DAMAGE_CATEGORY[type];
  return cat ? DAMAGE_CATEGORY_TO_PRIMARY_STAT[cat] : null;
}

// ─── Unique modifier pool ────────────────────────────────────────────────────

export const LAW_UNIQUES = [];

export const LAW_UNIQUES_BY_ID = Object.fromEntries(LAW_UNIQUES.map(u => [u.id, u]));

/** Roll a value for a given unique. Returns 0 for unknown ids. */
export function rollUniqueValue(uniqueId) {
  const u = LAW_UNIQUES_BY_ID[uniqueId];
  if (!u) return 0;
  const { min, max } = u.range;
  return Math.floor(min + Math.random() * (max - min + 1));
}

/**
 * Pick a random unique for the given law. With the pool empty, always
 * returns null. Signature preserved for callers in lawEngine /
 * useCultivation / ProductionScreen.
 */
export function pickRandomUnique(_lawOrExcludeIds, _excludeIds) {
  return null;
}

/** Get a unique's display description given its rolled value. */
export function formatUniqueDescription(uniqueId, value) {
  const u = LAW_UNIQUES_BY_ID[uniqueId];
  if (!u) return '';
  return u.description(value);
}
