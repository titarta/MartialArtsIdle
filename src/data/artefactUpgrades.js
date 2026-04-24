/**
 * artefactUpgrades.js — upgrade ladder + value scaling.
 *
 * Replaces the deprecated refining loop. Each artefact has an
 * `upgradeLevel` (0 up to its rarity cap) and an `affixBonuses` map
 * keyed by affix index. Bonus values are freshly-rolled additions
 * awarded at milestone levels (every 4 levels — see BONUS_LEVELS).
 *
 * Spec mirrors obsidian/Artefact Upgrades.md. Cost quantities are a
 * first-pass — tune later.
 */

import { rollAffix } from './affixPools';

/** Maximum +N level per rarity. Caps the upgrade ladder. */
export const MAX_UPGRADE_BY_RARITY = {
  Iron:         4,
  Bronze:       8,
  Silver:       12,
  Gold:         16,
  Transcendent: 20,
};

/** Levels that award a bonus-roll on one existing modifier. */
export const BONUS_LEVELS = [4, 8, 12, 16, 20];

/** Value multiplier on every modifier at a given level. +N → 1 + 0.05 × N. */
export function upgradeValueMult(level) {
  return 1 + 0.05 * Math.max(0, level ?? 0);
}

/** Whether the given level-up lands on a bonus-roll milestone. */
export function isBonusLevel(level) {
  return BONUS_LEVELS.includes(level);
}

/**
 * Apply the level multiplier (and optional bonus additive) to a raw affix
 * value. `value` is the originally rolled affix value; `bonus` is the
 * additive roll layered on at milestones; `level` is the current +N.
 *
 * MORE-type affixes store `1 + Δ` instead of `Δ`, so the scale is applied
 * to the delta only — otherwise a level multiplier would inflate the
 * neutral 1.0 baseline too.
 */
export function effectiveAffixValue(affix, level = 0, bonus = 0) {
  const mult = upgradeValueMult(level);
  const raw  = (affix?.value ?? 0) + (bonus ?? 0);
  if (affix?.type === 'more') {
    return 1 + (raw - 1) * mult;
  }
  return raw * mult;
}

/**
 * Cost ladder by upgrade-level band (see obsidian/Artefact Upgrades.md).
 * bands[bandIndex] = { mineral, bloodcore, qty } where qty applies to both.
 */
const COST_BANDS = [
  { levels: [1, 2],   mineral: 'iron_mineral_1',         bloodcore: 'iron_blood_core_1',         qty: 2 },
  { levels: [3, 4],   mineral: 'iron_mineral_2',         bloodcore: 'iron_blood_core_2',         qty: 3 },
  { levels: [5, 6],   mineral: 'bronze_mineral_1',       bloodcore: 'bronze_blood_core_1',       qty: 3 },
  { levels: [7, 8],   mineral: 'bronze_mineral_2',       bloodcore: 'bronze_blood_core_2',       qty: 4 },
  { levels: [9, 10],  mineral: 'silver_mineral_1',       bloodcore: 'silver_blood_core_1',       qty: 4 },
  { levels: [11, 12], mineral: 'silver_mineral_2',       bloodcore: 'silver_blood_core_2',       qty: 5 },
  { levels: [13, 14], mineral: 'gold_mineral_1',         bloodcore: 'gold_blood_core_1',         qty: 5 },
  { levels: [15, 16], mineral: 'gold_mineral_2',         bloodcore: 'gold_blood_core_2',         qty: 6 },
  { levels: [17, 18], mineral: 'transcendent_mineral_1', bloodcore: 'transcendent_blood_core_1', qty: 6 },
  { levels: [19, 20], mineral: 'transcendent_mineral_2', bloodcore: 'transcendent_blood_core_2', qty: 8 },
];

/**
 * Cost to move from `currentLevel` to `currentLevel + 1`.
 * Returns `[{ itemId, qty }, ...]` or null if already at the rarity cap.
 */
export function upgradeCost(currentLevel, rarity) {
  const cap = MAX_UPGRADE_BY_RARITY[rarity] ?? 0;
  const target = (currentLevel ?? 0) + 1;
  if (target > cap) return null;
  const band = COST_BANDS.find(b => target >= b.levels[0] && target <= b.levels[1]);
  if (!band) return null;
  return [
    { itemId: band.mineral,   qty: band.qty },
    { itemId: band.bloodcore, qty: band.qty },
  ];
}

/**
 * Roll the bonus additive awarded at a milestone level.
 * Picks one of the artefact's affixes at random and returns
 * `{ affixIndex, bonus }` so the caller can merge it into affixBonuses.
 *
 * Returns null if the artefact has no affixes or the slot pool entry for
 * the chosen affix can't be found (defensive fallback).
 */
export function rollUpgradeBonus(affixes, rarity, AFFIX_POOL_BY_SLOT, slot) {
  if (!Array.isArray(affixes) || affixes.length === 0) return null;
  const idx   = Math.floor(Math.random() * affixes.length);
  const affix = affixes[idx];
  const pool  = AFFIX_POOL_BY_SLOT?.[slot] ?? [];
  const entry = pool.find(e => e.id === affix.id);
  if (!entry) return null;
  const fresh = rollAffix(entry, rarity);
  // For MORE-type affixes store just the delta (fresh.value - 1) so the
  // bonus adds cleanly to the stored affix delta.
  const bonus = affix.type === 'more' ? (fresh.value - 1) : fresh.value;
  return { affixIndex: idx, bonus };
}
