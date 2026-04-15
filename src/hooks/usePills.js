/**
 * usePills.js — Pill consumption hook (permanent stat improvements).
 *
 * Pills are no longer temporary buffs — consuming one permanently and
 * irreversibly adds its stat bonuses to the character.
 *
 * State:
 *   ownedPills      { [pillId]: count }  — persisted to 'mai_pills'
 *   permanentStats  { [statId]: value }  — persisted to 'mai_permanent_pill_stats'
 *
 * `usePill(pillId)` returns an array of { stat, value } deltas so the UI
 * can display a floating stat-gain animation. Returns null if the pill
 * is not owned or does not exist.
 *
 * `getStatModifiers()` and `getQiMult()` maintain the same external interface
 * as before (both now read from permanentStats instead of active pills).
 */

import { useState, useEffect, useCallback } from 'react';
import { PILLS_BY_ID } from '../data/pills';

const SAVE_KEY = 'mai_pills';
const PERM_KEY = 'mai_permanent_pill_stats';

// Stats that contribute as INCREASED (percentage) type mods.
// All other stats contribute as FLAT.
const INCREASED_STATS = new Set(['harvest_speed', 'mining_speed']);

function loadOwned() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function loadPermanentStats() {
  try {
    const raw = localStorage.getItem(PERM_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export default function usePills() {
  const [ownedPills,      setOwnedPills]      = useState(loadOwned);
  const [permanentStats,  setPermanentStats]   = useState(loadPermanentStats);

  // Persist owned pills
  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(ownedPills)); } catch {}
  }, [ownedPills]);

  // Persist permanent stats
  useEffect(() => {
    try { localStorage.setItem(PERM_KEY, JSON.stringify(permanentStats)); } catch {}
  }, [permanentStats]);

  const craftPill = useCallback((pillId) => {
    setOwnedPills(prev => ({
      ...prev,
      [pillId]: (prev[pillId] || 0) + 1,
    }));
  }, []);

  /**
   * Consume one pill permanently.
   * @returns {Array<{stat: string, value: number}>} stat deltas for animation,
   *          or null if pill not owned / not found.
   */
  const usePill = useCallback((pillId) => {
    const pill = PILLS_BY_ID[pillId];
    if (!pill) return null;

    let didConsume = false;
    setOwnedPills(prev => {
      const current = prev[pillId] || 0;
      if (current <= 0) return prev;
      didConsume = true;
      return { ...prev, [pillId]: current - 1 };
    });

    if (!didConsume) return null;

    // Accumulate stats permanently
    setPermanentStats(prev => {
      const next = { ...prev };
      for (const eff of pill.effects) {
        next[eff.stat] = (next[eff.stat] ?? 0) + eff.value;
      }
      return next;
    });

    // Return deltas for floating animation
    return pill.effects.map(eff => ({ stat: eff.stat, value: eff.value }));
  }, [ownedPills]); // eslint-disable-line react-hooks/exhaustive-deps

  const getOwnedCount = useCallback((pillId) => {
    return ownedPills[pillId] || 0;
  }, [ownedPills]);

  /**
   * Returns { [stat]: [{type, value}] } for permanent pill stats.
   * qi_speed is excluded (handled via getQiMult).
   */
  const getStatModifiers = useCallback(() => {
    const mods = {};
    for (const [stat, total] of Object.entries(permanentStats)) {
      if (stat === 'qi_speed') continue;
      if (!total) continue;
      const modType = INCREASED_STATS.has(stat) ? 'increased' : 'flat';
      mods[stat] = [{ type: modType, value: total }];
    }
    return mods;
  }, [permanentStats]);

  /**
   * Returns additive qi multiplier: 1 + accumulated qi_speed value.
   */
  const getQiMult = useCallback(() => {
    return 1 + (permanentStats.qi_speed ?? 0);
  }, [permanentStats]);

  return {
    ownedPills,
    permanentStats,
    craftPill,
    usePill,
    getOwnedCount,
    getStatModifiers,
    getQiMult,
  };
}
