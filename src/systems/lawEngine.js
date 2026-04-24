/**
 * lawEngine.js — Evaluate active law uniques against game state.
 *
 * Given an active law (with rolled uniques), the engine returns:
 *   - stat modifiers (to feed into computeAllStats)
 *   - special flags (for cannot_dodge, cannot_heal, hp_cap_pct, etc.)
 *   - trigger handlers (to call on combat events)
 *   - regen effects (for HP/Qi regen per second)
 *   - conversion specs (for stat conversions)
 *
 * Most effects evaluate to ZERO contribution until their condition is met.
 * The engine is called every frame of the combat tick OR whenever stats are
 * computed, so conditions re-evaluate live.
 */

import { LAW_UNIQUES_BY_ID } from '../data/lawUniques';
import { MOD } from '../data/stats';

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Walk an active law's uniques and collect structured output.
 * @param {object} law     — the active law with `uniques: { Iron: {id, value}, ... }`
 * @param {object} ctx     — current game context (see `buildContext` below)
 * @returns { statMods, flags, conversions, regen, triggers, stacks }
 */
export function evaluateLawUniques(law, ctx) {
  const result = {
    statMods: {},      // { statName: [{type, value}] }
    flags: {},         // { flagName: value }
    conversions: [],   // [{ from, to, pct }]
    regen: [],         // [{ resource, perSec }]
    triggers: [],      // [{ event, action }]
    stacks: [],        // [{ stat, mod, perStack, max, gainOn, resetOn }]
  };
  if (!law || !law.uniques) return result;

  for (const tier of Object.keys(law.uniques)) {
    const entry = law.uniques[tier];
    if (!entry) continue;
    const unique = LAW_UNIQUES_BY_ID[entry.id];
    if (!unique) continue;
    const rolledValue = entry.value;

    for (const effect of unique.effects) {
      applyEffect(effect, rolledValue, ctx, result, entry.id);
    }
  }

  return result;
}

/**
 * Build a minimal ctx object from whatever is handy. Callers fill in what
 * they know. Missing fields are treated as "unknown" → conditions that
 * reference them evaluate to false (so the effect is inactive).
 */
export function buildContext({
  hpPct, hpFull, enemyHpPct, inCombat, combatTimeSec, lastDamageAt, lastTechAt,
  lastKillAt, lastDodgeAt, lastCritAt, firstAttackFired,
  essence, soul, body, lawElement, techElements,
  realmIndex, isAtPeak, activePillCount, equippedArtefactCount,
  equippedRingCount, focusing, currentQi,
} = {}) {
  return {
    hpPct,
    hpFull,
    enemyHpPct,
    inCombat,
    combatTimeSec,
    lastDamageAt,
    lastTechAt,
    lastKillAt,
    lastDodgeAt,
    lastCritAt,
    firstAttackFired,
    essence, soul, body,
    lawElement,
    techElements: techElements || [],
    realmIndex: realmIndex ?? 0,
    isAtPeak: isAtPeak ?? false,
    activePillCount: activePillCount ?? 0,
    equippedArtefactCount: equippedArtefactCount ?? 0,
    equippedRingCount: equippedRingCount ?? 0,
    focusing: focusing ?? false,
    currentQi: currentQi ?? 0,
    nowSec: (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000,
  };
}

// ─── Effect dispatch ─────────────────────────────────────────────────────────

function applyEffect(effect, rolledValue, ctx, result, sourceId) {
  switch (effect.kind) {
    case 'stat':      return applyStat(effect, rolledValue, ctx, result);
    case 'trigger':   return result.triggers.push({ ...effect, rolledValue, sourceId });
    case 'conversion':return applyConversion(effect, rolledValue, result);
    case 'regen':     return applyRegen(effect, rolledValue, ctx, result);
    case 'special':   return applySpecial(effect, rolledValue, result);
    case 'stack':     return result.stacks.push({ ...effect, rolledValue, sourceId });
    case 'once':      return result.triggers.push({ ...effect, rolledValue, sourceId, oncePerFight: true });
  }
}

function resolveValue(spec, rolledValue, ctx) {
  if (typeof spec === 'number') return spec;
  if (spec === 'rolled') return rolledValue / 100; // % → fraction
  if (spec === 'rolled_as_mult') return 1 + rolledValue / 100;
  if (spec === 'rolled_as_more') return 1 + rolledValue / 100;
  if (spec === 'rolled_as_less') return 1 - rolledValue / 100;
  if (spec === 'rolled_as_pct')  return rolledValue / 100;
  if (spec === 'rolled_half') return rolledValue / 2;
  if (spec === 'rolled_third') return rolledValue / 3;
  if (spec === 'rolled_half_pct') return rolledValue / 200;
  if (spec === 'rolled_per_major_realm') {
    // Each major realm counts as roughly 3 indices (average sub-stage count).
    const majorRealm = Math.floor((ctx.realmIndex ?? 0) / 3);
    return (rolledValue / 100) * majorRealm;
  }
  if (spec === 'rolled_per_realm_above_saint') {
    const delta = Math.max(0, (ctx.realmIndex ?? 0) - 24);
    return (rolledValue / 100) * delta;
  }
  if (spec === 'rolled_per_active_pill')   return (rolledValue / 100) * (ctx.activePillCount ?? 0);
  if (spec === 'rolled_per_10pct_missing_hp') {
    const missing = Math.max(0, 1 - (ctx.hpPct ?? 1));
    return (rolledValue / 100) * (missing * 10);
  }
  if (spec === 'rolled_per_unique_tech_element') {
    const elems = new Set((ctx.techElements || []).filter(Boolean));
    return (rolledValue / 100) * elems.size;
  }
  if (spec === 'rolled_pct_current_qi') {
    return (rolledValue / 100) * (ctx.currentQi ?? 0);
  }
  if (spec === 'rolled_scaled_by_missing_hp') {
    const missing = Math.max(0, 1 - (ctx.hpPct ?? 1));
    return (rolledValue / 100) * missing;
  }
  if (spec === 'rolled_as_pct_per_pill') {
    return (rolledValue / 100) * (ctx.activePillCount ?? 0);
  }
  return 0;
}

function applyStat(effect, rolledValue, ctx, result) {
  if (effect.condition && !evaluateCondition(effect.condition, ctx)) return;
  const numeric = resolveValue(effect.value, rolledValue, ctx);
  if (!numeric && numeric !== 0) return;
  if (!result.statMods[effect.stat]) result.statMods[effect.stat] = [];
  result.statMods[effect.stat].push({ type: effect.mod, value: numeric });
}

function applyConversion(effect, rolledValue, result) {
  const pct = typeof effect.pct === 'number' ? effect.pct / 100 : rolledValue / 100;
  result.conversions.push({ from: effect.from, to: effect.to, pct });
}

function applyRegen(effect, rolledValue, ctx, result) {
  if (effect.condition && !evaluateCondition(effect.condition, ctx)) return;
  const perSec = resolveValue(effect.perSec, rolledValue, ctx);
  result.regen.push({ resource: effect.resource, perSec });
}

function applySpecial(effect, rolledValue, result) {
  const val = effect.value === undefined ? true
    : effect.value === 'rolled' ? rolledValue
    : effect.value === 'rolled_half' ? rolledValue / 2
    : effect.value;
  result.flags[effect.flag] = val;
}

// ─── Condition evaluation ───────────────────────────────────────────────────

export function evaluateCondition(cond, ctx) {
  if (!cond) return true;
  switch (cond.type) {
    case 'hp_below_pct':       return ctx.hpPct !== undefined && ctx.hpPct < cond.value / 100;
    case 'hp_above_pct':       return ctx.hpPct !== undefined && ctx.hpPct > cond.value / 100;
    case 'hp_full':            return ctx.hpPct !== undefined && ctx.hpPct >= 0.99;
    case 'enemy_hp_below_pct': return ctx.enemyHpPct !== undefined && ctx.enemyHpPct < cond.value / 100;
    case 'enemy_hp_above_pct': return ctx.enemyHpPct !== undefined && ctx.enemyHpPct > cond.value / 100;
    case 'in_combat':          return !!ctx.inCombat;
    case 'out_of_combat':      return !ctx.inCombat;
    case 'in_combat_idle':     return !!ctx.inCombat && ctx.lastTechAt && (ctx.nowSec - ctx.lastTechAt) > 0.5;
    case 'no_combat_for_sec':  return !ctx.inCombat && ctx.nowSec - (ctx.lastCombatEndAt || 0) > cond.sec;
    case 'no_damage_for_sec':  return ctx.lastDamageAt !== undefined && ctx.nowSec - ctx.lastDamageAt > cond.sec;
    case 'no_technique_for_sec': return ctx.lastTechAt !== undefined && ctx.nowSec - ctx.lastTechAt > cond.sec;
    case 'recent_kill_sec':    return ctx.lastKillAt !== undefined && ctx.nowSec - ctx.lastKillAt < cond.sec;
    case 'recent_dodge_sec':   return ctx.lastDodgeAt !== undefined && ctx.nowSec - ctx.lastDodgeAt < cond.sec;
    case 'recent_crit_sec':    return ctx.lastCritAt !== undefined && ctx.nowSec - ctx.lastCritAt < cond.sec;
    case 'first_attack':       return !ctx.firstAttackFired;
    case 'body_gt_soul':       return (ctx.body ?? 0) > (ctx.soul ?? 0);
    case 'soul_gt_body':       return (ctx.soul ?? 0) > (ctx.body ?? 0);
    case 'body_gt_essence_plus_soul': return (ctx.body ?? 0) > (ctx.essence ?? 0) + (ctx.soul ?? 0);
    case 'tri_harmony_10': {
      const e = ctx.essence ?? 0, s = ctx.soul ?? 0, b = ctx.body ?? 0;
      if (e === 0 || s === 0 || b === 0) return false;
      const avg = (e + s + b) / 3;
      const tol = avg * 0.1;
      return Math.abs(e - avg) <= tol && Math.abs(s - avg) <= tol && Math.abs(b - avg) <= tol;
    }
    case 'realm_below':        return (ctx.realmIndex ?? 0) < cond.index;
    case 'realm_above':        return (ctx.realmIndex ?? 0) > cond.index;
    case 'at_peak_realm':      return !!ctx.isAtPeak;
    case 'no_artefacts':       return (ctx.equippedArtefactCount ?? 0) === 0;
    case 'no_rings':           return (ctx.equippedRingCount ?? 0) === 0;
    case 'all_tech_elements_match_law': {
      const elems = ctx.techElements || [];
      if (elems.length === 0) return false;
      return elems.every(e => e === ctx.lawElement);
    }
    case 'combat_time_below':  return (ctx.combatTimeSec ?? 0) < cond.sec;
    case 'combat_time_above':  return (ctx.combatTimeSec ?? 0) > cond.sec;
    case 'focusing':           return !!ctx.focusing;
    case 'not_focusing':       return !ctx.focusing;
    case 'law_element_is':     return ctx.lawElement === cond.value;
    default:                   return true;
  }
}

// ─── Trigger dispatch (called from combat loop) ──────────────────────────────

/**
 * Check if a trigger should fire for a given event, return its action.
 * @param {object} trigger — { event, action, rolledValue, sourceId, oncePerFight? }
 * @param {string} eventType — the event that just occurred
 * @param {object} ctx
 * @param {Set}    usedOncePerFight — set of sourceIds that have already fired
 */
export function shouldFireTrigger(trigger, eventType, ctx, usedOncePerFight) {
  if (trigger.event?.event) {
    // `once` trigger wraps its inner trigger shape
    if (trigger.event.event !== eventType) return false;
  } else if (trigger.event !== eventType) {
    return false;
  }
  if (trigger.oncePerFight && usedOncePerFight.has(trigger.sourceId)) return false;
  if (trigger.action?.condition && !evaluateCondition(trigger.action.condition, ctx)) return false;
  return true;
}
