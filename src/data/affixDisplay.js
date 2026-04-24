import { MOD } from './stats';

export const AFFIX_UNIQUE_COLOR = '#ff7ae6';

export const AFFIX_STAT_LABELS = {
  // Damage categories
  physical_damage:        'Physical Damage',
  elemental_damage:       'Elemental Damage',
  damage_all:             'All Damage',
  // Source-gated damage
  default_attack_damage:  'Basic Attack Damage',
  secret_technique_damage:'Secret Technique Damage',
  // Defensive
  defense:                'Defense',
  elemental_defense:      'Elemental Defense',
  health:                 'Health',
  // Combat utility
  exploit_chance:         'Exploit Chance',
  exploit_attack_mult:    'Exploit Multiplier',
  // Cultivation
  qi_speed:               'Qi Speed',
  qi_focus_mult:          'Focus Multiplier',
  heavenly_qi_mult:       'Heavenly Qi Multiplier',
  // Activity
  harvest_speed:          'Harvest Speed',
  harvest_luck:           'Harvest Luck',
  mining_speed:           'Mining Speed',
  mining_luck:            'Mining Luck',
  // Buffs
  buff_effect:            'Buff Effect',
  buff_duration:          'Buff Duration',
};

// Stats whose FLAT / BASE_FLAT values are stored as decimal percentage points
// (0.05 = +5pp). Displayed with a % suffix instead of a raw number.
export const AFFIX_PCT_FLAT_STATS = new Set([
  'qi_focus_mult', 'heavenly_qi_mult',
  'harvest_luck', 'mining_luck',
  'exploit_chance', 'exploit_attack_mult',
  'default_attack_damage', 'secret_technique_damage',
  'buff_effect', 'buff_duration',
]);

// Subset of AFFIX_PCT_FLAT_STATS whose stat-engine contract is 0–100 scale
// (the engine rounds `exploitChance = Math.round(computeStat(0, mods))`
// directly, so a stored 0.05 collapses to 0). Artefact affixes roll these
// as decimals (matching INCREASED semantics), so we scale ×100 at projection
// time when pushing into the stat modifier bundle.
//
// The complement (default_attack_damage, secret_technique_damage, buff_*,
// heavenly_qi_mult) is consumed as a 0–1 fraction and must stay decimal.
export const AFFIX_PCT_POINT_STATS = new Set([
  'qi_focus_mult',
  'harvest_luck', 'mining_luck',
  'exploit_chance', 'exploit_attack_mult',
]);

/** Cap a numeric value at 2 decimal places and trim trailing zeros. */
function fmt2(n) {
  if (typeof n !== 'number' || !isFinite(n)) return n;
  return Number(n.toFixed(2));
}

/**
 * Format a single affix / bonus line. Works for both artefact slot-bonuses
 * (uniform shape `{ stat, type, value }`) and transmutation affixes (same
 * shape, plus optional `unique: true` / `description`).
 *
 * All numeric outputs are capped at 2 decimal places (after any
 * level-multiplier scaling the caller has applied).
 */
export function formatAffixValue(affix) {
  if (affix.unique) return affix.description ?? affix.name ?? '';
  const label = AFFIX_STAT_LABELS[affix.stat] ?? affix.stat;
  if (affix.type === MOD.INCREASED) {
    return `+${fmt2(affix.value * 100)}% ${label}`;
  }
  if (affix.type === MOD.MORE) {
    return `×${fmt2(affix.value)} ${label}`;
  }
  // FLAT / BASE_FLAT
  const isPct = AFFIX_PCT_FLAT_STATS.has(affix.stat);
  const v = isPct
    ? `${fmt2(affix.value * 100)}%`
    : fmt2(affix.value);
  const prefix = affix.type === MOD.BASE_FLAT ? '+ base' : '+';
  return `${prefix} ${v} ${label}`;
}
