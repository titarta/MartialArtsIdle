/**
 * furnace.js — data + pure logic for the Meridian Furnace producer minigame.
 *
 * The furnace is a 3-layer alchemy loop on top of the Spirit Garden:
 *
 *   GARDEN basket  →  send to FURNACE pantry  →
 *
 *   LAYER 1  REFINE      3 plants    + heat  →  1 Material
 *   LAYER 2  COMBINE     3 Materials + heat  →  1 Pill (timed buff)
 *   LAYER 3  TRANSCEND   3 Pills     + heat  →  1 Foundation Pill (permanent)
 *
 * Cauldrons process one cook at a time. Cauldron count starts at 1 (the
 * Meridian Furnace producer unlocks the first one at realm 7) and grows
 * via Eternal Tree Alchemy-branch nodes.
 *
 * Heat is a single shared pool that REGENERATES OVER REAL TIME based on
 * the number of Meridian Furnace producers owned:
 *   regenPerSec = (0.5 + 0.1 × meridianFurnaceCount) / 60
 *   cap         = 30 + 1 × meridianFurnaceCount
 *
 * Pills consumed for timed buffs route into the existing buff slot via
 * useCultivation. Foundation Pills grant SMALL permanent stat bonuses
 * limited to 3 active slots per run; the Eternal Foundation keystone
 * node (future) persists 1 slot across reincarnations.
 *
 * Persistence: single localStorage key `mai_furnace`, VERSION 1.
 *
 * STATUS: v1 STARTING VALUES, not balanced final content. Tune via sim
 * before they leave the prototype.
 */

const KEY = 'mai_furnace';
const VERSION = 1;

// ── Time constants ──────────────────────────────────────────────────────────
const SEC = 1000;
const MIN = 60 * SEC;
const HR  = 60 * MIN;

// ── Tunables (starting values) ──────────────────────────────────────────────

/** Per-realm-7 unlock: the player always has at least 1 cauldron. */
export const DEFAULT_CAULDRONS = 1;

/** Hard maximum, reachable via the Alchemy branch. */
export const MAX_CAULDRONS = 5;

/** Permanent-pill slot cap per life. */
export const FOUNDATION_SLOTS = 3;

/** Heat regen rate per Meridian Furnace owned (units per minute). */
export const HEAT_REGEN_BASE_PER_MIN = 0.5;
export const HEAT_REGEN_PER_FURNACE_PER_MIN = 0.1;

/** Heat reserve cap (base + per-furnace addition). */
export const HEAT_CAP_BASE = 30;
export const HEAT_CAP_PER_FURNACE = 1;

/** Heat quality curve: heat invested → output magnitude multiplier. */
export const HEAT_QUALITY_TIERS = [
  { heat: 0,  mult: 1.0,  label: 'Raw'         },
  { heat: 10, mult: 1.5,  label: 'Tempered'    },
  { heat: 30, mult: 2.0,  label: 'Refined'     },
  { heat: 60, mult: 3.0,  label: 'Peak'        },
];

/** Layer-specific minimums + cook durations. */
export const LAYER_DEF = {
  refine:    { minHeat: 1,  cookMs: 15 * MIN },
  combine:   { minHeat: 10, cookMs: 1 * HR   },
  transcend: { minHeat: 60, cookMs: 6 * HR   },
};

// ── Materials (Layer 1 outputs) ─────────────────────────────────────────────
// Each unlocked plant produces a single named Material when 3 are refined.
// Mixed-plant refines produce a generic "Spirit Sediment" mystery material.

export const MATERIALS = {
  mint_essence:     { id: 'mint_essence',     name: 'Mint Essence',     plant: 'spirit_mint',         color: '#8fc99a' },
  cinnabar_powder:  { id: 'cinnabar_powder',  name: 'Cinnabar Powder',  plant: 'cinnabar_bloom',      color: '#d04a30' },
  jade_tincture:    { id: 'jade_tincture',    name: 'Jade Tincture',    plant: 'jade_lotus_bud',      color: '#5fa67a' },
  moon_dust:        { id: 'moon_dust',        name: 'Moon Dust',        plant: 'moonleaf_vine',       color: '#a8c0d6' },
  dragon_root:      { id: 'dragon_root',      name: 'Dragon Root',      plant: 'dragonscale_ginseng', color: '#c69254' },
  phoenix_ash:      { id: 'phoenix_ash',      name: 'Phoenix Ash',      plant: 'phoenix_tail_grass',  color: '#e25640' },
  // Mystery material from mixed-plant refines (any 3 plants where not all
  // 3 are the same species). Carries no recipe path into Layer 2 — it's a
  // dead-end byproduct unless the player figures out the mixed-pill recipe.
  spirit_sediment:  { id: 'spirit_sediment',  name: 'Spirit Sediment',  plant: null,                  color: '#9b7bc3' },
};

/** Map plant id → its species-specific material id. Mixed plant trios fall
 *  back to 'spirit_sediment'. */
export const PLANT_TO_MATERIAL = {
  spirit_mint:         'mint_essence',
  cinnabar_bloom:      'cinnabar_powder',
  jade_lotus_bud:      'jade_tincture',
  moonleaf_vine:       'moon_dust',
  dragonscale_ginseng: 'dragon_root',
  phoenix_tail_grass:  'phoenix_ash',
};

// ── Pills (Layer 2 outputs) ─────────────────────────────────────────────────
// Each pill is a timed buff. The `effect` field describes what gets boosted
// when the pill is CONSUMED (not when it's brewed). Magnitude scales by
// the heat-quality multiplier locked in at cook time.

export const PILLS = {
  // Pure recipes — one per species material
  verdant_body: {
    id: 'verdant_body',
    name: 'Verdant Body Pill',
    rarity: 'iron',
    effect: { kind: 'qiPerSecMult', baseMagnitude: 0.05, baseDurationMs: 2 * HR },
    desc:   '+5% qi/s for 2 hours (per heat tier, scales).',
  },
  inner_flame: {
    id: 'inner_flame',
    name: 'Inner Flame Pill',
    rarity: 'iron',
    effect: { kind: 'breakthroughDiscount', baseMagnitude: 0.10, baseDurationMs: 0 },
    desc:   'Next breakthrough costs 10% less qi (one-shot).',
  },
  calm_pond: {
    id: 'calm_pond',
    name: 'Calm Pond Pill',
    rarity: 'bronze',
    effect: { kind: 'offlineQiMult', baseMagnitude: 0.10, baseDurationMs: 4 * HR },
    desc:   '+10% offline qi catch-up for 4 hours.',
  },
  frugal_mind: {
    id: 'frugal_mind',
    name: 'Frugal Mind Pill',
    rarity: 'bronze',
    effect: { kind: 'producerCostMult', baseMagnitude: 0.10, baseDurationMs: 0, charges: 10 },
    desc:   'Next 10 producer purchases cost 10% less.',
  },
  rooted_vigor: {
    id: 'rooted_vigor',
    name: 'Rooted Vigor Pill',
    rarity: 'silver',
    effect: { kind: 'karmaGainMult', baseMagnitude: 0.05, baseDurationMs: 4 * HR },
    desc:   '+5% karma gain for 4 hours.',
  },
  phoenix_radiance: {
    id: 'phoenix_radiance',
    name: 'Phoenix Radiance Pill',
    rarity: 'silver',
    effect: { kind: 'qiPerSecMult', baseMagnitude: 0.10, baseDurationMs: 1 * HR },
    desc:   '+10% qi/s for 1 hour. Late-game burn.',
  },
  // Mixed recipes — discovered through experimentation
  spring_flame: {
    id: 'spring_flame',
    name: 'Spring Flame Pill',
    rarity: 'bronze',
    effect: { kind: 'qiPerSecMult', baseMagnitude: 0.04, baseDurationMs: 1 * HR, side: { kind: 'breakthroughDiscount', baseMagnitude: 0.05 } },
    desc:   '+4% qi/s for 1 hour AND 5% off next breakthrough.',
  },
  verdant_tide: {
    id: 'verdant_tide',
    name: 'Verdant Tide Pill',
    rarity: 'bronze',
    effect: { kind: 'qiPerSecMult', baseMagnitude: 0.04, baseDurationMs: 2 * HR, side: { kind: 'offlineQiMult', baseMagnitude: 0.05 } },
    desc:   '+4% qi/s AND +5% offline for 2 hours.',
  },
  trinity: {
    id: 'trinity',
    name: 'Trinity Pill',
    rarity: 'silver',
    effect: { kind: 'qiPerSecMult', baseMagnitude: 0.03, baseDurationMs: 1 * HR, side: { kind: 'breakthroughDiscount', baseMagnitude: 0.03 }, side2: { kind: 'offlineQiMult', baseMagnitude: 0.03 } },
    desc:   '+3% qi/s, +3% BT discount, +3% offline. All-rounder.',
  },
  quiet_tide: {
    id: 'quiet_tide',
    name: 'Quiet Tide Pill',
    rarity: 'silver',
    effect: { kind: 'producerCostMult', baseMagnitude: 0.07, baseDurationMs: 0, charges: 10, side: { kind: 'offlineQiMult', baseMagnitude: 0.05 } },
    desc:   '-7% next 10 producer costs AND +5% offline.',
  },
  // Mystery placeholder used for unknown mixed combos. The actual pill
  // resolved depends on the input set; this entry just exists so the UI
  // can display "??" before the discovery moment.
  mystery: {
    id: 'mystery',
    name: '??? Pill',
    rarity: 'mystery',
    effect: { kind: 'qiPerSecMult', baseMagnitude: 0.02, baseDurationMs: 30 * MIN },
    desc:   'A mysterious pill. Effect revealed on consumption.',
  },
};

// ── Foundation Pills (Layer 3 outputs — permanent) ──────────────────────────
// 3× Layer-2 pill of a single type → 1 Foundation Pill. Foundation Pills
// grant SMALL permanent stat bonuses on consume. Players can only carry 3
// active Foundation effects per run (reset on reincarnation).

export const FOUNDATIONS = {
  foundation_verdant: {
    id: 'foundation_verdant',
    name: 'Foundation Verdant Pill',
    sourcePill: 'verdant_body',
    effect: { kind: 'qiPerSecMult', baseMagnitude: 0.02 }, // permanent +2% qi/s
    desc:   'Permanently +2% qi/s for this life (per heat tier, scales).',
  },
  foundation_crucible: {
    id: 'foundation_crucible',
    name: 'Foundation Crucible Pill',
    sourcePill: 'inner_flame',
    effect: { kind: 'breakthroughDiscount', baseMagnitude: 0.03 }, // permanent -3% BT cost
    desc:   'Permanently -3% breakthrough cost for this life.',
  },
  foundation_tide: {
    id: 'foundation_tide',
    name: 'Foundation Tide Pill',
    sourcePill: 'calm_pond',
    effect: { kind: 'offlineQiMult', baseMagnitude: 0.05 }, // permanent +5% offline
    desc:   'Permanently +5% offline qi catch-up for this life.',
  },
  foundation_frugal: {
    id: 'foundation_frugal',
    name: 'Foundation Frugal Pill',
    sourcePill: 'frugal_mind',
    effect: { kind: 'producerCostMult', baseMagnitude: 0.03 }, // permanent -3% producer costs
    desc:   'Permanently -3% producer purchase cost for this life.',
  },
  foundation_root: {
    id: 'foundation_root',
    name: 'Foundation Root Pill',
    sourcePill: 'rooted_vigor',
    effect: { kind: 'karmaGainMult', baseMagnitude: 0.03 }, // permanent +3% karma
    desc:   'Permanently +3% karma gain for this life.',
  },
  foundation_radiance: {
    id: 'foundation_radiance',
    name: 'Foundation Radiance Pill',
    sourcePill: 'phoenix_radiance',
    effect: { kind: 'qiPerSecMult', baseMagnitude: 0.04 }, // permanent +4% qi/s
    desc:   'Permanently +4% qi/s for this life. Late-game.',
  },
};

/** Map sourcePill → foundation id. Drives the Transcend recipe matcher. */
export const PILL_TO_FOUNDATION = {};
for (const f of Object.values(FOUNDATIONS)) {
  PILL_TO_FOUNDATION[f.sourcePill] = f.id;
}

// ── Recipe matchers ─────────────────────────────────────────────────────────

/** Layer 1: 3 plant ids → a Material id.
 *  Same-species trio → species-specific material.
 *  Mixed → spirit_sediment (the mystery byproduct). */
export function resolveMaterial(plantIds) {
  if (plantIds.length !== 3) return null;
  const allSame = plantIds.every(id => id === plantIds[0]);
  if (allSame) {
    const mid = PLANT_TO_MATERIAL[plantIds[0]];
    return mid ? MATERIALS[mid].id : 'spirit_sediment';
  }
  return 'spirit_sediment';
}

/** Layer 2: 3 material ids → a Pill id.
 *  Pure-trio (3 of same material) → the pure pill bound to that material.
 *  Mixed combos → named mixed pills (Spring Flame, Verdant Tide, Trinity,
 *    Quiet Tide). Unknown mixes → mystery. */
const PURE_MATERIAL_TO_PILL = {
  mint_essence:    'verdant_body',
  cinnabar_powder: 'inner_flame',
  jade_tincture:   'calm_pond',
  moon_dust:       'frugal_mind',
  dragon_root:     'rooted_vigor',
  phoenix_ash:     'phoenix_radiance',
};

// Sorted-tuple keys for mixed recipes. Each key is the 3 material ids
// sorted lexicographically + joined by '|' so order doesn't matter.
function comboKey(ids) {
  return [...ids].sort().join('|');
}
const MIXED_RECIPES = {
  // 2× Mint + 1× Cinnabar → Spring Flame
  [comboKey(['mint_essence','mint_essence','cinnabar_powder'])]: 'spring_flame',
  // 2× Mint + 1× Jade → Verdant Tide
  [comboKey(['mint_essence','mint_essence','jade_tincture'])]:    'verdant_tide',
  // 1× Mint + 1× Cinnabar + 1× Jade → Trinity
  [comboKey(['mint_essence','cinnabar_powder','jade_tincture'])]: 'trinity',
  // 2× Jade + 1× Moon Dust → Quiet Tide
  [comboKey(['jade_tincture','jade_tincture','moon_dust'])]:      'quiet_tide',
};

export function resolvePill(materialIds) {
  if (materialIds.length !== 3) return null;
  const allSame = materialIds.every(id => id === materialIds[0]);
  if (allSame) {
    return PURE_MATERIAL_TO_PILL[materialIds[0]] ?? 'mystery';
  }
  const key = comboKey(materialIds);
  return MIXED_RECIPES[key] ?? 'mystery';
}

/** Layer 3: 3 pill ids → a Foundation id.
 *  Must all be the SAME pill id (no mixed transcends in v1). */
export function resolveFoundation(pillIds) {
  if (pillIds.length !== 3) return null;
  if (!pillIds.every(id => id === pillIds[0])) return null;
  return PILL_TO_FOUNDATION[pillIds[0]] ?? null;
}

// ── Heat helpers ────────────────────────────────────────────────────────────

/** Per-second heat regen rate given the number of Meridian Furnace
 *  producers owned. Units = heat per second. */
export function heatRegenPerSec(furnaceCount = 0) {
  const perMin = HEAT_REGEN_BASE_PER_MIN + HEAT_REGEN_PER_FURNACE_PER_MIN * furnaceCount;
  return perMin / 60;
}

/** Heat cap given furnace count. */
export function heatCap(furnaceCount = 0) {
  return HEAT_CAP_BASE + HEAT_CAP_PER_FURNACE * furnaceCount;
}

/** Resolve a heat investment into its quality multiplier (lookup the
 *  largest tier whose `heat` threshold the investment meets). */
export function heatQualityMult(heatInvested) {
  let mult = HEAT_QUALITY_TIERS[0].mult;
  for (const tier of HEAT_QUALITY_TIERS) {
    if (heatInvested >= tier.heat) mult = tier.mult;
    else break;
  }
  return mult;
}

/** Resolve a heat investment into its tier label ('Raw' / 'Tempered' / etc). */
export function heatQualityLabel(heatInvested) {
  let label = HEAT_QUALITY_TIERS[0].label;
  for (const tier of HEAT_QUALITY_TIERS) {
    if (heatInvested >= tier.heat) label = tier.label;
    else break;
  }
  return label;
}

// ── Persistence ─────────────────────────────────────────────────────────────

/** Cauldron state machine:
 *    idle      = no cook in progress
 *    cooking   = cook in progress; outputId resolved at completion via the
 *                recipe matcher when the timer expires (we store inputs +
 *                heat + finishAt instead of outputId, so save/load is
 *                idempotent and recipe updates propagate to in-flight cooks)
 *
 *  Each cauldron record:
 *    { state, layer, inputs:[plantOrMaterialOrPill ids], heat, finishAt }
 */
export function defaultFurnace() {
  return {
    v: VERSION,
    // Pantry inventories — separate maps per layer-input type.
    plants:    {},  // { plantId: count } — transferred from garden basket
    materials: {},  // { materialId: count }
    pills:     {},  // { pillId: count }
    foundations: [],// up to FOUNDATION_SLOTS active Foundation Pill objects
    // Heat reserve (capped at cap(furnaceCount), regen per tick).
    heat:      0,
    heatTickAt: 0,  // last tick time for offline regen catch-up
    // Cauldrons — array. Slot count grows with ET nodes, but we keep the
    // full array up to MAX_CAULDRONS and only treat the first `cauldronCount`
    // as accessible. Idle cauldrons sit as { state: 'idle' }.
    cauldrons: Array.from({ length: MAX_CAULDRONS }, () => ({ state: 'idle' })),
    // Codex — recipes discovered this life. Set of recipe keys
    // ('layer1:plantA|plantB|plantC' / 'layer2:matA|matB|matC' /
    // 'layer3:pillId'). Used to flag first-discovery in the UI.
    codex:     {},
    // Stats for analytics / achievements.
    stats: { refined: 0, combined: 0, transcended: 0, consumed: 0 },
  };
}

function migrate(data) {
  const base = defaultFurnace();
  const g = { ...base, ...data };
  g.plants    = { ...(data.plants    || {}) };
  g.materials = { ...(data.materials || {}) };
  g.pills     = { ...(data.pills     || {}) };
  g.codex     = { ...(data.codex     || {}) };
  g.stats     = { ...base.stats, ...(data.stats || {}) };
  g.foundations = Array.isArray(data.foundations) ? data.foundations.slice(0, FOUNDATION_SLOTS) : [];
  g.heat      = Number.isFinite(data.heat) ? Math.max(0, data.heat) : 0;
  g.heatTickAt= Number.isFinite(data.heatTickAt) ? data.heatTickAt : Date.now();
  // Reconcile cauldrons against MAX_CAULDRONS.
  const raw = Array.isArray(data.cauldrons) ? data.cauldrons.slice(0, MAX_CAULDRONS) : [];
  while (raw.length < MAX_CAULDRONS) raw.push({ state: 'idle' });
  g.cauldrons = raw.map(c => (c && c.state === 'cooking' && Number.isFinite(c.finishAt))
    ? { state: 'cooking', layer: c.layer, inputs: c.inputs || [], heat: c.heat || 0, finishAt: c.finishAt }
    : { state: 'idle' });
  g.v = VERSION;
  return g;
}

export function loadFurnace() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultFurnace();
    return migrate(JSON.parse(raw));
  } catch {
    return defaultFurnace();
  }
}

export function saveFurnace(g) {
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch {
    /* storage full — non-fatal */
  }
}

// ── Tick (heat regen + cook completion) ─────────────────────────────────────

/** Advance the furnace state by `now`. Applies heat regen and resolves any
 *  completed cooks (each completed cauldron's output goes into the matching
 *  inventory map). Pure: returns { furnace, events } where events is an
 *  array of { kind, payload } the React layer can render toasts for. */
export function tickFurnace(g, furnaceCount = 0, now = Date.now()) {
  const events = [];
  let cur = g;

  // 1. Heat regen catch-up since last tick (offline-safe).
  const elapsedSec = Math.max(0, (now - (cur.heatTickAt || now)) / 1000);
  if (elapsedSec > 0) {
    const cap   = heatCap(furnaceCount);
    const regen = heatRegenPerSec(furnaceCount) * elapsedSec;
    const newHeat = Math.min(cap, (cur.heat || 0) + regen);
    if (newHeat !== cur.heat || cur.heatTickAt !== now) {
      cur = { ...cur, heat: newHeat, heatTickAt: now };
    }
  }

  // 2. Resolve completed cooks.
  const cauldrons = cur.cauldrons.slice();
  let inventoryChanged = false;
  for (let i = 0; i < cauldrons.length; i++) {
    const c = cauldrons[i];
    if (c?.state !== 'cooking' || !(c.finishAt <= now)) continue;
    // Resolve recipe + magnitude based on layer + heat invested.
    let outputId = null, layer = c.layer;
    if (layer === 'refine')         outputId = resolveMaterial(c.inputs);
    else if (layer === 'combine')   outputId = resolvePill(c.inputs);
    else if (layer === 'transcend') outputId = resolveFoundation(c.inputs);
    if (!outputId) {
      // Invalid recipe — refund inputs (this shouldn't happen in practice
      // because resolve* guards at start, but defensively keep the loop
      // safe).
      cauldrons[i] = { state: 'idle' };
      continue;
    }
    // Apply output to inventory.
    if (layer === 'refine') {
      cur = { ...cur, materials: { ...cur.materials, [outputId]: (cur.materials[outputId] || 0) + 1 }, stats: { ...cur.stats, refined: cur.stats.refined + 1 } };
    } else if (layer === 'combine') {
      cur = { ...cur, pills: { ...cur.pills, [outputId]: (cur.pills[outputId] || 0) + 1 }, stats: { ...cur.stats, combined: cur.stats.combined + 1 } };
    } else if (layer === 'transcend') {
      // Foundation Pills are auto-consumed on cook completion — they go
      // straight into the active foundations array (subject to the 3-slot
      // cap). If full, the pill becomes a buffered consumable that the
      // player has to choose to apply / discard via UI.
      if (cur.foundations.length < FOUNDATION_SLOTS) {
        const fdef = FOUNDATIONS[outputId];
        const heatMult = heatQualityMult(c.heat || 0);
        cur = {
          ...cur,
          foundations: [...cur.foundations, {
            id: outputId,
            magnitude: (fdef.effect.baseMagnitude || 0) * heatMult,
            grantedAt: now,
          }],
          stats: { ...cur.stats, transcended: cur.stats.transcended + 1 },
        };
      } else {
        // Slot full — drop the pill onto the shelf as a Foundation Capsule
        // the player can apply later when a slot opens. Store under pills
        // map with a special prefix so it isn't confused with regular pills.
        const capsuleId = `capsule:${outputId}:${c.heat || 0}`;
        cur = { ...cur, pills: { ...cur.pills, [capsuleId]: (cur.pills[capsuleId] || 0) + 1 } };
      }
    }
    events.push({ kind: 'cook-complete', cauldronIdx: i, layer, outputId, heat: c.heat || 0 });
    cauldrons[i] = { state: 'idle' };
    inventoryChanged = true;
  }
  if (inventoryChanged) cur = { ...cur, cauldrons };
  else if (cauldrons.some((c, i) => c !== cur.cauldrons[i])) cur = { ...cur, cauldrons };

  return { furnace: cur, events };
}

// ── Cook actions (Layer 1/2/3) ──────────────────────────────────────────────

function consumeFromBag(bag, id, n) {
  const cur = bag[id] || 0;
  if (cur < n) return null;
  const next = { ...bag };
  if (cur === n) delete next[id];
  else next[id] = cur - n;
  return next;
}

function consumeMultiFromBag(bag, idsWithCount) {
  let cur = { ...bag };
  for (const [id, n] of Object.entries(idsWithCount)) {
    const after = consumeFromBag(cur, id, n);
    if (!after) return null;
    cur = after;
  }
  return cur;
}

function countMap(ids) {
  const out = {};
  for (const id of ids) out[id] = (out[id] || 0) + 1;
  return out;
}

/** Pick the first idle cauldron index, or -1 if none. */
export function nextIdleCauldron(g, cauldronCount = DEFAULT_CAULDRONS) {
  for (let i = 0; i < Math.min(cauldronCount, g.cauldrons.length); i++) {
    if (g.cauldrons[i]?.state === 'idle') return i;
  }
  return -1;
}

/** Start a Layer 1 cook (refine). `plantIds` is an array of exactly 3 plant
 *  ids drawn from the pantry. `heatInvest` is the heat spent. Returns:
 *    { ok, garden } on success / { ok:false, reason } on failure. */
export function startRefine(g, plantIds, heatInvest, cauldronCount = DEFAULT_CAULDRONS, now = Date.now()) {
  if (plantIds.length !== 3) return { ok: false, reason: 'bad-input' };
  if (heatInvest < LAYER_DEF.refine.minHeat) return { ok: false, reason: 'heat-min' };
  if ((g.heat || 0) < heatInvest) return { ok: false, reason: 'heat' };
  const idx = nextIdleCauldron(g, cauldronCount);
  if (idx < 0) return { ok: false, reason: 'cauldron' };
  const need = countMap(plantIds);
  const newPlants = consumeMultiFromBag(g.plants, need);
  if (!newPlants) return { ok: false, reason: 'plant' };
  const cauldrons = g.cauldrons.slice();
  cauldrons[idx] = {
    state:    'cooking',
    layer:    'refine',
    inputs:   plantIds,
    heat:     heatInvest,
    finishAt: now + LAYER_DEF.refine.cookMs,
  };
  return {
    ok: true,
    furnace: {
      ...g,
      plants: newPlants,
      heat:   (g.heat || 0) - heatInvest,
      cauldrons,
    },
  };
}

/** Start a Layer 2 cook (combine). `materialIds` is exactly 3 material ids. */
export function startCombine(g, materialIds, heatInvest, cauldronCount = DEFAULT_CAULDRONS, now = Date.now()) {
  if (materialIds.length !== 3) return { ok: false, reason: 'bad-input' };
  if (heatInvest < LAYER_DEF.combine.minHeat) return { ok: false, reason: 'heat-min' };
  if ((g.heat || 0) < heatInvest) return { ok: false, reason: 'heat' };
  const idx = nextIdleCauldron(g, cauldronCount);
  if (idx < 0) return { ok: false, reason: 'cauldron' };
  const need = countMap(materialIds);
  const newMaterials = consumeMultiFromBag(g.materials, need);
  if (!newMaterials) return { ok: false, reason: 'material' };
  const cauldrons = g.cauldrons.slice();
  cauldrons[idx] = {
    state:    'cooking',
    layer:    'combine',
    inputs:   materialIds,
    heat:     heatInvest,
    finishAt: now + LAYER_DEF.combine.cookMs,
  };
  return {
    ok: true,
    furnace: {
      ...g,
      materials: newMaterials,
      heat:      (g.heat || 0) - heatInvest,
      cauldrons,
    },
  };
}

/** Start a Layer 3 cook (transcend). `pillIds` is exactly 3 of the same
 *  pill id. */
export function startTranscend(g, pillIds, heatInvest, cauldronCount = DEFAULT_CAULDRONS, now = Date.now()) {
  if (pillIds.length !== 3) return { ok: false, reason: 'bad-input' };
  if (heatInvest < LAYER_DEF.transcend.minHeat) return { ok: false, reason: 'heat-min' };
  if ((g.heat || 0) < heatInvest) return { ok: false, reason: 'heat' };
  if (!resolveFoundation(pillIds)) return { ok: false, reason: 'no-foundation' };
  const idx = nextIdleCauldron(g, cauldronCount);
  if (idx < 0) return { ok: false, reason: 'cauldron' };
  const need = countMap(pillIds);
  const newPills = consumeMultiFromBag(g.pills, need);
  if (!newPills) return { ok: false, reason: 'pill' };
  const cauldrons = g.cauldrons.slice();
  cauldrons[idx] = {
    state:    'cooking',
    layer:    'transcend',
    inputs:   pillIds,
    heat:     heatInvest,
    finishAt: now + LAYER_DEF.transcend.cookMs,
  };
  return {
    ok: true,
    furnace: {
      ...g,
      pills: newPills,
      heat:  (g.heat || 0) - heatInvest,
      cauldrons,
    },
  };
}

// ── Pill consumption (timed buff path) ──────────────────────────────────────

/** Consume a Layer 2 Pill. Returns:
 *    { ok, furnace, buff }
 *  where `buff` is the descriptor the React layer routes into the existing
 *  buff slot (same shape as garden elixir buffs). Returns { ok:false } if
 *  the pill isn't in inventory. */
export function consumePill(g, pillId, now = Date.now()) {
  if (!(g.pills[pillId] > 0)) return { ok: false, reason: 'not-owned' };
  const pdef = PILLS[pillId];
  if (!pdef) return { ok: false, reason: 'unknown-pill' };
  const newPills = consumeFromBag(g.pills, pillId, 1);
  const buff = {
    pillId,
    name: pdef.name,
    effect: pdef.effect,
    consumedAt: now,
    expiresAt: pdef.effect.baseDurationMs > 0 ? now + pdef.effect.baseDurationMs : null,
  };
  return {
    ok: true,
    furnace: { ...g, pills: newPills, stats: { ...g.stats, consumed: g.stats.consumed + 1 } },
    buff,
  };
}

// ── Garden basket → furnace pantry transfer ─────────────────────────────────

/** Move all plants in `basketLike` (a map of plantId → count) into the
 *  furnace pantry. Returns the updated furnace. */
export function transferFromBasket(g, basketLike) {
  const plants = { ...g.plants };
  for (const [id, n] of Object.entries(basketLike)) {
    if (n > 0) plants[id] = (plants[id] || 0) + n;
  }
  return { ...g, plants };
}

// ── Foundation effects (resolved against gameplay) ──────────────────────────

/** Aggregate the active Foundation Pill effects into a flat modifier bundle
 *  consumed by useCultivation. Mirrors the shape of tree.modifiers so the
 *  caller can multiply / sum them into the same formulas. */
export function aggregateFoundationMods(g) {
  let qiPerSecMult = 1;
  let breakthroughDiscount = 0;
  let offlineQiMult = 1;
  let producerCostMult = 1;
  let karmaGainMult = 1;
  for (const f of g.foundations || []) {
    const fdef = FOUNDATIONS[f.id];
    if (!fdef) continue;
    const mag = f.magnitude ?? fdef.effect.baseMagnitude;
    switch (fdef.effect.kind) {
      case 'qiPerSecMult':         qiPerSecMult         *= (1 + mag); break;
      case 'breakthroughDiscount': breakthroughDiscount += mag;       break;
      case 'offlineQiMult':        offlineQiMult        *= (1 + mag); break;
      case 'producerCostMult':     producerCostMult     *= (1 - mag); break;
      case 'karmaGainMult':        karmaGainMult        *= (1 + mag); break;
      default: break;
    }
  }
  return { qiPerSecMult, breakthroughDiscount, offlineQiMult, producerCostMult, karmaGainMult };
}
