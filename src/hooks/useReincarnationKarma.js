/**
 * useReincarnationKarma.js — tracks karma earned continuously from Qi generated
 * this life.
 *
 * Karma formula: the k-th karma point (0-indexed) costs 1,000,000 + k×10,000 Qi.
 * Total Qi for n karma:  Q(n) = 5,000n² + 995,000n
 * Inverse (karma from Qi):
 *   n = floor((-995,000 + √(990,025,000,000 + 20,000·Q)) / 10,000)
 *
 * Persisted to 'mai_reincarnation' — NOT wiped on reincarnation.
 * karmaEarnedThisLife resets to 0 on each reincarnation.
 */

import { useState, useEffect, useCallback } from 'react';
import { recordStat } from '../systems/statsRecorder';
import { trackKarmaSource, trackKarmaSink } from '../analytics';

const SAVE_KEY = 'mai_reincarnation';

/**
 * Returns how many karma points correspond to `Q` total Qi earned this life.
 * Quadratic inverse of Q(n) = 5,000n² + 995,000n.
 */
export function karmaFromQi(Q) {
  if (Q <= 0) return 0;
  return Math.floor((-995_000 + Math.sqrt(990_025_000_000 + 20_000 * Q)) / 10_000);
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        karma:               data.karma               ?? 0,
        lives:               data.lives               ?? 0,
        karmaEarnedThisLife: data.karmaEarnedThisLife ?? 0,
      };
    }
  } catch {}
  return { karma: 0, lives: 0, karmaEarnedThisLife: 0 };
}

function persist(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
}

export default function useReincarnationKarma() {
  const [state, setState] = useState(loadState);

  // Persist on every change
  useEffect(() => { persist(state); }, [state]);

  /**
   * Called each tick (or whenever qiEarnedThisLife updates).
   * Awards any newly-unlocked karma points based on total Qi earned this life.
   */
  const noteQiEarned = useCallback((qiEarnedThisLife) => {
    setState(prev => {
      const expected = karmaFromQi(qiEarnedThisLife);
      const toAward  = expected - prev.karmaEarnedThisLife;
      if (toAward <= 0) return prev;
      try { trackKarmaSource(toAward, 'qi'); } catch {}
      try { recordStat('karmaEarned', toAward); } catch {}
      return {
        ...prev,
        karma:               prev.karma + toAward,
        karmaEarnedThisLife: prev.karmaEarnedThisLife + toAward,
      };
    });
  }, []);

  /** Bumps the life counter and resets karmaEarnedThisLife.
   * Persists synchronously so `wipeReincarnation()` (which snapshots
   * 'mai_reincarnation' synchronously) always sees the reset value. */
  const reincarnate = useCallback(() => {
    setState(prev => {
      const next = { ...prev, lives: prev.lives + 1, karmaEarnedThisLife: 0 };
      persist(next); // sync write — survives wipeReincarnation snapshot
      return next;
    });
  }, []);

  /** Spend karma on a tree node. Returns true on success. */
  const spendKarma = useCallback((cost, nodeId = 'unknown') => {
    let ok = false;
    setState(prev => {
      if (prev.karma < cost) return prev;
      ok = true;
      return { ...prev, karma: prev.karma - cost };
    });
    if (ok) {
      try { trackKarmaSink(cost, nodeId); } catch {}
      try { recordStat('karmaSpent', cost); } catch {}
    }
    return ok;
  }, []);

  return {
    karma:               state.karma,
    lives:               state.lives,
    karmaEarnedThisLife: state.karmaEarnedThisLife,
    noteQiEarned,
    reincarnate,
    spendKarma,
  };
}
