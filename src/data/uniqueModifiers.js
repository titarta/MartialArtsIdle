/**
 * uniqueModifiers.js — Unique modifier pools for Artefacts and Techniques.
 *
 * WIPED during the Damage & Element System Overhaul (2026-04-24).
 * Pre-overhaul artefact uniques (~110) and technique uniques (~110) are
 * archived in obsidian/Deprecated_Unique_Modifiers.md.
 *
 * Artefacts no longer auto-roll unique modifiers — they spawn with their
 * full modifier complement (count by rarity, see MODS_PER_RARITY) and
 * never reroll. Whether to reintroduce a unique slot is a designer call
 * after the new pools are populated.
 *
 * Technique passives remain wired through generateTechnique but the pool
 * is empty pending refill against the new 5-element model.
 *
 * SHAPE preserved for reference:
 *   { id, name, description, range, slot? (artefacts) }
 */

// ─── ARTEFACT UNIQUE MODIFIERS ────────────────────────────────────────────────

export const ARTEFACT_UNIQUES = [];

// ─── TECHNIQUE UNIQUE MODIFIERS ───────────────────────────────────────────────

export const TECHNIQUE_UNIQUES = {
  Attack: [],
  Heal:   [],
  Defend: [],
  Dodge:  [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get all artefact uniques for a slot. */
export function artefactUniquesBySlot(slot) {
  return ARTEFACT_UNIQUES.filter(u => u.slot === slot);
}

/**
 * Re-roll the value of an EXISTING artefact-unique. Returns null with the
 * pool empty. Signature preserved for legacy callers (useArtefacts).
 */
export function rerollArtefactUniqueValue(_uniqueId, _tier = 'Transcendent') {
  return null;
}

/**
 * Roll a fresh artefact-unique affix for a given slot. Returns null with
 * the pool empty. Signature preserved for legacy callers (affixPools).
 */
export function rollArtefactUnique(_slot, _tier = 'Iron', _excludeIds = []) {
  return null;
}

/** Get technique uniques for a type. */
export function techniqueUniquesByType(type) {
  return TECHNIQUE_UNIQUES[type] ?? [];
}

/** Total counts (for design auditing). */
export const UNIQUE_COUNTS = {
  artefacts: ARTEFACT_UNIQUES.length,
  techniques: Object.values(TECHNIQUE_UNIQUES).reduce((s, arr) => s + arr.length, 0),
  total() {
    return this.artefacts + this.techniques;
  },
};
