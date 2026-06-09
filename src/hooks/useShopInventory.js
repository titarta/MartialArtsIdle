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
import { useTranslation } from 'react-i18next';
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
    buffs:       {},   // { [type]: { expiresAtMs, mult, itemId, vfx } } (one per type)
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
      // Normalise to the type-keyed buff model + drop expired ones. Also
      // migrates old itemId-keyed saves and collapses any same-type buffs that
      // were stacked under the old multiply-on-top bug.
      inv.buffs = normalizeBuffs(inv.buffs);
      return inv;
    }
  } catch {}
  return emptyInventory();
}

function persist(inv) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(inv)); } catch {}
}

/**
 * Normalise the timed-buff map to the TYPE-keyed model and drop expired ones.
 *
 * Model: `buffs[type] = { expiresAtMs, mult, itemId, vfx }` — ONE entry per
 * effect type (qi_mult, producer_mult, crystal_tap_mult). Every duration
 * product of the same buff shares that single entry: buying another EXTENDS
 * the timer (durations add up) and NEVER multiplies the effect.
 *
 * Migration: older saves keyed buffs by itemId with only `{ expiresAtMs }`,
 * and getActiveBuffMult multiplied every same-type entry together (the
 * x2*x2*x2 exploit). Here we collapse all same-type entries into one, keeping
 * the furthest expiry and the highest single mult — upgrading the save format
 * and disarming the exploit retroactively.
 */
function normalizeBuffs(rawBuffs) {
  const now = Date.now();
  const out = {};
  for (const [key, info] of Object.entries(rawBuffs || {})) {
    if (!info?.expiresAtMs || info.expiresAtMs <= now) continue;
    // Resolve type + representative item. New format: key is the type and
    // info.itemId points at a product. Old format: key IS the itemId.
    let item = info.itemId ? SHOP_ITEMS_BY_ID[info.itemId] : null;
    if (!item && SHOP_ITEMS_BY_ID[key]) item = SHOP_ITEMS_BY_ID[key];
    const type = item?.effect?.type ?? (info.mult !== undefined ? key : null);
    if (!type) continue;
    const mult   = Number.isFinite(info.mult) ? info.mult : (item?.effect?.mult ?? 1);
    const vfx    = info.vfx ?? item?.effect?.vfx ?? null;
    const itemId = info.itemId ?? (SHOP_ITEMS_BY_ID[key] ? key : null);
    if (out[type]) {
      out[type].expiresAtMs = Math.max(out[type].expiresAtMs, info.expiresAtMs);
      out[type].mult        = Math.max(out[type].mult, mult);
    } else {
      out[type] = { expiresAtMs: info.expiresAtMs, mult, itemId, vfx };
    }
  }
  return out;
}

export default function useShopInventory() {
  const { t } = useTranslation('ui');
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
    if (!item) return { ok: false, error: t('shop.errorUnknownItem') };

    // Affordability gate
    const balance = getBloodLotusBalance();
    if (balance < item.cost) return { ok: false, error: t('shop.errorInsufficientBL') };

    // Permanent QoL — refuse second buy
    if (item.ownership === 'permanent' && inv.qol[itemId]) {
      return { ok: false, error: t('shop.errorAlreadyOwned') };
    }
    // Stackable — refuse if at cap
    if (item.ownership === 'stackable') {
      const cur = inv.stacks[itemId] ?? 0;
      if (item.maxStack && cur >= item.maxStack) {
        return { ok: false, error: t('shop.errorMaxStack') };
      }
    }

    // Spend BL (atomic — refuses if balance shifted since the check)
    if (!spendBloodLotus(item.cost)) {
      return { ok: false, error: t('shop.errorInsufficientBL') };
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
        // Timed buffs are keyed by EFFECT TYPE, not itemId, so every duration
        // product of the same buff (e.g. Crimson Aura 1h / 4h / 12h, all
        // qi_mult x2) shares ONE entry. Buying another EXTENDS the timer
        // (durations add up) and never multiplies the effect — the multiplier
        // is a single value (the max single-product mult), so two x2 buffs are
        // x2 for longer, never x4. The player keeps every minute they paid for.
        const now  = Date.now();
        const type = item.effect.type;
        const cur  = next.buffs[type];
        const active  = !!(cur?.expiresAtMs && cur.expiresAtMs > now);
        const baseEnd = active ? cur.expiresAtMs : now;
        next.buffs = {
          ...next.buffs,
          [type]: {
            expiresAtMs: baseEnd + item.effect.durationMs,
            mult:        Math.max(active ? (cur.mult ?? 1) : 1, item.effect.mult ?? 1),
            itemId,
            vfx:         item.effect.vfx ?? null,
          },
        };
      } else if (item.ownership === 'cosmetic') {
        // Cosmetics are permanent-owned. Bazaar v2 (2026-05-27) removed
        // the auto-equip-on-purchase behaviour: the player goes to
        // Codex > Wardrobe to equip what they bought. This keeps the
        // store focused on "buy" and the wardrobe focused on "wear".
        next.cosmetics = { ...next.cosmetics, [itemId]: true };
      } else if (item.ownership === 'bundle') {
        // Theme bundle: expand into the component cosmetics, credit each
        // to the cosmetics map. BL already spent above, so no second
        // affordability check; affordability for the bundle is for the
        // bundle's discounted total, not the sum of components.
        next.cosmetics = { ...next.cosmetics };
        for (const componentId of (item.components ?? [])) {
          next.cosmetics[componentId] = true;
        }
      }
      return next;
    });

    return { ok: true };
  }, [inv, t]);

  /**
   * True if a bundle is still buyable - i.e. the player does NOT own any
   * of its components yet. Once even one component is purchased
   * individually, the bundle hides from the storefront (discount logic
   * stops making sense once partial-ownership exists).
   */
  const isBundleAvailable = useCallback((bundleId) => {
    const item = SHOP_ITEMS_BY_ID[bundleId];
    if (!item || item.ownership !== 'bundle') return false;
    for (const cid of (item.components ?? [])) {
      if (inv.cosmetics[cid]) return false;
    }
    return true;
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
   * Current multiplier from the active buff of `type`. Buffs are one-per-type,
   * so this is a single value (e.g. x2), NEVER a product of multiple same-type
   * purchases — buying more only extends the timer. Returns 1 when inactive.
   */
  const getActiveBuffMult = useCallback((type) => {
    const info = inv.buffs?.[type];
    if (info?.expiresAtMs && info.expiresAtMs > Date.now() && Number.isFinite(info.mult)) {
      return info.mult;
    }
    return 1;
  }, [inv]);

  /**
   * Returns the additive sum of an effect property across active buffs
   * (e.g. for offline-cap-style additive bonuses). Currently unused but
   * matches the multiplier API shape for future symmetry.
   */
  const getActiveBuffAdd = useCallback((type, prop) => {
    const info = inv.buffs?.[type];
    if (info?.expiresAtMs && info.expiresAtMs > Date.now()) {
      const item = info.itemId ? SHOP_ITEMS_BY_ID[info.itemId] : null;
      const v = item?.effect?.[prop];
      return Number.isFinite(v) ? v : 0;
    }
    return 0;
  }, [inv]);

  /** Array of active buffs (one per type) for UI surfacing. `id` is the most
   *  recently bought product of that type; `type` lets callers match any
   *  product of the same buff. */
  const activeBuffs = Object.entries(inv.buffs || {})
    .map(([type, info]) => {
      const item = info.itemId ? SHOP_ITEMS_BY_ID[info.itemId] : null;
      if (!item) return null;
      return { id: info.itemId, type, item, expiresAtMs: info.expiresAtMs, mult: info.mult };
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
    isBundleAvailable,
  };
}
