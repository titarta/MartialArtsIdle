/**
 * shopItems.js — Catalog of items the player can buy with Blood Lotus
 * from the spend-side Blood Lotus Shop (distinct from the IAP "Top Up"
 * modal where Blood Lotus is purchased with real money).
 *
 * Each item declares:
 *   id        — stable string id, persisted in mai_shop_inventory
 *   category  — 'buff' | 'qol' | 'consumable' | 'cosmetic'
 *   name      — display string
 *   desc      — short blurb
 *   icon      — emoji or asset path
 *   cost      — price in Blood Lotus
 *   ownership — 'permanent' (one-time purchase, true/false in inventory)
 *               | 'stackable' (purchase multiple, count in inventory)
 *               | 'timed'    (purchase grants a duration buff)
 *               | 'oneshot'  (consumable; count in inventory, decrement on use)
 *   effect    — payload consumed by the apply layer (see useShopInventory)
 *
 * v1 prices are STARTING values — calibrated against a guess of ~50-200
 * BL per session for casual play. Easy to dial up/down in playtest.
 */

export const SHOP_CATEGORIES = [
  { id: 'buff',       label: 'Buffs'        },
  { id: 'consumable', label: 'Consumables'  },
  { id: 'qol',        label: 'Quality of Life' },
  // Cosmetics ship in a follow-up commit with sprite generation. Left
  // declared here so the tab row already shows the eventual slot.
  { id: 'cosmetic',   label: 'Cosmetics'    },
];

export const SHOP_ITEMS = [
  // ── Buffs ───────────────────────────────────────────────────────────────
  // Crimson Aura — the flagship buff. Multiplies total qi/s by 2 for a
  // chosen duration. Cultivator gets a glowing red-gold halo VFX while
  // active. Three tiers so players can pick budget vs. binge.
  {
    id: 'buff_crimson_aura_1h',
    category: 'buff',
    name: 'Crimson Aura — 1h',
    desc: '×2 qi/s for 1 hour. Cultivator wears a crimson halo while active.',
    icon: '🔴',
    cost: 50,
    ownership: 'timed',
    effect: { type: 'qi_mult', mult: 2, durationMs: 60 * 60 * 1000, vfx: 'crimson-aura' },
  },
  {
    id: 'buff_crimson_aura_4h',
    category: 'buff',
    name: 'Crimson Aura — 4h',
    desc: '×2 qi/s for 4 hours. Best value per minute for active grinders.',
    icon: '🔴',
    cost: 150,
    ownership: 'timed',
    effect: { type: 'qi_mult', mult: 2, durationMs: 4 * 60 * 60 * 1000, vfx: 'crimson-aura' },
  },
  {
    id: 'buff_crimson_aura_12h',
    category: 'buff',
    name: 'Crimson Aura — 12h',
    desc: '×2 qi/s for 12 hours. The "going to sleep" pack.',
    icon: '🔴',
    cost: 350,
    ownership: 'timed',
    effect: { type: 'qi_mult', mult: 2, durationMs: 12 * 60 * 60 * 1000, vfx: 'crimson-aura' },
  },
  // Crystal Resonance — pairs with active tap-spam playstyle.
  {
    id: 'buff_crystal_resonance_30m',
    category: 'buff',
    name: 'Crystal Resonance — 30m',
    desc: '×2 qi granted per crystal tap, 30 min. Stack with Refined Tap upgrades for huge taps.',
    icon: '◆',
    cost: 40,
    ownership: 'timed',
    effect: { type: 'crystal_tap_mult', mult: 2, durationMs: 30 * 60 * 1000 },
  },
  // Producer Surge — pure idle buff, great for AFK / sleep cycles.
  {
    id: 'buff_producer_surge_4h',
    category: 'buff',
    name: 'Producer Surge — 4h',
    desc: '×1.5 to every producer\'s base rate for 4 hours. Stacks multiplicatively with upgrades.',
    icon: '⚙️',
    cost: 80,
    ownership: 'timed',
    effect: { type: 'producer_mult', mult: 1.5, durationMs: 4 * 60 * 60 * 1000 },
  },

  // ── Consumables ─────────────────────────────────────────────────────────
  // Major BT gate bypass — the "pay your way through" answer to the
  // newly-tightened major-BT gates. Doesn't bypass the qi cost; just
  // skips the sustained-rate check.
  {
    id: 'consumable_major_bt_bypass',
    category: 'consumable',
    name: 'Heaven\'s Pardon',
    desc: 'Skip the qi/s gate on your next major breakthrough. You still pay the qi cost — but no need to push your rate first.',
    icon: '☁️',
    cost: 120,
    ownership: 'oneshot',
    effect: { type: 'major_bt_bypass' },
  },

  // ── Quality of Life (permanent unlocks) ─────────────────────────────────
  // Auto-buy cheapest — saves the player from manual tapping. Toggleable
  // after purchase via a switch on the Cultivation screen.
  {
    id: 'qol_autobuy_cheapest',
    category: 'qol',
    name: 'Disciple\'s Diligence',
    desc: 'Unlocks an Auto-Buy toggle on the Cultivation screen. While enabled, qi auto-spends on the cheapest available producer.',
    icon: '🤖',
    cost: 250,
    ownership: 'permanent',
    effect: { type: 'qol_autobuy' },
  },
  // Skip BT confirmation — for idle players who don't want to babysit
  // the confirmation button on every major BT.
  {
    id: 'qol_skip_bt_confirm',
    category: 'qol',
    name: 'Decisive Heart',
    desc: 'Auto-confirms major breakthroughs the moment the gate clears. Skips the celebratory pause.',
    icon: '⚡',
    cost: 180,
    ownership: 'permanent',
    effect: { type: 'qol_skip_bt' },
  },
  // Offline cap +2h. Stack-able — buy up to 3 times for +6h total.
  {
    id: 'qol_offline_cap_2h',
    category: 'qol',
    name: 'Patient Mind +2h',
    desc: 'Extends the offline qi-accrual cap by 2 hours. Stack-able up to 3 times (max +6h on top of the base 8h cap).',
    icon: '⏳',
    cost: 200,
    ownership: 'stackable',
    maxStack: 3,
    effect: { type: 'qol_offline_cap', addHours: 2 },
  },
];

export const SHOP_ITEMS_BY_ID = Object.fromEntries(SHOP_ITEMS.map(i => [i.id, i]));

/** True if an item is currently affordable. */
export function canAfford(itemId, balance) {
  const item = SHOP_ITEMS_BY_ID[itemId];
  return !!item && balance >= item.cost;
}
