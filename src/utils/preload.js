/**
 * preload.js — predictive image preloading utilities.
 *
 * Fires `new Image()` requests so sprite sheets land in the browser
 * cache before they're needed. All calls are fire-and-forget.
 */

const BASE = import.meta.env.BASE_URL;

function preloadImage(src) {
  if (!src) return;
  const el = new Image();
  el.src = src;
}

/** Preload an arbitrary list of image URLs. */
export function preloadImages(srcs) {
  srcs.forEach(preloadImage);
}

/**
 * Preload animation sheets for one enemy sprite ID.
 * @param {string}   sprite  — base filename, e.g. 'iron_fang_wolf'
 * @param {string[]} anims   — which sheets to load; default all three
 */
export function preloadEnemySprites(sprite, anims = ['idle', 'attack', 'hit']) {
  if (!sprite) return;
  anims.forEach(anim =>
    preloadImage(`${BASE}sprites/enemies/${sprite}-${anim}.png`)
  );
}

/** Static player combat sprite URLs — always the same three files. */
export const PLAYER_SPRITE_SRCS = [
  `${BASE}sprites/combat/player-idle.png`,
  `${BASE}sprites/combat/player-attack.png`,
  `${BASE}sprites/combat/player-hit.png`,
];
