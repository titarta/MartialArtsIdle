/**
 * materials.js — canonical source of truth for all non-pill items.
 *
 * Owns: HERBS, ORES, BLOOD_CORES, CULTIVATION_MATERIALS ("QI Stones"),
 * plus the RARITY colour table re-used by components, the flat
 * ALL_MATERIALS lookup, and getRefinedQi() for QI stones.
 *
 * Rarity tier → cost (in "gather/mine points"; base speed = 3/sec):
 *   Iron: 15 (5s) | Bronze: 60 (20s) | Silver: 180 (1min) | Gold: 600 (3.3min) | Transcendent: 1800 (10min)
 *
 * Designer overrides: src/data/config/materials.override.json patches the
 * four maps under namespaced keys — records.HERBS, records.ORES,
 * records.BLOOD_CORES, records.QI_STONES — each keyed by the item id with
 * a partial patch as the value (e.g. { gatherCost: 25 }).
 */
import { getRecordsPatch } from './config/loader';

export const RARITY = {
  Iron:         { label: 'Iron',         color: '#9ca3af' },
  Bronze:       { label: 'Bronze',       color: '#cd7f32' },
  Silver:       { label: 'Silver',       color: '#c0c0c0' },
  Gold:         { label: 'Gold',         color: '#f5c842' },
  Transcendent: { label: 'Transcendent', color: '#c084fc' },
};

// Alias retained for components that imported ITEM_RARITY historically.
export const ITEM_RARITY = RARITY;

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
  iron_herb_1:          { name: 'Mortal Qi Grass',     rarity: 'Iron',         gatherCost: 15,   description: 'A weed that grows wherever mortal cultivators train, soaking up residual qi from their exercises.' },
  iron_herb_2:          { name: 'Wild Spirit Root',    rarity: 'Iron',         gatherCost: 15,   description: 'A gnarled root found in borderland wilderness, drawn to faint spiritual energy in the soil.' },
  bronze_herb_1:        { name: 'Qi Vein Vine',        rarity: 'Bronze',       gatherCost: 60,   description: 'A creeping vine that grows along underground qi veins, its leaves faintly luminescent.' },
  bronze_herb_2:        { name: 'Misty Forest Bloom',  rarity: 'Bronze',       gatherCost: 60,   description: 'A pale flower that blooms only in spirit-mist forests, pollinated by forest spirits.' },
  silver_herb_1:        { name: 'Desert Silver Lotus', rarity: 'Silver',       gatherCost: 180,  description: 'A silver lotus that survives in scorched desert ruins, drawing water from deep ley lines.' },
  silver_herb_2:        { name: 'Blood Reed',          rarity: 'Silver',       gatherCost: 180,  description: 'A blood-red reed that grows at the edges of the blood sea, its sap thick with corrupted vitality.' },
  gold_herb_1:          { name: 'Burial Ground Lotus', rarity: 'Gold',         gatherCost: 600,  description: 'A dark lotus that blooms only above saint-grade burial sites, feeding on centuries of death qi.' },
  gold_herb_2:          { name: 'Void Thorn Vine',     rarity: 'Gold',         gatherCost: 600,  description: 'A thorned vine that grows through rift cracks, its barbs sharp enough to pierce saint-grade defenses.' },
  transcendent_herb_1:  { name: 'Origin Spring Petal', rarity: 'Transcendent', gatherCost: 1800, description: "A petal shed by flowers growing at the world's origin qi springs, saturated with primordial energy." },
  transcendent_herb_2:  { name: 'Heaven Root Vine',    rarity: 'Transcendent', gatherCost: 1800, description: 'A legendary vine whose roots reach through bedrock to the world core, channeling heaven-grade energy.' },
};

// ── Ores (ID-keyed) ───────────────────────────────────────────────────────────
export const ORES = {
  iron_mineral_1:         { name: 'Sect Iron Shard',      rarity: 'Iron',         mineCost: 15,   description: 'A fragment of iron-grade material shed from sect constructs, training equipment, and the iron of mortal cultivators.' },
  iron_mineral_2:         { name: 'Iron Vein Shard',      rarity: 'Iron',         mineCost: 15,   description: 'A dense shard of iron ore extracted from shallow veins, used in basic transmutation.' },
  bronze_mineral_1:       { name: 'Qi Fang',              rarity: 'Bronze',       mineCost: 60,   description: 'A fang or spine shard from a beast that grew mineral-dense through years of absorbing qi from the earth.' },
  bronze_mineral_2:       { name: 'Spirit Wood Core',     rarity: 'Bronze',       mineCost: 60,   description: 'The hardened core from a spirit entity or ancient tree, permeated with concentrated forest qi.' },
  silver_mineral_1:       { name: 'Iron Spine Scale',     rarity: 'Silver',       mineCost: 180,  description: 'A scale or spine segment from iron-calibre predators of the ancient frontier, dense enough to deflect silver-grade attacks.' },
  silver_mineral_2:       { name: 'Immortal Array Jade',  rarity: 'Silver',       mineCost: 180,  description: 'Jade infused with formation arrays from sunken immortal ruins, still containing traces of their original inscriptions.' },
  gold_mineral_1:         { name: 'Saint Bone Sliver',    rarity: 'Gold',         mineCost: 600,  description: 'A sliver of bone from saint-realm corpses, radiating a cold death qi that resists refinement.' },
  gold_mineral_2:         { name: 'Forbidden Seal Shard', rarity: 'Gold',         mineCost: 600,  description: 'A fragment of the void seals that once contained the Forbidden Lands, crackling with restrained power.' },
  transcendent_mineral_1: { name: 'Void Crystal',         rarity: 'Transcendent', mineCost: 1800, description: 'A crystal grown inside rift tears, its structure formed entirely by compressed void energy.' },
  transcendent_mineral_2: { name: 'World Stone Core',     rarity: 'Transcendent', mineCost: 1800, description: "An impossibly dense stone core formed at the world's deepest strata or shed by titans of the upper heaven, used only in the most advanced transmutation." },
};

// ── Blood Cores (combat drops only — no gather/mine cost) ─────────────────────
export const BLOOD_CORES = {
  iron_blood_core_1:         { name: 'Iron Blood Core 1',         rarity: 'Iron',         description: 'Placeholder — a dense iron-grade blood core extracted from a fallen enemy.' },
  iron_blood_core_2:         { name: 'Iron Blood Core 2',         rarity: 'Iron',         description: 'Placeholder — a crystallised iron-grade blood essence condensed from mortal cultivators.' },
  bronze_blood_core_1:       { name: 'Bronze Blood Core 1',       rarity: 'Bronze',       description: 'Placeholder — a bronze-grade blood core pulsing with beast vitality.' },
  bronze_blood_core_2:       { name: 'Bronze Blood Core 2',       rarity: 'Bronze',       description: 'Placeholder — a shard of condensed bronze-grade blood qi from corrupted entities.' },
  silver_blood_core_1:       { name: 'Silver Blood Core 1',       rarity: 'Silver',       description: 'Placeholder — a silver-grade blood core saturated with ancient frontier vitality.' },
  silver_blood_core_2:       { name: 'Silver Blood Core 2',       rarity: 'Silver',       description: 'Placeholder — a remnant blood crystal from an immortal-realm entity.' },
  gold_blood_core_1:         { name: 'Gold Blood Core 1',         rarity: 'Gold',         description: 'Placeholder — a saint-grade blood core radiating cold death qi.' },
  gold_blood_core_2:         { name: 'Gold Blood Core 2',         rarity: 'Gold',         description: 'Placeholder — a void-attribute blood pearl from a gold-grade predator.' },
  transcendent_blood_core_1: { name: 'Transcendent Blood Core 1', rarity: 'Transcendent', description: 'Placeholder — a primordial blood core condensed from an entity beyond mortal limitations.' },
  transcendent_blood_core_2: { name: 'Transcendent Blood Core 2', rarity: 'Transcendent', description: 'Placeholder — a heaven-grade blood crystal radiating overwhelming pressure.' },
};

// ── QI Stones — cultivation materials (ID-keyed) ──────────────────────────────
// QI stones drop from all three activities (combat, gathering, mining).
export const CULTIVATION_MATERIALS = {
  iron_cultivation_1:         { name: 'Iron QI Stone 1',         rarity: 'Iron',         gatherCost: 15,   mineCost: 15,   refinedQi: 5,    description: 'A naturally formed stone that accumulates ambient qi over time in mortal-realm training grounds.' },
  iron_cultivation_2:         { name: 'Iron QI Stone 2',         rarity: 'Iron',         gatherCost: 15,   mineCost: 15,   refinedQi: 8,    description: 'Residual qi that coalesces above a defeated mortal cultivator or beast, briefly visible before dispersing.' },
  bronze_cultivation_1:       { name: 'Bronze QI Stone 1',       rarity: 'Bronze',       gatherCost: 60,   mineCost: 60,   refinedQi: 20,   description: 'The dense qi nucleus found at the center of a beast that has fed on spiritual energy for years — still pulsing faintly after death.' },
  bronze_cultivation_2:       { name: 'Bronze QI Stone 2',       rarity: 'Bronze',       gatherCost: 60,   mineCost: 60,   refinedQi: 30,   description: 'A crystallised shard of qi torn from a fallen cultivator or construct whose energy pathways had been corrupted or shattered.' },
  silver_cultivation_1:       { name: 'Silver QI Stone 1',       rarity: 'Silver',       gatherCost: 180,  mineCost: 180,  refinedQi: 80,   description: 'The marrow-like qi condensate found deep within ancient frontier creatures, saturated after centuries of qi absorption.' },
  silver_cultivation_2:       { name: 'Silver QI Stone 2',       rarity: 'Silver',       gatherCost: 180,  mineCost: 180,  refinedQi: 120,  description: 'A fragment of soul-force that persists after the death of an immortal-grade entity, still carrying echoes of its cultivation.' },
  gold_cultivation_1:         { name: 'Gold QI Stone 1',         rarity: 'Gold',         gatherCost: 600,  mineCost: 600,  refinedQi: 300,  description: 'A calcified relic of saint-realm qi, recovered from burial grounds and war altars.' },
  gold_cultivation_2:         { name: 'Gold QI Stone 2',         rarity: 'Gold',         gatherCost: 600,  mineCost: 600,  refinedQi: 450,  description: 'A small pearl formed inside void-touched predators and shades, containing compressed void-attribute energy.' },
  transcendent_cultivation_1: { name: 'Transcendent QI Stone 1', rarity: 'Transcendent', gatherCost: 1800, mineCost: 1800, refinedQi: 1000, description: 'The crystallised qi core of a primordial entity — condensed from millions of years of unbroken cultivation.' },
  transcendent_cultivation_2: { name: 'Transcendent QI Stone 2', rarity: 'Transcendent', gatherCost: 1800, mineCost: 1800, refinedQi: 1500, description: 'A crystal of pure heaven-grade qi extracted from entities that have ascended beyond mortal limitations.' },
};

// Apply designer overrides BEFORE building ALL_MATERIALS so the flat lookup
// sees the final patched records.
patchMap(HERBS,                 'HERBS');
patchMap(ORES,                  'ORES');
patchMap(BLOOD_CORES,           'BLOOD_CORES');
patchMap(CULTIVATION_MATERIALS, 'QI_STONES');

// ── Flat lookup keyed by snake_case ID — covers every material type ──────────
export const ALL_MATERIALS = {};
for (const [id, rec] of Object.entries(HERBS))                 ALL_MATERIALS[id] = { ...rec, type: 'herb' };
for (const [id, rec] of Object.entries(ORES))                  ALL_MATERIALS[id] = { ...rec, type: 'ore' };
for (const [id, rec] of Object.entries(BLOOD_CORES))           ALL_MATERIALS[id] = { ...rec, type: 'blood_core' };
for (const [id, rec] of Object.entries(CULTIVATION_MATERIALS)) ALL_MATERIALS[id] = { ...rec, type: 'cultivation' };

// ── Array-form exports — consumers that iterate a category ───────────────────
// Each element is a plain object with `id` prepended so existing code using
// `.map(h => h.id)` and `.filter(h => ...)` keeps working.
function toArray(map) {
  return Object.entries(map).map(([id, rec]) => ({ id, ...rec }));
}
export const HERB_ITEMS        = toArray(HERBS);
export const ORE_ITEMS         = toArray(ORES);
export const BLOOD_CORE_ITEMS  = toArray(BLOOD_CORES);
export const CULTIVATION_ITEMS = toArray(CULTIVATION_MATERIALS);

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

/** Look up the refined QI value of a cultivation stone by item id. */
export function getRefinedQi(itemId) {
  return CULTIVATION_MATERIALS[itemId]?.refinedQi ?? 0;
}
