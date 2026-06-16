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
  { id: 'cosmetic',   label: 'Cosmetics'    },
];

/**
 * Cosmetic slots — one equipped item per slot. Selectors that apply the
 * cosmetic (via body classes in App.css) all key off these slot names.
 * Premium pixelart skins (full sprite swaps) drop into the SAME slots
 * later — they just declare a different `effect.kind`.
 */
export const COSMETIC_SLOTS = {
  CHARACTER:  'character',
  CRYSTAL:    'crystal',
  PARTICLES:  'particles',
  BACKGROUND: 'background',
};

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
    icon: '/ui/shop_crimson_aura.png',
    cost: 50,
    ownership: 'timed',
    effect: { type: 'qi_mult', mult: 2, durationMs: 60 * 60 * 1000, vfx: 'crimson-aura' },
  },
  {
    id: 'buff_crimson_aura_4h',
    category: 'buff',
    name: 'Crimson Aura — 4h',
    desc: '×2 qi/s for 4 hours. Best value per minute for active grinders.',
    icon: '/ui/shop_crimson_aura.png',
    cost: 150,
    ownership: 'timed',
    effect: { type: 'qi_mult', mult: 2, durationMs: 4 * 60 * 60 * 1000, vfx: 'crimson-aura' },
  },
  {
    id: 'buff_crimson_aura_12h',
    category: 'buff',
    name: 'Crimson Aura — 12h',
    desc: '×2 qi/s for 12 hours. The "going to sleep" pack.',
    icon: '/ui/shop_crimson_aura.png',
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
    icon: '/ui/shop_crystal_resonance.png',
    cost: 40,
    ownership: 'timed',
    effect: { type: 'crystal_tap_mult', mult: 2, durationMs: 30 * 60 * 1000 },
  },
  // Heavenly Resonance, the repurposed idle buff (was "Producer Surge",
  // which collapsed onto Crimson Aura's qi/s axis). Channels Heavenly Qi
  // CONTINUOUSLY with no ads: the same ×1.5 qi/s + heavenly bonuses (+ the
  // halo VFX) as the rewarded-ad boost, riding the same adBoost path. Icon is
  // the singing bowl (sustained resonance = continuous channeling); the war
  // drum it freed up moved onto Crystal Resonance (the ×2 TAP buff).
  //
  // ACTIVE-ONLY by design: the pool (useShopInventory `resonanceMs`) drains
  // ONLY while the app is foregrounded and PAUSES while backgrounded, so the
  // player never loses paid time to a window where the boost wouldn't apply
  // anyway (the ad boost is excluded from offline accrual; see
  // useCultivation's offline formula). Buying more is CUMULATIVE: durations
  // add to one shared pool. While the pool is live the Home "Heavenly Qi"
  // tablet shows the remaining time and the ad petition is suppressed.
  {
    id: 'buff_heavenly_resonance_1h',
    category: 'buff',
    name: 'Heavenly Resonance - 1h',
    desc: 'Channels Heavenly Qi for 1h of active play. ×1.5 qi/s + heavenly bonuses, no ads. Drains only while you\'re playing; pauses when you close the app.',
    icon: '/ui/shop_heavenly_resonance.png',
    cost: 40,
    ownership: 'resonance',
    effect: { type: 'heavenly_resonance', durationMs: 60 * 60 * 1000 },
  },
  {
    id: 'buff_heavenly_resonance_4h',
    category: 'buff',
    name: 'Heavenly Resonance - 4h',
    desc: '4h of active-play Heavenly Qi. ×1.5 qi/s + heavenly bonuses, no ads. Cumulative: time stacks, and it only burns while the app is open.',
    icon: '/ui/shop_heavenly_resonance.png',
    cost: 130,
    ownership: 'resonance',
    effect: { type: 'heavenly_resonance', durationMs: 4 * 60 * 60 * 1000 },
  },
  {
    id: 'buff_heavenly_resonance_12h',
    category: 'buff',
    name: 'Heavenly Resonance - 12h',
    desc: '12h of active-play Heavenly Qi. ×1.5 qi/s + heavenly bonuses, no ads. The value pack; the pool pauses whenever you\'re away.',
    icon: '/ui/shop_heavenly_resonance.png',
    cost: 340,
    ownership: 'resonance',
    effect: { type: 'heavenly_resonance', durationMs: 12 * 60 * 60 * 1000 },
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
    icon: '/ui/shop_heavens_pardon.png',
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
    desc: 'Unlocks an Auto-Buy toggle on the Sect screen. While enabled, qi auto-spends on the cheapest available producer.',
    icon: '/ui/shop_disciples_diligence.png',
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
    icon: '/ui/shop_decisive_heart.png',
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
    icon: '/ui/shop_patient_mind.png',
    cost: 200,
    ownership: 'stackable',
    maxStack: 3,
    effect: { type: 'qol_offline_cap', addHours: 2 },
  },

  // ── Cosmetics — Tier 1 (CSS-tint variants) ──────────────────────────────
  //
  // Each cosmetic is a permanent-owned slot item. Buying auto-equips;
  // the player can then equip/unequip from the shop later to swap looks.
  // Tier 1 cosmetics ship without new sprite art — they apply a CSS
  // hue-rotate / tint to the existing assets. Premium pixelart skins
  // (full sprite swaps) drop into the same slots with a different
  // `effect.kind`.
  //
  //   effect.kind = 'tint' — body class adds a hue-rotate filter
  //                          to the slot's target element(s).
  //   effect.bodyClass    — the class App.jsx toggles when equipped.

  // ── Cosmetic SKINS (procession format) ─────────────────────────────────
  // 2026-05-27 redesign. The earlier "tint" cards (Crimson Path / Verdant
  // Path / Amethyst Path / etc.) were a bug — there is no recolour SKU.
  // Every skin is now a full sprite-set product. The card shop renders
  // them as a procession (first 3 stances revealed, remaining 10
  // silhouetted) so the player sees the shape evolution without spoiling
  // the late-game sprites.
  //
  // Sprite assets aren't done yet for these skin SKUs, so for v1 each
  // entry ships WITHOUT an `effect.bodyClass`. The skin lives in the
  // player's inventory (Codex > Wardrobe surfaces it) but does not yet
  // override the sprite. When the pixel-art assets land, just add
  // `effect: { kind: 'skin', bodyClass: '...', assetPath: '...' }` and
  // the equip flow lights up - save state preserved.
  //
  // Themes: skins are grouped by theme name (frost / bone / etc.) so a
  // matching bundle pack can sell them together at a discount. See
  // SHOP_BUNDLES below.

  // Frost Sect — theme: 'frost'
  { id: 'cos_char_frost_ascetic',  category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.CHARACTER, name: 'Frost Ascetic',  desc: 'A wind-bitten monk of the frozen peaks. Evolves through all 13 realms with you.', icon: '🏔️', cost: 1200, ownership: 'cosmetic', theme: 'frost', previewSprite: 5 },
  { id: 'cos_crystal_frost',       category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.CRYSTAL,   name: 'Frost Crystal',  desc: 'A glacial shard carved by winter cultivators. Evolves through all 10 tiers.',     icon: '◇',  cost: 800,  ownership: 'cosmetic', theme: 'frost', previewSprite: 5 },

  // Bone Court — theme: 'bone'
  { id: 'cos_char_bone_patriarch', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.CHARACTER, name: 'Bone Patriarch', desc: 'A withered elder of the ossuary sect. Evolves through all 13 realms with you.',  icon: '💀', cost: 1500, ownership: 'cosmetic', theme: 'bone',  previewSprite: 6 },
  { id: 'cos_crystal_ossuary',     category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.CRYSTAL,   name: 'Ossuary Crystal', desc: 'A crystal lattice grown through ancient bone. Evolves through all 10 tiers.',    icon: '⬣',  cost: 800,  ownership: 'cosmetic', theme: 'bone',  previewSprite: 6 },

  // ── Qi Particle skins ─────────────────────────────────────────────────────
  // Each variant is a different pixel-art orb shape generated via the
  // qi_orb_c9 batch. C1 is the default (free, no item). C0 + C2-C15 are
  // purchasable. ID pattern: cos_particles_c9_N — HomeScreen.jsx derives
  // the maskBase path directly from the N suffix.
  { id: 'cos_particles_c9_0',  category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Void Mote',       desc: 'Condensed-absence orbs. Understated and pure.',               icon: '⚫', cost: 400, ownership: 'cosmetic' },
  { id: 'cos_particles_c9_2',  category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Wisp Mote',       desc: 'Trailing wisps of raw qi. Leave a faint luminous tail.',      icon: '🌫️', cost: 400, ownership: 'cosmetic' },
  { id: 'cos_particles_c9_3',  category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Star Mote',       desc: 'Compact star-form orbs that flicker with celestial light.',   icon: '⭐', cost: 400, ownership: 'cosmetic' },
  { id: 'cos_particles_c9_4',  category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Dense Core',      desc: 'Compressed qi, heavy with intent. Tight inner glow.',         icon: '🔵', cost: 400, ownership: 'cosmetic' },
  { id: 'cos_particles_c9_5',  category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Mist Orb',        desc: 'Soft and diffuse. Dissolves into you like morning fog.',      icon: '🌊', cost: 400, ownership: 'cosmetic' },
  { id: 'cos_particles_c9_6',  category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Primal Orb',      desc: 'An older form of qi manifestation. Raw and resonant.',        icon: '🔮', cost: 400, ownership: 'cosmetic' },
  { id: 'cos_particles_c9_7',  category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Crystal Mote',    desc: 'Qi shaped around a crystalline lattice. Hard-edged inner glow.', icon: '💎', cost: 400, ownership: 'cosmetic' },
  { id: 'cos_particles_c9_8',  category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Ethereal Orb',    desc: 'Barely material qi. More radiance than substance.',           icon: '🌟', cost: 400, ownership: 'cosmetic' },
  { id: 'cos_particles_c9_9',  category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Celestial Mote',  desc: 'Heaven-grade orbs. Carry a distant, ancient echo.',           icon: '✨', cost: 400, ownership: 'cosmetic' },
  { id: 'cos_particles_c9_10', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Arcane Orb',      desc: 'Intricate qi nodes with an ordered inner pattern.',           icon: '🔷', cost: 400, ownership: 'cosmetic' },
  { id: 'cos_particles_c9_11', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Dragon Mote',     desc: 'Coiled qi. Carries the concentrated force of a dragon.',      icon: '🐲', cost: 400, ownership: 'cosmetic' },
  { id: 'cos_particles_c9_12', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Phoenix Orb',     desc: 'Warm rising orbs. Bright inner core like flame reforming.',   icon: '🌅', cost: 400, ownership: 'cosmetic' },
  { id: 'cos_particles_c9_13', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Storm Mote',      desc: 'Crackles with contained charge. Never quite still.',          icon: '⚡', cost: 400, ownership: 'cosmetic' },
  { id: 'cos_particles_c9_14', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Thunder Orb',     desc: 'Carries the memory of a hundred thunderclaps.',              icon: '💥', cost: 400, ownership: 'cosmetic' },
  { id: 'cos_particles_c9_15', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Supreme Mote',    desc: 'The pinnacle form. Dense, bright, perfectly balanced qi.',    icon: '👑', cost: 400, ownership: 'cosmetic' },

  // Untethered skins — no bundle association yet
  { id: 'cos_char_storm_caller',   category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.CHARACTER, name: 'Storm Caller',  desc: 'Cloud-silk robes, eyes lit with lightning. Evolves through all 13 realms.',       icon: '⚡', cost: 1300, ownership: 'cosmetic', previewSprite: 7 },
  { id: 'cos_char_lotus_sage',     category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.CHARACTER, name: 'Lotus Sage',    desc: 'Petals bloom around an ascetic\'s frame. Evolves through all 13 realms.',         icon: '🪷', cost: 1100, ownership: 'cosmetic', previewSprite: 8 },
  { id: 'cos_crystal_phoenix',     category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.CRYSTAL,   name: 'Phoenix Core',  desc: 'A molten ember bound in crystal lattice. Evolves through all 10 tiers.',          icon: '🔥', cost: 900,  ownership: 'cosmetic', previewSprite: 6 },
];

// ── Theme bundle packs ─────────────────────────────────────────────────────
// Fortnite-style bundle: a cultivator + crystal from the same theme, sold
// together at a discount. Purchase expands into components atomically.
//
// A bundle hides from the storefront once ANY of its components is already
// owned (the discount logic stops making sense once the player has paid
// piecemeal). The remaining components stay buyable as singles.

export const SHOP_BUNDLES = [
  {
    id: 'bundle_frost_sect',
    category: 'bundle',
    name: 'Frost Sect',
    theme: 'frost',
    desc: 'Cultivator + crystal, one frozen theme.',
    icon: '❄️',
    components: ['cos_char_frost_ascetic', 'cos_crystal_frost'],
    cost: 1500,          // discounted price
    originalCost: 2000,  // sum of components (1200 + 800)
    saveAmount: 500,
    ownership: 'bundle',
  },
  {
    id: 'bundle_bone_court',
    category: 'bundle',
    name: 'Bone Court',
    theme: 'bone',
    desc: 'Cultivator + crystal, one ossuary theme.',
    icon: '💀',
    components: ['cos_char_bone_patriarch', 'cos_crystal_ossuary'],
    cost: 1700,
    originalCost: 2300,  // sum of components (1500 + 800)
    saveAmount: 600,
    ownership: 'bundle',
  },
];

// Lookup table for ALL purchasable entries - includes singles AND bundles
// so the purchase / featured / display layers can look anything up by id
// without caring whether the source array was SHOP_ITEMS or SHOP_BUNDLES.
export const SHOP_ITEMS_BY_ID = Object.fromEntries(
  [...SHOP_ITEMS, ...SHOP_BUNDLES].map(i => [i.id, i])
);

/** True if an item is currently affordable. */
export function canAfford(itemId, balance) {
  const item = SHOP_ITEMS_BY_ID[itemId];
  return !!item && balance >= item.cost;
}

// ── Featured "Today's Pick" rotation ────────────────────────────────────────
// A 7-day rotation keyed on `new Date().getDay()` (Sunday = 0). The Spirit
// Bazaar's hero card renders one item per day at a discount; the discount
// resets at the end of the local calendar day. v1 ships with a hardcoded
// schedule — server-side rotation can land later without changing the
// surface API (just update the helper).
//
// Picks are chosen for variety: cosmetics on weekends, buffs/QoL on
// weekdays. Pure-cosmetic spotlighting helps players discover the visual
// catalogue; weekday buffs are the impulse-buy moments where a discount
// can flip a "maybe later" into a purchase.
export const FEATURED_BY_WEEKDAY = [
  'cos_char_frost_ascetic',     // Sun  — cosmetic spotlight
  'buff_crimson_aura_4h',       // Mon
  'qol_skip_bt_confirm',        // Tue
  'buff_heavenly_resonance_4h', // Wed
  'consumable_major_bt_bypass', // Thu
  'buff_crimson_aura_12h',      // Fri
  'cos_crystal_phoenix',        // Sat  — cosmetic spotlight
];

export const FEATURED_DISCOUNT = 0.20; // 20% off the daily pick

/**
 * Returns the featured item for the local current weekday, plus a discount
 * factor + the unix-ms timestamp the offer expires (local midnight). Render
 * surfaces should call this once per render and re-fetch on day rollover.
 */
export function getFeaturedItemForToday(now = new Date()) {
  const dow = now.getDay(); // 0..6, Sun = 0
  const itemId = FEATURED_BY_WEEKDAY[dow];
  const item = SHOP_ITEMS_BY_ID[itemId] ?? null;
  if (!item) return null;
  // End of LOCAL day in ms (start of tomorrow at 00:00).
  const tomorrow = new Date(now);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endsAtMs = tomorrow.getTime();
  const baseCost = item.cost ?? 0;
  const discountedCost = Math.max(1, Math.round(baseCost * (1 - FEATURED_DISCOUNT)));
  return {
    item,
    discount: FEATURED_DISCOUNT,
    originalCost: baseCost,
    discountedCost,
    endsAtMs,
  };
}
