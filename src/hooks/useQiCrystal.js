/**
 * useQiCrystal.js — QI Crystal hook (no UI).
 *
 * The QI Crystal is a permanent upgrade that adds flat qi/sec to cultivation.
 * Upgrading costs QI stones (cultivation materials) drawn from the inventory.
 *
 * Bonus formula: level × 2 qi/sec (flat addition to BASE_RATE).
 *
 * Cost per upgrade:
 *   Levels 1–2:  iron_cultivation_1         × ceil(10 × within^1.5)
 *   Levels 3–4:  bronze_cultivation_1       × ceil(10 × within^1.5)
 *   Levels 5–6:  silver_cultivation_1       × ceil(10 × within^1.5)
 *   Levels 7–8:  gold_cultivation_1         × ceil(10 × within^1.5)
 *   Levels 9–10: transcendent_cultivation_1 × ceil(10 × within^1.5)
 * where `within` = position within the two-level tier (1 or 2).
 *
 * Debug commands are exposed on window.__debug.qiCrystal.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

const SAVE_KEY = 'mai_qi_crystal';
const MAX_LEVEL = 10;

const LEVEL_TIERS = [
  { levels: [1, 2],   itemId: 'iron_cultivation_1'         },
  { levels: [3, 4],   itemId: 'bronze_cultivation_1'       },
  { levels: [5, 6],   itemId: 'silver_cultivation_1'       },
  { levels: [7, 8],   itemId: 'gold_cultivation_1'         },
  { levels: [9, 10],  itemId: 'transcendent_cultivation_1' },
];

function loadLevel() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw).level ?? 0;
  } catch {}
  return 0;
}

function saveLevel(level) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ level })); } catch {}
}

/** Cost to upgrade from current level to `targetLevel`. Returns null if maxed. */
export function getCrystalUpgradeCost(targetLevel) {
  if (targetLevel < 1 || targetLevel > MAX_LEVEL) return null;
  for (const tier of LEVEL_TIERS) {
    const idx = tier.levels.indexOf(targetLevel);
    if (idx !== -1) {
      const within = idx + 1; // 1 or 2
      return { itemId: tier.itemId, qty: Math.ceil(10 * Math.pow(within, 1.5)) };
    }
  }
  return null;
}

/**
 * @param {{ getQuantity: (id: string) => number, removeItem: (id: string, qty: number) => void }} param
 */
export default function useQiCrystal({ getQuantity, removeItem } = {}) {
  const [level, setLevelState] = useState(loadLevel);

  // Ref that useCultivation reads in its game loop.
  // Updated immediately on every level change so the rate is always current.
  const crystalQiBonusRef = useRef(level * 2);

  useEffect(() => {
    crystalQiBonusRef.current = level * 2;
  }, [level]);

  /** Internal helper — set level, update ref, persist. */
  const applyLevel = useCallback((n) => {
    const clamped = Math.max(0, Math.min(MAX_LEVEL, n));
    setLevelState(clamped);
    crystalQiBonusRef.current = clamped * 2;
    saveLevel(clamped);
  }, []);

  /** Upgrade one level if the player has the required QI stones. */
  const upgrade = useCallback(() => {
    setLevelState(prev => {
      const nextLevel = prev + 1;
      if (nextLevel > MAX_LEVEL) return prev;
      const cost = getCrystalUpgradeCost(nextLevel);
      if (!cost) return prev;
      const owned = getQuantity?.(cost.itemId) ?? 0;
      if (owned < cost.qty) return prev;
      removeItem?.(cost.itemId, cost.qty);
      crystalQiBonusRef.current = nextLevel * 2;
      saveLevel(nextLevel);
      return nextLevel;
    });
  }, [getQuantity, removeItem]);

  // ── Debug API ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__debug = window.__debug || {};
    window.__debug.qiCrystal = {
      getLevel:  () => level,
      setLevel:  (n) => applyLevel(n),
      upgrade:   () => upgrade(),
      getCost:   (n) => getCrystalUpgradeCost(n ?? (level + 1)),
      getBonus:  () => crystalQiBonusRef.current,
    };
  }); // no dep array — always fresh so getLevel reflects current state

  const upgradeCost = getCrystalUpgradeCost(level + 1);

  return {
    level,
    crystalQiBonus:    level * 2,
    crystalQiBonusRef,
    upgrade,
    upgradeCost,
    maxLevel: MAX_LEVEL,
  };
}
