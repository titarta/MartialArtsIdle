/**
 * useReincarnationTree.js — purchased tree nodes + derived modifier bundle.
 *
 * Purchases are persisted to 'mai_reincarnation_tree' and are NOT wiped on
 * reincarnation. Each node is a one-time purchase.
 *
 * The hook exposes `modifiers`, a plain object consumed by the cultivation /
 * combat / stat systems to apply the buffs.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { NODES, NODES_BY_ID } from '../data/reincarnationTree';

const SAVE_KEY = 'mai_reincarnation_tree';

function loadPurchased() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function persist(set) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify([...set])); } catch {}
}

export default function useReincarnationTree({ karma, spendKarma }) {
  const [purchased, setPurchased] = useState(loadPurchased);

  useEffect(() => { persist(purchased); }, [purchased]);

  const isPurchased = useCallback((id) => purchased.has(id), [purchased]);

  /** A node is available when every prereq ORs to satisfied (or no prereqs). */
  const isAvailable = useCallback((id) => {
    const node = NODES_BY_ID[id];
    if (!node) return false;
    if (purchased.has(id)) return false;
    if (node.prereqs.length === 0) return true;
    return node.prereqs.some(pid => purchased.has(pid));
  }, [purchased]);

  const canBuy = useCallback((id) => {
    const node = NODES_BY_ID[id];
    if (!node) return false;
    return isAvailable(id) && karma >= node.cost;
  }, [isAvailable, karma]);

  const buy = useCallback((id) => {
    const node = NODES_BY_ID[id];
    if (!node) return false;
    if (!isAvailable(id)) return false;
    const ok = spendKarma(node.cost);
    if (!ok) return false;
    setPurchased(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    return true;
  }, [isAvailable, spendKarma]);

  /** Derived multipliers / flats for consumers. */
  const modifiers = useMemo(() => ({
    qiMult:         purchased.has('qis2x')     ? 2 : 1,
    damageMult:     purchased.has('damage3x')  ? 3 : 1,
    pillMult:       purchased.has('pills2x')   ? 2 : 1,
    crystalMult:    purchased.has('stones3x')  ? 3 : 1,
    miningMult:     purchased.has('mining2x')  ? 2 : 1,
    gatheringMult:  purchased.has('gather2x')  ? 2 : 1,
    focusMult:      purchased.has('focus3x')   ? 3 : 1,
    heavenlyMult:   purchased.has('heaven2x')  ? 2 : 1,
    statsFlat:      purchased.has('stats1000') ? 1000 : 0,
  }), [purchased]);

  /** Stat-bundle modifiers merged into computeAllStats via mergeModifiers. */
  const getStatModifiers = useCallback(() => {
    const mods = {};
    if (modifiers.miningMult !== 1) {
      mods.mining_speed = [{ type: 'more', value: modifiers.miningMult }];
    }
    if (modifiers.gatheringMult !== 1) {
      mods.harvest_speed = [{ type: 'more', value: modifiers.gatheringMult }];
    }
    if (modifiers.focusMult !== 1) {
      // qi_focus_mult has a base of 300 (%); triple = 900%.
      mods.qi_focus_mult = [{ type: 'more', value: modifiers.focusMult }];
    }
    if (modifiers.statsFlat > 0) {
      mods.essence = [{ type: 'flat', value: modifiers.statsFlat }];
      mods.body    = [{ type: 'flat', value: modifiers.statsFlat }];
      mods.soul    = [{ type: 'flat', value: modifiers.statsFlat }];
    }
    return mods;
  }, [modifiers]);

  /** Reset the tree — used by the designer; NOT called by reincarnation. */
  const _reset = useCallback(() => setPurchased(new Set()), []);

  return {
    purchased,
    isPurchased,
    isAvailable,
    canBuy,
    buy,
    modifiers,
    getStatModifiers,
    nodes: NODES,
    _reset,
  };
}
