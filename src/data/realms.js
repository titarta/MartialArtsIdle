/**
 * Cultivation realms based on Martial Peak, with sub-stages.
 * Each entry is one breakthrough step. Costs are in qi.
 *
 * Designer overrides: per-index patches live in src/data/config/realms.override.json.
 * Realm identity is its position in this array (indices are save-file state), so
 * the designer panel only edits existing entries — no insert/remove/reorder.
 */
import { mergeArrayByIndex } from './config/loader';

export const REALMS_RAW = [
  // 2026-05-21 rebalance — Dial-3 v4 progressive steepening from Saint Early
  // (realm 24) onward. Designed to create natural rebirth-loop walls every
  // ~7 realms so players cycle through 4-5 reincarnations before entering
  // Open Heaven. Past realm 35 the curve deliberately FLATTENS so the
  // accumulated Eternal Tree mult pulls the player through into the OH
  // plateau, which is the "infinite endgame" zone where future content
  // (sprite-tier bonuses, click mini-games, OH L7+) lands.
  //
  // 2026-05-18 prior rebalance — crystal multiplier bumped to +1%/lvl (was
  // +0.3%). Every cost from Qi Transformation onwards is scaled ×4 from the
  // prior table. Tempered Body untouched — early game stays brisk.
  // Audit: `scripts/sim-multilife.mjs` should land at 4-5 rebirths reaching
  // Emperor 1st / OH L1 at hardcore pacing.
  // ── Tempered Body (10 Layers) — 2026-05-21 Dial-8 ──────────────────────────
  //    Costs bumped ×2 from the original onboarding values. Playtest showed
  //    the player hitting first major BT in ~5 min with crystal still at L5
  //    — they didn't have enough breathing room in TB to explore producers
  //    + refine crystal to T2 (L10 = Crystal Reservoir unlock). Doubling TB
  //    cumulative (16K → 32K) gives ~10 min in the first realm so the player
  //    can naturally invest in BOTH producers and crystal, and the L10 / T2
  //    unlock lands around or just after the first major BT.
  { name: 'Tempered Body',    stage: 'Layer 1',      cost: 100 },
  { name: 'Tempered Body',    stage: 'Layer 2',      cost: 200 },
  { name: 'Tempered Body',    stage: 'Layer 3',      cost: 350 },
  { name: 'Tempered Body',    stage: 'Layer 4',      cost: 600 },
  { name: 'Tempered Body',    stage: 'Layer 5',      cost: 1_000 },
  { name: 'Tempered Body',    stage: 'Layer 6',      cost: 1_700 },
  { name: 'Tempered Body',    stage: 'Layer 7',      cost: 2_800 },
  { name: 'Tempered Body',    stage: 'Layer 8',      cost: 4_800 },
  { name: 'Tempered Body',    stage: 'Layer 9',      cost: 8_000 },
  { name: 'Tempered Body',    stage: 'Layer 10',     cost: 13_000 },

  // ── Qi Transformation (4 Stages) ───────────────────────────────────────────
  //    QT Early bumped ×1.3 too (150K → 200K) so the first major BT moment
  //    is a slightly bigger achievement — and the player has time during
  //    QT Early to push crystal across the L10 threshold if they didn't
  //    make it during TB.
  { name: 'Qi Transformation', stage: 'Early Stage',  cost: 200_000 },
  { name: 'Qi Transformation', stage: 'Middle Stage', cost: 305_000 },
  { name: 'Qi Transformation', stage: 'Late Stage',   cost: 570_000 },
  { name: 'Qi Transformation', stage: 'Peak Stage',   cost: 1_000_000 },

  // ── True Element (4 Stages) ────────────────────────────────────────────────
  { name: 'True Element',      stage: 'Early Stage',  cost: 1_650_000 },
  { name: 'True Element',      stage: 'Middle Stage', cost: 3_100_000 },
  { name: 'True Element',      stage: 'Late Stage',   cost: 5_700_000 },
  { name: 'True Element',      stage: 'Peak Stage',   cost: 10_500_000 },

  // ════════════════════════════════════════════════════════════════════════
  // 2026-06-08: UNIFORM 4-STAGE RESTRUCTURE.
  // Every realm from Separation & Reunion through Emperor Realm now has 4
  // stages (Early/Middle/Late/Peak), matching Qi Transformation & True
  // Element. The Peak stage was inserted at each realm's existing per-stage
  // growth ratio, so the progression RATE is unchanged but the ladder is 9
  // rungs longer, raising the final cost ~147x. The late game + Open Heaven
  // are now a multi-reincarnation wall by design. Costs at ~3 significant
  // figures; fine-tune via the ?balance dashboard.
  // ════════════════════════════════════════════════════════════════════════

  // Separation & Reunion (4 Stages)
  { name: 'Separation & Reunion', stage: 'Early Stage',  cost: 18_000_000 },
  { name: 'Separation & Reunion', stage: 'Middle Stage', cost: 30_500_000 },
  { name: 'Separation & Reunion', stage: 'Late Stage',   cost: 55_000_000 },
  { name: 'Separation & Reunion', stage: 'Peak Stage',   cost: 96_100_000 },

  // Immortal Ascension (4 Stages)
  { name: 'Immortal Ascension', stage: 'Early Stage',  cost: 166_000_000 },
  { name: 'Immortal Ascension', stage: 'Middle Stage', cost: 288_000_000 },
  { name: 'Immortal Ascension', stage: 'Late Stage',   cost: 524_000_000 },
  { name: 'Immortal Ascension', stage: 'Peak Stage',   cost: 932_000_000 },

  // Saint (4 Stages)
  { name: 'Saint',              stage: 'Early Stage',  cost: 2_020_000_000 },
  { name: 'Saint',              stage: 'Middle Stage', cost: 4_350_000_000 },
  { name: 'Saint',              stage: 'Late Stage',   cost: 9_320_000_000 },
  { name: 'Saint',              stage: 'Peak Stage',   cost: 20_000_000_000 },

  // Saint King (4 Stages)
  { name: 'Saint King',         stage: 'Early Stage',  cost: 42_700_000_000 },
  { name: 'Saint King',         stage: 'Middle Stage', cost: 86_800_000_000 },
  { name: 'Saint King',         stage: 'Late Stage',   cost: 180_000_000_000 },
  { name: 'Saint King',         stage: 'Peak Stage',   cost: 370_000_000_000 },

  // Origin Returning (4 Stages)
  { name: 'Origin Returning',   stage: 'Early Stage',  cost: 685_000_000_000 },
  { name: 'Origin Returning',   stage: 'Middle Stage', cost: 1_300_000_000_000 },
  { name: 'Origin Returning',   stage: 'Late Stage',   cost: 2_400_000_000_000 },
  { name: 'Origin Returning',   stage: 'Peak Stage',   cost: 4_490_000_000_000 },

  // Origin King (4 Stages)
  { name: 'Origin King',        stage: 'Early Stage',  cost: 8_210_000_000_000 },
  { name: 'Origin King',        stage: 'Middle Stage', cost: 14_400_000_000_000 },
  { name: 'Origin King',        stage: 'Late Stage',   cost: 25_600_000_000_000 },
  { name: 'Origin King',        stage: 'Peak Stage',   cost: 45_300_000_000_000 },

  // Void King (4 Stages)
  { name: 'Void King',          stage: 'Early Stage',  cost: 69_100_000_000_000 },
  { name: 'Void King',          stage: 'Middle Stage', cost: 105_000_000_000_000 },
  { name: 'Void King',          stage: 'Late Stage',   cost: 156_000_000_000_000 },
  { name: 'Void King',          stage: 'Peak Stage',   cost: 234_000_000_000_000 },

  // Dao Source (4 Stages)
  { name: 'Dao Source',         stage: 'Early Stage',  cost: 357_000_000_000_000 },
  { name: 'Dao Source',         stage: 'Middle Stage', cost: 500_000_000_000_000 },
  { name: 'Dao Source',         stage: 'Late Stage',   cost: 708_000_000_000_000 },
  { name: 'Dao Source',         stage: 'Peak Stage',   cost: 997_000_000_000_000 },

  // Emperor Realm (4 Stages)
  { name: 'Emperor Realm',      stage: 'Early Stage',  cost: 1_460_000_000_000_000 },
  { name: 'Emperor Realm',      stage: 'Middle Stage', cost: 2_300_000_000_000_000 },
  { name: 'Emperor Realm',      stage: 'Late Stage',   cost: 3_450_000_000_000_000 },
  { name: 'Emperor Realm',      stage: 'Peak Stage',   cost: 5_310_000_000_000_000 },

  // Open Heaven (6 Layers), shifted up to continue the longer ladder
  { name: 'Open Heaven',        stage: 'Layer 1',     cost: 7_520_000_000_000_000 },
  { name: 'Open Heaven',        stage: 'Layer 2',     cost: 12_600_000_000_000_000 },
  { name: 'Open Heaven',        stage: 'Layer 3',     cost: 20_200_000_000_000_000 },
  { name: 'Open Heaven',        stage: 'Layer 4',     cost: 34_700_000_000_000_000 },
  { name: 'Open Heaven',        stage: 'Layer 5',     cost: 58_400_000_000_000_000 },
  { name: 'Open Heaven',        stage: 'Layer 6',     cost: 99_200_000_000_000_000 },
];

/**
 * Global steepness factor (2026-05-22 Dial-3.1).
 *
 * Compounds across stage index: stage `i` is scaled by COST_STEEPNESS^i.
 * A small per-step factor barely moves the needle early (×1.01^10 ≈ +10%
 * by end of Tempered Body) but compounds into a meaningful late-game
 * wall (×1.01^50 ≈ +64% at Origin Returning Late, ×1.01^56 ≈ +74% at
 * Open Heaven Layer 6). Tunes the curve in one knob without re-touching
 * every per-stage cost.
 *
 * Lower to 1.005 for a gentler curve, raise to 1.015 for harder. The
 * scaling is applied BEFORE designer overrides (mergeArrayByIndex)
 * so any per-stage override in realms.override.json still wins as the
 * final authority.
 */
export const COST_STEEPNESS = 1.01;

const REALMS_SCALED = REALMS_RAW.map((r, i) => ({
  ...r,
  cost: Math.round(r.cost * Math.pow(COST_STEEPNESS, i)),
}));

const REALMS = mergeArrayByIndex(REALMS_SCALED, 'realms');

// ── Major breakthrough qi/s gate ─────────────────────────────────────────────
// Ascending between major realms (i.e. `realm.name` changes) requires a
// minimum sustained qi/s. The threshold is expressed as a percentage of the
// NEXT realm's qi cost and decays with each successive major transition.
//
// 2026-05-22 Dial-3.1 — DECAY relaxed from 0.5 → 0.9. The previous halving
// made every gate past the first one functionally invisible (gate at major
// 5 was 0.0078% of cost — fraction of a second of production). 0.9 keeps
// the first gate identical at 0.25% but holds subsequent gates near
// 0.1-0.2% of next-realm cost, so players actually need to push
// (focus-hold, divine qi orbs, ad boost, future paid multiplier boosts)
// to clear them instead of breaking through the moment the bar fills.
//
//   ord   gate %      example next   gate qi/s     (at relaxed 0.9 decay)
//   0     0.25%       200 K          500
//   1     0.225%      1.65 M         3.7 K
//   3     0.182%      95 M           173 K
//   5     0.148%      6.4 B          9.4 M
//   7     0.12%       320 B          384 M
//   9     0.097%      5.25 T         5.1 B
//
// Compare to the old 0.5 decay where ord-5 was 500 K qi/s — invisible
// late game.
export const MAJOR_BREAKTHROUGH_BASE_PCT = 0.0025; // 0.25% at the first gate (unchanged)
export const MAJOR_BREAKTHROUGH_DECAY    = 0.9;    // multiplicative per major gate

/** Is the transition `fromIndex → fromIndex+1` a major-realm change? */
export function isMajorTransition(fromIndex) {
  const a = REALMS[fromIndex];
  const b = REALMS[fromIndex + 1];
  return !!a && !!b && a.name !== b.name;
}

/**
 * Is the transition `fromIndex → fromIndex+1` a "peak" event?
 *
 * Only one case now: entering the absolute last realm in the array (no
 * entry after it) — that layer is the endgame pinnacle before the final
 * ascension and gets its own banner.
 *
 * REMOVED (2026-05-20): same-name Peak Stage entries (e.g. Qi Transformation
 * Late Stage → Peak Stage) used to count as peak transitions and triggered
 * both the qi/s gate and the old BreakthroughBanner. That was wrong — the
 * peak stage is a normal sub-stage; the gate + banner belong only at the
 * EXIT of the realm (handled by isMajorTransition when the realm name
 * changes). Without this, the player got gated AND celebrated twice
 * (entering peak + exiting peak to the next realm).
 */
export function isPeakTransition(fromIndex) {
  const a = REALMS[fromIndex];
  const b = REALMS[fromIndex + 1];
  if (!a || !b) return false;
  if (!REALMS[fromIndex + 2]) return true; // entering the very last realm
  return false;
}

/**
 * 0-based position of REALMS[stageIndex] within its realm name group.
 * E.g. Tempered Body L1 → 0, L2 → 1, ..., L10 → 9.
 * Returns 0 for the first stage of any realm (or an out-of-range index).
 */
export function getRealmStageOrdinal(stageIndex) {
  const s = REALMS[stageIndex];
  if (!s) return 0;
  let ord = 0;
  for (let i = stageIndex - 1; i >= 0; i--) {
    if (REALMS[i]?.name !== s.name) break;
    ord++;
  }
  return ord;
}

/**
 * True iff the breakthrough INTO `stageIndex` rewards a Qi Spark selection.
 *
 * Rule (deterministic by stage index):
 *   - Major transition (entering a new realm name): YES.
 *   - Sub-stage at an ODD realm-internal ordinal (1, 3, 5, …): YES, UNLESS
 *     `stageIndex` is the last stage of its realm (the next BT is the major,
 *     which already gives the spark, so we do not double up).
 *   - Everything else (stage 0, even sub-stages): NO.
 *
 * Sparks fire on ODD ordinals (previously even) so the first one lands at
 * Tempered Body L2, before the Qi Crystal unlocks at L3, instead of colliding
 * with it. Same spark count per realm, shifted one stage earlier. This is the
 * single source the spark roadmap reads.
 */
export function stageHasSpark(stageIndex) {
  if (stageIndex <= 0) return false;          // first stage of the game has no incoming BT
  const prev = REALMS[stageIndex - 1];
  const curr = REALMS[stageIndex];
  if (!prev || !curr) return false;
  // Major transition: always spark.
  if (prev.name !== curr.name) return true;
  // Sub-stage: ODD ordinal AND not the realm's last stage.
  const ord = getRealmStageOrdinal(stageIndex);
  if (ord % 2 !== 1) return false;  // odd ordinals only (1, 3, 5, ...)
  const next = REALMS[stageIndex + 1];
  const isLastInRealm = !next || next.name !== curr.name;
  return !isLastInRealm;
}

/**
 * Returns the 0-based ordinal of the major transition starting from `fromIndex`
 * (i.e. how many major transitions precede this one), or -1 if the transition
 * is not a major one.
 */
export function majorTransitionOrdinal(fromIndex) {
  if (!isMajorTransition(fromIndex)) return -1;
  let ord = 0;
  for (let i = 0; i < fromIndex; i++) {
    if (isMajorTransition(i)) ord++;
  }
  return ord;
}

/**
 * Required qi/s to pass a Peak transition at `fromIndex → fromIndex+1`.
 * Uses the same exponential-decay formula as major breakthroughs, ordinal
 * based on how many major transitions have already occurred before fromIndex.
 * Returns 0 if this is not a peak transition.
 */
export function getPeakBreakthroughRate(fromIndex) {
  if (!isPeakTransition(fromIndex)) return 0;
  const next = REALMS[fromIndex + 1];
  if (!next) return 0;
  let ord = 0;
  for (let i = 0; i <= fromIndex; i++) {
    if (isMajorTransition(i)) ord++;
  }
  const pct = MAJOR_BREAKTHROUGH_BASE_PCT * Math.pow(MAJOR_BREAKTHROUGH_DECAY, ord);
  return next.cost * pct;
}

/**
 * Required qi/s to ascend from `fromIndex` to `fromIndex+1`. Returns 0 when
 * the transition is a sub-stage (non-major) — no gating applies.
 */
export function getMajorBreakthroughRate(fromIndex) {
  const ord = majorTransitionOrdinal(fromIndex);
  if (ord < 0) return 0;
  const next = REALMS[fromIndex + 1];
  if (!next) return 0;
  const pct = MAJOR_BREAKTHROUGH_BASE_PCT * Math.pow(MAJOR_BREAKTHROUGH_DECAY, ord);
  return next.cost * pct;
}

// ── Chapter grouping for the Journey "Chronicle" screen ─────────────────────
// The 13 unique realm names cluster into 7 narrative chapters. The Journey
// screen renders one Roman-numeral divider per chapter so the 49-stage list
// reads as a 7-act epic rather than a flat ladder. `realmIndices` are the
// REALM-NAME positions inside `REALM_NAMES` below (0 = Tempered Body, … ,
// 12 = Open Heaven), NOT stage indices into REALMS — chapter boundaries
// are a render concern keyed on the realm name groups.
export const REALM_NAMES = [
  'Tempered Body',
  'Qi Transformation',
  'True Element',
  'Separation & Reunion',
  'Immortal Ascension',
  'Saint',
  'Saint King',
  'Origin Returning',
  'Origin King',
  'Void King',
  'Dao Source',
  'Emperor Realm',
  'Open Heaven',
];

export const CHAPTERS = [
  { id: 1, title: 'The Mortal Path',    glyph: '命', realmIndices: [0, 1, 2] },
  { id: 2, title: 'Awakening Element',  glyph: '元', realmIndices: [3, 4]    },
  { id: 3, title: 'The Saintly Path',   glyph: '圣', realmIndices: [5, 6]    },
  { id: 4, title: 'Origin Returning',   glyph: '归', realmIndices: [7, 8]    },
  { id: 5, title: 'The Void Crown',     glyph: '虚', realmIndices: [9]       },
  { id: 6, title: 'The Dao Source',     glyph: '道', realmIndices: [10, 11]  },
  { id: 7, title: 'Open Heaven',        glyph: '天', realmIndices: [12]      },
];

/**
 * Returns the chapter object containing a given realm-name index, or
 * `null` if the index is out of range. Used by JourneyScreen to find
 * the "current chapter" for the hero header.
 */
export function chapterForRealmNameIndex(realmNameIndex) {
  return CHAPTERS.find(c => c.realmIndices.includes(realmNameIndex)) ?? null;
}

// Roman numeral helper for chapter dividers ("I — The Mortal Path").
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'];
export function toRoman(n) { return ROMAN[n] ?? String(n); }

// ── Major-realm → law-offer rarity band ──────────────────────────────────────
// Each major realm name maps to the 2-rarity pool used when a breakthrough
// offers law choices. Iron stops appearing once the player enters the
// Silver band (Separation & Reunion); Transcendent first appears in the
// Gold/Transcendent band (Origin King onwards).
const MAJOR_TO_RARITY_BAND = {
  'Tempered Body':        ['Iron'],
  'Qi Transformation':    ['Iron', 'Bronze'],
  'True Element':         ['Iron', 'Bronze'],
  'Separation & Reunion': ['Bronze', 'Silver'],
  'Immortal Ascension':   ['Bronze', 'Silver'],
  'Saint':                ['Silver', 'Gold'],
  'Saint King':           ['Silver', 'Gold'],
  'Origin Returning':     ['Silver', 'Gold'],
  'Origin King':          ['Gold', 'Transcendent'],
  'Void King':            ['Gold', 'Transcendent'],
  'Dao Source':           ['Gold', 'Transcendent'],
  'Emperor Realm':        ['Gold', 'Transcendent'],
  'Open Heaven':          ['Gold', 'Transcendent'],
};

/**
 * Offer rarity pool for a law choice triggered by a major-realm
 * breakthrough that lands the player on `realmIndex`.
 */
export function lawOfferRaritiesForRealm(realmIndex) {
  const realm = REALMS[realmIndex];
  return MAJOR_TO_RARITY_BAND[realm?.name] ?? ['Iron'];
}

export default REALMS;
