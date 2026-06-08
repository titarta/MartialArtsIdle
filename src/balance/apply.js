/**
 * apply.js, turns a tuned curve into something you can apply back to the game.
 *
 * Two output kinds (a curve may emit both):
 *   1. OVERRIDE JSON, for domains the loader merges at build/reload time
 *      (currently `realms`, by index). Paste into
 *      src/data/config/<domain>.override.json → Vite HMR reload applies it,
 *      so you can playtest the change live. The existing override doc is read
 *      via the loader and merged so you never clobber prior edits.
 *   2. SNIPPET, for formula constants that live in hooks/data and aren't
 *      override-backed (crystal, producers, karma, upgrades, cultivation).
 *      A copy-paste summary of the changed params (and any point overrides,
 *      which on a formula curve are export-only) targeted at the source file.
 */
import { getOverrideDoc } from '../data/config/loader';

/** Params that differ from the curve/variant defaults. */
export function changedParams(curve, params, defaults) {
  const out = [];
  for (const s of curve.paramsSpec) {
    const to = params[s.key];
    const from = defaults[s.key];
    if (to !== from) out.push({ key: s.key, label: s.label, from, to });
  }
  return out;
}

function numStr(v) {
  if (!Number.isFinite(v)) return String(v);
  // Keep integers clean; show big round numbers in full so they paste as code.
  if (Number.isInteger(v)) return String(v);
  return String(Number(v.toPrecision(8)));
}

/**
 * Build the merged override document for an index-backed curve (e.g. realms).
 * `overrides` is { x: value }. Returns a pretty JSON string, or null if empty.
 */
export function buildOverrideJSON(curve, overrides) {
  const ap = curve.apply;
  if (!ap || ap.kind !== 'override') return null;
  const keys = Object.keys(overrides || {});
  if (keys.length === 0) return null;

  const doc = getOverrideDoc(ap.domain);
  const records = { ...(doc.records || {}) };
  for (const x of keys) {
    const val = overrides[x];
    if (!Number.isFinite(val)) continue;
    // realms key by array index; the eternal tree keys by node id (ap.keys[x]).
    const recKey = ap.keys ? String(ap.keys[Number(x)]) : String(x);
    if (recKey === 'undefined') continue;
    records[recKey] = { ...(records[recKey] || {}), [ap.field]: Math.round(val) };
  }
  return JSON.stringify({ version: doc.version ?? 1, records }, null, 2);
}

/** Build the human-readable snippet (param changes + point-override note). */
export function buildSnippet(curve, params, defaults, overrides, variantLabel) {
  const changes = changedParams(curve, params, defaults);
  const ptCount = Object.keys(overrides || {}).length;
  const isOverrideDomain = curve.apply?.kind === 'override';

  if (changes.length === 0 && (ptCount === 0 || isOverrideDomain)) return null;

  const lines = [];
  lines.push(`// Balance Dashboard, ${curve.label}${variantLabel ? ` · ${variantLabel}` : ''}`);
  lines.push(`// Target: ${curve.apply?.target ?? '(unknown)'}`);
  if (changes.length) {
    lines.push('// Param changes:');
    for (const c of changes) lines.push(`//   ${c.label}: ${numStr(c.from)} -> ${numStr(c.to)}`);
  }
  // Point overrides on a formula curve are export-only (the runtime reads a
  // formula, not a table), surface them so nothing is silently dropped.
  if (ptCount > 0 && !isOverrideDomain) {
    lines.push(`// Point overrides (${ptCount}), export-only on a formula curve:`);
    const entries = Object.keys(overrides)
      .map(Number).sort((a, b) => a - b)
      .map(x => `${x}: ${numStr(overrides[x])}`);
    lines.push(`//   { ${entries.join(', ')} }`);
  }
  return lines.join('\n');
}

/**
 * Full export for the active curve/variant. Returns { overrideJSON, overrideDomain,
 * snippet }, any field may be null.
 */
export function buildExport(curve, { params, defaults, overrides, variantLabel }) {
  return {
    overrideDomain: curve.apply?.kind === 'override' ? curve.apply.domain : null,
    overrideJSON:   buildOverrideJSON(curve, overrides),
    snippet:        buildSnippet(curve, params, defaults, overrides, variantLabel),
  };
}
