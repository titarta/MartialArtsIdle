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
    if (s.type === 'bands') continue; // structured param, not a scalar constant
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
 * Emits every stage whose value (point override, else the tuned formula `fn`)
 * differs from the live baseline, so band-model edits export directly with no
 * "bake" step and the patch stays minimal. Returns a JSON string, or null when
 * nothing differs.
 */
export function buildOverrideJSON(curve, { overrides, params, xs, baseFn }) {
  const ap = curve.apply;
  if (!ap || ap.kind !== 'override') return null;

  const doc = getOverrideDoc(ap.domain);
  const records = { ...(doc.records || {}) };
  let any = false;
  for (const x of (xs || [])) {
    const has = Object.prototype.hasOwnProperty.call(overrides || {}, x);
    const raw = has ? overrides[x] : curve.fn(x, params);
    if (!Number.isFinite(raw)) continue;
    const val = Math.round(raw);
    // Skip stages that match the live baseline — the band model regenerates
    // those, so only the genuinely-reshaped stages land in the override.
    const base = baseFn ? baseFn(x) : null;
    if (base != null && val === Math.round(base)) continue;
    // realms key by array index; the eternal tree keys by node id (ap.keys[x]).
    const recKey = ap.keys ? String(ap.keys[Number(x)]) : String(x);
    if (recKey === 'undefined') continue;
    records[recKey] = { ...(records[recKey] || {}), [ap.field]: val };
    any = true;
  }
  return any ? JSON.stringify({ version: doc.version ?? 1, records }, null, 2) : null;
}

/** Build the human-readable snippet (param changes + point-override note). */
export function buildSnippet(curve, params, defaults, overrides, variantLabel) {
  // Override-backed curves (realms, tree) apply via JSON only — there's no
  // constant to paste, so a snippet would just be noise.
  if (curve.apply?.kind === 'override') return null;
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
  // Tuned points, labelled (e.g. producer name) so the values are pasteable
  // back into the source by hand. On a formula curve these are export-only.
  if (ptCount > 0 && !isOverrideDomain) {
    lines.push(`// Tuned points (${ptCount}):`);
    Object.keys(overrides).map(Number).sort((a, b) => a - b).forEach(x => {
      const lbl = curve.pointLabel ? curve.pointLabel(x) : `x=${x}`;
      lines.push(`//   ${lbl}: ${numStr(overrides[x])}`);
    });
  }
  return lines.join('\n');
}

/**
 * Full export for the active curve/variant. Returns { overrideJSON, overrideDomain,
 * snippet }, any field may be null.
 */
export function buildExport(curve, { params, defaults, overrides, variantLabel, xs, baseFn }) {
  return {
    overrideDomain: curve.apply?.kind === 'override' ? curve.apply.domain : null,
    overrideJSON:   buildOverrideJSON(curve, { overrides, params, xs, baseFn }),
    snippet:        buildSnippet(curve, params, defaults, overrides, variantLabel),
  };
}
