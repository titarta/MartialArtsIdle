/**
 * useReincarnationTree.js — purchased node set + derived modifier bundle.
 *
 * Purchases persist in 'mai_reincarnation_tree' and survive reincarnation.
 *
 * All nodes cost 1 karma; prereqs use simple 'and' logic (every prereq
 * must be purchased). No yyUnlock / or mode.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { NODES, NODES_BY_ID } from '../data/reincarnationTree';
import { trackTreeNodePurchased } from '../analytics';

const SAVE_KEY = 'mai_reincarnation_tree';

function loadPurchased() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      // Drop any node IDs that no longer exist in the current tree
      // (handles old saves with al_1, md_k, etc. — silently ignored).
      return new Set(arr.filter(id => NODES_BY_ID[id]));
    }
  } catch { /* start with empty set on parse error */ }
  return new Set();
}

function persist(set) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify([...set])); }
  catch { /* non-fatal */ }
}

export default function useReincarnationTree({ karma, spendKarma } = {}) {
  const [purchased, setPurchased] = useState(loadPurchased);

  useEffect(() => { persist(purchased); }, [purchased]);

  const isPurchased = useCallback((id) => purchased.has(id), [purchased]);

  const isAvailable = useCallback((id) => {
    const node = NODES_BY_ID[id];
    if (!node || purchased.has(id)) return false;
    if (node.prereqs.length === 0) return true;
    return node.prereqs.every(pid => purchased.has(pid));
  }, [purchased]);

  const canBuy = useCallback((id) => {
    const node = NODES_BY_ID[id];
    if (!node) return false;
    return isAvailable(id) && karma >= node.cost;
  }, [isAvailable, karma]);

  const buy = useCallback((id) => {
    const node = NODES_BY_ID[id];
    if (!node || !isAvailable(id)) return false;
    const ok = spendKarma(node.cost, id);
    if (!ok) return false;
    try { trackTreeNodePurchased(id, node.cost); } catch {}
    setPurchased(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    return true;
  }, [isAvailable, spendKarma]);

  /**
   * Derived modifier bundle consumed by useCultivation, useProducers,
   * useQiSparks, useQiCrystal, and App.jsx.
   */
  const modifiers = useMemo(() => {
    // Each node costs 1 karma, so karmaSpentOnTree === purchased.size.
    const karmaSpentOnTree = purchased.size;

    return {
      // n_1 Devoted Path — +0.1% Qi/s per karma spent on the tree.
      // Wired into useCultivation via treeQiMultRef in App.jsx.
      treeQiMult: purchased.has('n_1')
        ? 1 + 0.001 * karmaSpentOnTree
        : 1,

      // n_3 Crystalline Focus — +20% INCREASED to crystal Qi bonus multiplier.
      // Applied in useCultivation tick alongside crystalQiBonusRef.
      crystalQiBonusMult: purchased.has('n_3') ? 1.20 : 1,

      // n_4 Discerning Eye — common sparks are 40% less likely (weight × 0.6).
      // Passed to drawOffer() via useQiSparks.
      sparkCommonWeightMult: purchased.has('n_4') ? 0.60 : 1,

      // n_5 Frugal Cultivation — 10% reduced producer purchase cost.
      // Applied in useProducers buy().
      producerCostMult: purchased.has('n_5') ? 0.90 : 1,

      // n_6 Sect Resonance — each producer gains +1% increased Qi/s per owned
      // of that type.
      producerSelfSynergyPct: purchased.has('n_6') ? 0.01 : 0,

      // n_7 Senior's Guidance — each producer gains +0.5% increased Qi/s per
      // owned of the previous producer type.
      producerCrossSynergyPct: purchased.has('n_7') ? 0.005 : 0,
    };
  }, [purchased]);

  const _reset = useCallback(() => setPurchased(new Set()), []);

  return {
    purchased,
    isPurchased,
    isAvailable,
    canBuy,
    buy,
    modifiers,
    nodes: NODES,
    _reset,
  };
}
