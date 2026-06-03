/**
 * useDiscipleMerge — React seam for the disciple promotion grid.
 *
 * Owns the merge state + actions. Exposes a Context so the SectMerge tab can
 * read it without prop drilling, while App.jsx reads the same instance to
 * fold the per-disciple multiplier into the disciple producer's qi/s.
 *
 * Pattern: call `useDiscipleMergeProvider()` at App.jsx, wrap children in
 * <DiscipleMergeContext.Provider value={merge}>, then any descendant can
 * `useDiscipleMerge()` for read + actions.
 */
import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import {
  defaultMerge, loadMerge, saveMerge,
  spawnTile, resolveDrop, secludeTile,
  boardSum, discipleProducerMult, BONUS_PER_BOARD_SUM,
} from '../data/discipleMerge';

export const DiscipleMergeContext = createContext(null);

/** Call once at App.jsx and feed into the context provider. */
export function useDiscipleMergeProvider() {
  const [state, setState] = useState(loadMerge);

  // Persist on every state change.
  useEffect(() => { saveMerge(state); }, [state]);

  const place = useCallback(() => {
    let out;
    setState(prev => {
      out = spawnTile(prev, 1);
      return out.state;
    });
    return out;  // { state, idx, placed }
  }, []);

  const drop = useCallback((fromIdx, toIdx) => {
    let out;
    setState(prev => {
      out = resolveDrop(prev, fromIdx, toIdx);
      return out.state;
    });
    return out;  // { state, action, newTier? }
  }, []);

  const seclude = useCallback((idx) => {
    let out;
    setState(prev => {
      out = secludeTile(prev, idx);
      return out.state;
    });
    return out;  // { state, removed }
  }, []);

  const reset = useCallback(() => setState(defaultMerge()), []);

  const sum = boardSum(state.tiles);
  const perDiscipleBonusPct = sum * BONUS_PER_BOARD_SUM;
  const producerMult = 1 + perDiscipleBonusPct;
  let tileCount = 0;
  for (const t of state.tiles) if (t) tileCount++;

  return {
    state,
    place, drop, seclude, reset,
    sum,
    tileCount,
    perDiscipleBonusPct,
    producerMult,
  };
}

/** Read the merge bundle from context. Returns null if no provider. */
export default function useDiscipleMerge() {
  return useContext(DiscipleMergeContext);
}
