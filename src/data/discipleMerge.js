/**
 * discipleMerge.js — state + math for the Roster (Disciple Promotion grid).
 *
 * THE ECONOMY (Option D — dual currency, non-destructive Merit):
 *
 *   Merit  ← passive income from owned disciples (Sect Merit / 贡献)
 *           rate = ownedDisciples × MERIT_RATE per second
 *           spent on: PLACE (drop a new T1 on the board)
 *
 *   Qi     ← main game currency
 *           spent on: EXPAND (grow grid size 3×3 → 4×4 → 5×5 → 6×6 → 7×7)
 *
 * Merit is accumulated lazily — we store the balance at the last "settle"
 * point and the timestamp of that settle, then compute the live balance
 * on demand: stored + (now - last) × discipleCount × MERIT_RATE. This
 * gives accurate offline catch-up without a polling loop in App.jsx, and
 * the React state only mutates on actual spends (or explicit settles).
 *
 * Expansion is tier-gated: you can't buy a 4×4 grid until you've
 * promoted any tile to T3, can't buy 5×5 until T5, and so on. The gate
 * forces you to USE the smaller grid before scaling up — without it,
 * a wealthy player would skip straight to 7×7 with T1s everywhere.
 *
 * Each merge yields Merit equal to the new tile's value (T2 = 2 Merit,
 * T10 = 512 Merit). Closes the loop: place → merge → gain Merit → place
 * again. Late merges fund late placements.
 *
 * Persistence: `mai_disciple_merge` in localStorage. Module is pure (no
 * React); the React seam lives in hooks/useDiscipleMerge.js.
 *
 * Sprite economy: T1-T5 each get a unique producer disciple sprite
 * (bronze / silver / gold / mythic / transcended); T6-T10 reuse the
 * transcended sprite with a multiplier badge (×2..×6) until each top
 * rank gets bespoke art. T5 Elder is the first appearance of the new
 * Transcended art on the roster — previously the entire upper half of
 * the ladder rendered the Mythic sprite, which made the visual climb
 * stall at T4 and never feel like it landed the Transcended tier the
 * disciple producer ladder now exposes.
 *
 * ALL numeric values here are STARTING VALUES — tune via sim before they
 * leave the prototype. The two master levers are MERIT_RATE (sets pacing
 * of Place beats) and EXPANSION qiCosts (set the milestone cadence).
 */

// Persistence key for the Roster state (single key — grid, gridSize,
// nextId, highestTier, meritStored, meritLastUpdate live together).
const KEY = 'mai_disciple_merge';

// Tier ladder. Values double for board-sum arithmetic. Each T5+ entry has
// both a `sprite` / `badge` (post-gate, after disc_transcend Eternal Tree
// node is purchased) and a `pregateSprite` / `pregateBadge` (the original
// pre-Transcended-tier scheme of mythic + escalating badges). Consumers
// pick via effectiveTier(idx, transcendUnlocked).
export const TIERS = [
  null,
  { rank: 'Outer Disciple',  glyph: '徒', value: 1,   sprite: '/sprites/producers/p_disciple_bronze.png',      badge: null  },
  { rank: 'Inner Disciple',  glyph: '弟', value: 2,   sprite: '/sprites/producers/p_disciple_silver.png',      badge: null  },
  { rank: 'Core Disciple',   glyph: '核', value: 4,   sprite: '/sprites/producers/p_disciple_gold.png',        badge: null  },
  { rank: 'Sword Disciple',  glyph: '劍', value: 8,   sprite: '/sprites/producers/p_disciple_mythic.png',      badge: null  },
  { rank: 'Elder',           glyph: '長', value: 16,  sprite: '/sprites/producers/p_disciple_transcended.png', badge: null,
    pregateSprite: '/sprites/producers/p_disciple_mythic.png',      pregateBadge: '×2' },
  { rank: 'Senior Elder',    glyph: '尊', value: 32,  sprite: '/sprites/producers/p_disciple_transcended.png', badge: '×2',
    pregateSprite: '/sprites/producers/p_disciple_mythic.png',      pregateBadge: '×3' },
  { rank: 'Hall Master',     glyph: '主', value: 64,  sprite: '/sprites/producers/p_disciple_transcended.png', badge: '×3',
    pregateSprite: '/sprites/producers/p_disciple_mythic.png',      pregateBadge: '×4' },
  { rank: 'Sect Master',     glyph: '宗', value: 128, sprite: '/sprites/producers/p_disciple_transcended.png', badge: '×4',
    pregateSprite: '/sprites/producers/p_disciple_mythic.png',      pregateBadge: '×5' },
  { rank: 'Patriarch',       glyph: '祖', value: 256, sprite: '/sprites/producers/p_disciple_transcended.png', badge: '×5',
    pregateSprite: '/sprites/producers/p_disciple_mythic.png',      pregateBadge: '×6' },
  { rank: 'Ancestor',        glyph: '聖', value: 512, sprite: '/sprites/producers/p_disciple_transcended.png', badge: '×6',
    pregateSprite: '/sprites/producers/p_disciple_mythic.png',      pregateBadge: '×7' },
];

/** Returns the tier display descriptor honoring the disc_transcend gate.
 *  When `transcendUnlocked` is false, T5+ revert to the pregate scheme
 *  (mythic sprite + escalating ×N badges) so a player who hasn't bought
 *  the Eternal Tree node never sees the new chrome-rose art. */
export function effectiveTier(tierIdx, transcendUnlocked) {
  const t = TIERS[tierIdx];
  if (!t) return t;
  if (transcendUnlocked || !t.pregateSprite) return t;
  return { ...t, sprite: t.pregateSprite, badge: t.pregateBadge };
}

// ── Economy levers (STARTING VALUES) ─────────────────────────────────────────
// Each board-sum point = +1% to disciple producer per-unit qi/s.
export const BONUS_PER_BOARD_SUM = 0.01;

// Per-disciple Merit accrual (per second). 10 disciples → 1 Merit/sec.
// Test plan: at 50 disciples (early-mid), first Place (10 Merit) should
// be affordable in ~2 sec; at 1000 disciples (mid-late), Merit shouldn't
// run away (consider soft cap if it does).
export const MERIT_RATE = 0.1;

// Place cost — geometric in tile count on board. Pushes the player to
// merge before refilling. 1st tile = 10, 9th = ~116, 16th = ~524.
export const PLACE_BASE  = 10;
export const PLACE_SCALE = 1.35;

// Expansion ladder. Indexed by GRID SIZE (3..7). Each step:
//   tiles       — total tiles after expansion
//   qiCost      — Qi to spend to reach this size
//   unlockTier  — must have ever-reached this tier to expand here
// 3×3 is the starting size (no cost, no gate).
export const EXPANSION = {
  3: { size: 3, tiles: 9,  qiCost: 0,             unlockTier: 0 },
  4: { size: 4, tiles: 16, qiCost: 5_000,         unlockTier: 3 },
  5: { size: 5, tiles: 25, qiCost: 500_000,       unlockTier: 5 },
  6: { size: 6, tiles: 36, qiCost: 50_000_000,    unlockTier: 7 },
  7: { size: 7, tiles: 49, qiCost: 5_000_000_000, unlockTier: 9 },
};
export const MIN_GRID_SIZE = 3;
export const MAX_GRID_SIZE = 7;

// ── State shape ──────────────────────────────────────────────────────────────
// {
//   tiles:           Array<null | { tier: 1..10, id: number }>  (length = gridSize²)
//   gridSize:        3..7
//   nextId:          number (monotonic per-tile id for React keys)
//   highestTier:    0..10  (highest tile ever produced; the expansion gate)
//   meritStored:     number (Merit at meritLastUpdate)
//   meritLastUpdate: number (ms timestamp; used to lazily accrue more Merit)
// }

export function defaultMerge() {
  return {
    tiles: new Array(EXPANSION[MIN_GRID_SIZE].tiles).fill(null),
    gridSize: MIN_GRID_SIZE,
    nextId: 1,
    highestTier: 0,
    meritStored: 0,
    meritLastUpdate: Date.now(),
  };
}

export function loadMerge() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && Array.isArray(raw.tiles) && raw.tiles.length > 0) {
      // Infer gridSize from tile count if not explicitly stored — handles
      // migration from the pre-economy 4×4-only build.
      const inferredSize = Math.round(Math.sqrt(raw.tiles.length));
      const gridSize = (raw.gridSize >= MIN_GRID_SIZE && raw.gridSize <= MAX_GRID_SIZE)
        ? raw.gridSize
        : (inferredSize >= MIN_GRID_SIZE && inferredSize <= MAX_GRID_SIZE ? inferredSize : MIN_GRID_SIZE);
      return {
        tiles: raw.tiles,
        gridSize,
        nextId: typeof raw.nextId === 'number' ? raw.nextId : 1,
        highestTier: typeof raw.highestTier === 'number'
          ? raw.highestTier
          : maxTierOnBoard(raw.tiles),
        meritStored: typeof raw.meritStored === 'number' ? raw.meritStored : 0,
        meritLastUpdate: typeof raw.meritLastUpdate === 'number' ? raw.meritLastUpdate : Date.now(),
      };
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

export function discipleProducerMult(tiles) {
  return 1 + boardSum(tiles) * BONUS_PER_BOARD_SUM;
}

export function tileCount(tiles) {
  let n = 0;
  for (const t of tiles) if (t) n++;
  return n;
}

export function gridIsFull(tiles) {
  for (const t of tiles) if (!t) return false;
  return true;
}

export function findEmptySlot(tiles) {
  return tiles.findIndex(t => t === null);
}

function maxTierOnBoard(tiles) {
  let h = 0;
  for (const t of tiles) if (t && t.tier > h) h = t.tier;
  return h;
}

/** Merit cost to place the NEXT tile, given how many sit on the board. */
export function placeCost(currentTileCount) {
  return Math.max(1, Math.ceil(PLACE_BASE * Math.pow(PLACE_SCALE, currentTileCount)));
}

/** Lookup for the next expansion step (or null if at MAX_GRID_SIZE). */
export function nextExpansion(currentSize) {
  if (currentSize >= MAX_GRID_SIZE) return null;
  return EXPANSION[currentSize + 1] ?? null;
}

/**
 * Compute current Merit lazily.
 *   currentMerit = stored + (now − lastUpdate) × discipleCount × MERIT_RATE
 * Used both for display (every UI tick) and for spend checks.
 */
export function currentMerit(state, discipleCount, now = Date.now()) {
  const elapsedSec = Math.max(0, (now - state.meritLastUpdate) / 1000);
  return state.meritStored + Math.max(0, discipleCount) * MERIT_RATE * elapsedSec;
}

/** Fold the accumulated Merit into stored + reset the timestamp. Pure. */
export function settleMerit(state, discipleCount, now = Date.now()) {
  return { ...state, meritStored: currentMerit(state, discipleCount, now), meritLastUpdate: now };
}

// ── Pure actions ─────────────────────────────────────────────────────────────

/**
 * Place a T1 tile. Settles Merit first, then checks affordability.
 * Returns { state, placed, idx, cost, reason? }.
 *   reason: 'merit' (couldn't afford) | 'full' (no slot)
 */
export function tryPlace(state, discipleCount, now = Date.now(), costMult = 1) {
  const settled = settleMerit(state, discipleCount, now);
  const tilesNow = tileCount(settled.tiles);
  // Eternal Tree 'Open Hand' (hand) discounts the Merit place cost (costMult<1).
  const cost = Math.max(1, Math.ceil(placeCost(tilesNow) * (costMult > 0 ? costMult : 1)));
  if (settled.meritStored < cost) {
    return { state: settled, placed: false, idx: -1, cost, reason: 'merit' };
  }
  const idx = findEmptySlot(settled.tiles);
  if (idx < 0) {
    return { state: settled, placed: false, idx: -1, cost, reason: 'full' };
  }
  const tiles = settled.tiles.slice();
  tiles[idx] = { tier: 1, id: settled.nextId };
  return {
    state: {
      ...settled,
      tiles,
      nextId: settled.nextId + 1,
      meritStored: settled.meritStored - cost,
    },
    placed: true,
    idx,
    cost,
  };
}

/**
 * Resolve a drag-drop. Merges yield Merit equal to the new tile's value.
 * Returns { state, action, newTier?, meritYield }:
 *   action: 'noop' | 'move' | 'swap' | 'merge' | 'maxed'
 */
export function resolveDrop(state, fromIdx, toIdx) {
  if (fromIdx === toIdx) return { state, action: 'noop', meritYield: 0 };
  const src = state.tiles[fromIdx];
  const dst = state.tiles[toIdx];
  if (!src) return { state, action: 'noop', meritYield: 0 };

  // Empty target → move
  if (!dst) {
    const tiles = state.tiles.slice();
    tiles[toIdx] = src;
    tiles[fromIdx] = null;
    return { state: { ...state, tiles }, action: 'move', meritYield: 0 };
  }
  // Same tier + room to ascend → promote
  if (src.tier === dst.tier && src.tier < TIERS.length - 1) {
    const newTier = src.tier + 1;
    const tiles = state.tiles.slice();
    tiles[toIdx] = { tier: newTier, id: state.nextId };
    tiles[fromIdx] = null;
    const meritYield = TIERS[newTier].value;
    const next = {
      ...state,
      tiles,
      nextId: state.nextId + 1,
      highestTier: Math.max(state.highestTier, newTier),
      meritStored: state.meritStored + meritYield,
    };
    return { state: next, action: 'merge', newTier, meritYield };
  }
  // Same tier at top → nothing to do
  if (src.tier === dst.tier) return { state, action: 'maxed', meritYield: 0 };
  // Different tier → swap
  const tiles = state.tiles.slice();
  tiles[toIdx] = src;
  tiles[fromIdx] = dst;
  return { state: { ...state, tiles }, action: 'swap', meritYield: 0 };
}

/** Remove a tile entirely. The stuck-board escape valve. */
export function secludeTile(state, idx) {
  const tile = state.tiles[idx];
  if (!tile) return { state, removed: null };
  const tiles = state.tiles.slice();
  tiles[idx] = null;
  return { state: { ...state, tiles }, removed: tile };
}

/**
 * Attempt to expand the grid. Caller MUST have already spent Qi externally
 * (this module doesn't touch the qi balance). Returns:
 *   { state, expanded, reason?, next? }
 *     reason: 'maxed' | 'tier' (need: number)
 */
export function expandGrid(state) {
  const next = nextExpansion(state.gridSize);
  if (!next) return { state, expanded: false, reason: 'maxed' };
  if (state.highestTier < next.unlockTier) {
    return { state, expanded: false, reason: 'tier', need: next.unlockTier };
  }
  const tiles = state.tiles.slice();
  while (tiles.length < next.tiles) tiles.push(null);
  return {
    state: { ...state, tiles, gridSize: next.size },
    expanded: true,
    next,
  };
}

// ── Codex queries ───────────────────────────────────────────────────────────
// Surfaced through the global Codex modal under the 'Roster' tab. One
// section: ranks. Discovery happens when the player first promotes a
// tile to that rank (tracked via `highestTier` in the merge state).

const RANK_HINTS = {
  1:  'Drop your first disciple on the grid.',
  2:  'Merge two Outer Disciples.',
  3:  'Merge two Inner Disciples.',
  4:  'Merge two Core Disciples.',
  5:  'Merge two Sword Disciples.',
  6:  'Merge two Elders.',
  7:  'Merge two Senior Elders.',
  8:  'Merge two Hall Masters.',
  9:  'Merge two Sect Masters.',
  10: 'Merge two Patriarchs — the apex of the roster.',
};

/** Returns codex entries for the Roster tab. `state` is the disciple-merge
 *  persistence object (has `highestTier`). `transcendUnlocked` decides which
 *  sprite displays for T5+ ranks (mythic vs transcended). */
export function getRosterCodexEntries(state, transcendUnlocked) {
  const highest = state?.highestTier ?? 0;
  const entries = [];
  for (let i = 1; i <= 10; i++) {
    const t = effectiveTier(i, transcendUnlocked);
    if (!t) continue;
    const discovered = highest >= i;
    entries.push({
      id:   `rank_${i}`,
      name: discovered ? `T${i} ${t.rank}` : '???',
      desc: discovered ? `Glyph ${t.glyph}. Value ${t.value}. +${(t.value * BONUS_PER_BOARD_SUM * 100).toFixed(2)}% to per-disciple qi/s.` : null,
      hint: discovered ? null : (RANK_HINTS[i] || ''),
      discovered,
      sprite: t.sprite,
      badge:  t.badge,
    });
  }
  return [{ id: 'ranks', label: 'Ranks', entries }];
}

export function getRosterCodexProgress(state) {
  const highest = state?.highestTier ?? 0;
  return { total: 10, discovered: Math.min(10, highest) };
}
