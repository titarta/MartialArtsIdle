/**
 * curves.js, the Balance Dashboard curve registry.
 *
 * Each entry describes one scaling curve in the game:
 *   - what it scales over (x), what it produces (y),
 *   - the tunable formula `fn(x, params)` whose DEFAULT params reproduce the
 *     live game value exactly,
 *   - a `baseline(x)` that calls the REAL exported game function/data so the
 *     chart always shows ground truth and can never silently drift,
 *   - how a tuned result is applied back (`apply`): a per-domain override
 *     patch (live on reload) or a copy-paste constants snippet.
 *
 * Adding coverage = adding one entry here. Nothing else needs to change.
 *
 * IMPORTANT: this module is dev-only (mounted on ?balance). It imports the
 * pure named exports from the game's data/hooks modules, never the hooks
 * themselves, so it has no runtime side effects on the player app.
 */

import REALMS, {
  REALMS_RAW,
  COST_STEEPNESS,
  getMajorBreakthroughRate,
  isMajorTransition,
  MAJOR_BREAKTHROUGH_BASE_PCT,
  MAJOR_BREAKTHROUGH_DECAY,
} from '../data/realms';
import {
  getRequiredRefinedQi,
  getCrystalQiMult,
  MAX_CRYSTAL_LEVEL,
  CRYSTAL_MULT_PER_LEVEL,
} from '../hooks/useQiCrystal';
import { qiForKarma, KARMA_QI_SCALE } from '../hooks/useReincarnationKarma';
import PRODUCERS from '../data/producers';
import { UPGRADES_BY_ID } from '../data/upgrades';
import { NODES } from '../data/reincarnationTree';
import { SHOP_ITEMS } from '../data/shopItems';
import { QI_SPARK_BY_ID } from '../data/qiSparks';

// ── shared helpers ───────────────────────────────────────────────────────────

/** Round to ~2 significant figures the same way getRequiredRefinedQi does. */
function round2sig(raw) {
  if (raw <= 0) return 0;
  const step = Math.pow(10, Math.max(1, Math.floor(Math.log10(raw)) - 1));
  return Math.round(raw / step) * step;
}

// Precompute the major-realm transitions so the qi/s gate curve can index by
// "major transition ordinal" (0..N) and know each one's next-realm cost.
const MAJOR_GATES = [];
for (let i = 0; i < REALMS.length - 1; i++) {
  if (isMajorTransition(i)) {
    MAJOR_GATES.push({
      ord:      MAJOR_GATES.length,
      fromIndex: i,
      label:    `${REALMS[i].name} → ${REALMS[i + 1].name}`,
      nextCost: REALMS[i + 1].cost,
    });
  }
}

// ── phase-2 data (read live from the imported modules, no drift) ────────────

const MECHANIC_DEFS = [
  { id: 'crystal_click',     label: 'Crystal Reservoir' },
  { id: 'consecutive_focus', label: 'Consecutive Focus' },
  { id: 'divine_qi',         label: 'Divine Qi' },
  { id: 'pattern_click',     label: 'Tracing Meridians' },
];
/** Mechanic-tier upgrade cost table { 2..5 } per mechanic, from UPGRADES. */
const mechCostTable = (mid) => {
  const t = {};
  for (let tier = 2; tier <= 5; tier++) t[tier] = UPGRADES_BY_ID[`u_${mid}_t${tier}`]?.cost ?? 0;
  return t;
};
/** A spark-card field per tier (1..5) for a mechanic, from QI_SPARK_BY_ID. */
const mechField = (mid, field) => {
  const t = {};
  for (let tier = 1; tier <= 5; tier++) t[tier] = QI_SPARK_BY_ID[`${mid}_t${tier}`]?.[field] ?? 0;
  return t;
};
const CRYSTAL_RATE = mechField('crystal_click', 'rate');
const DIVINE_BURST = mechField('divine_qi', 'burstSeconds');
/** Consecutive Focus CUMULATIVE qi/s bonus (%) through each tier threshold. */
const CF_CUMULATIVE = (() => {
  const t = {}; let sum = 0;
  for (let tier = 1; tier <= 5; tier++) {
    sum += QI_SPARK_BY_ID[`consecutive_focus_t${tier}`]?.bonus ?? 0;
    t[tier] = Math.round(sum * 100);
  }
  return t;
})();

const TREE_NODE_IDS = NODES.map(n => n.id);
const TREE_COST     = NODES.map(n => n.cost);

// Blood Lotus gameplay items (exclude the flat-priced cosmetic particles).
const SHOP_GAMEPLAY = SHOP_ITEMS.filter(it => it.category !== 'cosmetic');

// ── fit helpers: derive baseline-pass defaults from hand-tuned data ───────────
// Many game values (producer start cost/output, mechanic costs) are hand-tuned
// with no governing formula. These pick the geometric / linear formula whose
// defaults best track the real data, so a curve can offer a "baseline pass"
// (tune the formula) and then per-point fine-tuning on top.
const geomFit = (first, last, steps) =>
  ({ base: first, ratio: steps > 0 && first > 0 ? Math.pow(last / first, 1 / steps) : 1 });
const linFit = (first, last, steps) =>
  ({ base: first, slope: steps > 0 ? (last - first) / steps : 0 });

const PROD_COST = PRODUCERS.map(p => p.startCost);
const PROD_OUT  = PRODUCERS.map(p => p.startQiPerSec);
const COST_FIT  = geomFit(PROD_COST[0], PROD_COST[PROD_COST.length - 1], PROD_COST.length - 1);
const OUT_FIT   = geomFit(PROD_OUT[0],  PROD_OUT[PROD_OUT.length - 1],  PROD_OUT.length - 1);
const CR_FIT    = linFit(CRYSTAL_RATE[1], CRYSTAL_RATE[5], 4);
const DB_FIT    = linFit(DIVINE_BURST[1], DIVINE_BURST[5], 4);
const CF_FIT    = linFit(CF_CUMULATIVE[1], CF_CUMULATIVE[5], 4);

// ── the registry ─────────────────────────────────────────────────────────────

export const CURVES = [

  // ══ Realms ══════════════════════════════════════════════════════════════
  {
    id: 'realm_cost',
    group: 'Realms',
    label: 'Breakthrough qi cost',
    blurb: 'Qi required to advance one stage. Base table × COST_STEEPNESS^index. ' +
           'Drag a point to override a single stage (live via realms.override.json); ' +
           'tune steepness to reshape the whole curve (snippet).',
    x: { label: 'Realm stage index', from: 0, to: REALMS.length - 1, step: 1 },
    y: { label: 'Qi cost', log: true },
    paramsSpec: [
      { key: 'steepness', label: 'COST_STEEPNESS', value: COST_STEEPNESS, min: 1.0, max: 1.03, step: 0.001 },
    ],
    fn: (i, p) => Math.round((REALMS_RAW[i]?.cost ?? 0) * Math.pow(p.steepness, i)),
    baseline: (i) => REALMS[i]?.cost ?? 0,
    pointLabel: (i) => `${REALMS[i]?.name ?? '?'} · ${REALMS[i]?.stage ?? ''}`,
    apply: { kind: 'override', domain: 'realms', byIndex: true, field: 'cost', target: 'src/data/realms.js' },
  },

  {
    id: 'major_gate',
    group: 'Realms',
    label: 'Major-realm qi/s gate',
    blurb: 'Minimum sustained qi/s to clear a major-realm transition. ' +
           '= next-realm cost × basePct × decay^ordinal. Tunable via the two consts (snippet).',
    x: { label: 'Major transition #', from: 0, to: Math.max(0, MAJOR_GATES.length - 1), step: 1 },
    y: { label: 'Required qi/s', log: true },
    paramsSpec: [
      { key: 'basePct', label: 'BASE_PCT', value: MAJOR_BREAKTHROUGH_BASE_PCT, min: 0.0005, max: 0.01, step: 0.0005 },
      { key: 'decay',   label: 'DECAY',    value: MAJOR_BREAKTHROUGH_DECAY,    min: 0.5,    max: 1.0,  step: 0.01 },
    ],
    fn: (ord, p) => (MAJOR_GATES[ord]?.nextCost ?? 0) * p.basePct * Math.pow(p.decay, ord),
    baseline: (ord) => getMajorBreakthroughRate(MAJOR_GATES[ord]?.fromIndex ?? -1),
    pointLabel: (ord) => MAJOR_GATES[ord]?.label ?? `#${ord}`,
    apply: { kind: 'snippet', target: 'src/data/realms.js' },
  },

  // ══ Producers ═══════════════════════════════════════════════════════════
  {
    id: 'producer_cost',
    group: 'Producers',
    label: 'Producer purchase cost',
    blurb: 'Qi to buy the NEXT unit at a given owned count = startCost × costScaling^owned.',
    x: { label: 'Owned', from: 0, to: 150, step: 1 },
    y: { label: 'Qi cost (next unit)', log: true },
    paramsSpec: [
      { key: 'startCost', label: 'startCost', step: 1 },
      { key: 'scaling',   label: 'costScaling', min: 1.01, max: 1.6, step: 0.005 },
    ],
    fn: (o, p) => Math.ceil(p.startCost * Math.pow(p.scaling, o)),
    variants: PRODUCERS.map(p => ({
      id: p.id,
      label: p.name,
      params: { startCost: p.startCost, scaling: p.costScaling },
      baseline: (o) => Math.ceil(p.startCost * Math.pow(p.costScaling, o)),
    })),
    apply: { kind: 'snippet', target: 'src/data/producers.js' },
  },

  {
    id: 'producer_output',
    group: 'Producers',
    label: 'Producer qi/s output',
    blurb: 'Base qi/s contributed at a given owned count = owned × startQiPerSec ' +
           '(before upgrade / spark / tree multipliers).',
    x: { label: 'Owned', from: 0, to: 150, step: 1 },
    y: { label: 'Base qi/s', log: true },
    paramsSpec: [
      { key: 'perUnit', label: 'startQiPerSec', step: 0.1 },
    ],
    fn: (o, p) => o * p.perUnit,
    variants: PRODUCERS.map(p => ({
      id: p.id,
      label: p.name,
      params: { perUnit: p.startQiPerSec },
      baseline: (o) => o * p.startQiPerSec,
    })),
    apply: { kind: 'snippet', target: 'src/data/producers.js' },
  },

  {
    id: 'producer_base_cost',
    group: 'Producers',
    label: 'Producer base cost (per tier)',
    blurb: 'startCost of each producer across the 10 tiers. The game hand-tunes these (no formula), ' +
           'so tune the geometric base/ratio for a baseline pass, then fine-tune per producer (drag or type).',
    x: { label: 'Producer tier', from: 0, to: PRODUCERS.length - 1, step: 1 },
    y: { label: 'startCost', log: true },
    approx: true,
    paramsSpec: [
      { key: 'base',  label: 'tier-0 cost', value: COST_FIT.base,  step: 1 },
      { key: 'ratio', label: '× per tier',  value: COST_FIT.ratio, min: 1.5, max: 30, step: 0.1 },
    ],
    fn: (i, p) => Math.round(p.base * Math.pow(p.ratio, i)),
    baseline: (i) => PROD_COST[i] ?? 0,
    pointLabel: (i) => PRODUCERS[i]?.name ?? `#${i}`,
    apply: { kind: 'snippet', target: 'src/data/producers.js (startCost)' },
  },
  {
    id: 'producer_base_output',
    group: 'Producers',
    label: 'Producer base output (per tier)',
    blurb: 'startQiPerSec of each producer across the 10 tiers. Hand-tuned in the game; set the ' +
           'geometric base/ratio for a baseline pass, then fine-tune per producer (drag or type).',
    x: { label: 'Producer tier', from: 0, to: PRODUCERS.length - 1, step: 1 },
    y: { label: 'startQiPerSec', log: true },
    approx: true,
    paramsSpec: [
      { key: 'base',  label: 'tier-0 qi/s', value: OUT_FIT.base,  step: 0.1 },
      { key: 'ratio', label: '× per tier',  value: OUT_FIT.ratio, min: 1.5, max: 20, step: 0.1 },
    ],
    fn: (i, p) => p.base * Math.pow(p.ratio, i),
    baseline: (i) => PROD_OUT[i] ?? 0,
    pointLabel: (i) => PRODUCERS[i]?.name ?? `#${i}`,
    apply: { kind: 'snippet', target: 'src/data/producers.js (startQiPerSec)' },
  },

  // ══ Qi Crystal ══════════════════════════════════════════════════════════
  {
    id: 'crystal_cost',
    group: 'Qi Crystal',
    label: 'Crystal refine cost',
    blurb: 'Refined qi to reach a crystal level = round2sig((cubic·n³ + quart·n⁴) × (1 + (n/lateBase)^lateExp)).',
    x: { label: 'Crystal level', from: 1, to: 100, step: 1 },
    y: { label: 'Qi', log: true },
    paramsSpec: [
      { key: 'cubic',    label: 'n³ coeff', value: 10, step: 1 },
      { key: 'quart',    label: 'n⁴ coeff', value: 2,  step: 1 },
      { key: 'lateBase', label: 'late base', value: 40, step: 1 },
      { key: 'lateExp',  label: 'late exp',  value: 4,  step: 1 },
    ],
    fn: (n, p) => round2sig((p.cubic * n ** 3 + p.quart * n ** 4) * (1 + Math.pow(n / p.lateBase, p.lateExp))),
    baseline: (n) => getRequiredRefinedQi(n),
    apply: { kind: 'snippet', target: 'src/hooks/useQiCrystal.js' },
  },

  {
    id: 'crystal_mult',
    group: 'Qi Crystal',
    label: 'Crystal qi multiplier',
    blurb: 'Cultivation-rate multiplier from the crystal = 1 + min(level, cap) × perLevel (linear, capped).',
    x: { label: 'Crystal level', from: 1, to: 100, step: 1 },
    y: { label: '× multiplier', log: false },
    paramsSpec: [
      { key: 'perLevel', label: 'mult / level', value: CRYSTAL_MULT_PER_LEVEL, min: 0, max: 0.05, step: 0.001 },
      { key: 'cap',      label: 'level cap',     value: MAX_CRYSTAL_LEVEL, step: 1 },
    ],
    fn: (n, p) => 1 + Math.min(n, p.cap) * p.perLevel,
    baseline: (n) => getCrystalQiMult(n),
    apply: { kind: 'snippet', target: 'src/hooks/useQiCrystal.js' },
  },

  // ══ Reincarnation ═══════════════════════════════════════════════════════
  {
    id: 'karma_qi',
    group: 'Reincarnation',
    label: 'Qi to reach karma k',
    blurb: 'Cumulative all-time qi needed to have earned k karma = k³ × KARMA_QI_SCALE ' +
           '(inverse of karma = floor(cbrt(Q / SCALE))).',
    x: { label: 'Karma k', from: 1, to: 60, step: 1 },
    y: { label: 'Cumulative qi', log: true },
    paramsSpec: [
      { key: 'scale', label: 'KARMA_QI_SCALE', value: KARMA_QI_SCALE, step: 1e6 },
    ],
    fn: (k, p) => Math.pow(k, 3) * p.scale,
    baseline: (k) => qiForKarma(k),
    apply: { kind: 'snippet', target: 'src/hooks/useReincarnationKarma.js' },
  },

  // ══ Upgrades ════════════════════════════════════════════════════════════
  {
    id: 'crystal_tap_cost',
    group: 'Upgrades',
    label: 'Crystal-tap upgrade cost',
    blurb: 'Refined Tap I-V cost ramp = base × ratio^(tier-1).',
    x: { label: 'Tap tier', from: 1, to: 5, step: 1 },
    y: { label: 'Qi cost', log: true },
    paramsSpec: [
      { key: 'base',  label: 'base (T1)', value: 500, step: 50 },
      { key: 'ratio', label: '× per tier', value: 8, min: 2, max: 16, step: 0.5 },
    ],
    fn: (t, p) => Math.round(p.base * Math.pow(p.ratio, t - 1)),
    baseline: (t) => [0, 500, 4000, 32000, 256000, 2048000][t] ?? 0,
    apply: { kind: 'snippet', target: 'src/data/upgrades.js' },
  },

  {
    id: 'offline_rate',
    group: 'Offline',
    label: 'Offline qi rate',
    blurb: 'Fraction of live qi/s accrued while away = base + perTier × upgrades owned (0-4).',
    x: { label: 'Idle Cultivation tier', from: 0, to: 4, step: 1 },
    y: { label: 'Offline rate', log: false },
    paramsSpec: [
      { key: 'base',    label: 'base rate', value: 0.20, min: 0, max: 1, step: 0.01 },
      { key: 'perTier', label: '+ per tier', value: 0.05, min: 0, max: 0.25, step: 0.01 },
    ],
    fn: (t, p) => p.base + p.perTier * t,
    baseline: (t) => 0.20 + 0.05 * t,
    apply: { kind: 'snippet', target: 'src/data/upgrades.js (add) + src/hooks/useCultivation.js (base)' },
  },

  {
    id: 'offline_cap',
    group: 'Offline',
    label: 'Offline cap (hours)',
    blurb: 'Max offline accrual window = base + perTier × Deeper Slumber tiers owned (0-4).',
    x: { label: 'Deeper Slumber tier', from: 0, to: 4, step: 1 },
    y: { label: 'Hours', log: false },
    paramsSpec: [
      { key: 'base',    label: 'base hours', value: 8, step: 1 },
      { key: 'perTier', label: '+ hours/tier', value: 4, step: 1 },
    ],
    fn: (t, p) => p.base + p.perTier * t,
    baseline: (t) => 8 + 4 * t,
    apply: { kind: 'snippet', target: 'src/data/upgrades.js (addHours) + src/systems/autoFarm.js (base)' },
  },

  // ══ Mechanics (hand-tuned tables, point-tune directly) ═══════════════════
  {
    id: 'mechanic_cost',
    group: 'Mechanics',
    label: 'Mechanic upgrade cost',
    blurb: 'Qi to buy each mechanic tier (T2-T5; T1 is granted by crystal evolution). Pick a mechanic, ' +
           'tune the geometric base/ratio for a baseline pass, then fine-tune a tier (drag or type).',
    x: { label: 'Tier', from: 2, to: 5, step: 1 },
    y: { label: 'Qi cost', log: true },
    approx: true,
    paramsSpec: [
      { key: 'base',  label: 'T2 cost', step: 1000 },
      { key: 'ratio', label: '× per tier', min: 2, max: 16, step: 0.1 },
    ],
    fn: (tier, p) => Math.round(p.base * Math.pow(p.ratio, tier - 2)),
    variants: MECHANIC_DEFS.map(m => {
      const tbl = mechCostTable(m.id);
      return {
        id: m.id, label: m.label,
        params: { base: tbl[2], ratio: geomFit(tbl[2], tbl[5], 3).ratio },
        baseline: (t) => tbl[t] ?? 0,
      };
    }),
    pointLabel: (t) => `Tier ${t}`,
    apply: { kind: 'snippet', target: 'src/data/upgrades.js (MECHANIC_TIER_CONFIG)' },
  },
  {
    id: 'crystal_reservoir_rate',
    group: 'Mechanics',
    label: 'Crystal Reservoir fill rate',
    blurb: 'Fraction of your qi/s the reservoir stockpiles, per crystal_click tier.',
    x: { label: 'Tier', from: 1, to: 5, step: 1 },
    y: { label: 'rate (× qi/s)', log: false },
    approx: true,
    paramsSpec: [
      { key: 'base',  label: 'T1 rate',    value: CR_FIT.base,  min: 0, max: 1,   step: 0.05 },
      { key: 'slope', label: '+ per tier', value: CR_FIT.slope, min: 0, max: 0.5, step: 0.01 },
    ],
    fn: (t, p) => p.base + p.slope * (t - 1),
    baseline: (t) => CRYSTAL_RATE[t] ?? 0,
    pointLabel: (t) => `Tier ${t}`,
    apply: { kind: 'snippet', target: 'src/data/qiSparks.js (crystal_click_t*)' },
  },
  {
    id: 'divine_qi_burst',
    group: 'Mechanics',
    label: 'Divine Qi burst',
    blurb: 'Seconds of qi/s granted by collecting a Divine Qi orb, per tier.',
    x: { label: 'Tier', from: 1, to: 5, step: 1 },
    y: { label: 'burst (s of qi/s)', log: false },
    approx: true,
    paramsSpec: [
      { key: 'base',  label: 'T1 burst',   value: DB_FIT.base,  step: 1 },
      { key: 'slope', label: '+ per tier', value: DB_FIT.slope, step: 1 },
    ],
    fn: (t, p) => p.base + p.slope * (t - 1),
    baseline: (t) => DIVINE_BURST[t] ?? 0,
    pointLabel: (t) => `Tier ${t}`,
    apply: { kind: 'snippet', target: 'src/data/qiSparks.js (divine_qi_t*)' },
  },
  {
    id: 'consecutive_focus_bonus',
    group: 'Mechanics',
    label: 'Consecutive Focus bonus',
    blurb: 'Cumulative qi/s bonus (%) once you hold Focus through each tier threshold.',
    x: { label: 'Tier', from: 1, to: 5, step: 1 },
    y: { label: 'cumulative qi/s %', log: false },
    approx: true,
    paramsSpec: [
      { key: 'base',  label: 'T1 bonus %',  value: CF_FIT.base,  step: 1 },
      { key: 'slope', label: '+ per tier',  value: CF_FIT.slope, step: 1 },
    ],
    fn: (t, p) => p.base + p.slope * (t - 1),
    baseline: (t) => CF_CUMULATIVE[t] ?? 0,
    pointLabel: (t) => `Tier ${t}`,
    apply: { kind: 'snippet', target: 'src/data/qiSparks.js (consecutive_focus_t*)' },
  },

  // ══ Reincarnation, Eternal Tree (override-backed, live on reload) ════════
  {
    id: 'tree_node_cost',
    group: 'Reincarnation',
    label: 'Eternal Tree node cost',
    blurb: 'Karma to unlock each Eternal Tree node. Override-backed: drag a node to retune ' +
           '(live via reincarnationTree.override.json).',
    x: { label: 'Node index', from: 0, to: Math.max(0, TREE_COST.length - 1), step: 1 },
    y: { label: 'Karma', log: false },
    paramsSpec: [],
    fn: (i) => TREE_COST[i] ?? 0,
    baseline: (i) => TREE_COST[i] ?? 0,
    pointLabel: (i) => NODES[i]?.label ?? `#${i}`,
    apply: { kind: 'override', domain: 'reincarnationTree', keys: TREE_NODE_IDS, field: 'cost', target: 'src/data/reincarnationTree.js' },
  },

  // ══ Shop ═════════════════════════════════════════════════════════════════
  {
    id: 'shop_price',
    group: 'Shop',
    label: 'Blood Lotus price',
    blurb: 'Blood Lotus cost of each gameplay shop item (cosmetics excluded).',
    x: { label: 'Item', from: 0, to: Math.max(0, SHOP_GAMEPLAY.length - 1), step: 1 },
    y: { label: 'Blood Lotus', log: false },
    paramsSpec: [],
    fn: (i) => SHOP_GAMEPLAY[i]?.cost ?? 0,
    baseline: (i) => SHOP_GAMEPLAY[i]?.cost ?? 0,
    pointLabel: (i) => SHOP_GAMEPLAY[i]?.name ?? `#${i}`,
    apply: { kind: 'snippet', target: 'src/data/shopItems.js' },
  },
];

// ── derived helpers consumed by the dashboard ────────────────────────────────

/** Default editable param object for a curve (or one of its variants). */
export function defaultParams(curve, variant) {
  if (variant) return { ...variant.params };
  const out = {};
  for (const s of curve.paramsSpec) out[s.key] = s.value;
  return out;
}

/** The ground-truth function for a curve (variant-aware). */
export function baselineFn(curve, variant) {
  return variant ? variant.baseline : curve.baseline;
}

/** Integer x samples across a curve's domain. */
export function sampleXs(curve) {
  const { from, to, step } = curve.x;
  const xs = [];
  for (let x = from; x <= to; x += step) xs.push(x);
  return xs;
}

/** Curves grouped by `group`, preserving registry order. */
export function groupedCurves() {
  const groups = [];
  const byName = new Map();
  for (const c of CURVES) {
    if (!byName.has(c.group)) {
      const g = { name: c.group, curves: [] };
      byName.set(c.group, g);
      groups.push(g);
    }
    byName.get(c.group).curves.push(c);
  }
  return groups;
}

/**
 * Dev sanity check: a curve's default params must reproduce its baseline.
 * Returns the list of {id, x, fn, base} mismatches (empty = all good).
 * Pure-formula curves should be exact; rounding-heavy ones use a small
 * relative tolerance.
 */
export const CURVE_COUNTS = {
  total:  CURVES.length,
  exact:  CURVES.filter(c => !c.approx).length,
  approx: CURVES.filter(c =>  c.approx).length,
};

export function auditCurves(tol = 1e-6) {
  const issues = [];
  for (const curve of CURVES) {
    if (curve.approx) continue; // fitted-baseline curves intentionally approximate hand-tuned data
    const variants = curve.variants ?? [null];
    for (const variant of variants) {
      const params = defaultParams(curve, variant);
      const base = baselineFn(curve, variant);
      for (const x of sampleXs(curve)) {
        const a = curve.fn(x, params);
        const b = base(x);
        const denom = Math.max(1, Math.abs(b));
        if (Math.abs(a - b) / denom > tol) {
          issues.push({ id: curve.id, variant: variant?.id ?? null, x, fn: a, base: b });
        }
      }
    }
  }
  return issues;
}
