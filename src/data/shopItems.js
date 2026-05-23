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

  // Character tints
  {
    id: 'cos_char_crimson',
    category: 'cosmetic',
    cosmeticSlot: COSMETIC_SLOTS.CHARACTER,
    name: 'Crimson Path',
    desc: 'Tints your cultivator with the deep red of the crimson sect. CSS recolour — premium pixelart skins arrive later.',
    icon: '🔴',
    cost: 300,
    ownership: 'cosmetic',
    effect: { kind: 'tint', bodyClass: 'cosmetic-char-crimson' },
  },
  {
    id: 'cos_char_verdant',
    category: 'cosmetic',
    cosmeticSlot: COSMETIC_SLOTS.CHARACTER,
    name: 'Verdant Path',
    desc: 'Tints your cultivator in jade-green serenity. CSS recolour.',
    icon: '🟢',
    cost: 300,
    ownership: 'cosmetic',
    effect: { kind: 'tint', bodyClass: 'cosmetic-char-verdant' },
  },
  {
    id: 'cos_char_amethyst',
    category: 'cosmetic',
    cosmeticSlot: COSMETIC_SLOTS.CHARACTER,
    name: 'Amethyst Path',
    desc: 'Tints your cultivator in royal violet. CSS recolour.',
    icon: '🟣',
    cost: 300,
    ownership: 'cosmetic',
    effect: { kind: 'tint', bodyClass: 'cosmetic-char-amethyst' },
  },

  // Crystal tints — affect the crystal sprite on the home screen.
  {
    id: 'cos_crystal_verdant',
    category: 'cosmetic',
    cosmeticSlot: COSMETIC_SLOTS.CRYSTAL,
    name: 'Verdant Crystal',
    desc: 'Recolours your qi crystal jade-green through all tiers. CSS recolour.',
    icon: '◆',
    cost: 200,
    ownership: 'cosmetic',
    effect: { kind: 'tint', bodyClass: 'cosmetic-crystal-verdant' },
  },
  {
    id: 'cos_crystal_amber',
    category: 'cosmetic',
    cosmeticSlot: COSMETIC_SLOTS.CRYSTAL,
    name: 'Amber Crystal',
    desc: 'Recolours your qi crystal in warm amber-gold. CSS recolour.',
    icon: '◆',
    cost: 200,
    ownership: 'cosmetic',
    effect: { kind: 'tint', bodyClass: 'cosmetic-crystal-amber' },
  },

  // Particle tints — affect the qi-flow VFX orbs around the cultivator.
  {
    id: 'cos_particles_jade',
    category: 'cosmetic',
    cosmeticSlot: COSMETIC_SLOTS.PARTICLES,
    name: 'Jade Particles',
    desc: 'Qi orbs flow as jade motes instead of the default white-gold.',
    icon: '✨',
    cost: 150,
    ownership: 'cosmetic',
    effect: { kind: 'tint', bodyClass: 'cosmetic-particles-jade' },
  },
  {
    id: 'cos_particles_violet',
    category: 'cosmetic',
    cosmeticSlot: COSMETIC_SLOTS.PARTICLES,
    name: 'Violet Particles',
    desc: 'Qi orbs flow in deep violet, befitting a high-aspect cultivator.',
    icon: '✨',
    cost: 150,
    ownership: 'cosmetic',
    effect: { kind: 'tint', bodyClass: 'cosmetic-particles-violet' },
  },

  // Background tints — overlay a tinted gradient on the home backdrop.
  {
    id: 'cos_bg_dawn',
    category: 'cosmetic',
    cosmeticSlot: COSMETIC_SLOTS.BACKGROUND,
    name: 'Dawn Sky',
    desc: 'Bathes the home backdrop in warm sunrise light.',
    icon: '🌅',
    cost: 250,
    ownership: 'cosmetic',
    effect: { kind: 'tint', bodyClass: 'cosmetic-bg-dawn' },
  },
  {
    id: 'cos_bg_twilight',
    category: 'cosmetic',
    cosmeticSlot: COSMETIC_SLOTS.BACKGROUND,
    name: 'Twilight Veil',
    desc: 'Cools the home backdrop with twilight blues and indigo shadows.',
    icon: '🌌',
    cost: 250,
    ownership: 'cosmetic',
    effect: { kind: 'tint', bodyClass: 'cosmetic-bg-twilight' },
  },

  // ── Cosmetics — Tier 2 placeholder slots ("Coming Soon") ────────────────
  //
  // These cards exist purely for the showcase. The visual is a
  // silhouetted late-realm cultivator / crystal sprite so the player
  // gets a tease of "what's coming" without spoiling specific shapes.
  // `comingSoon: true` flips the shop UI to a locked card variant —
  // no Buy button, no price, just a teaser. When the real Tier-2
  // skin lands we drop `comingSoon`, add `effect.kind: 'skin'` and an
  // `assetPath`, and reuse the same slot.
  //
  // Character — show different "preview tiers" so the row reads as
  // variety (player sees "I could be any of these one day"). Each
  // declares a `previewSprite` index (0-12) to pick which existing
  // cultivator sprite to use for the silhouette teaser.
  { id: 'cos_char_premium_1', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.CHARACTER, name: 'Sword Saint', desc: 'A blade-bound cultivator clad in jade brocade. Premium pixelart skin — coming soon.',  icon: '🗡️', ownership: 'cosmetic', comingSoon: true, previewSprite: 5 },
  { id: 'cos_char_premium_2', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.CHARACTER, name: 'Demon Path',  desc: 'A heretical path stained in shadow and ember. Premium pixelart skin — coming soon.',  icon: '👹', ownership: 'cosmetic', comingSoon: true, previewSprite: 7 },
  { id: 'cos_char_premium_3', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.CHARACTER, name: 'Storm Caller', desc: 'Robes woven from cloud-silk, eyes lit with lightning. Premium pixelart skin — coming soon.',  icon: '⚡', ownership: 'cosmetic', comingSoon: true, previewSprite: 9 },
  { id: 'cos_char_premium_4', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.CHARACTER, name: 'Lotus Sage',   desc: 'Serene petals bloom around an ascetic\'s frame. Premium pixelart skin — coming soon.',  icon: '🪷', ownership: 'cosmetic', comingSoon: true, previewSprite: 11 },

  // Crystal — Tier-2 premium skins (different gem cuts / fantasy
  // materials). Show silhouettes of mid-tier crystals (3-7) so the
  // late-tier shapes stay a surprise.
  { id: 'cos_crystal_premium_1', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.CRYSTAL, name: 'Obsidian Heart', desc: 'A jet-black crystal carved by void cultivators. Premium skin — coming soon.', icon: '⬣', ownership: 'cosmetic', comingSoon: true, previewSprite: 4 },
  { id: 'cos_crystal_premium_2', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.CRYSTAL, name: 'Phoenix Core',   desc: 'A molten ember bound in crystal lattice. Premium skin — coming soon.',         icon: '🔥', ownership: 'cosmetic', comingSoon: true, previewSprite: 6 },
  { id: 'cos_crystal_premium_3', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.CRYSTAL, name: 'Dragon Tear',    desc: 'Wept by a slumbering ancient. Premium skin — coming soon.',                   icon: '🐉', ownership: 'cosmetic', comingSoon: true, previewSprite: 7 },

  // Particles — Tier-2 (alt particle pools)
  { id: 'cos_particles_premium_1', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Cherry Blossom', desc: 'Petals drift inward instead of orbs. Premium skin — coming soon.',  icon: '🌸', ownership: 'cosmetic', comingSoon: true },
  { id: 'cos_particles_premium_2', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.PARTICLES, name: 'Sigil Runes',    desc: 'Glowing arcane glyphs spiral toward you. Premium skin — coming soon.',  icon: '🔮', ownership: 'cosmetic', comingSoon: true },

  // Backgrounds — Tier-2 (full scene swaps)
  { id: 'cos_bg_premium_1', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.BACKGROUND, name: 'Frozen Peak',     desc: 'A snowbound summit at the edge of the heavens. Premium backdrop — coming soon.', icon: '🏔️', ownership: 'cosmetic', comingSoon: true },
  { id: 'cos_bg_premium_2', category: 'cosmetic', cosmeticSlot: COSMETIC_SLOTS.BACKGROUND, name: 'Lotus Pavilion',  desc: 'A jade pavilion floating on a still lotus pond. Premium backdrop — coming soon.', icon: '🏯', ownership: 'cosmetic', comingSoon: true },
];

export const SHOP_ITEMS_BY_ID = Object.fromEntries(SHOP_ITEMS.map(i => [i.id, i]));

/** True if an item is currently affordable. */
export function canAfford(itemId, balance) {
  const item = SHOP_ITEMS_BY_ID[itemId];
  return !!item && balance >= item.cost;
}
