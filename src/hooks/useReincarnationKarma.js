/**
 * useReincarnationKarma.js — tracks karma + the highest realm ever reached.
 *
 * Karma is awarded once per realm (first-time only). Persisted to
 * 'mai_reincarnation' — NOT wiped on reincarnation.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  karmaForReachingIndex,
  totalKarmaForPeak,
  SAINT_UNLOCK_INDEX,
  PEAK_INDEX,
} from '../data/reincarnationTree';

const SAVE_KEY = 'mai_reincarnation';

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        karma:          data.karma          ?? 0,
        highestReached: data.highestReached ?? 0,
        maxAwarded:     data.maxAwarded     ?? 0,
        lives:          data.lives          ?? 0,
      };
    }
  } catch {}
  return { karma: 0, highestReached: 0, maxAwarded: 0, lives: 0 };
}

function persist(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
}

export default function useReincarnationKarma() {
  const [state, setState] = useState(loadState);

  // Persist on every change
  useEffect(() => { persist(state); }, [state]);

  /**
   * Called on every realm breakthrough. Bumps highestReached if new.
   * Does NOT award karma — that happens at reincarnation time.
   */
  const noteRealmReached = useCallback((index) => {
    setState(prev => {
      if (index <= prev.highestReached) return prev;
      return { ...prev, highestReached: index };
    });
  }, []);

  /**
   * Called when the player clicks reincarnate. Awards delta karma for
   * any newly-reached realms since the last reincarnation and increments
   * the life counter. Returns the karma awarded.
   */
  const reincarnate = useCallback(() => {
    let awarded = 0;
    setState(prev => {
      // Award sum of karmaForReachingIndex from (maxAwarded+1) up to highestReached
      for (let i = prev.maxAwarded + 1; i <= prev.highestReached; i++) {
        awarded += karmaForReachingIndex(i);
      }
      return {
        ...prev,
        karma:      prev.karma + awarded,
        maxAwarded: Math.max(prev.maxAwarded, prev.highestReached),
        lives:      prev.lives + 1,
      };
    });
    return awarded;
  }, []);

  /** Spend karma on a tree node. Returns true on success. */
  const spendKarma = useCallback((cost) => {
    let ok = false;
    setState(prev => {
      if (prev.karma < cost) return prev;
      ok = true;
      return { ...prev, karma: prev.karma - cost };
    });
    return ok;
  }, []);

  /** Preview how much karma the player would earn if they reincarnated now. */
  const pendingKarma = (() => {
    let sum = 0;
    for (let i = state.maxAwarded + 1; i <= state.highestReached; i++) {
      sum += karmaForReachingIndex(i);
    }
    return sum;
  })();

  return {
    karma:           state.karma,
    highestReached:  state.highestReached,
    maxAwarded:      state.maxAwarded,
    lives:           state.lives,
    pendingKarma,
    unlocked:        state.highestReached >= SAINT_UNLOCK_INDEX,
    peakKarmaTotal:  totalKarmaForPeak(PEAK_INDEX),
    noteRealmReached,
    reincarnate,
    spendKarma,
  };
}
