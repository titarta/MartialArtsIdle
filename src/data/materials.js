/**
 * materials.js — gather/mine costs for herbs, ores, and QI stones.
 *
 * Rarity tier → cost (in "gather/mine points"; base speed = 3/sec):
 *   Iron: 15 (5s) | Bronze: 60 (20s) | Silver: 180 (1min) | Gold: 600 (3.3min) | Transcendent: 1800 (10min)
 *
 * All rarity strings use the canonical Iron/Bronze/Silver/Gold/Transcendent system.
 * RARITY is re-exported from items.js as the single source of truth for rarity colors.
 *
 * HERBS and ORES are now keyed by item ID (not display name).
 * ALL_MATERIALS is the unified ID-keyed flat lookup for all material types.
 *
 * Designer overrides: src/data/config/materials.override.json patches HERBS
 * and ORES by their item ID. Each record is a partial patch (e.g. { gatherCost: 25 }).
 *
 * Each transmutation tier has two materials:
 *   _1 — used for rolling stats  (hone + add operations)
 *   _2 — used for rolling modifiers (replace operation)
 */
import { getRecordsPatch } from './config/loader';

export { RARITY } from './items';

const matsPatch = getRecordsPatch('materials');

function patchMap(map, key) {
  const patches = matsPatch[key] || {};
  for (const [id, p] of Object.entries(patches)) {
    if (!p) continue;
    map[id] = { ...(map[id] || {}), ...p };
  }
}

/** Cost per rarity tier — shared across gather and mine. */
export const RARITY_TIER_COST = {
  Iron:         15,
  Bronze:       60,
  Silver:       180,
  Gold:         600,
  Transcendent: 1800,
};

// ── Herbs (ID-keyed) ──────────────────────────────────────────────────────────
export const HERBS = {
  iron_herb_1:          { rarity: 'Iron',         gatherCost: 15   },
  iron_herb_2:          { rarity: 'Iron',         gatherCost: 15   },
  bronze_herb_1:        { rarity: 'Bronze',       gatherCost: 60   },
  bronze_herb_2:        { rarity: 'Bronze',       gatherCost: 60   },
  silver_herb_1:        { rarity: 'Silver',       gatherCost: 180  },
  silver_herb_2:        { rarity: 'Silver',       gatherCost: 180  },
  gold_herb_1:          { rarity: 'Gold',         gatherCost: 600  },
  gold_herb_2:          { rarity: 'Gold',         gatherCost: 600  },
  transcendent_herb_1:  { rarity: 'Transcendent', gatherCost: 1800 },
  transcendent_herb_2:  { rarity: 'Transcendent', gatherCost: 1800 },
};

// ── Ores (ID-keyed) ───────────────────────────────────────────────────────────
export const ORES = {
  iron_mineral_1:         { rarity: 'Iron',         mineCost: 15   },
  iron_mineral_2:         { rarity: 'Iron',         mineCost: 15   },
  bronze_mineral_1:       { rarity: 'Bronze',       mineCost: 60   },
  bronze_mineral_2:       { rarity: 'Bronze',       mineCost: 60   },
  silver_mineral_1:       { rarity: 'Silver',       mineCost: 180  },
  silver_mineral_2:       { rarity: 'Silver',       mineCost: 180  },
  gold_mineral_1:         { rarity: 'Gold',         mineCost: 600  },
  gold_mineral_2:         { rarity: 'Gold',         mineCost: 600  },
  transcendent_mineral_1: { rarity: 'Transcendent', mineCost: 1800 },
  transcendent_mineral_2: { rarity: 'Transcendent', mineCost: 1800 },
};

// ── QI Stones — cultivation materials (ID-keyed) ──────────────────────────────
// QI stones drop from all three activities (combat, gathering, mining).
export const CULTIVATION_MATERIALS = {
  iron_cultivation_1:         { name: 'Iron QI Stone 1',         rarity: 'Iron',         gatherCost: 15,   mineCost: 15   },
  iron_cultivation_2:         { name: 'Iron QI Stone 2',         rarity: 'Iron',         gatherCost: 15,   mineCost: 15   },
  bronze_cultivation_1:       { name: 'Bronze QI Stone 1',       rarity: 'Bronze',       gatherCost: 60,   mineCost: 60   },
  bronze_cultivation_2:       { name: 'Bronze QI Stone 2',       rarity: 'Bronze',       gatherCost: 60,   mineCost: 60   },
  silver_cultivation_1:       { name: 'Silver QI Stone 1',       rarity: 'Silver',       gatherCost: 180,  mineCost: 180  },
  silver_cultivation_2:       { name: 'Silver QI Stone 2',       rarity: 'Silver',       gatherCost: 180,  mineCost: 180  },
  gold_cultivation_1:         { name: 'Gold QI Stone 1',         rarity: 'Gold',         gatherCost: 600,  mineCost: 600  },
  gold_cultivation_2:         { name: 'Gold QI Stone 2',         rarity: 'Gold',         gatherCost: 600,  mineCost: 600  },
  transcendent_cultivation_1: { name: 'Transcendent QI Stone 1', rarity: 'Transcendent', gatherCost: 1800, mineCost: 1800 },
  transcendent_cultivation_2: { name: 'Transcendent QI Stone 2', rarity: 'Transcendent', gatherCost: 1800, mineCost: 1800 },
};

/** Flat lookup keyed by snake_case ID — covers all material types. */
export const ALL_MATERIALS = {
  // herbs
  iron_herb_1:             { name: 'Mortal Qi Grass',        rarity: 'Iron',         type: 'herb',        gatherCost: 15   },
  iron_herb_2:             { name: 'Wild Spirit Root',        rarity: 'Iron',         type: 'herb',        gatherCost: 15   },
  bronze_herb_1:           { name: 'Qi Vein Vine',            rarity: 'Bronze',       type: 'herb',        gatherCost: 60   },
  bronze_herb_2:           { name: 'Misty Forest Bloom',      rarity: 'Bronze',       type: 'herb',        gatherCost: 60   },
  silver_herb_1:           { name: 'Desert Silver Lotus',     rarity: 'Silver',       type: 'herb',        gatherCost: 180  },
  silver_herb_2:           { name: 'Blood Reed',              rarity: 'Silver',       type: 'herb',        gatherCost: 180  },
  gold_herb_1:             { name: 'Burial Ground Lotus',     rarity: 'Gold',         type: 'herb',        gatherCost: 600  },
  gold_herb_2:             { name: 'Void Thorn Vine',         rarity: 'Gold',         type: 'herb',        gatherCost: 600  },
  transcendent_herb_1:     { name: 'Origin Spring Petal',     rarity: 'Transcendent', type: 'herb',        gatherCost: 1800 },
  transcendent_herb_2:     { name: 'Heaven Root Vine',        rarity: 'Transcendent', type: 'herb',        gatherCost: 1800 },
  // ores
  iron_mineral_1:          { name: 'Sect Iron Shard',         rarity: 'Iron',         type: 'ore',         mineCost: 15   },
  iron_mineral_2:          { name: 'Iron Vein Shard',         rarity: 'Iron',         type: 'ore',         mineCost: 15   },
  bronze_mineral_1:        { name: 'Qi Fang',                 rarity: 'Bronze',       type: 'ore',         mineCost: 60   },
  bronze_mineral_2:        { name: 'Spirit Wood Core',        rarity: 'Bronze',       type: 'ore',         mineCost: 60   },
  silver_mineral_1:        { name: 'Iron Spine Scale',        rarity: 'Silver',       type: 'ore',         mineCost: 180  },
  silver_mineral_2:        { name: 'Immortal Array Jade',     rarity: 'Silver',       type: 'ore',         mineCost: 180  },
  gold_mineral_1:          { name: 'Saint Bone Sliver',       rarity: 'Gold',         type: 'ore',         mineCost: 600  },
  gold_mineral_2:          { name: 'Forbidden Seal Shard',    rarity: 'Gold',         type: 'ore',         mineCost: 600  },
  transcendent_mineral_1:  { name: 'Void Crystal',            rarity: 'Transcendent', type: 'ore',         mineCost: 1800 },
  transcendent_mineral_2:  { name: 'World Stone Core',        rarity: 'Transcendent', type: 'ore',         mineCost: 1800 },
  // QI stones (cultivation materials)
  iron_cultivation_1:         { name: 'Iron QI Stone 1',         rarity: 'Iron',         type: 'cultivation', gatherCost: 15,   mineCost: 15   },
  iron_cultivation_2:         { name: 'Iron QI Stone 2',         rarity: 'Iron',         type: 'cultivation', gatherCost: 15,   mineCost: 15   },
  bronze_cultivation_1:       { name: 'Bronze QI Stone 1',       rarity: 'Bronze',       type: 'cultivation', gatherCost: 60,   mineCost: 60   },
  bronze_cultivation_2:       { name: 'Bronze QI Stone 2',       rarity: 'Bronze',       type: 'cultivation', gatherCost: 60,   mineCost: 60   },
  silver_cultivation_1:       { name: 'Silver QI Stone 1',       rarity: 'Silver',       type: 'cultivation', gatherCost: 180,  mineCost: 180  },
  silver_cultivation_2:       { name: 'Silver QI Stone 2',       rarity: 'Silver',       type: 'cultivation', gatherCost: 180,  mineCost: 180  },
  gold_cultivation_1:         { name: 'Gold QI Stone 1',         rarity: 'Gold',         type: 'cultivation', gatherCost: 600,  mineCost: 600  },
  gold_cultivation_2:         { name: 'Gold QI Stone 2',         rarity: 'Gold',         type: 'cultivation', gatherCost: 600,  mineCost: 600  },
  transcendent_cultivation_1: { name: 'Transcendent QI Stone 1', rarity: 'Transcendent', type: 'cultivation', gatherCost: 1800, mineCost: 1800 },
  transcendent_cultivation_2: { name: 'Transcendent QI Stone 2', rarity: 'Transcendent', type: 'cultivation', gatherCost: 1800, mineCost: 1800 },
  // blood cores (combat drops only)
  iron_blood_core_1:         { name: 'Iron Blood Core 1',         rarity: 'Iron',         type: 'blood_core' },
  iron_blood_core_2:         { name: 'Iron Blood Core 2',         rarity: 'Iron',         type: 'blood_core' },
  bronze_blood_core_1:       { name: 'Bronze Blood Core 1',       rarity: 'Bronze',       type: 'blood_core' },
  bronze_blood_core_2:       { name: 'Bronze Blood Core 2',       rarity: 'Bronze',       type: 'blood_core' },
  silver_blood_core_1:       { name: 'Silver Blood Core 1',       rarity: 'Silver',       type: 'blood_core' },
  silver_blood_core_2:       { name: 'Silver Blood Core 2',       rarity: 'Silver',       type: 'blood_core' },
  gold_blood_core_1:         { name: 'Gold Blood Core 1',         rarity: 'Gold',         type: 'blood_core' },
  gold_blood_core_2:         { name: 'Gold Blood Core 2',         rarity: 'Gold',         type: 'blood_core' },
  transcendent_blood_core_1: { name: 'Transcendent Blood Core 1', rarity: 'Transcendent', type: 'blood_core' },
  transcendent_blood_core_2: { name: 'Transcendent Blood Core 2', rarity: 'Transcendent', type: 'blood_core' },
};

// Apply designer overrides — patches by id into HERBS and ORES.
patchMap(HERBS, 'HERBS');
patchMap(ORES,  'ORES');

/**
 * Look up the gather cost for any item by ID.
 * Falls back to RARITY_TIER_COST[rarity] if the item doesn't have a direct gatherCost.
 */
export function getGatherCost(itemId) {
  const mat = ALL_MATERIALS[itemId];
  if (!mat) return 30;
  return mat.gatherCost ?? RARITY_TIER_COST[mat.rarity] ?? 30;
}

/**
 * Look up the mine cost for any item by ID.
 */
export function getMineCost(itemId) {
  const mat = ALL_MATERIALS[itemId];
  if (!mat) return 30;
  return mat.mineCost ?? RARITY_TIER_COST[mat.rarity] ?? 30;
}
