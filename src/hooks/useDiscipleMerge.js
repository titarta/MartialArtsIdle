/**
 * useDiscipleMerge — React seam for the Roster (Disciple Promotion grid).
 *
 * Owns the merge state + actions. Exposes a Context so SectMerge can read
 * it without prop drilling, while App.jsx reads the same instance to:
 *   1. Fold producerMult into the disciple producer's qi/s rate
 *   2. Settle Merit accumulation when disciple count changes (so accruals
 *      use the right disciple count for the elapsed period)
 *
 * Merit accumulates LAZILY:
 *   state.meritStored = balance at meritLastUpdate
 *   "current" Merit  = stored + (now − last) × disciples × MERIT_RATE
 * No 1Hz tick in App.jsx — the SectMerge component runs its own local
 * tick just for display while open.
 *
 * Action semantics:
 *   place(discipleCount)   → settles, deducts Place cost from Merit, drops T1
 *   drop(from, to)         → resolves merge/swap/move; merges add yield to Merit
 *   expand(spendQi)        → checks tier gate, calls spendQi(qiCost), grows grid
 *   seclude(idx)           → removes a tile (no refund)
 *   settle(discipleCount)  → fold accumulated Merit into stored (used by App.jsx
 *                            when disciple count changes so offline-style accrual
 *                            uses the correct count for each interval)
 *   reset()                → wipe to default (3×3, 0 Merit)
 */
import { useState, useEffect, useCallback, useContext, createContext, useRef } from 'react';
import {
  defaultMerge, loadMerge, saveMerge,
  tryPlace, resolveDrop, secludeTile, expandGrid, settleMerit,
  boardSum, tileCount, currentMerit, placeCost, nextExpansion,
  BONUS_PER_BOARD_SUM, MERIT_RATE,
} from '../data/discipleMerge';
import { trackDiscipleMerge, trackMinigameEvent } from '../analytics';

export const DiscipleMergeContext = createContext(null);

/** Call once at App.jsx and feed into the context provider. */
export function useDiscipleMergeProvider() {
  const [state, setState] = useState(loadMerge);

  // Persist on every state change. Merit lazy-compute means setState only
  // fires on actual actions (place / drop / expand / seclude / settle), not
  // every animation frame — so this is cheap.
  useEffect(() => { saveMerge(state); }, [state]);

  // Eternal Tree 'Open Hand' — App.jsx writes tree.modifiers.disciplePlaceCostMult here.
  const placeCostMultRef = useRef(1);

  const place = useCallback((discipleCount) => {
    let out;
    setState(prev => {
      out = tryPlace(prev, discipleCount, undefined, placeCostMultRef.current);
      return out.state;
    });
    return out;  // { state, placed, idx, cost, reason? }
  }, []);

  const drop = useCallback((fromIdx, toIdx) => {
    let out;
    setState(prev => {
      out = resolveDrop(prev, fromIdx, toIdx);
      return out.state;
    });
    if (out?.action === 'merge' && out.newTier) {
      try { trackDiscipleMerge(`t${out.newTier}`, 1); } catch {}
    }
    return out;  // { state, action, newTier?, meritYield }
  }, []);

  const seclude = useCallback((idx) => {
    let out;
    setState(prev => {
      out = secludeTile(prev, idx);
      return out.state;
    });
    return out;  // { state, removed }
  }, []);

  /**
   * Try to expand. spendQi(amount) must return true if qi was deducted.
   * Returns { expanded, reason?, need?, qiCost?, newSize? }.
   */
  const expand = useCallback((spendQi) => {
    let out = { expanded: false };
    setState(prev => {
      const next = nextExpansion(prev.gridSize);
      if (!next) { out = { expanded: false, reason: 'maxed' }; return prev; }
      if (prev.highestTier < next.unlockTier) {
        out = { expanded: false, reason: 'tier', need: next.unlockTier };
        return prev;
      }
      const ok = spendQi(next.qiCost);
      if (!ok) { out = { expanded: false, reason: 'qi', qiCost: next.qiCost }; return prev; }
      const e = expandGrid(prev);
      if (!e.expanded) { out = { expanded: false, reason: e.reason, need: e.need }; return prev; }
      try { trackMinigameEvent('disciple_merge', 'expand', e.next.size); } catch {}
      out = { expanded: true, newSize: e.next.size, qiCost: next.qiCost };
      return e.state;
    });
    return out;
  }, []);

  /** Settle Merit using a known disciple count. Used by App.jsx when the
   *  count changes, so the accrual for the prior interval uses the right
   *  count rather than over- or under-counting after the change. */
  const settle = useCallback((discipleCount) => {
    setState(prev => settleMerit(prev, discipleCount));
  }, []);

  const reset = useCallback(() => setState(defaultMerge()), []);

  // Read-side derivations — pure, recomputed each render.
  const sum = boardSum(state.tiles);
  const perDiscipleBonusPct = sum * BONUS_PER_BOARD_SUM;
  const producerMult = 1 + perDiscipleBonusPct;
  const tilesNow = tileCount(state.tiles);
  const nextPlaceCost = Math.max(1, Math.ceil(placeCost(tilesNow) * (placeCostMultRef.current > 0 ? placeCostMultRef.current : 1)));
  const next = nextExpansion(state.gridSize);

  return {
    state,
    place, drop, seclude, expand, settle, reset,
    placeCostMultRef,
    sum,
    tileCount: tilesNow,
    perDiscipleBonusPct,
    producerMult,
    nextPlaceCost,
    nextExpansion: next,           // { size, tiles, qiCost, unlockTier } or null
    highestTier: state.highestTier,
    gridSize: state.gridSize,
    MERIT_RATE,                    // exposed so UI can show "+X.X/s" estimate
  };
}

/** Read the merge bundle from context. Returns null if no provider. */
export default function useDiscipleMerge() {
  return useContext(DiscipleMergeContext);
}

// Re-export the lazy current-merit helper so SectMerge can compute it for display.
export { currentMerit };
