/**
 * materials.js — gather/mine costs for herbs and ores.
 * Costs are in "gather points". Initial gather/mine speed = 3/sec.
 * Common=15 (5s), Uncommon=60 (20s), Rare=180 (1min), Epic=600 (3.3min), Legendary=1800 (10min)
 *
 * Each transmutation tier has two materials:
 *   _1  — used for rolling stats  (hone + add operations)
 *   _2  — used for rolling modifiers (replace operation)
 */

export const HERBS = {
  'Mortal Qi Grass':       { rarity: 'Common',    gatherCost: 15   },
  'Wild Spirit Root':      { rarity: 'Common',    gatherCost: 15   },
  'Qi Vein Vine':          { rarity: 'Uncommon',  gatherCost: 60   },
  'Misty Forest Bloom':    { rarity: 'Uncommon',  gatherCost: 60   },
  'Desert Silver Lotus':   { rarity: 'Rare',      gatherCost: 180  },
  'Blood Reed':            { rarity: 'Rare',      gatherCost: 180  },
  'Burial Ground Lotus':   { rarity: 'Epic',      gatherCost: 600  },
  'Void Thorn Vine':       { rarity: 'Epic',      gatherCost: 600  },
  'Origin Spring Petal':   { rarity: 'Legendary', gatherCost: 1800 },
  'Heaven Root Vine':      { rarity: 'Legendary', gatherCost: 1800 },
};

export const ORES = {
  'Cracked Qi Stone':      { rarity: 'Common',    mineCost: 15   },
  'Iron Beast Shard':      { rarity: 'Common',    mineCost: 15   },
  'Qi Beast Fang':         { rarity: 'Uncommon',  mineCost: 60   },
  'Spirit Wood Sliver':    { rarity: 'Uncommon',  mineCost: 60   },
  'Iron Spine Fragment':   { rarity: 'Rare',      mineCost: 180  },
  'Array Jade Shard':      { rarity: 'Rare',      mineCost: 180  },
  'Saint Bone Sliver':     { rarity: 'Epic',      mineCost: 600  },
  'Forbidden Seal Shard':  { rarity: 'Epic',      mineCost: 600  },
  'Void Crystal':          { rarity: 'Legendary', mineCost: 1800 },
  'Origin Stone Core':     { rarity: 'Legendary', mineCost: 1800 },
};

export const CULTIVATION_MATERIALS = {
  iron_cultivation_1:          { name: 'Qi Fragment',           rarity: 'Common'    },
  iron_cultivation_2:          { name: 'Spirit Stone Shard',    rarity: 'Common'    },
  bronze_cultivation_1:        { name: 'Beast Core Shard',      rarity: 'Uncommon'  },
  bronze_cultivation_2:        { name: 'Qi Crystal',            rarity: 'Uncommon'  },
  silver_cultivation_1:        { name: 'Silver Spirit Essence', rarity: 'Rare'      },
  silver_cultivation_2:        { name: 'Soul Shard',            rarity: 'Rare'      },
  gold_cultivation_1:          { name: 'Saint Qi Relic',        rarity: 'Epic'      },
  gold_cultivation_2:          { name: 'Void Qi Pearl',         rarity: 'Epic'      },
  transcendent_cultivation_1:  { name: 'Primordial Qi Essence', rarity: 'Legendary' },
  transcendent_cultivation_2:  { name: 'Heaven Core Crystal',   rarity: 'Legendary' },
};

/** Flat lookup keyed by snake_case ID — covers all material types. */
export const ALL_MATERIALS = {
  // herbs
  iron_herb_1:             { name: 'Mortal Qi Grass',       rarity: 'Common',    type: 'herb' },
  iron_herb_2:             { name: 'Wild Spirit Root',      rarity: 'Common',    type: 'herb' },
  bronze_herb_1:           { name: 'Qi Vein Vine',          rarity: 'Uncommon',  type: 'herb' },
  bronze_herb_2:           { name: 'Misty Forest Bloom',    rarity: 'Uncommon',  type: 'herb' },
  silver_herb_1:           { name: 'Desert Silver Lotus',   rarity: 'Rare',      type: 'herb' },
  silver_herb_2:           { name: 'Blood Reed',            rarity: 'Rare',      type: 'herb' },
  gold_herb_1:             { name: 'Burial Ground Lotus',   rarity: 'Epic',      type: 'herb' },
  gold_herb_2:             { name: 'Void Thorn Vine',       rarity: 'Epic',      type: 'herb' },
  transcendent_herb_1:     { name: 'Origin Spring Petal',   rarity: 'Legendary', type: 'herb' },
  transcendent_herb_2:     { name: 'Heaven Root Vine',      rarity: 'Legendary', type: 'herb' },
  // ores
  iron_mineral_1:          { name: 'Cracked Qi Stone',      rarity: 'Common',    type: 'ore' },
  iron_mineral_2:          { name: 'Iron Beast Shard',      rarity: 'Common',    type: 'ore' },
  bronze_mineral_1:        { name: 'Qi Beast Fang',         rarity: 'Uncommon',  type: 'ore' },
  bronze_mineral_2:        { name: 'Spirit Wood Sliver',    rarity: 'Uncommon',  type: 'ore' },
  silver_mineral_1:        { name: 'Iron Spine Fragment',   rarity: 'Rare',      type: 'ore' },
  silver_mineral_2:        { name: 'Array Jade Shard',      rarity: 'Rare',      type: 'ore' },
  gold_mineral_1:          { name: 'Saint Bone Sliver',     rarity: 'Epic',      type: 'ore' },
  gold_mineral_2:          { name: 'Forbidden Seal Shard',  rarity: 'Epic',      type: 'ore' },
  transcendent_mineral_1:  { name: 'Void Crystal',          rarity: 'Legendary', type: 'ore' },
  transcendent_mineral_2:  { name: 'Origin Stone Core',     rarity: 'Legendary', type: 'ore' },
  // cultivation materials
  iron_cultivation_1:      { name: 'Qi Fragment',           rarity: 'Common',    type: 'cultivation' },
  iron_cultivation_2:      { name: 'Spirit Stone Shard',    rarity: 'Common',    type: 'cultivation' },
  bronze_cultivation_1:    { name: 'Beast Core Shard',      rarity: 'Uncommon',  type: 'cultivation' },
  bronze_cultivation_2:    { name: 'Qi Crystal',            rarity: 'Uncommon',  type: 'cultivation' },
  silver_cultivation_1:    { name: 'Silver Spirit Essence', rarity: 'Rare',      type: 'cultivation' },
  silver_cultivation_2:    { name: 'Soul Shard',            rarity: 'Rare',      type: 'cultivation' },
  gold_cultivation_1:      { name: 'Saint Qi Relic',        rarity: 'Epic',      type: 'cultivation' },
  gold_cultivation_2:      { name: 'Void Qi Pearl',         rarity: 'Epic',      type: 'cultivation' },
  transcendent_cultivation_1: { name: 'Primordial Qi Essence', rarity: 'Legendary', type: 'cultivation' },
  transcendent_cultivation_2: { name: 'Heaven Core Crystal',   rarity: 'Legendary', type: 'cultivation' },
};

export const RARITY_COLOR = {
  Common:    '#aaa',
  Uncommon:  '#4ade80',
  Rare:      '#60a5fa',
  Epic:      '#c084fc',
  Legendary: '#f59e0b',
};
