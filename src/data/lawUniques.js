/**
 * lawUniques.js — Law unique modifier pool.
 *
 * Repopulated 2026-04-27 with 50 element-themed entries codifying each
 * element's combat identity:
 *   - Fire  = damage / aggression           (10 entries, pool: 'fire')
 *   - Water = healing / sustain             (10 entries, pool: 'water')
 *   - Earth = defence / mitigation          (10 entries, pool: 'earth')
 *   - Metal = exploit / debuff              (10 entries, pool: 'metal')
 *   - Wood  = dodge / evasion               (10 entries, pool: 'wood')
 *
 * The first 3 entries of each pool are "<Set N> counts as +1 artefact" —
 * one per of that element's 3 sets. The remaining 7 are themed mechanics.
 *
 * ── Effect schema ────────────────────────────────────────────────────────
 *   STAT             { kind: 'stat', stat, mod, value, condition? }
 *   TRIGGER          { kind: 'trigger', event, action }
 *   CONVERSION       { kind: 'conversion', from, to, pct }
 *   REGEN            { kind: 'regen', resource, perSec, condition? }
 *   SPECIAL (flag)   { kind: 'special', flag, value? }
 *   STACK            { kind: 'stack', stat, mod, perStack, max, gainOn, resetOn? }
 *   ONCE_PER_FIGHT   { kind: 'once', trigger, action }
 *   CD_MULT          { kind: 'cd_mult', techType, mult }       (added 2026-04-27)
 *   SET_COUNT_BONUS  { kind: 'set_count_bonus', setId, amount } (added 2026-04-27)
 *
 * Triggers fire from useCombat.dispatchTrigger on these events:
 *   on_heal, on_default_attack_fired, on_secret_tech_fired,
 *   on_dodge_success, on_hit_taken, on_enemy_killed, on_exploit_fired
 */

import { MOD } from './stats';

export { LAW_UNIQUE_POOLS } from './elements';

// Most uniques in this pass are fixed-value modifiers — the value comes from
// the effect payload, not the rolled range. range stays { min: 1, max: 1 }
// so rollUniqueValue produces a stable 1 the engine can multiply through.
const FIXED = { min: 1, max: 1 };

export const LAW_UNIQUES = [
  // ═══════════════════════════════════════════════════════════════════════════
  // FIRE — damage / aggression
  // ═══════════════════════════════════════════════════════════════════════════

  // Set-counter trio
  { id: 'l_fire_set1_extra', pool: 'fire', range: FIXED,
    description: () => 'Ember Legacy artefact count counts as having one more artefact',
    effects: [{ kind: 'set_count_bonus', setId: 'set_fire_1', amount: 1 }] },
  { id: 'l_fire_set2_extra', pool: 'fire', range: FIXED,
    description: () => 'Phoenix Coterie artefact count counts as having one more artefact',
    effects: [{ kind: 'set_count_bonus', setId: 'set_fire_2', amount: 1 }] },
  { id: 'l_fire_set3_extra', pool: 'fire', range: FIXED,
    description: () => 'Sunforge Compact artefact count counts as having one more artefact',
    effects: [{ kind: 'set_count_bonus', setId: 'set_fire_3', amount: 1 }] },

  { id: 'l_fire_aggressor', pool: 'fire', range: FIXED,
    description: () => '50% more damage with techniques. 20% less damage with default attack. 10% reduced technique cooldown',
    effects: [
      { kind: 'stat', stat: 'secret_technique_damage', mod: MOD.MORE, value: 1.50 },
      { kind: 'stat', stat: 'default_attack_damage',   mod: MOD.INCREASED, value: -0.20 },
      { kind: 'stat', stat: 'technique_cd_reduction',  mod: MOD.FLAT, value: 0.10 },
    ] },

  { id: 'l_fire_double_strike', pool: 'fire', range: FIXED,
    description: () => 'Default attacks double the damage of the next default attack. Using a technique removes this buff',
    effects: [{
      kind: 'trigger', event: 'on_default_attack_fired',
      action: { type: 'default_attack_buff_set', value: 1 },
    }] },

  { id: 'l_fire_burning_will', pool: 'fire', range: FIXED,
    description: () => 'Healing techniques have double the cooldown. 30% more damage',
    effects: [
      { kind: 'cd_mult', techType: 'Heal', mult: 2.0 },
      { kind: 'stat', stat: 'damage_all', mod: MOD.MORE, value: 1.30 },
    ] },

  { id: 'l_fire_legion', pool: 'fire', range: { min: 6, max: 6 },
    description: () => '6% more damage for each fire artefact equipped',
    effects: [{ kind: 'stat', stat: 'damage_all', mod: MOD.INCREASED,
                value: 'rolled_per_fire_artefact' }] },

  { id: 'l_fire_desperate', pool: 'fire', range: { min: 10, max: 10 },
    description: () => '1% more damage for each 1% of life missing',
    effects: [{ kind: 'stat', stat: 'damage_all', mod: MOD.INCREASED,
                value: 'rolled_per_10pct_missing_hp' }] }, // 10 × (missing×10) → up to +100% at 0 HP

  { id: 'l_fire_violent_dao', pool: 'fire', range: { min: 10, max: 10 },
    description: () => 'Qi/s is increased by 10% of damage increase multiplier',
    effects: [{ kind: 'stat', stat: 'qi_speed', mod: MOD.INCREASED,
                value: 'rolled_pct_damage_mult' }] },

  { id: 'l_fire_overwhelming', pool: 'fire', range: FIXED,
    description: () => '200% increased damage. Cannot execute exploit attacks',
    effects: [
      { kind: 'stat', stat: 'damage_all', mod: MOD.INCREASED, value: 2.00 },
      { kind: 'special', flag: 'cannotExploit' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // WATER — healing / sustain
  // ═══════════════════════════════════════════════════════════════════════════

  // Set-counter trio
  { id: 'l_water_set1_extra', pool: 'water', range: FIXED,
    description: () => 'Tidebound Rite artefact count counts as having one more artefact',
    effects: [{ kind: 'set_count_bonus', setId: 'set_water_1', amount: 1 }] },
  { id: 'l_water_set2_extra', pool: 'water', range: FIXED,
    description: () => 'Frost Mirror artefact count counts as having one more artefact',
    effects: [{ kind: 'set_count_bonus', setId: 'set_water_2', amount: 1 }] },
  { id: 'l_water_set3_extra', pool: 'water', range: FIXED,
    description: () => 'Abyssal Pact artefact count counts as having one more artefact',
    effects: [{ kind: 'set_count_bonus', setId: 'set_water_3', amount: 1 }] },

  { id: 'l_water_swift_mend', pool: 'water', range: FIXED,
    description: () => 'Healing techniques have 40% reduced cooldown. 10% less damage',
    effects: [
      { kind: 'cd_mult', techType: 'Heal', mult: 0.60 },
      { kind: 'stat', stat: 'damage_all', mod: MOD.INCREASED, value: -0.10 },
    ] },

  { id: 'l_water_purity', pool: 'water', range: FIXED,
    description: () => 'Any source of healing is 30% more effective',
    effects: [{ kind: 'stat', stat: 'healing_received', mod: MOD.INCREASED, value: 0.30 }] },

  { id: 'l_water_purifying_tide', pool: 'water', range: FIXED,
    description: () => 'Damage enemies by 30% of healing received',
    effects: [{
      kind: 'trigger', event: 'on_heal',
      action: { type: 'damage_enemy_pct_of_payload', value: 0.30 },
    }] },

  { id: 'l_water_natural_flow', pool: 'water', range: FIXED,
    description: () => '5% HP per second natural regeneration',
    effects: [{ kind: 'stat', stat: 'hp_regen_in_combat', mod: MOD.FLAT, value: 0.05 }] },

  { id: 'l_water_resonant_healing', pool: 'water', range: FIXED,
    description: () => 'Triggering healing secret techniques reduce other secret techniques cooldown by 40%',
    effects: [{
      kind: 'trigger', event: 'on_heal',
      action: { type: 'reduce_other_tech_cd_pct', value: 0.40 },
    }] },

  { id: 'l_water_living_rivers', pool: 'water', range: { min: 100, max: 100 },
    description: () => 'Qi/s is increased by healing increase multiplier',
    effects: [{ kind: 'stat', stat: 'qi_speed', mod: MOD.INCREASED,
                value: 'rolled_pct_healing_mult' }] },

  { id: 'l_water_sanctuary', pool: 'water', range: FIXED,
    description: () => 'Healing makes the next enemy hit deal no damage',
    effects: [{
      kind: 'trigger', event: 'on_heal',
      action: { type: 'null_next_enemy_hit', value: true },
    }] },

  // ═══════════════════════════════════════════════════════════════════════════
  // EARTH — defence / mitigation
  // ═══════════════════════════════════════════════════════════════════════════

  // Set-counter trio
  { id: 'l_earth_set1_extra', pool: 'earth', range: FIXED,
    description: () => 'Stoneblood Oath artefact count counts as having one more artefact',
    effects: [{ kind: 'set_count_bonus', setId: 'set_earth_1', amount: 1 }] },
  { id: 'l_earth_set2_extra', pool: 'earth', range: FIXED,
    description: () => 'Mountain Chapel artefact count counts as having one more artefact',
    effects: [{ kind: 'set_count_bonus', setId: 'set_earth_2', amount: 1 }] },
  { id: 'l_earth_set3_extra', pool: 'earth', range: FIXED,
    description: () => 'Dune Wanderers artefact count counts as having one more artefact',
    effects: [{ kind: 'set_count_bonus', setId: 'set_earth_3', amount: 1 }] },

  { id: 'l_earth_warrior_monk', pool: 'earth', range: FIXED,
    description: () => '80% increased defense and elemental defense. You cannot heal',
    effects: [
      { kind: 'stat', stat: 'defense',           mod: MOD.INCREASED, value: 0.80 },
      { kind: 'stat', stat: 'elemental_defense', mod: MOD.INCREASED, value: 0.80 },
      { kind: 'special', flag: 'cannotHeal' },
    ] },

  { id: 'l_earth_iron_resolve', pool: 'earth', range: FIXED,
    description: () => '50% more defense and elemental defense if below 50% health',
    effects: [
      { kind: 'stat', stat: 'defense',           mod: MOD.MORE, value: 1.50,
        condition: { type: 'hp_below_pct', value: 50 } },
      { kind: 'stat', stat: 'elemental_defense', mod: MOD.MORE, value: 1.50,
        condition: { type: 'hp_below_pct', value: 50 } },
    ] },

  { id: 'l_earth_thornward', pool: 'earth', range: FIXED,
    description: () => '50% of mitigated damage is retaliated',
    effects: [{ kind: 'special', flag: 'retaliateMitigatedPct', value: 0.50 }] },

  { id: 'l_earth_steady_ward', pool: 'earth', range: FIXED,
    description: () => 'Defense techniques apply to 1 more hit',
    effects: [{ kind: 'special', flag: 'defendBuffExtraHits', value: 1 }] },

  { id: 'l_earth_iron_fist', pool: 'earth', range: FIXED,
    description: () => 'Default attacks deal 5% of maximum health as physical damage',
    effects: [{ kind: 'special', flag: 'basicAttackHpPctDmg', value: 0.05 }] },

  { id: 'l_earth_meditative', pool: 'earth', range: { min: 5, max: 5 },
    description: () => '5% of out-of-combat defense is added to Qi/s',
    effects: [{ kind: 'stat', stat: 'qi_speed', mod: MOD.FLAT,
                value: 'rolled_pct_out_of_combat_defense' }] },

  { id: 'l_earth_dual_aspect', pool: 'earth', range: FIXED,
    description: () => 'Elemental defense is equal to defense. 35% less defense',
    effects: [
      { kind: 'conversion', from: 'defense', to: 'elemental_defense', pct: 100 },
      { kind: 'stat', stat: 'defense', mod: MOD.INCREASED, value: -0.35 },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // METAL — exploit / debuff
  // ═══════════════════════════════════════════════════════════════════════════

  // Set-counter trio
  { id: 'l_metal_set1_extra', pool: 'metal', range: FIXED,
    description: () => 'Iron Bastion artefact count counts as having one more artefact',
    effects: [{ kind: 'set_count_bonus', setId: 'set_metal_1', amount: 1 }] },
  { id: 'l_metal_set2_extra', pool: 'metal', range: FIXED,
    description: () => 'Razor Hierarchy artefact count counts as having one more artefact',
    effects: [{ kind: 'set_count_bonus', setId: 'set_metal_2', amount: 1 }] },
  { id: 'l_metal_set3_extra', pool: 'metal', range: FIXED,
    description: () => 'Sovereign Plate artefact count counts as having one more artefact',
    effects: [{ kind: 'set_count_bonus', setId: 'set_metal_3', amount: 1 }] },

  { id: 'l_metal_concentrated', pool: 'metal', range: FIXED,
    description: () => '50% reduced exploit chance. 100% increased exploit damage',
    effects: [
      { kind: 'stat', stat: 'exploit_chance',      mod: MOD.INCREASED, value: -0.50 },
      { kind: 'stat', stat: 'exploit_attack_mult', mod: MOD.INCREASED, value: 1.00 },
    ] },

  { id: 'l_metal_piercing', pool: 'metal', range: FIXED,
    description: () => 'Exploit hits ignore 20% of enemy defenses',
    effects: [{ kind: 'special', flag: 'exploitDefPenPct', value: 0.20 }] },

  { id: 'l_metal_extended_pressure', pool: 'metal', range: FIXED,
    description: () => 'Expose secret techniques apply to 2 more hits',
    effects: [{ kind: 'special', flag: 'exposeBuffExtraHits', value: 2 }] },

  { id: 'l_metal_torment', pool: 'metal', range: FIXED,
    description: () => 'Any debuff on an enemy is 30% more effective',
    // Routes through buff_effect (the same stat Defend / Dodge / Expose magnitudes scale by).
    effects: [{ kind: 'stat', stat: 'buff_effect', mod: MOD.INCREASED, value: 0.30 }] },

  { id: 'l_metal_armoury', pool: 'metal', range: { min: 20, max: 20 },
    description: () => '20% reduced secret technique cooldowns for each Expose technique equipped',
    effects: [{ kind: 'stat', stat: 'technique_cd_reduction', mod: MOD.FLAT,
                value: 'rolled_per_expose_tech_equipped' }] },

  { id: 'l_metal_predator', pool: 'metal', range: { min: 100, max: 100 },
    description: () => 'Qi/s is increased by exploit chance',
    effects: [{ kind: 'stat', stat: 'qi_speed', mod: MOD.INCREASED,
                value: 'rolled_pct_exploit_chance' }] },

  { id: 'l_metal_resonant', pool: 'metal', range: { min: 4, max: 4 },
    description: () => '4% more secret technique effectiveness per metal artefact equipped',
    effects: [{ kind: 'stat', stat: 'secret_technique_damage', mod: MOD.INCREASED,
                value: 'rolled_per_metal_artefact' }] },

  // ═══════════════════════════════════════════════════════════════════════════
  // WOOD — dodge / evasion
  // ═══════════════════════════════════════════════════════════════════════════

  // Set-counter trio
  { id: 'l_wood_set1_extra', pool: 'wood', range: FIXED,
    description: () => 'Verdant Accord artefact count counts as having one more artefact',
    effects: [{ kind: 'set_count_bonus', setId: 'set_wood_1', amount: 1 }] },
  { id: 'l_wood_set2_extra', pool: 'wood', range: FIXED,
    description: () => 'Root Conclave artefact count counts as having one more artefact',
    effects: [{ kind: 'set_count_bonus', setId: 'set_wood_2', amount: 1 }] },
  { id: 'l_wood_set3_extra', pool: 'wood', range: FIXED,
    description: () => 'Bloomward artefact count counts as having one more artefact',
    effects: [{ kind: 'set_count_bonus', setId: 'set_wood_3', amount: 1 }] },

  { id: 'l_wood_swift_step', pool: 'wood', range: FIXED,
    description: () => 'Dodge secret techniques have 20% reduced cooldown and last 1 more hit',
    effects: [
      { kind: 'cd_mult', techType: 'Dodge', mult: 0.80 },
      { kind: 'special', flag: 'dodgeBuffExtraHits', value: 1 },
    ] },

  { id: 'l_wood_anticipation', pool: 'wood', range: FIXED,
    description: () => 'Dodge chance is increased by 5% for each hit taken. Resets on successful dodge',
    effects: [{
      kind: 'trigger', event: 'on_hit_taken',
      action: { type: 'add_dodge_chance', value: 5 },
    }] },

  { id: 'l_wood_renewing_breeze', pool: 'wood', range: FIXED,
    description: () => 'Heal 5% HP on successful dodge',
    effects: [{
      kind: 'trigger', event: 'on_dodge_success',
      action: { type: 'heal_pct', value: 0.05 },
    }] },

  { id: 'l_wood_lithe', pool: 'wood', range: FIXED,
    description: () => 'Damage is increased by current dodge chance',
    effects: [{ kind: 'special', flag: 'damageScalesWithDodgeChance', value: true }] },

  { id: 'l_wood_unbroken_dance', pool: 'wood', range: FIXED,
    description: () => 'Each successful dodge increases defenses by 30%. Decreases dodge chance by 5% for each successful dodge',
    effects: [
      { kind: 'trigger', event: 'on_dodge_success',
        action: { type: 'dodge_stack_increment', value: 1 } },
      { kind: 'special', flag: 'defensePerDodgeStack', value: 0.30 },
      { kind: 'special', flag: 'dodgeReductionPerDodgeStack', value: 5 },
    ] },

  { id: 'l_wood_living_dao', pool: 'wood', range: FIXED,
    description: () => '30% increased Qi/s',
    effects: [{ kind: 'stat', stat: 'qi_speed', mod: MOD.INCREASED, value: 0.30 }] },

  { id: 'l_wood_grove', pool: 'wood', range: { min: 3, max: 3 },
    description: () => '3% dodge chance for each wood artefact equipped',
    // RAW-% resolver: dodge_chance is stored as 0–100 raw %, not a fraction.
    effects: [{ kind: 'stat', stat: 'dodge_chance', mod: MOD.FLAT,
                value: 'rolled_x_per_wood_artefact' }] },
];

export const LAW_UNIQUES_BY_ID = Object.fromEntries(LAW_UNIQUES.map(u => [u.id, u]));

/** Roll a value for a given unique. Returns 0 for unknown ids. */
export function rollUniqueValue(uniqueId) {
  const u = LAW_UNIQUES_BY_ID[uniqueId];
  if (!u) return 0;
  const { min, max } = u.range;
  return Math.floor(min + Math.random() * (max - min + 1));
}

/**
 * Pick a random unique for the given law, filtered by pool. The caller can
 * pass either a law object (uses `law.element` / `law.pool` / `law.types`),
 * a pool string directly, or an object with `{ types: [...] }` from the
 * legacy generator path. `general` is always implicitly included.
 *
 * Excludes any ids in `excludeIds` so a single law never rolls the same
 * unique twice across its tiers.
 */
export function pickRandomUnique(lawOrPool, excludeIds = []) {
  let pools = [];
  if (typeof lawOrPool === 'string') {
    pools = [lawOrPool];
  } else if (Array.isArray(lawOrPool?.types) && lawOrPool.types.length) {
    pools = lawOrPool.types;
  } else if (lawOrPool?.element) {
    pools = [lawOrPool.element];
  } else if (lawOrPool?.pool) {
    pools = [lawOrPool.pool];
  }
  // Fall back to general only — element-themed uniques in 2026-04-27 don't
  // include a `general` set, so passing no pool yields nothing.
  if (!pools.includes('general')) pools = [...pools, 'general'];
  const candidates = LAW_UNIQUES.filter(u => pools.includes(u.pool) && !excludeIds.includes(u.id));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Get a unique's display description given its rolled value. */
export function formatUniqueDescription(uniqueId, value) {
  const u = LAW_UNIQUES_BY_ID[uniqueId];
  if (!u) return '';
  return u.description(value);
}
