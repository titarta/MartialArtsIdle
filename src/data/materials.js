/**
 * materials.js — rarity tier constants only.
 *
 * The herb / ore / blood-core / cultivation-stone tables, the gather/mine
 * cost lookups, the refined-qi helper, and the dismantle-to-mineral map
 * were retired with the v1 Cookie-Clicker pivot. Combat, gathering, mining,
 * and the pill recipe loop no longer ship in v1.
 *
 * Only the rarity colour table + tier-cost table remain — they are still
 * read by spirit-garden plants, shop UI, and the upgrade card colour bar.
 */

export const RARITY = {
  Iron:         { label: 'Iron',         color: '#9ca3af' },
  Bronze:       { label: 'Bronze',       color: '#cd7f32' },
  Silver:       { label: 'Silver',       color: '#c0c0c0' },
  Gold:         { label: 'Gold',         color: '#f5c842' },
  Transcendent: { label: 'Transcendent', color: '#c084fc' },
};

// Alias retained for components that imported ITEM_RARITY historically.
export const ITEM_RARITY = RARITY;

/** Cost per rarity tier — shared across gather and mine. */
export const RARITY_TIER_COST = {
  Iron:         15,
  Bronze:       60,
  Silver:       180,
  Gold:         600,
  Transcendent: 1800,
};
