import { useState, useEffect, useRef, useCallback } from 'react';
import PRODUCERS, { PRODUCERS_BY_ID } from '../data/producers';
import { recordStat } from '../systems/statsRecorder';

const SAVE_KEY = 'mai_producers';

// ── Persistence ───────────────────────────────────────────────────────────────

function loadOwned() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveOwned(owned) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(owned)); } catch {}
}

// The offline-rate snapshot (`mai_producers_rate_snapshot`) is written by
// App.jsx — it needs to fold in per-producer upgrade multipliers which this
// hook intentionally doesn't know about. See the mirror effect in App.jsx
// that triggers on producers.owned OR upgrades.owned change.

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useProducers — owns the {[producerId]: ownedCount} map.
 *
 * Cost / max-affordable / rate are pure derivations from `owned`. The hook
 * deliberately does NOT touch qi — callers must spend qi through
 * `cultivation.spendQi(amount)` before calling `buy(id, n)`.
 *
 * Wiring: App.jsx mirrors `getRate()` into useCultivation's `producerRateRef`
 * each render; that ref is folded into the rAF rate formula.
 */
export default function useProducers() {
  const [owned, setOwned] = useState(loadOwned);
  const ownedRef = useRef(owned);
  // n_5 Frugal Cultivation — written by App.jsx from tree.modifiers.producerCostMult.
  // Applied in getCost / getMaxAffordable so the discounted price flows through
  // every consumer (CultivationScreen buy, auto-buy, max-affordable calc)
  // without any callsite changes.
  const costMultRef = useRef(1);

  useEffect(() => {
    ownedRef.current = owned;
    saveOwned(owned);
  }, [owned]);

  // Convenience accessor — owned count for a producer.
  const getOwned = useCallback((id) => owned[id] ?? 0, [owned]);

  /**
   * Geometric-sum cost for buying `n` units of `id` starting from the current
   * owned count. Formula: startCost × scaling^owned × (scaling^n − 1) / (scaling − 1).
   * Returns 0 for unknown ids or non-positive n.
   * Multiplied by `costMultRef.current` so node 5 (Frugal Cultivation) and
   * similar discounts apply automatically at every callsite.
   */
  const getCost = useCallback((id, n = 1) => {
    const p = PRODUCERS_BY_ID[id];
    if (!p || n <= 0) return 0;
    const o = owned[id] ?? 0;
    const s = p.costScaling;
    const geomSum = (Math.pow(s, n) - 1) / (s - 1);
    const base = Math.ceil(p.startCost * Math.pow(s, o) * geomSum);
    return Math.ceil(base * (costMultRef.current ?? 1));
  }, [owned]);

  /**
   * Max units of `id` purchasable with `qi`. Solves the cost-sum inequality:
   *   startCost × s^owned × (s^n − 1) / (s − 1)  ≤  qi
   * → n ≤ log( 1 + qi × (s−1) / (startCost × s^owned) ) / log(s)
   * Inflates `qi` by (1 / costMultRef) before the inversion so the
   * effective affordability matches the discounted cost.
   */
  const getMaxAffordable = useCallback((id, qi) => {
    const p = PRODUCERS_BY_ID[id];
    if (!p || qi <= 0) return 0;
    const o = owned[id] ?? 0;
    const s = p.costScaling;
    // Adjust effective qi upward by the cost discount factor so the
    // geometric inversion sees the right spending power.
    const effectiveQi = qi / (costMultRef.current ?? 1);
    const rhs = 1 + (effectiveQi * (s - 1)) / (p.startCost * Math.pow(s, o));
    if (rhs <= 1) return 0;
    return Math.max(0, Math.floor(Math.log(rhs) / Math.log(s)));
  }, [owned]);

  /**
   * Sum of per-unit qi/sec × owned, across all producers.
   *
   * Optional `extraMult` callback returns a per-producer multiplier — used
   * by App.jsx to fold in the per-producer doubling upgrades from
   * useUpgrades.getProducerMult. Passing nothing returns the un-modified
   * producer sum (used by the offline-rate snapshot, which intentionally
   * excludes mutable upgrade state).
   *
   * Optional `flatPerUnit` is added to EVERY producer's per-unit qi/s
   * before the per-producer mult applies. Used by Sect Discipline (Dial-9
   * common timed spark) to temporarily boost every producer's base rate
   * by +1. Defaults to 0 → identity behaviour.
   *
   * Optional `selfSynergyPct` / `crossSynergyPct` — Eternal Tree node 6/7.
   *   selfSynergyPct:  +% INCREASED qi/s per owned of the SAME producer type.
   *                    e.g. 0.01 + 50 owned → ×1.50 on that producer.
   *   crossSynergyPct: +% INCREASED qi/s per owned of the PREVIOUS producer
   *                    type in the PRODUCERS array. First producer has no
   *                    previous type (crossBonus = 1).
   */
  const getRate = useCallback((extraMult, flatPerUnit = 0, { selfSynergyPct = 0, crossSynergyPct = 0 } = {}) => {
    const mult = typeof extraMult === 'function' ? extraMult : null;
    let rate = 0;
    for (let i = 0; i < PRODUCERS.length; i++) {
      const p = PRODUCERS[i];
      const o = owned[p.id] ?? 0;
      if (o > 0) {
        const m = mult ? mult(p.id) : 1;
        // n_6 Sect Resonance — self-synergy: each owned unit of this type
        // contributes +selfSynergyPct INCREASED to the producer's base rate.
        const selfBonus  = selfSynergyPct  > 0 ? (1 + o * selfSynergyPct)  : 1;
        // n_7 Senior's Guidance — cross-synergy: driven by the count of
        // the PREVIOUS producer in the ordered PRODUCERS array.
        const prevOwned  = i > 0 ? (owned[PRODUCERS[i - 1].id] ?? 0) : 0;
        const crossBonus = crossSynergyPct > 0 ? (1 + prevOwned * crossSynergyPct) : 1;
        rate += o * (p.startQiPerSec + flatPerUnit) * selfBonus * crossBonus * m;
      }
    }
    return rate;
  }, [owned]);

  /** Unlock predicate against current realm index. */
  const isUnlocked = useCallback((id, realmIndex) => {
    const p = PRODUCERS_BY_ID[id];
    if (!p) return false;
    const u = p.unlock ?? { type: 'always' };
    if (u.type === 'always') return true;
    if (u.type === 'realm')  return realmIndex >= u.minRealmIndex;
    return false;
  }, []);

  /**
   * Adds `n` units of producer `id`. CALLER must have already deducted the qi
   * via cultivation.spendQi(getCost(id, n)). Returns true on success.
   */
  const buy = useCallback((id, n = 1) => {
    if (n <= 0) return false;
    if (!PRODUCERS_BY_ID[id]) return false;
    setOwned(prev => ({ ...prev, [id]: (prev[id] ?? 0) + n }));
    // Stats — aggregate counter (per-producer breakdown deferred to v2).
    try { recordStat('producersBought', n); } catch {}
    return true;
  }, []);

  /**
   * Force-sets a producer's owned count. Used by sparks that consume
   * producers (e.g. Phoenix Reborn resets the Phoenix count to 0 on
   * every major realm breakthrough). Bypasses the qi-spend path — caller
   * is responsible for any compensating bonus.
   */
  const setOwnedCount = useCallback((id, count) => {
    if (!PRODUCERS_BY_ID[id]) return false;
    const n = Math.max(0, Math.floor(count));
    setOwned(prev => {
      if ((prev[id] ?? 0) === n) return prev;
      if (n === 0) {
        // Drop the key entirely so the empty state matches a fresh save.
        if (!(id in prev)) return prev;
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: n };
    });
    return true;
  }, []);

  /**
   * Reincarnation reset — retain a fractional portion of each producer's
   * level (driven by Eternal Tree's `keepProducerLevelsFrac` modifier).
   * Default 0 = full wipe.
   */
  const resetToFraction = useCallback((frac = 0) => {
    setOwned(prev => {
      if (frac <= 0) return {};
      const out = {};
      for (const id of Object.keys(prev)) {
        const next = Math.floor((prev[id] ?? 0) * frac);
        if (next > 0) out[id] = next;
      }
      return out;
    });
  }, []);

  return {
    owned,
    ownedRef,
    getOwned,
    getCost,
    getMaxAffordable,
    getRate,
    isUnlocked,
    buy,
    setOwnedCount,
    resetToFraction,
    // Ref written by App.jsx from tree.modifiers.producerCostMult (n_5).
    // Default 1 = no discount. Set to 0.90 when Frugal Cultivation is active.
    costMultRef,
  };
}
