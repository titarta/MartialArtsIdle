/**
 * affixPools.js — per-slot affix definitions for artefact transmutation.
 *
 * Each entry: { id, name, stat, type, ranges: { rarity: [min, max], ... } }
 * Slot counts: common = 3 slots, all higher rarities = 2 slots.
 */

import { MOD } from './stats';

// ─── Slot counts ──────────────────────────────────────────────────────────────

export const AFFIX_SLOT_COUNT = {
  common: 3, uncommon: 2, rare: 2, epic: 2, legendary: 2,
};

// ─── Rarity tiers (for cost calculation) ────────────────────────────────────

export const RARITY_TIER = {
  common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5,
  Iron:   1, Bronze:   2, Silver: 3, Gold:  4, Transcendent: 5,
};

// ─── Per-slot affix pools ────────────────────────────────────────────────────

const WEAPON_POOL = [
  { id: 'w_phys_dmg',  name: 'Sharpness',      stat: 'physical_damage',   type: MOD.FLAT, ranges: { common:[5,12],  uncommon:[10,24],  rare:[20,48],   epic:[40,96],   legendary:[80,192]  } },
  { id: 'w_elem_dmg',  name: 'Spirit Edge',     stat: 'elemental_damage',  type: MOD.FLAT, ranges: { common:[4,10],  uncommon:[8,20],   rare:[16,40],   epic:[32,80],   legendary:[64,160]  } },
  { id: 'w_essence',   name: 'Essence Channel', stat: 'essence',           type: MOD.FLAT, ranges: { common:[2,6],   uncommon:[4,12],   rare:[8,24],    epic:[16,48],   legendary:[32,96]   } },
  { id: 'w_body',      name: 'Body Force',      stat: 'body',              type: MOD.FLAT, ranges: { common:[2,6],   uncommon:[4,12],   rare:[8,24],    epic:[16,48],   legendary:[32,96]   } },
  { id: 'w_exploit',   name: 'Exploit Chance',  stat: 'exploit_chance',    type: MOD.FLAT, ranges: { common:[1,3],   uncommon:[2,5],    rare:[4,8],     epic:[6,12],    legendary:[10,20]   } },
];

const HEAD_POOL = [
  { id: 'h_soul_tough', name: 'Soul Barrier',    stat: 'soul_toughness',    type: MOD.FLAT, ranges: { common:[3,8],   uncommon:[6,16],   rare:[12,32],   epic:[24,64],   legendary:[48,128]  } },
  { id: 'h_elem_def',   name: 'Spirit Ward',     stat: 'elemental_defense', type: MOD.FLAT, ranges: { common:[3,8],   uncommon:[6,16],   rare:[12,32],   epic:[24,64],   legendary:[48,128]  } },
  { id: 'h_soul',       name: 'Mind Clarity',    stat: 'soul',              type: MOD.FLAT, ranges: { common:[2,6],   uncommon:[4,12],   rare:[8,24],    epic:[16,48],   legendary:[32,96]   } },
  { id: 'h_health',     name: 'Vitality',        stat: 'health',            type: MOD.FLAT, ranges: { common:[15,40], uncommon:[30,80],  rare:[60,160],  epic:[120,320], legendary:[240,640] } },
  { id: 'h_defense',    name: 'Hardened Mind',   stat: 'defense',           type: MOD.FLAT, ranges: { common:[3,8],   uncommon:[6,16],   rare:[12,32],   epic:[24,64],   legendary:[48,128]  } },
];

const BODY_POOL = [
  { id: 'b_defense',     name: 'Iron Shell',      stat: 'defense',           type: MOD.FLAT,      ranges: { common:[5,14],     uncommon:[10,28],   rare:[20,56],   epic:[40,112],  legendary:[80,224]   } },
  { id: 'b_health',      name: 'Life Force',      stat: 'health',            type: MOD.FLAT,      ranges: { common:[20,50],    uncommon:[40,100],  rare:[80,200],  epic:[160,400], legendary:[320,800]  } },
  { id: 'b_elem_def',    name: 'Elemental Shell', stat: 'elemental_defense', type: MOD.FLAT,      ranges: { common:[3,8],      uncommon:[6,16],    rare:[12,32],   epic:[24,64],   legendary:[48,128]   } },
  { id: 'b_body',        name: 'Body Hardening',  stat: 'body',              type: MOD.FLAT,      ranges: { common:[2,6],      uncommon:[4,12],    rare:[8,24],    epic:[16,48],   legendary:[32,96]    } },
  { id: 'b_defense_pct', name: 'Reinforcement',   stat: 'defense',           type: MOD.INCREASED, ranges: { common:[0.02,0.06], uncommon:[0.04,0.10],rare:[0.08,0.18],epic:[0.12,0.25],legendary:[0.20,0.40] } },
];

const HANDS_POOL = [
  { id: 'ha_phys_dmg', name: 'Iron Fist',   stat: 'physical_damage',   type: MOD.FLAT, ranges: { common:[4,10],  uncommon:[8,20],   rare:[16,40],   epic:[32,80],   legendary:[64,160]  } },
  { id: 'ha_elem_dmg', name: 'Flame Palm',  stat: 'elemental_damage',  type: MOD.FLAT, ranges: { common:[3,8],   uncommon:[6,16],   rare:[12,32],   epic:[24,64],   legendary:[48,128]  } },
  { id: 'ha_essence',  name: 'Qi Surge',    stat: 'essence',           type: MOD.FLAT, ranges: { common:[2,6],   uncommon:[4,12],   rare:[8,24],    epic:[16,48],   legendary:[32,96]   } },
  { id: 'ha_body',     name: 'Stone Grip',  stat: 'body',              type: MOD.FLAT, ranges: { common:[2,6],   uncommon:[4,12],   rare:[8,24],    epic:[16,48],   legendary:[32,96]   } },
];

const WAIST_POOL = [
  { id: 'wa_health',  name: 'Dantian Seal', stat: 'health',  type: MOD.FLAT, ranges: { common:[20,50],  uncommon:[40,100], rare:[80,200],  epic:[160,400], legendary:[320,800] } },
  { id: 'wa_defense', name: 'Belt Guard',   stat: 'defense', type: MOD.FLAT, ranges: { common:[3,8],    uncommon:[6,16],   rare:[12,32],   epic:[24,64],   legendary:[48,128]  } },
  { id: 'wa_body',    name: 'Core Strength',stat: 'body',    type: MOD.FLAT, ranges: { common:[2,6],    uncommon:[4,12],   rare:[8,24],    epic:[16,48],   legendary:[32,96]   } },
  { id: 'wa_essence', name: 'Qi Storage',   stat: 'essence', type: MOD.FLAT, ranges: { common:[2,6],    uncommon:[4,12],   rare:[8,24],    epic:[16,48],   legendary:[32,96]   } },
];

const FEET_POOL = [
  { id: 'fe_defense',    name: 'Rooted Stance',   stat: 'defense',           type: MOD.FLAT, ranges: { common:[3,8],   uncommon:[6,16],   rare:[12,32],   epic:[24,64],   legendary:[48,128]  } },
  { id: 'fe_health',     name: 'Endurance',        stat: 'health',            type: MOD.FLAT, ranges: { common:[15,40], uncommon:[30,80],  rare:[60,160],  epic:[120,320], legendary:[240,640] } },
  { id: 'fe_soul_tough', name: 'Mental Footing',   stat: 'soul_toughness',    type: MOD.FLAT, ranges: { common:[2,6],   uncommon:[4,12],   rare:[8,24],    epic:[16,48],   legendary:[32,96]   } },
  { id: 'fe_elem_def',   name: 'Spirit Steps',     stat: 'elemental_defense', type: MOD.FLAT, ranges: { common:[2,6],   uncommon:[4,12],   rare:[8,24],    epic:[16,48],   legendary:[32,96]   } },
];

const NECK_POOL = [
  { id: 'ne_elem_def',   name: 'Warding Light',  stat: 'elemental_defense', type: MOD.FLAT, ranges: { common:[3,8],   uncommon:[6,16],   rare:[12,32],   epic:[24,64],   legendary:[48,128] } },
  { id: 'ne_soul_tough', name: 'Soul Anchor',    stat: 'soul_toughness',    type: MOD.FLAT, ranges: { common:[3,8],   uncommon:[6,16],   rare:[12,32],   epic:[24,64],   legendary:[48,128] } },
  { id: 'ne_essence',    name: 'Jade Resonance', stat: 'essence',           type: MOD.FLAT, ranges: { common:[2,6],   uncommon:[4,12],   rare:[8,24],    epic:[16,48],   legendary:[32,96]  } },
  { id: 'ne_soul',       name: 'Spiritual Link', stat: 'soul',              type: MOD.FLAT, ranges: { common:[2,6],   uncommon:[4,12],   rare:[8,24],    epic:[16,48],   legendary:[32,96]  } },
];

const RING_POOL = [
  { id: 'ri_essence',  name: 'Essence Flow',   stat: 'essence',          type: MOD.FLAT, ranges: { common:[3,8],   uncommon:[6,16],   rare:[12,32],   epic:[24,64],   legendary:[48,128] } },
  { id: 'ri_soul',     name: 'Soul Resonance', stat: 'soul',             type: MOD.FLAT, ranges: { common:[3,8],   uncommon:[6,16],   rare:[12,32],   epic:[24,64],   legendary:[48,128] } },
  { id: 'ri_body',     name: 'Body Ring',      stat: 'body',             type: MOD.FLAT, ranges: { common:[3,8],   uncommon:[6,16],   rare:[12,32],   epic:[24,64],   legendary:[48,128] } },
  { id: 'ri_phys_dmg', name: 'Striker Band',   stat: 'physical_damage',  type: MOD.FLAT, ranges: { common:[3,8],   uncommon:[6,16],   rare:[12,32],   epic:[24,64],   legendary:[48,128] } },
  { id: 'ri_elem_dmg', name: 'Elemental Ring', stat: 'elemental_damage', type: MOD.FLAT, ranges: { common:[3,8],   uncommon:[6,16],   rare:[12,32],   epic:[24,64],   legendary:[48,128] } },
];

export const AFFIX_POOL_BY_SLOT = {
  weapon: WEAPON_POOL,
  head:   HEAD_POOL,
  body:   BODY_POOL,
  hands:  HANDS_POOL,
  waist:  WAIST_POOL,
  feet:   FEET_POOL,
  neck:   NECK_POOL,
  ring:   RING_POOL,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Roll a single affix value within its rarity range. */
export function rollAffix(entry, rarity) {
  const range = entry.ranges[rarity] ?? entry.ranges.common;
  const [min, max] = range;
  const value = entry.type === MOD.INCREASED
    ? Math.round((min + Math.random() * (max - min)) * 1000) / 1000
    : Math.floor(min + Math.random() * (max - min + 1));
  return { id: entry.id, name: entry.name, stat: entry.stat, type: entry.type, value };
}

/** Pick a random affix from the slot pool, avoiding already-used ids. */
export function pickRandomAffix(slot, rarity, excludeIds = []) {
  const pool = (AFFIX_POOL_BY_SLOT[slot] ?? []).filter(e => !excludeIds.includes(e.id));
  if (!pool.length) return null;
  const entry = pool[Math.floor(Math.random() * pool.length)];
  return rollAffix(entry, rarity);
}

/** Generate a full set of affixes for a slot + rarity combination. */
export function generateAffixes(slot, rarity) {
  const count = AFFIX_SLOT_COUNT[rarity] ?? 2;
  const pool  = AFFIX_POOL_BY_SLOT[slot] ?? [];
  const result   = [];
  const usedIds  = [];
  for (let i = 0; i < count && usedIds.length < pool.length; i++) {
    const available = pool.filter(e => !usedIds.includes(e.id));
    if (!available.length) break;
    const entry = available[Math.floor(Math.random() * available.length)];
    usedIds.push(entry.id);
    result.push(rollAffix(entry, rarity));
  }
  return result;
}

// ─── Law multiplier ranges ────────────────────────────────────────────────────

export const LAW_MULT_RANGES = {
  cultivationSpeedMult: {
    Iron: [0.8, 1.2], Bronze: [0.9, 1.5], Silver: [1.0, 2.0], Gold: [1.2, 2.5], Transcendent: [1.5, 3.0],
  },
  essenceMult: {
    Iron: [0.1, 0.5], Bronze: [0.15, 0.65], Silver: [0.2, 0.85], Gold: [0.30, 1.2], Transcendent: [0.50, 1.8],
  },
  soulMult: {
    Iron: [0.1, 0.5], Bronze: [0.15, 0.65], Silver: [0.2, 0.85], Gold: [0.30, 1.2], Transcendent: [0.50, 1.8],
  },
  bodyMult: {
    Iron: [0.1, 0.5], Bronze: [0.15, 0.65], Silver: [0.2, 0.85], Gold: [0.30, 1.2], Transcendent: [0.50, 1.8],
  },
};

export function rollLawMult(multKey, rarity) {
  const range = LAW_MULT_RANGES[multKey]?.[rarity] ?? [0.2, 0.5];
  const [min, max] = range;
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

// ─── Law passive pool ────────────────────────────────────────────────────────

export const LAW_PASSIVE_POOL = [
  { name: 'Unyielding Spirit',    description: 'Increases DEF by 10% during cultivation.' },
  { name: 'Clear Mind',           description: 'Reduces breakthrough failure chance by 5%.' },
  { name: 'Harmonious Flow',      description: 'Increases cultivation speed by 5% per active artefact slot.' },
  { name: 'Elemental Attunement', description: 'Increases elemental damage by 15%.' },
  { name: 'Body Tempering',       description: 'Body stat gains 10% bonus from body multiplier.' },
  { name: 'Soul Expansion',       description: 'Soul stat gains 10% bonus from soul multiplier.' },
  { name: 'Essence Surge',        description: 'Essence stat gains 10% bonus from essence multiplier.' },
  { name: 'Steady Breath',        description: 'Cultivation is not interrupted when taking damage below 10% of max DEF.' },
  { name: 'Qi Compression',       description: 'Each realm advance increases max HP by 2%.' },
  { name: 'Meridian Widening',    description: 'Cultivation speed increases by 10% for 30s after a realm breakthrough.' },
];

export function pickRandomLawPassive(excludeNames = []) {
  const pool = LAW_PASSIVE_POOL.filter(p => !excludeNames.includes(p.name));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
