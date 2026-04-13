/**
 * enemies.js — all enemy type definitions.
 *
 * sprite: base filename under public/sprites/enemies/.
 *   null  → canvas fallback until art is ready.
 *   set   → loads {sprite}-idle.png and {sprite}-attack.png automatically.
 *
 * statMult: multiplied on top of the player-derived base stats so each
 *   enemy type feels distinct even inside the same region.
 *     hp  — scales enemy max HP
 *     atk — scales enemy attack damage
 *
 * drops: array of { itemId, chance 0–1, qty [min, max] }
 *   itemId references material IDs from data/materials.js
 *
 * See docs/enemy-design.md for distribution rules and thematic guidelines.
 */

const ENEMIES = {

  // ── World 1 — The Mortal Lands ────────────────────────────────────────────
  // Theme: mortal sect → wilderness → qi forests → storm peaks
  // statMult targets: hp 0.7–1.2, atk 0.4–1.5

  outer_sect_disciple: {
    id:       'outer_sect_disciple',
    name:     'Outer Sect Disciple',
    sprite:   'outer_sect_disciple',
    statMult: { hp: 0.7, atk: 0.6 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.90, qty: [1, 4] },
      { itemId: 'iron_mineral_1',     chance: 0.15, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.02 },
  },

  training_golem: {
    id:       'training_golem',
    name:     'Training Golem',
    sprite:   'training_golem',
    statMult: { hp: 1.2, atk: 0.4 },   // tanky construct, low damage
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.50, qty: [1, 2] },
      { itemId: 'iron_mineral_1',     chance: 0.20, qty: [1, 1] },
    ],
  },

  wolf: {
    id:       'wolf',
    name:     'Pack Wolf',
    sprite:   'wolf',
    statMult: { hp: 0.9, atk: 1.0 },
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.70, qty: [1, 3] },
      { itemId: 'bronze_cultivation_1', chance: 0.20, qty: [1, 1] },
      { itemId: 'iron_mineral_1',       chance: 0.10, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.01 },
  },

  bandit_scout: {
    id:       'bandit_scout',
    name:     'Bandit Scout',
    sprite:   'bandit_scout',
    statMult: { hp: 0.8, atk: 1.1 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.85, qty: [2, 6] },
      { itemId: 'iron_mineral_1',     chance: 0.20, qty: [1, 2] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  wandering_beast: {
    id:       'wandering_beast',
    name:     'Wandering Beast',
    sprite:   'wandering_beast',
    statMult: { hp: 1.0, atk: 1.0 },
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.65, qty: [1, 3] },
      { itemId: 'bronze_cultivation_1', chance: 0.25, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.01 },
  },

  qi_beast: {
    id:       'qi_beast',
    name:     'Qi-Sensing Beast',
    sprite:   'qi_beast',
    statMult: { hp: 1.1, atk: 1.2 },
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.80, qty: [2, 5] },
      { itemId: 'bronze_cultivation_1', chance: 0.30, qty: [1, 1] },
      { itemId: 'bronze_mineral_1',     chance: 0.15, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  rogue_disciple: {
    id:       'rogue_disciple',
    name:     'Rogue Disciple',
    sprite:   'rogue_disciple',
    statMult: { hp: 1.0, atk: 1.3 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.85, qty: [2, 6] },
      { itemId: 'bronze_mineral_1',   chance: 0.20, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.05 },
  },

  forest_spirit: {
    id:       'forest_spirit',
    name:     'Forest Spirit',
    sprite:   'forest_spirit',
    statMult: { hp: 0.8, atk: 1.5 },
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.70, qty: [2, 5] },
      { itemId: 'bronze_cultivation_1', chance: 0.35, qty: [1, 2] },
      { itemId: 'bronze_mineral_2',     chance: 0.15, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  // ── World 2 — The Ancient Frontier ───────────────────────────────────────
  // Theme: desert ruins, ancient cities, blood seas
  // statMult targets: hp 1.5–2.5, atk 1.3–2.5

  iron_fang_wolf: {
    id:       'iron_fang_wolf',
    name:     'Iron Fang Wolf',
    sprite:   'iron_fang_wolf',
    statMult: { hp: 1.5, atk: 1.7 },
    drops: [
      { itemId: 'bronze_cultivation_1', chance: 0.80, qty: [3, 8] },
      { itemId: 'silver_cultivation_1', chance: 0.20, qty: [1, 1] },
      { itemId: 'silver_mineral_1',     chance: 0.15, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.02 },
  },

  iron_spine_boar: {
    id:       'iron_spine_boar',
    name:     'Iron Spine Boar',
    sprite:   null,
    statMult: { hp: 1.8, atk: 1.5 },
    drops: [
      { itemId: 'bronze_cultivation_1', chance: 0.80, qty: [4, 10] },
      { itemId: 'silver_cultivation_1', chance: 0.25, qty: [1, 1] },
      { itemId: 'silver_mineral_1',     chance: 0.15, qty: [1, 1] },
    ],
  },

  sand_dragon: {
    id:       'sand_dragon',
    name:     'Sand Dragon',
    sprite:   null,
    statMult: { hp: 1.6, atk: 1.8 },
    drops: [
      { itemId: 'silver_cultivation_1', chance: 0.70, qty: [2, 5] },
      { itemId: 'silver_mineral_1',     chance: 0.30, qty: [1, 1] },
      { itemId: 'silver_mineral_2',     chance: 0.20, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.02 },
  },

  bone_construct: {
    id:       'bone_construct',
    name:     'Bone Construct',
    sprite:   null,
    statMult: { hp: 2.0, atk: 1.3 },
    drops: [
      { itemId: 'silver_cultivation_1', chance: 0.65, qty: [2, 5] },
      { itemId: 'silver_mineral_1',     chance: 0.25, qty: [1, 1] },
    ],
  },

  city_guardian: {
    id:       'city_guardian',
    name:     'City Guardian Construct',
    sprite:   null,
    statMult: { hp: 2.3, atk: 1.8 },
    drops: [
      { itemId: 'silver_cultivation_1', chance: 0.80, qty: [3, 7] },
      { itemId: 'silver_cultivation_2', chance: 0.25, qty: [1, 1] },
      { itemId: 'silver_mineral_2',     chance: 0.20, qty: [1, 1] },
    ],
  },

  immortal_shade: {
    id:       'immortal_shade',
    name:     'Trapped Immortal Shade',
    sprite:   null,
    statMult: { hp: 1.5, atk: 2.2 },
    drops: [
      { itemId: 'silver_cultivation_1', chance: 0.80, qty: [3, 8] },
      { itemId: 'silver_cultivation_2', chance: 0.30, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  corrupted_cultivator: {
    id:       'corrupted_cultivator',
    name:     'Corrupted Cultivator',
    sprite:   null,
    statMult: { hp: 1.7, atk: 2.0 },
    drops: [
      { itemId: 'silver_cultivation_1', chance: 0.85, qty: [4, 10] },
      { itemId: 'silver_cultivation_2', chance: 0.25, qty: [1, 1] },
      { itemId: 'silver_mineral_2',     chance: 0.15, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  blood_leviathan: {
    id:       'blood_leviathan',
    name:     'Blood Sea Leviathan',
    sprite:   null,
    statMult: { hp: 2.5, atk: 2.3 },
    drops: [
      { itemId: 'silver_cultivation_1', chance: 0.80, qty: [5, 12] },
      { itemId: 'silver_cultivation_2', chance: 0.40, qty: [1, 2] },
      { itemId: 'gold_mineral_1',       chance: 0.10, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  // ── World 3 — The Forbidden Lands ────────────────────────────────────────
  // Theme: burial grounds, void rifts, sealed war altars
  // statMult targets: hp 2.0–4.0, atk 2.3–4.0

  burial_guardian: {
    id:       'burial_guardian',
    name:     'Burial Guardian',
    sprite:   null,
    statMult: { hp: 2.8, atk: 2.5 },
    drops: [
      { itemId: 'gold_cultivation_1', chance: 0.70, qty: [2, 5] },
      { itemId: 'gold_mineral_1',     chance: 0.30, qty: [1, 1] },
    ],
  },

  saint_corpse_soldier: {
    id:       'saint_corpse_soldier',
    name:     'Saint Corpse-Soldier',
    sprite:   null,
    statMult: { hp: 3.2, atk: 2.3 },
    drops: [
      { itemId: 'gold_cultivation_1', chance: 0.75, qty: [2, 6] },
      { itemId: 'gold_mineral_1',     chance: 0.25, qty: [1, 1] },
    ],
  },

  ancient_war_spirit: {
    id:       'ancient_war_spirit',
    name:     'Ancient War Spirit',
    sprite:   null,
    statMult: { hp: 2.5, atk: 3.0 },
    drops: [
      { itemId: 'gold_cultivation_1', chance: 0.75, qty: [3, 7] },
      { itemId: 'gold_cultivation_2', chance: 0.20, qty: [1, 1] },
      { itemId: 'gold_mineral_1',     chance: 0.20, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  saint_bone_sovereign: {
    id:       'saint_bone_sovereign',
    name:     'Saint Bone Sovereign',
    sprite:   null,
    statMult: { hp: 3.5, atk: 2.8 },
    drops: [
      { itemId: 'gold_cultivation_1', chance: 0.80, qty: [3, 8] },
      { itemId: 'gold_cultivation_2', chance: 0.25, qty: [1, 1] },
      { itemId: 'gold_mineral_2',     chance: 0.20, qty: [1, 1] },
    ],
  },

  void_shade: {
    id:       'void_shade',
    name:     'Void Shade',
    sprite:   null,
    statMult: { hp: 2.0, atk: 3.5 },
    drops: [
      { itemId: 'gold_cultivation_1', chance: 0.75, qty: [3, 8] },
      { itemId: 'gold_cultivation_2', chance: 0.25, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  forbidden_construct: {
    id:       'forbidden_construct',
    name:     'Forbidden Construct',
    sprite:   null,
    statMult: { hp: 4.0, atk: 2.5 },
    drops: [
      { itemId: 'gold_cultivation_1', chance: 0.80, qty: [4, 10] },
      { itemId: 'gold_mineral_2',     chance: 0.25, qty: [1, 1] },
    ],
  },

  void_rift_predator: {
    id:       'void_rift_predator',
    name:     'Void Rift Predator',
    sprite:   null,
    statMult: { hp: 2.8, atk: 3.8 },
    drops: [
      { itemId: 'gold_cultivation_2',      chance: 0.75, qty: [2, 5] },
      { itemId: 'transcendent_mineral_1',  chance: 0.15, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  rift_stalker: {
    id:       'rift_stalker',
    name:     'Rift Stalker',
    sprite:   null,
    statMult: { hp: 3.0, atk: 4.0 },
    drops: [
      { itemId: 'gold_cultivation_2',     chance: 0.80, qty: [3, 7] },
      { itemId: 'transcendent_mineral_1', chance: 0.20, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.05 },
  },

  // ── World 4 — The Origin Depths ──────────────────────────────────────────
  // Theme: underground springs, primordial forests, world core
  // statMult targets: hp 4.5–7.0, atk 4.0–6.5

  origin_crystal_golem: {
    id:       'origin_crystal_golem',
    name:     'Origin Crystal Golem',
    sprite:   null,
    statMult: { hp: 4.5, atk: 4.0 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.65, qty: [1, 3] },
      { itemId: 'transcendent_mineral_1',     chance: 0.25, qty: [1, 1] },
    ],
  },

  origin_guardian: {
    id:       'origin_guardian',
    name:     'Origin Guardian',
    sprite:   null,
    statMult: { hp: 5.0, atk: 4.5 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.70, qty: [2, 5] },
      { itemId: 'transcendent_mineral_1',     chance: 0.30, qty: [1, 1] },
    ],
  },

  primordial_serpent: {
    id:       'primordial_serpent',
    name:     'Primordial Serpent',
    sprite:   null,
    statMult: { hp: 5.5, atk: 5.0 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.75, qty: [2, 6] },
      { itemId: 'transcendent_cultivation_2', chance: 0.20, qty: [1, 1] },
      { itemId: 'transcendent_mineral_1',     chance: 0.20, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  root_sovereign: {
    id:       'root_sovereign',
    name:     'Root Sovereign',
    sprite:   null,
    statMult: { hp: 6.0, atk: 4.5 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.80, qty: [3, 7] },
      { itemId: 'transcendent_cultivation_2', chance: 0.25, qty: [1, 1] },
      { itemId: 'transcendent_mineral_1',     chance: 0.20, qty: [1, 1] },
    ],
  },

  deep_earth_titan: {
    id:       'deep_earth_titan',
    name:     'Deep Earth Titan',
    sprite:   null,
    statMult: { hp: 7.0, atk: 5.0 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.80, qty: [3, 8] },
      { itemId: 'transcendent_mineral_1',     chance: 0.35, qty: [1, 1] },
      { itemId: 'transcendent_mineral_2',     chance: 0.15, qty: [1, 1] },
    ],
  },

  ancient_beast: {
    id:       'ancient_beast',
    name:     'Ancient Beast',
    sprite:   null,
    statMult: { hp: 6.5, atk: 5.5 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.80, qty: [4, 10] },
      { itemId: 'transcendent_cultivation_2', chance: 0.30, qty: [1, 1] },
      { itemId: 'transcendent_mineral_1',     chance: 0.25, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  cavern_elder_demon: {
    id:       'cavern_elder_demon',
    name:     'Cavern Elder Demon',
    sprite:   null,
    statMult: { hp: 5.5, atk: 6.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.70, qty: [2, 5] },
      { itemId: 'transcendent_mineral_2',     chance: 0.30, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  world_root_wraith: {
    id:       'world_root_wraith',
    name:     'World Root Wraith',
    sprite:   null,
    statMult: { hp: 5.0, atk: 6.5 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.75, qty: [2, 6] },
      { itemId: 'transcendent_mineral_2',     chance: 0.35, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.05 },
  },

  // ── World 5 — The Void Sea ────────────────────────────────────────────────
  // Theme: fractured space, void sea, Dao ruins, Emperor tombs
  // statMult targets: hp 7.0–11.0, atk 6.5–11.0

  spatial_fissure_beast: {
    id:       'spatial_fissure_beast',
    name:     'Spatial Fissure Beast',
    sprite:   null,
    statMult: { hp: 7.0, atk: 6.5 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.85, qty: [5, 12] },
      { itemId: 'transcendent_mineral_1',     chance: 0.35, qty: [1, 2] },
    ],
  },

  void_elemental: {
    id:       'void_elemental',
    name:     'Void Elemental',
    sprite:   null,
    statMult: { hp: 8.0, atk: 7.5 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.85, qty: [6, 15] },
      { itemId: 'transcendent_cultivation_2', chance: 0.30, qty: [1, 2] },
    ],
  },

  void_sea_leviathan: {
    id:       'void_sea_leviathan',
    name:     'Void Sea Leviathan',
    sprite:   null,
    statMult: { hp: 9.0, atk: 8.0 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.85, qty: [8, 20] },
      { itemId: 'transcendent_cultivation_2', chance: 0.35, qty: [1, 2] },
      { itemId: 'transcendent_mineral_2',     chance: 0.20, qty: [1, 1] },
    ],
  },

  dao_inscription_guardian: {
    id:       'dao_inscription_guardian',
    name:     'Dao Inscription Guardian',
    sprite:   null,
    statMult: { hp: 9.5, atk: 8.5 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.85, qty: [8, 20] },
      { itemId: 'transcendent_cultivation_2', chance: 0.35, qty: [1, 2] },
    ],
  },

  dao_inscription_revenant: {
    id:       'dao_inscription_revenant',
    name:     'Dao Inscription Revenant',
    sprite:   null,
    statMult: { hp: 8.5, atk: 9.5 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.80, qty: [3, 8] },
      { itemId: 'transcendent_mineral_2',     chance: 0.30, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  petrified_dao_lord: {
    id:       'petrified_dao_lord',
    name:     'Petrified Dao Lord',
    sprite:   null,
    statMult: { hp: 10.0, atk: 9.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.80, qty: [4, 10] },
      { itemId: 'transcendent_mineral_2',     chance: 0.35, qty: [1, 2] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  emperor_will_fragment: {
    id:       'emperor_will_fragment',
    name:     'Emperor Will Fragment',
    sprite:   null,
    statMult: { hp: 9.0, atk: 11.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.85, qty: [5, 12] },
      { itemId: 'transcendent_mineral_2',     chance: 0.40, qty: [1, 2] },
    ],
    techniqueDrop: { chance: 0.05 },
  },

  star_sea_drifter: {
    id:       'star_sea_drifter',
    name:     'Star Sea Drifter',
    sprite:   null,
    statMult: { hp: 11.0, atk: 10.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.85, qty: [6, 15] },
      { itemId: 'transcendent_mineral_2',     chance: 0.40, qty: [1, 2] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  // ── World 6 — The Open Heaven ─────────────────────────────────────────────
  // Theme: heaven pillars, star sea, celestial rifts, cosmic beasts
  // statMult targets: hp 14.0–28.0, atk 16.0–32.0

  boundary_wraith: {
    id:       'boundary_wraith',
    name:     'Boundary Wraith',
    sprite:   null,
    statMult: { hp: 14.0, atk: 16.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [10, 25] },
      { itemId: 'transcendent_mineral_2',     chance: 0.50, qty: [1, 3] },
    ],
  },

  heaven_pillar_guardian: {
    id:       'heaven_pillar_guardian',
    name:     'Heaven Pillar Guardian',
    sprite:   null,
    statMult: { hp: 16.0, atk: 18.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [12, 30] },
      { itemId: 'transcendent_mineral_2',     chance: 0.50, qty: [1, 3] },
    ],
  },

  open_heaven_beast: {
    id:       'open_heaven_beast',
    name:     'Open Heaven Beast',
    sprite:   null,
    statMult: { hp: 18.0, atk: 18.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [15, 40] },
      { itemId: 'transcendent_mineral_2',     chance: 0.55, qty: [1, 3] },
    ],
  },

  star_sea_leviathan: {
    id:       'star_sea_leviathan',
    name:     'Star Sea Leviathan',
    sprite:   null,
    statMult: { hp: 20.0, atk: 20.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [20, 50] },
      { itemId: 'transcendent_mineral_2',     chance: 0.60, qty: [1, 3] },
    ],
  },

  eternal_storm_titan: {
    id:       'eternal_storm_titan',
    name:     'Eternal Storm Titan',
    sprite:   null,
    statMult: { hp: 22.0, atk: 22.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [20, 55] },
      { itemId: 'transcendent_mineral_2',     chance: 0.60, qty: [2, 4] },
    ],
  },

  celestial_sovereign: {
    id:       'celestial_sovereign',
    name:     'Celestial Sovereign',
    sprite:   null,
    statMult: { hp: 24.0, atk: 24.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [25, 60] },
      { itemId: 'transcendent_mineral_2',     chance: 0.65, qty: [2, 4] },
    ],
    techniqueDrop: { chance: 0.05 },
  },

  void_apex_predator: {
    id:       'void_apex_predator',
    name:     'Void Apex Predator',
    sprite:   null,
    statMult: { hp: 20.0, atk: 28.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [25, 65] },
      { itemId: 'transcendent_mineral_2',     chance: 0.65, qty: [2, 4] },
    ],
    techniqueDrop: { chance: 0.05 },
  },

  open_heaven_sovereign: {
    id:       'open_heaven_sovereign',
    name:     'Open Heaven Sovereign',
    sprite:   null,
    statMult: { hp: 28.0, atk: 32.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [30, 80] },
      { itemId: 'transcendent_mineral_2',     chance: 0.70, qty: [2, 5] },
    ],
    techniqueDrop: { chance: 0.06 },
  },
};

/**
 * Weighted random pick from an enemy pool.
 * pool: [{ enemyId: string, weight: number }]
 */
export function pickEnemy(pool) {
  const total  = pool.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return ENEMIES[entry.enemyId] ?? null;
  }
  return ENEMIES[pool[pool.length - 1].enemyId] ?? null;
}

export default ENEMIES;
