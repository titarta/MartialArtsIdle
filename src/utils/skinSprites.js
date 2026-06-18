/**
 * Cosmetic skin -> sprite-set resolver.
 *
 * Each character / crystal cosmetic skin (Frost Ascetic, Bone Patriarch, ...)
 * gets a full themed sprite set that evolves through every tier, living
 * alongside the base art under a per-theme subfolder:
 *
 *   base  character: sprites/cultivator/<tier>_<pose>.png
 *   skin  character: sprites/cultivator/skins/<theme>/<tier>_<pose>.png
 *   base  crystal:   crystals/crystal_<n>.png
 *   skin  crystal:   crystals/skins/<theme>/crystal_<n>.png
 *
 * Theme comes from the shop item's `theme` field (e.g. 'frost'). The resolver
 * is a pure path REWRITE: callers build the base path they already use, then
 * pass it through here with the equipped (or previewed) skin id.
 *
 * SKIN_ART_READY gates which themes actually have their PNGs on disk. Until a
 * theme is listed there, every rewrite returns the base path unchanged — so
 * this whole layer is a no-op (no broken images, no visual change) until the
 * art lands. When a theme's sprites are committed, add it to SKIN_ART_READY
 * and it lights up at every render site at once: the home cultivator + crystal,
 * the Bazaar skin preview, and the Wardrobe.
 */
import { SHOP_ITEMS_BY_ID } from '../data/shopItems';

// Themes whose full sprite sets exist on disk. EMPTY until art is generated;
// add a theme string here the moment its sprites/<theme>/ folder is populated.
export const SKIN_ART_READY = new Set([
  // 'frost', 'bone', 'storm', 'lotus', 'phoenix',
]);

/** The skin's theme, but only when that theme's art is ready (else null). */
export function readyThemeFor(itemId) {
  if (!itemId) return null;
  const theme = SHOP_ITEMS_BY_ID[itemId]?.theme ?? null;
  return theme && SKIN_ART_READY.has(theme) ? theme : null;
}

/**
 * Rewrite a base CULTIVATOR sprite URL to the equipped character skin's set.
 * No-op (returns basePath) when nothing is equipped or the theme isn't ready.
 */
export function skinnedCultivatorPath(basePath, equippedCharId) {
  const theme = readyThemeFor(equippedCharId);
  if (!theme) return basePath;
  return basePath.replace(/sprites\/cultivator\//, `sprites/cultivator/skins/${theme}/`);
}

/**
 * Rewrite a base CRYSTAL sprite URL to the equipped crystal skin's set.
 * No-op (returns basePath) when nothing is equipped or the theme isn't ready.
 */
export function skinnedCrystalPath(basePath, equippedCrystalId) {
  const theme = readyThemeFor(equippedCrystalId);
  if (!theme) return basePath;
  return basePath.replace(/crystals\/crystal_/, `crystals/skins/${theme}/crystal_`);
}
