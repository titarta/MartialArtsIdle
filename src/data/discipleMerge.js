/**
 * discipleMerge.js — state + math for the Disciple Promotion grid.
 *
 * Loop: each "Place" drops a T1 Outer Disciple onto the next empty tile of a
 * 4×4 grid. Drag a disciple onto a same-rank disciple to PROMOTE (merge to
 * T+1). Drag onto a different rank to SWAP, or onto an empty cell to MOVE.
 * Board sum → +X% multiplier on the disciple producer's per-unit qi/s, so
 * every promotion lifts the entire idle loop.
 *
 * Persistence: `mai_disciple_merge` in localStorage. Module is pure (no
 * React); the React seam lives in hooks/useDiscipleMerge.js.
 *
 * Sprite economy: we own four producer sprites (bronze/silver/gold/mythic).
 * T1–T4 each get one. T5–T10 reuse the mythic sprite with a numeric badge
 * (×2…×7) in the corner until bespoke art is generated for the higher ranks.
 *
 * ALL numeric values here are STARTING VALUES — tune via sim before they
 * leave the prototype. The bonus-per-board-sum constant is the master lever;
 * everything else cascades from grid size and tier doubling.
 */

const KEY = 'mai_disciple_merge';

export const GRID_SIZE = 16;  // 4×4

// Tier ladder. Sprite assignments:
//   T1 → bronze, T2 → silver, T3 → gold, T4 → mythic (no badge)
//   T5–T10 → mythic + multiplier badge (so the eye reads ×2 → ×3 → ... as the
//   "veteran" tier the mythic ascended into) until bespoke art lands.
export const TIERS = [
  null,
  { rank: 'Outer Disciple',  glyph: '徒', value: 1,   sprite: '/sprites/producers/p_disciple_bronze.png',  badge: null  },
  { rank: 'Inner Disciple',  glyph: '弟', value: 2,   sprite: '/sprites/producers/p_disciple_silver.png',  badge: null  },
  { rank: 'Core Disciple',   glyph: '核', value: 4,   sprite: '/sprites/producers/p_disciple_gold.png',    badge: null  },
  { rank: 'Sword Disciple',  glyph: '劍', value: 8,   sprite: '/sprites/producers/p_disciple_mythic.png',  badge: null  },
  { rank: 'Elder',           glyph: '長', value: 16,  sprite: '/sprites/producers/p_disciple_mythic.png',  badge: '×2'  },
  { rank: 'Senior Elder',    glyph: '尊', value: 32,  sprite: '/sprites/producers/p_disciple_mythic.png',  badge: '×3'  },
  { rank: 'Hall Master',     glyph: '主', value: 64,  sprite: '/sprites/producers/p_disciple_mythic.png',  badge: '×4'  },
  { rank: 'Sect Master',     glyph: '宗', value: 128, sprite: '/sprites/producers/p_disciple_mythic.png',  badge: '×5'  },
  { rank: 'Patriarch',       glyph: '祖', value: 256, sprite: '/sprites/producers/p_disciple_mythic.png',  badge: '×6'  },
  { rank: 'Ancestor',        glyph: '聖', value: 512, sprite: '/sprites/producers/p_disciple_mythic.png',  badge: '×7'  },
];

// Each board-sum point lifts disciple per-unit qi/s by this fraction. A full
// board of T5 elders (sum = 16×16 = 256) → +256% to p_disciple production.
// STARTING VALUE.
export const BONUS_PER_BOARD_SUM = 0.01;

// ── State shape ──────────────────────────────────────────────────────────────
// { tiles: Array<null | { tier: 1..10, id: number }>, nextId: number }

export function defaultMerge() {
  return { tiles: new Array(GRID_SIZE).fill(null), nextId: 1 };
}

export function loadMerge() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && Array.isArray(raw.tiles) && raw.tiles.length === GRID_SIZE) {
      return { tiles: raw.tiles, nextId: typeof raw.nextId === 'number' ? raw.nextId : 1 };
    }
  } catch { /* ignore malformed */ }
  return defaultMerge();
}

export function saveMerge(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore quota */ }
}

// ── Pure math ────────────────────────────────────────────────────────────────
export function boardSum(tiles) {
  let s = 0;
  for (const t of tiles) if (t) s += TIERS[t.tier].value;
  return s;
}

/** Multiplier on the disciple producer's per-unit qi/s. 1 = no bonus. */
export function discipleProducerMult(tiles) {
  return 1 + boardSum(tiles) * BONUS_PER_BOARD_SUM;
}

export function gridIsFull(tiles) {
  for (const t of tiles) if (!t) return false;
  return true;
}

export function findEmptySlot(tiles) {
  return tiles.findIndex(t => t === null);
}

// ── Pure actions (return new state; do not mutate) ───────────────────────────

/** Place a fresh tile (default T1) in the next empty slot. Idempotent if full. */
export function spawnTile(state, tier = 1) {
  const idx = findEmptySlot(state.tiles);
  if (idx < 0) return { state, idx: -1, placed: false };
  const tiles = state.tiles.slice();
  tiles[idx] = { tier, id: state.nextId };
  return { state: { tiles, nextId: state.nextId + 1 }, idx, placed: true };
}

/**
 * Resolve a drop of tile at `fromIdx` onto cell at `toIdx`.
 * Returns { state, action, ?newTier }:
 *   action = 'noop'  | invalid (same cell, dragging empty, etc.)
 *          | 'move'  | dropped on empty → move tile there
 *          | 'merge' | same-tier non-max → promote, newTier set
 *          | 'maxed' | same-tier at max  → noop
 *          | 'swap'  | different-tier    → swap positions
 */
export function resolveDrop(state, fromIdx, toIdx) {
  if (fromIdx === toIdx) return { state, action: 'noop' };
  const src = state.tiles[fromIdx];
  const dst = state.tiles[toIdx];
  if (!src) return { state, action: 'noop' };

  // Empty target → move
  if (!dst) {
    const tiles = state.tiles.slice();
    tiles[toIdx] = src;
    tiles[fromIdx] = null;
    return { state: { ...state, tiles }, action: 'move' };
  }
  // Same tier + not at top → promote
  if (src.tier === dst.tier && src.tier < TIERS.length - 1) {
    const tiles = state.tiles.slice();
    tiles[toIdx] = { tier: src.tier + 1, id: state.nextId };
    tiles[fromIdx] = null;
    return { state: { tiles, nextId: state.nextId + 1 }, action: 'merge', newTier: src.tier + 1 };
  }
  // Same tier already at top → can't promote
  if (src.tier === dst.tier) return { state, action: 'maxed' };
  // Different tier → swap
  const tiles = state.tiles.slice();
  tiles[toIdx] = src;
  tiles[fromIdx] = dst;
  return { state: { ...state, tiles }, action: 'swap' };
}

/** Remove a tile entirely. Used as the stuck-board escape valve. */
export function secludeTile(state, idx) {
  const tile = state.tiles[idx];
  if (!tile) return { state, removed: null };
  const tiles = state.tiles.slice();
  tiles[idx] = null;
  return { state: { ...state, tiles }, removed: tile };
}
