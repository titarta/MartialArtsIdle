/**
 * useFurnace — React seam over the pure furnace data module.
 *
 * Mirrors the shape of useDiscipleMerge and useSpiritGarden (similarly the
 * other producer minigame hooks): the data module is the source of truth;
 * the hook just adds React state, a once-per-second tick, and durable
 * commits to localStorage on every mutation.
 *
 * Live state surface returned:
 *   - furnace                  (raw furnace object: pantry, heat, cauldrons,
 *                               pills, foundations, codex, stats)
 *   - refine(plantIds, heat)   (Layer 1 cook start)
 *   - combine(matIds, heat)    (Layer 2 cook start)
 *   - transcend(pillIds, heat) (Layer 3 cook start)
 *   - consume(pillId)          (apply timed buff)
 *   - sendPlantsFromBasket(basketLike, onApplied)
 *                              (move plants from garden basket to pantry,
 *                               clearing the basket on the caller side)
 *   - heatCapNow / heatRegenPerSecNow
 *                              (live values resolved against furnace count)
 *   - foundationMods           (memoised aggregate for the qi/s formula)
 *
 * The ?refresh-rate is 1Hz — enough for cook timers and heat regen. The
 * underlying data is tick-pure so any cadence works for resolution.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  loadFurnace, saveFurnace,
  tickFurnace,
  startRefine, startCombine, startTranscend,
  consumePill as pureConsumePill,
  transferFromBasket,
  aggregateFoundationMods,
  heatCap, heatRegenPerSec,
  DEFAULT_CAULDRONS,
} from '../data/furnace';

const TICK_MS = 1000;

export default function useFurnace({ furnaceCount = 0, cauldronCount = DEFAULT_CAULDRONS, onPillBuff } = {}) {
  const [furnace, setFurnace] = useState(loadFurnace);
  // Keep the latest input parameters in refs so the tick interval doesn't
  // need to be re-created on every prop change.
  const furnaceCountRef   = useRef(furnaceCount);
  const cauldronCountRef  = useRef(cauldronCount);
  const onPillBuffRef     = useRef(onPillBuff);
  furnaceCountRef.current  = furnaceCount;
  cauldronCountRef.current = cauldronCount;
  onPillBuffRef.current    = onPillBuff;

  // Single durable commit path.
  const commit = useCallback((next) => {
    setFurnace(next);
    saveFurnace(next);
  }, []);

  // Background tick — heat regen + cook completion. Survives offline because
  // the data module reads `now` and recomputes against the last tick stamp.
  useEffect(() => {
    let cancelled = false;
    function step() {
      if (cancelled) return;
      const fc = furnaceCountRef.current;
      const { furnace: next, events } = tickFurnace(furnace, fc);
      // Mutating refs in handlers — fine, we re-commit at the end of the
      // tick. Only commit if something actually changed (cheap identity test
      // on heat + cauldrons + inventory counts).
      if (next !== furnace) commit(next);
      // Events fired only for cook completions; the caller may want to play
      // an audio cue / spawn a toast. Currently we don't route them; the
      // React layer reads from `furnace` and renders accordingly. Hook
      // exposes `events` consumers via the optional handler.
      // (intentionally left in case a future audio call is desired)
      void events;
    }
    const id = setInterval(step, TICK_MS);
    // Tick once immediately so offline catch-up resolves on mount instead
    // of waiting for the first interval fire.
    step();
    return () => { cancelled = true; clearInterval(id); };
  }, [furnace, commit]);

  // ── Action helpers ─────────────────────────────────────────────────────────
  const refine = useCallback((plantIds, heatInvest) => {
    const r = startRefine(furnace, plantIds, heatInvest, cauldronCountRef.current);
    if (r.ok) commit(r.furnace);
    return r;
  }, [furnace, commit]);

  const combine = useCallback((materialIds, heatInvest) => {
    const r = startCombine(furnace, materialIds, heatInvest, cauldronCountRef.current);
    if (r.ok) commit(r.furnace);
    return r;
  }, [furnace, commit]);

  const transcend = useCallback((pillIds, heatInvest) => {
    const r = startTranscend(furnace, pillIds, heatInvest, cauldronCountRef.current);
    if (r.ok) commit(r.furnace);
    return r;
  }, [furnace, commit]);

  const consume = useCallback((pillId) => {
    const r = pureConsumePill(furnace, pillId);
    if (r.ok) {
      commit(r.furnace);
      onPillBuffRef.current?.(r.buff);
    }
    return r;
  }, [furnace, commit]);

  const sendPlantsFromBasket = useCallback((basketLike, onApplied) => {
    if (!basketLike || Object.keys(basketLike).length === 0) return false;
    const next = transferFromBasket(furnace, basketLike);
    commit(next);
    if (typeof onApplied === 'function') onApplied();
    return true;
  }, [furnace, commit]);

  // ── Derived live values ────────────────────────────────────────────────────
  const heatCapNow        = useMemo(() => heatCap(furnaceCount),         [furnaceCount]);
  const heatRegenPerSecNow= useMemo(() => heatRegenPerSec(furnaceCount), [furnaceCount]);
  const foundationMods    = useMemo(() => aggregateFoundationMods(furnace), [furnace]);

  return {
    furnace,
    refine,
    combine,
    transcend,
    consume,
    sendPlantsFromBasket,
    heatCapNow,
    heatRegenPerSecNow,
    foundationMods,
    cauldronCount,
  };
}
