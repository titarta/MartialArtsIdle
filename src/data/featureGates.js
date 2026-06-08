/**
 * Feature gate definitions — controls when each nav tab and world becomes
 * accessible. Evaluated by useFeatureFlags against live game state.
 *
 * Gate types:
 *   always    — always unlocked
 *   realm     — realmIndex >= minRealmIndex
 *   flag      — build-time `FEATURES[gate.flag]` is truthy
 *   all       — every sub-gate in `gates` must pass
 *   any       — at least one sub-gate in `gates` must pass
 *
 * The pre-pivot `region_clear_any` / `item_any` / `item_category` types and
 * the herb / ore / blood-core / cultivation / pill item catalogues were
 * retired with the v1 Cookie-Clicker pivot. The Worlds hub + combat-screen
 * unlock toasts + isWorldUnlocked / getWorldLockHint helpers were tied to
 * the now-deleted WORLDS data set, so they are gone too.
 *
 * Designer overrides: src/data/config/featureGates.override.json
 * Records are keyed by feature id; each record is shallow-merged onto the
 * baseline, so you can patch just `gate` without losing `hint` / `unlockMsg`.
 */
import { mergeRecords } from './config/loader';
import { FEATURES } from './featureFlags';

// Wrap a baseline gate behind a build-time feature flag. When the flag is
// false, the gate evaluates false regardless of in-game state — used to
// hide every combat-adjacent surface until combat ships in a future update.
const flagged = (baseGate, flag) => ({
  type: 'all',
  gates: [baseGate, { type: 'flag', flag }],
});

// ── Baseline ──────────────────────────────────────────────────────────────────

const BASELINE = {
  home: {
    gate: { type: 'always' },
    desc: null,
    hint: null,
    unlockMsg: null,
  },
  // The qi-investment shop (Cookie-Clicker-style producers + upgrades). The
  // main loop of v1 — always available, no realm gate, no flag.
  cultivation: {
    gate: { type: 'always' },
    desc: null,
    hint: null,
    unlockMsg: null,
  },
  // Journey — chronicle screen promoted out of the ProgressHub modal during
  // the nav-audit. Always available since the realm list is meaningful even
  // at realm 0 (gives the player a sense of the road ahead).
  journey: {
    gate: { type: 'always' },
    desc: null,
    hint: null,
    unlockMsg: null,
  },
  // The combat-adjacent gates below stay defined so any stale toast or
  // notification carrying a legacy feature id resolves to a known shape.
  // They evaluate to false in v1 because FEATURES.combat is off.
  worlds: {
    gate: flagged({ type: 'realm', minRealmIndex: 2 }, 'combat'),
    desc: null,
    hint: null,
    unlockMsg: null,
  },
  character: {
    gate: flagged({ type: 'always' }, 'combat'),
    desc: null,
    hint: null,
    unlockMsg: null,
  },
  collection: {
    gate: flagged({ type: 'always' }, 'combat'),
    desc: null,
    hint: null,
    unlockMsg: null,
  },
  production: {
    gate: flagged({ type: 'always' }, 'combat'),
    desc: null,
    hint: null,
    unlockMsg: null,
  },
  // Spirit Bazaar — Blood Lotus spend storefront, promoted to a full screen
  // during the nav-audit. TopBar 🏮 routes here via navigate('spirit-bazaar').
  'spirit-bazaar': {
    gate: { type: 'always' },
    desc: null,
    hint: null,
    unlockMsg: null,
  },
  settings: {
    gate: { type: 'always' },
    desc: null,
    hint: null,
    unlockMsg: null,
  },
  qi_crystal: {
    gate: { type: 'realm', minRealmIndex: 2 },
    desc: 'A crystallised vessel of refined Qi. Feed it QI stones to permanently boost your cultivation speed.',
    hint: 'Reach Tempered Body Layer 3',
    unlockMsg: 'Qi Crystal awakened.',
  },
};

export const FEATURE_GATES = mergeRecords(BASELINE, 'featureGates');

// ── Gate evaluation ───────────────────────────────────────────────────────────

/**
 * @param {object} gate
 * @param {{ realmIndex: number }} ctx
 */
export function evaluateGate(gate, ctx) {
  const { realmIndex } = ctx;
  switch (gate.type) {
    case 'always':
      return true;
    case 'realm':
      return realmIndex >= gate.minRealmIndex;
    case 'flag':
      return !!FEATURES[gate.flag];
    case 'all':
      return gate.gates.every(g => evaluateGate(g, ctx));
    case 'any':
      return gate.gates.some(g => evaluateGate(g, ctx));
    // 'region_clear_any' / 'item_any' / 'item_category' from the pre-pivot
    // build had no v1 surface; resolve to false so any leftover override
    // referencing them silently blocks instead of throwing.
    default:
      return false;
  }
}
