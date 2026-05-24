/**
 * useShopInventory.js — Player-side state for the Blood Lotus spend shop.
 *
 * Owns:
 *   - Permanent QoL unlocks (boolean map per item id)
 *   - Stackable QoL stacks (count map per item id, capped by item.maxStack)
 *   - Consumable token counts (count map per item id, decremented on use)
 *   - Active timed buffs (Map<itemId, { expiresAtMs, effect }>)
 *
 * Persistence:
 *   `mai_shop_inventory` — single JSON blob, survives reincarnation (cosmetics
 *   + QoL purchases should never be lost on rebirth).
 *
 *   Active timed buffs ARE persisted with their expiresAt timestamp so a
 *   reload mid-buff resumes correctly (the player paid for wall-clock time,
 *   so closing the tab shouldn't refund it).
 *
 * Public API:
 *   purchase(itemId)   — spends BL, applies to inventory, returns { ok, error? }
 *   useConsumable(itemId) — decrements a oneshot, returns true if one was available
 *   hasQol(itemId)     — true iff a permanent QoL is owned
 *   getStack(itemId)   — int count of a stackable
 *   getConsumable(id)  — int count of a oneshot
 *   getActiveBuffMult(type) — current multiplier from active buffs of `type`
 *   activeBuffs        — array of currently-active buffs for UI surfaces
 */

import { useState, useEffect, useCallback } from 'react';
import { SHOP_ITEMS_BY_ID } from '../data/shopItems';
import { getBloodLotusBalance, spendBloodLotus } from '../systems/bloodLotus';
import { recordStat } from '../systems/statsRecorder';

const SAVE_KEY = 'mai_shop_inventory';
const SCHEMA_VERSION = 1;

function emptyInventory() {
  return {
    version:     SCHEMA_VERSION,
    qol:         {},   // { [itemId]: true }
    stacks:      {},   // { [itemId]: int }
    consumables: {},   // { [itemId]: int }
    buffs:       {},   // { [itemId]: { expiresAtMs } }
    cosmetics:   {},   // { [itemId]: true } — owned (purchased)
    equipped:    {},   // { [slotType]: itemId } — currently equipped per slot
  };
}

function loadInventory() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const inv = { ...emptyInventory(), ...data };
      // Drop expired buffs at load time so the player doesn't see a
      // dead buff in the UI for a frame.
      const now = Date.now();
      const livingBuffs = {};
      for (const [id, info] of Object.entries(inv.buffs || {})) {
        if (info?.expiresAtMs && info.expiresAtMs > now) {
          livingBuffs[id] = info;
        }
      }
      inv.buffs = livingBuffs;
      return inv;
    }
  } catch {}
  return emptyInventory();
}

function persist(inv) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(inv)); } catch {}
}

export default function useShopInventory() {
  const [inv, setInv] = useState(loadInventory);

  // Persist on every change.
  useEffect(() => { persist(inv); }, [inv]);

  // Tick once per second to expire timed buffs. Only re-renders when
  // a buff actually expires (cheap — keeps App.jsx render cost flat).
  // UI components that show live countdown text should run their own
  // 1s interval against `expiresAtMs` (see ActiveShopBuffsBar pattern).
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      let dirty = false;
      const living = {};
      for (const [bid, info] of Object.entries(inv.buffs || {})) {
        if (info?.expiresAtMs && info.expiresAtMs > now) {
          living[bid] = info;
        } else {
          dirty = true;
        }
      }
      if (dirty) {
        setInv(prev => ({ ...prev, buffs: living }));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [inv]);

  // ── Purchase flow ──────────────────────────────────────────────────────
  const purchase = useCallback((itemId) => {
    const item = SHOP_ITEMS_BY_ID[itemId];
    if (!item) return { ok: false, error: 'Unknown item' };

    // Affordability gate
    const balance = getBloodLotusBalance();
    if (balance < item.cost) return { ok: false, error: 'Not enough Blood Lotus' };

    // Permanent QoL — refuse second buy
    if (item.ownership === 'permanent' && inv.qol[itemId]) {
      return { ok: false, error: 'Already owned' };
    }
    // Stackable — refuse if at cap
    if (item.ownership === 'stackable') {
      const cur = inv.stacks[itemId] ?? 0;
      if (item.maxStack && cur >= item.maxStack) {
        return { ok: false, error: 'Max stack reached' };
      }
    }

    // Spend BL (atomic — refuses if balance shifted since the check)
    if (!spendBloodLotus(item.cost)) {
      return { ok: false, error: 'Not enough Blood Lotus' };
    }

    // Achievement counters. Cosmetic and non-cosmetic split so the
    // Ascetic-style "no boosts this run" check can read run-bucket
    // `shopPurchases` without false positives from skin buys.
    try {
      if (item.ownership === 'cosmetic') recordStat('cosmeticPurchases', 1);
      else                                recordStat('shopPurchases',     1);
    } catch {}

    // Apply to inventory
    setInv(prev => {
      const next = { ...prev };
      if (item.ownership === 'permanent') {
        next.qol = { ...next.qol, [itemId]: true };
      } else if (item.ownership === 'stackable') {
        next.stacks = { ...next.stacks, [itemId]: (next.stacks[itemId] ?? 0) + 1 };
      } else if (item.ownership === 'oneshot') {
        next.consumables = { ...next.consumables, [itemId]: (next.consumables[itemId] ?? 0) + 1 };
      } else if (item.ownership === 'timed') {
        // Buying another of the same timed buff EXTENDS the duration
        // rather than resetting it. The player's already-paid time
        // is preserved — they paid for X hours total.
        const now = Date.now();
        const cur = next.buffs[itemId];
        const baseEnd = (cur?.expiresAtMs && cur.expiresAtMs > now) ? cur.expiresAtMs : now;
        next.buffs = {
          ...next.buffs,
          [itemId]: { expiresAtMs: baseEnd + item.effect.durationMs },
        };
      } else if (item.ownership === 'cosmetic') {
        // Cosmetics are permanent-owned and auto-equip on first purchase
        // (the player just bought it — they want to see it). Subsequent
        // equip/unequip flows live in the dedicated equip() method.
        next.cosmetics = { ...next.cosmetics, [itemId]: true };
        if (item.cosmeticSlot) {
          next.equipped = { ...next.equipped, [item.cosmeticSlot]: itemId };
        }
      }
      return next;
    });

    return { ok: true };
  }, [inv]);

  // ── Cosmetic equip / unequip ──────────────────────────────────────────
  // Equip sets the slot to itemId (replacing whatever was there).
  // Unequip clears the slot (game falls back to the default asset).
  const equip = useCallback((itemId) => {
    const item = SHOP_ITEMS_BY_ID[itemId];
    if (!item || item.ownership !== 'cosmetic') return false;
    if (!inv.cosmetics[itemId]) return false; // can't equip what you don't own
    setInv(prev => ({
      ...prev,
      equipped: { ...prev.equipped, [item.cosmeticSlot]: itemId },
    }));
    return true;
  }, [inv]);

  const unequip = useCallback((slotType) => {
    setInv(prev => {
      if (!prev.equipped[slotType]) return prev;
      const next = { ...prev, equipped: { ...prev.equipped } };
      delete next.equipped[slotType];
      return next;
    });
  }, []);

  const isCosmeticOwned    = useCallback((id) => !!inv.cosmetics[id], [inv]);
  const isCosmeticEquipped = useCallback((id) => {
    const item = SHOP_ITEMS_BY_ID[id];
    if (!item?.cosmeticSlot) return false;
    return inv.equipped[item.cosmeticSlot] === id;
  }, [inv]);
  const getEquippedInSlot  = useCallback((slot) => inv.equipped[slot] ?? null, [inv]);

  // ── Use a one-shot consumable ──────────────────────────────────────────
  // Decrements the count for `itemId`. Returns true iff one was available.
  // Callers (e.g. confirmMajorBreakthrough) use this to spend a token.
  const useConsumable = useCallback((itemId) => {
    const cur = inv.consumables[itemId] ?? 0;
    if (cur <= 0) return false;
    setInv(prev => ({
      ...prev,
      consumables: { ...prev.consumables, [itemId]: cur - 1 },
    }));
    return true;
  }, [inv]);

  // ── Queries used by gameplay hooks ─────────────────────────────────────
  const hasQol         = useCallback((id) => !!inv.qol[id],                   [inv]);
  const getStack       = useCallback((id) => inv.stacks[id]       ?? 0,       [inv]);
  const getConsumable  = useCallback((id) => inv.consumables[id]  ?? 0,       [inv]);

  /**
   * Returns the current multiplier from active timed buffs whose effect
   * matches `type`. Multiplies all active matches together (so two
   * different qi_mult buffs would stack). When no matching buff is
   * active, returns 1.
   */
  const getActiveBuffMult = useCallback((type) => {
    const now = Date.now();
    let mult = 1;
    for (const [bid, info] of Object.entries(inv.buffs || {})) {
      if (!info?.expiresAtMs || info.expiresAtMs <= now) continue;
      const item = SHOP_ITEMS_BY_ID[bid];
      if (item?.effect?.type === type && Number.isFinite(item.effect.mult)) {
        mult *= item.effect.mult;
      }
    }
    return mult;
  }, [inv]);

  /**
   * Returns the additive sum of an effect property across active buffs
   * (e.g. for offline-cap-style additive bonuses). Currently unused but
   * matches the multiplier API shape for future symmetry.
   */
  const getActiveBuffAdd = useCallback((type, prop) => {
    const now = Date.now();
    let sum = 0;
    for (const [bid, info] of Object.entries(inv.buffs || {})) {
      if (!info?.expiresAtMs || info.expiresAtMs <= now) continue;
      const item = SHOP_ITEMS_BY_ID[bid];
      if (item?.effect?.type === type && Number.isFinite(item.effect[prop])) {
        sum += item.effect[prop];
      }
    }
    return sum;
  }, [inv]);

  /** Array of active buffs (item + expiresAtMs) for UI surfacing. */
  const activeBuffs = Object.entries(inv.buffs || {})
    .map(([id, info]) => {
      const item = SHOP_ITEMS_BY_ID[id];
      if (!item) return null;
      return { id, item, expiresAtMs: info.expiresAtMs };
    })
    .filter(Boolean)
    .sort((a, b) => a.expiresAtMs - b.expiresAtMs);

  return {
    inv,
    purchase,
    useConsumable,
    hasQol,
    getStack,
    getConsumable,
    getActiveBuffMult,
    getActiveBuffAdd,
    activeBuffs,
    // Cosmetic equip/unequip API
    equip,
    unequip,
    isCosmeticOwned,
    isCosmeticEquipped,
    getEquippedInSlot,
  };
}
