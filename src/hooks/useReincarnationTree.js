/**
 * useReincarnationTree.js — purchased node set + derived modifier bundle.
 *
 * PROVISIONAL ANCHORING (2026-06-05)
 * ----------------------------------
 * Anchoring a node on the Eternal Tree is NOT committed immediately. The
 * player spends karma and lights up nodes *provisionally* (in memory only)
 * while deciding their allocation, and the changes are only written to
 * localStorage when the reincarnation is actually confirmed (App.jsx's
 * handleReincarnate calls `commit()`).
 *
 * Why: the Eternal Tree is the between-lives screen. If anchoring persisted
 * on click, a player could anchor nodes, refresh the page WITHOUT
 * reincarnating, and keep the nodes + the karma spend — a free unlock. Now a
 * refresh before reincarnating simply drops the in-memory pending set, so the
 * committed karma + node set (in localStorage) are untouched: the anchors and
 * the karma spend reset, exactly as if the session never happened.
 *
 * - `committed`  : the real, persisted purchased set (survives reincarnation).
 *                  Drives `modifiers` — node EFFECTS only turn on once committed.
 * - `pending`    : provisional anchors this session, in memory only.
 * - `purchased`  : committed ∪ pending — what the screen renders as anchored.
 * - `availableKarma` : committed karma minus what's tentatively spent.
 * - `commit()`   : pay the karma, fold pending into committed, persist. Called
 *                  by handleReincarnate at the moment the wipe is committed.
 * - `discard()`  : drop pending (e.g. backing out of the flow).
 *
 * Prereqs use simple 'and' logic. Node costs vary (1..5 karma). Nodes flagged
 * `comingSoon` are visible but cannot be bought (effect not wired yet).
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NODES, NODES_BY_ID } from '../data/reincarnationTree';
import { trackTreeNodePurchased } from '../analytics';

const SAVE_KEY = 'mai_reincarnation_tree';

/** Producer id unlocked by each Hidden-Art node (kept open across lives). */
const HIDDEN_ART_PRODUCER = {
  roster:  'p_disciple',
  garden:  'p_herb_garden',
  furnace: 'p_meridian_furnace',
};

function loadPurchased() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      // Drop any node ids that no longer exist in the current tree (handles
      // old saves with n_2..n_7, al_1, md_k, etc. — silently ignored).
      return new Set(arr.filter(id => NODES_BY_ID[id]));
    }
  } catch { /* start empty on parse error */ }
  return new Set();
}

function persist(set) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify([...set])); }
  catch { /* non-fatal */ }
}

function sumCost(ids) {
  let s = 0;
  for (const id of ids) s += NODES_BY_ID[id]?.cost ?? 0;
  return s;
}

export default function useReincarnationTree({ karma, spendKarma } = {}) {
  // committed = persisted (real) purchases. pending = provisional, in memory.
  const [committed, setCommitted] = useState(loadPurchased);
  const [pending, setPending]     = useState(() => new Set());

  // Latest pending in a ref so the stable commit() closure always sees it.
  const pendingRef = useRef(pending);
  useEffect(() => { pendingRef.current = pending; }, [pending]);

  // Only the COMMITTED set is persisted — never the provisional pending set.
  useEffect(() => { persist(committed); }, [committed]);

  // Union shown on the tree screen (committed anchors + this session's pending).
  const purchased = useMemo(
    () => (pending.size ? new Set([...committed, ...pending]) : committed),
    [committed, pending],
  );

  const pendingSpend  = useMemo(() => sumCost(pending), [pending]);
  const availableKarma = Math.max(0, (karma ?? 0) - pendingSpend);

  const isPurchased = useCallback((id) => purchased.has(id), [purchased]);

  const isAvailable = useCallback((id) => {
    const node = NODES_BY_ID[id];
    if (!node || node.comingSoon || purchased.has(id)) return false;
    if (node.prereqs.length === 0) return true;
    return node.prereqs.every(pid => purchased.has(pid));
  }, [purchased]);

  const canBuy = useCallback((id) => {
    const node = NODES_BY_ID[id];
    if (!node) return false;
    return isAvailable(id) && availableKarma >= node.cost;
  }, [isAvailable, availableKarma]);

  /**
   * Anchor a node PROVISIONALLY. Stages it in `pending` (in memory) and
   * tentatively reserves its karma cost. Nothing is persisted and no karma is
   * actually spent until commit(). Returns true if staged.
   */
  const buy = useCallback((id) => {
    const node = NODES_BY_ID[id];
    if (!node || node.comingSoon) return false;
    if (!isAvailable(id)) return false;
    if (availableKarma < node.cost) return false;
    setPending(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    return true;
  }, [isAvailable, availableKarma]);

  /**
   * Commit the session: actually spend the staged karma, fold pending into the
   * committed (persisted) set, and clear pending. Called by handleReincarnate
   * when the reincarnation is confirmed. Idempotent (no-op with empty pending).
   */
  const commit = useCallback(() => {
    const pend = pendingRef.current;
    if (!pend || pend.size === 0) return;
    const total = sumCost(pend);
    const ok = spendKarma ? spendKarma(total, 'eternal_tree') : true;
    if (!ok) return; // availableKarma should have prevented this
    for (const id of pend) {
      try { trackTreeNodePurchased(id, NODES_BY_ID[id]?.cost ?? 0); } catch {}
    }
    setCommitted(prev => new Set([...prev, ...pend]));
    setPending(new Set());
  }, [spendKarma]);

  /** Drop the provisional anchors (back out without reincarnating). */
  const discard = useCallback(() => setPending(new Set()), []);

  /**
   * Derived modifier bundle. Driven by the COMMITTED set only — a node's
   * effect turns on after the reincarnation is confirmed, never on anchor.
   */
  const modifiers = useMemo(() => {
    const has = (id) => committed.has(id);
    // Karma actually spent on the tree = sum of committed node costs.
    let karmaSpent = 0;
    for (const id of committed) karmaSpent += NODES_BY_ID[id]?.cost ?? 0;

    const unlockedHiddenArts = new Set();
    for (const [nodeId, producerId] of Object.entries(HIDDEN_ART_PRODUCER)) {
      if (has(nodeId)) unlockedHiddenArts.add(producerId);
    }

    return {
      // ── Cultivation core ────────────────────────────────────────────────
      treeQiMult:   has('n_1')    ? 1 + 0.001 * karmaSpent : 1,
      heavenlyMult: has('heaven') ? 1.25 : 1,

      // ── Producers / Treasury ────────────────────────────────────────────
      producerCostMult:       has('frugal')     ? 0.95 : 1,
      producerSelfSynergyPct: has('resonance')  ? 0.01 : 0,
      producerCrossSynergyPct:has('guidance')   ? 0.005 : 0,
      producerOutputMult:     has('coffers')    ? 1.15 : 1,
      keepProducerLevelsFrac: has('foundation') ? 0.20 : 0,

      // ── Disciples / Roster ──────────────────────────────────────────────
      discipleBoardSumMult:   has('star')      ? 1.5 : 1,
      discipleBaseMult:       has('disc_base') ? 2.0 : 1,
      disciplePlaceCostMult:  has('hand')      ? 0.8 : 1,
      discipleOutputMult:     has('thousand')  ? 2.0 : 1,

      // ── Spirit Garden ───────────────────────────────────────────────────
      gardenElixirMagnitudeMult: has('potency') ? 1.2 : 1,
      gardenElixirDurationMult:  has('linger')  ? 1.3 : 1,
      gardenGrowTimeMult:        has('soil')    ? 0.8 : 1,
      gardenRebirthSeed:         has('bloom'),

      // ── Qi Crystal ──────────────────────────────────────────────────────
      crystalQiBonusMult:  1, // crystal node is comingSoon (no flat bonus today)
      crystalFeedCostMult: has('lattice') ? 0.8 : 1,
      crystalKeepFrac:     has('core')    ? 0.25 : 0,

      // ── Qi Sparks / offline / karma ─────────────────────────────────────
      sparkCommonWeightMult: 1, // Discerning Eye was cut
      sparkBuffValueMult:    has('rspark') ? 1.25 : 1,
      offlineQiMult:         has('vigil')  ? 1.30 : 1,
      karmaGainMult:         has('merit')  ? 1.10 : 1,

      // ── Hidden Arts kept unlocked across lives ──────────────────────────
      unlockedHiddenArts,
    };
  }, [committed]);

  const _reset = useCallback(() => { setCommitted(new Set()); setPending(new Set()); }, []);

  return {
    purchased,          // committed ∪ pending (for the tree screen display)
    committed,          // persisted set only
    isPurchased,
    isAvailable,
    canBuy,
    buy,                // provisional anchor (in memory)
    commit,             // persist + spend karma (called on reincarnation)
    discard,            // drop provisional anchors
    pendingCount: pending.size,
    availableKarma,
    modifiers,
    nodes: NODES,
    _reset,
  };
}
