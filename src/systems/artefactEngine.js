/**
 * artefactEngine.js — Walk the player's equipped artefacts, look up each
 * unique affix in ARTEFACT_UNIQUE_EFFECTS, and produce:
 *
 *   - statMods:       { [statId]: [{type, value}, ...] }  — merged into computeAllStats
 *   - artefactFlags:  { [flagName]: accumulatedValue }    — consumed by combat/cultivation
 *
 * Normal (non-unique) affixes are NOT processed here; they continue to be
 * handled by useArtefacts.getStatModifiers. This engine is strictly additive.
 */

import { ARTEFACT_UNIQUE_EFFECTS, resolveUniqueValue } from '../data/artefactUniqueEffects';

/**
 * @param {Array} equippedInstances — full owned-instance objects for every
 *        equipped artefact (the shape stored on useArtefacts.state.owned).
 */
export function evaluateArtefactUniques(equippedInstances) {
  const statMods = {};
  const flags    = {};

  for (const inst of equippedInstances) {
    if (!inst?.affixes?.length) continue;
    for (const affix of inst.affixes) {
      if (!affix?.unique) continue;
      const effects = ARTEFACT_UNIQUE_EFFECTS[affix.id];
      if (!effects) continue;
      const rolled = typeof affix.value === 'number' ? affix.value : 0;

      for (const effect of effects) {
        if (effect.kind === 'stat') {
          const numeric = resolveUniqueValue(effect.value, rolled);
          if (!numeric && numeric !== 0) continue;
          (statMods[effect.stat] ??= []).push({ type: effect.mod, value: numeric });
        } else if (effect.kind === 'flag') {
          const v = effect.value === true
            ? true
            : resolveUniqueValue(effect.value, rolled);
          // Booleans short-circuit; numerics accumulate (larger of two sources wins).
          if (v === true) {
            flags[effect.flag] = true;
          } else if (typeof v === 'number') {
            flags[effect.flag] = Math.max(flags[effect.flag] ?? 0, v);
          }
        }
      }
    }
  }

  return { statMods, artefactFlags: flags };
}
