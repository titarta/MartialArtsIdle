/**
 * useStats.js — Cookie-Clicker-style statistics tracker.
 *
 * Owns two parallel buckets — `run` (current incarnation) and `lifetime`
 * (across all incarnations). Run wipes on reincarnation (handled by
 * save.js's wipeReincarnation rewriting the mai_stats blob); lifetime
 * persists forever.
 *
 * Performance note: recorders mutate an in-memory object directly so
 * tick-driven calls (per-second qi accrual) don't trigger React
 * re-renders. The mutation is coalesced into React state + localStorage
 * every FLUSH_INTERVAL_MS and on tab hide / unload.
 *
 * Mount once at the App level. Hooks emit events via the recordStat /
 * eventStat / peakStat helpers in src/systems/statsRecorder.js — no
 * prop threading needed.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { STATS_KEYS, STATS_KEYS_BY_ID } from '../data/statsKeys';
import { bindRecorder, unbindRecorder } from '../systems/statsRecorder';

const SAVE_KEY          = 'mai_stats';
const STATS_VERSION     = 1;
const FLUSH_INTERVAL_MS = 5_000;

function emptyBucket() {
  const out = {};
  for (const { key } of STATS_KEYS) out[key] = 0;
  return out;
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const now = Date.now();
      return {
        version:      data.version      ?? STATS_VERSION,
        run:          { ...emptyBucket(), ...(data.run      || {}) },
        lifetime:     { ...emptyBucket(), ...(data.lifetime || {}) },
        sinceTs:      data.sinceTs      ?? now,
        // When the CURRENT run started. Reset on reincarnation
        // (resetRun). Missing on older saves → backfill to sinceTs so
        // "run started X ago" still reads as a meaningful timestamp.
        runStartedTs: data.runStartedTs ?? data.sinceTs ?? now,
      };
    }
  } catch {}
  const now = Date.now();
  return {
    version:      STATS_VERSION,
    run:          emptyBucket(),
    lifetime:     emptyBucket(),
    sinceTs:      now,
    runStartedTs: now,
  };
}

function persist(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
}

export default function useStats() {
  const [snapshot, setSnapshot] = useState(loadState);
  // Mutable mirror of the React state. Recorders mutate this directly
  // (no re-render) and flush() coalesces into setState + persist.
  const liveRef  = useRef(snapshot);
  const dirtyRef = useRef(false);

  // ── Recorders ──────────────────────────────────────────────────────────
  const record = useCallback((key, delta) => {
    if (!key || !Number.isFinite(delta) || delta === 0) return;
    const def  = STATS_KEYS_BY_ID[key];
    const live = liveRef.current;
    if (!def?.lifetimeOnly) {
      live.run[key] = (live.run[key] ?? 0) + delta;
    }
    live.lifetime[key] = (live.lifetime[key] ?? 0) + delta;
    dirtyRef.current = true;
  }, []);

  const event = useCallback((key) => { record(key, 1); }, [record]);

  const recordPeak = useCallback((key, value) => {
    if (!key || !Number.isFinite(value)) return;
    const def  = STATS_KEYS_BY_ID[key];
    const live = liveRef.current;
    if (!def?.lifetimeOnly && value > (live.run[key] ?? 0)) {
      live.run[key] = value;
      dirtyRef.current = true;
    }
    if (value > (live.lifetime[key] ?? 0)) {
      live.lifetime[key] = value;
      dirtyRef.current = true;
    }
  }, []);

  // ── Bind to the global singleton ───────────────────────────────────────
  useEffect(() => {
    const handle = { record, event, recordPeak };
    bindRecorder(handle);
    return () => unbindRecorder(handle);
  }, [record, event, recordPeak]);

  // ── Flush loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const flush = () => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      // Build a NEW object (shallow-cloning run + lifetime) so React sees
      // a reference change and re-renders. Mutating the existing object
      // wouldn't trigger a re-render and the Stats tab would look stale.
      const next = {
        version:      liveRef.current.version,
        run:          { ...liveRef.current.run },
        lifetime:     { ...liveRef.current.lifetime },
        sinceTs:      liveRef.current.sinceTs,
        runStartedTs: liveRef.current.runStartedTs,
      };
      liveRef.current = next;
      setSnapshot(next);
      persist(next);
    };

    const interval = setInterval(flush, FLUSH_INTERVAL_MS);
    const onVis    = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', flush);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, []);

  // ── Reincarnation reset ────────────────────────────────────────────────
  // Wipes the in-memory run bucket and persists. App.jsx calls this just
  // before wipeReincarnation() so the `beforeunload` flush triggered by
  // the subsequent window.location.reload() doesn't accidentally restore
  // the pre-wipe run counters. wipeReincarnation also rewrites mai_stats
  // on disk (preserving lifetime), but the in-memory mirror needs the
  // same treatment so flushes between then and the reload behave.
  const resetRun = useCallback(() => {
    const next = {
      version:      liveRef.current.version,
      run:          emptyBucket(),
      lifetime:     { ...liveRef.current.lifetime },
      sinceTs:      liveRef.current.sinceTs,
      // Stamp a fresh "run started now" so the "X ago" readout in the
      // Stats tab resets alongside the run bucket.
      runStartedTs: Date.now(),
    };
    liveRef.current = next;
    dirtyRef.current = false; // suppress the next flush
    setSnapshot(next);
    persist(next);
  }, []);

  return {
    run:          snapshot.run,
    lifetime:     snapshot.lifetime,
    sinceTs:      snapshot.sinceTs,
    runStartedTs: snapshot.runStartedTs,
    resetRun,
    // Direct API in case a consumer wants to record without going through
    // the singleton (rare — singleton is the canonical path).
    record,
    event,
    recordPeak,
  };
}
