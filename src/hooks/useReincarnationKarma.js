/**
 * useReincarnationKarma.js — karma earned from CUMULATIVE all-time Qi.
 *
 * 2026-05-27 redesign (Cookie-Clicker "Heavenly Chips" model):
 *   karmaEverEarned = floor( (cumulativeQiAllTime / KARMA_QI_SCALE) ^ (1/3) )
 *
 * The previous formula was a square root of PER-LIFE Qi, which inflated
 * without bound (a single 1e18 life paid ~14M karma) because per-life Qi
 * tracks the absolute Qi magnitude, and Qi magnitude explodes each run.
 *
 * Cube-root-of-cumulative ties karma to how many runs deep you are, not to
 * the raw Qi number, so karma stays small and grows gently:
 *   - Each successive karma point needs cubically more cumulative Qi
 *     (point 2 needs 8x point 1, point 3 needs 27x, ...). The first point
 *     is gated and the rhythm settles into a steady drip — the Cookie
 *     Clicker "it takes a while to get the first one" feel.
 *   - A life reaching higher peak Qi adds more to the cumulative pile, so
 *     stronger runs still pay more karma; it just never balloons.
 *
 * cumulativeQiAllTime is the single source of truth owned by useCultivation
 * (qiEarnedAllTimeRef, persisted in mai_qi_alltime, never reset). App.jsx
 * feeds it straight in: noteQiEarned(cumulativeAllTime). The hook does NOT
 * reconstruct it from per-life deltas — an earlier version did, and the
 * cross-key desync between mai_reincarnation and the main save double-counted
 * on reload. Reading the cumulative directly is reload- and reincarnation-safe.
 *
 * Persisted to 'mai_reincarnation' — NOT wiped on reincarnation. Banked
 * karma + karmaClaimed survive; only karmaEarnedThisLife (a display counter)
 * resets each life.
 */

import { useState, useEffect, useCallback } from 'react';
import { recordStat } from '../systems/statsRecorder';
import { trackKarmaSource, trackKarmaSink } from '../analytics';

const SAVE_KEY = 'mai_reincarnation';
const STATE_VERSION = 2;

/**
 * Calibration knob. Karma at cumulative Qi Q is floor(cbrt(Q / SCALE)).
 *
 * Starting value: 1e7, which targets ~10 karma at the first reincarnation
 * IF cumulative Qi by realm 24 (reincarnation unlock) is ~1e10. That Qi
 * figure is an ASSUMPTION — read the real cumulative Qi at the first 2-3
 * reincarnations from a playthrough and retune:
 *   - first reincarnation should grant enough for a few tree nodes
 *     (target ~10), not 1 and not the whole tree.
 *   - raise SCALE if first-reincarnation karma is too high, lower it if
 *     too low. Adjust by powers of ~10 then fine-tune.
 */
export const KARMA_QI_SCALE = 1e7;

/** Karma earned for a given cumulative all-time Qi. Cube root, floored. */
export function karmaFromCumulativeQi(Q) {
  if (!Number.isFinite(Q) || Q <= 0) return 0;
  return Math.floor(Math.cbrt(Q / KARMA_QI_SCALE));
}

/** Cumulative Qi required to have earned `k` karma. Inverse of the above. */
export function qiForKarma(k) {
  if (k <= 0) return 0;
  return Math.pow(k, 3) * KARMA_QI_SCALE;
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const karma = data.karma ?? 0;
      if ((data._v ?? 1) >= STATE_VERSION) {
        // Current format. cumulativeQi is a display mirror of the value
        // cultivation feeds in; karmaClaimed is the formula baseline.
        return {
          karma,
          lives:               data.lives               ?? 0,
          karmaEarnedThisLife: data.karmaEarnedThisLife  ?? 0,
          cumulativeQi:        data.cumulativeQi         ?? 0,
          karmaClaimed:        data.karmaClaimed         ?? karma,
        };
      }
      // ── Migrate v1 (per-life sqrt formula) → v2 (cumulative cube root) ──
      // Seed karmaClaimed to current banked karma so the cumulative cube-root
      // formula continues from where the player is (no flood, no drought). The
      // noteQiEarned clamp keeps expected >= karmaClaimed until cultivation's
      // all-time qi (seeded from the current life) climbs past it.
      // (Karma already spent on the tree isn't counted in the seed — with
      // today's tiny tree that means a migrated player may re-earn at most a
      // handful of karma over time. Harmless.)
      return {
        karma,
        lives:               data.lives               ?? 0,
        karmaEarnedThisLife: data.karmaEarnedThisLife  ?? 0,
        cumulativeQi:        qiForKarma(karma),
        karmaClaimed:        karma,
      };
    }
  } catch {}
  return { karma: 0, lives: 0, karmaEarnedThisLife: 0, cumulativeQi: 0, karmaClaimed: 0 };
}

function persist(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, _v: STATE_VERSION }));
  } catch {}
}

export default function useReincarnationKarma() {
  const [state, setState] = useState(loadState);

  // Persist on every change
  useEffect(() => { persist(state); }, [state]);

  /**
   * Called each tick with the player's CUMULATIVE all-time Qi (owned by
   * useCultivation). Reads it directly — no delta reconstruction — so a
   * reload can't double-count. Awards any karma the cube-root formula now
   * unlocks above what's already been claimed.
   */
  const noteQiEarned = useCallback((cumulativeAllTime) => {
    const cumulative = Number.isFinite(cumulativeAllTime) ? Math.max(0, cumulativeAllTime) : 0;
    setState(prev => {
      // Migration clamp: never let expected drop below already-claimed karma.
      // For new saves this is a no-op (real cumulative >= qiForKarma(claimed));
      // for migrated saves it holds karma steady until cultivation's all-time
      // (seeded from the current life) climbs past the claimed level.
      const effective = Math.max(cumulative, qiForKarma(prev.karmaClaimed));
      const expected  = karmaFromCumulativeQi(effective);
      const toAward   = expected - prev.karmaClaimed;

      if (toAward <= 0) {
        // No new karma; refresh the display mirror if it moved.
        if (prev.cumulativeQi === effective) return prev;
        return { ...prev, cumulativeQi: effective };
      }

      try { trackKarmaSource(toAward, 'qi'); } catch {}
      try { recordStat('karmaEarned', toAward); } catch {}
      return {
        ...prev,
        cumulativeQi:        effective,
        karma:               prev.karma + toAward,
        karmaClaimed:        prev.karmaClaimed + toAward,
        karmaEarnedThisLife: prev.karmaEarnedThisLife + toAward,
      };
    });
  }, []);

  /**
   * Bumps the life counter and resets the per-life display counter. Does NOT
   * touch karmaClaimed (all-time) — cultivation owns the cumulative qi and it
   * survives reincarnation, so karma continues seamlessly into the next life.
   * Persists synchronously so wipeReincarnation() (which snapshots
   * 'mai_reincarnation' synchronously) always sees the reset value.
   */
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
    // All-time cumulative Qi + the threshold for the next karma point, so
    // the tree screen can show "X / Y total Qi to next karma".
    cumulativeQi:        state.cumulativeQi,
    qiForNextKarma:      qiForKarma(state.karmaClaimed + 1),
    noteQiEarned,
    reincarnate,
    spendKarma,
  };
}
