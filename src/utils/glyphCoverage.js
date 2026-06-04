/**
 * glyphCoverage.js — dev-time guard against the "some Chinese characters
 * look rounder than others" font-fallback artefact.
 *
 * BACKGROUND
 * ----------
 * The app ships a precise subset of Ma Shan Zheng (the brush calligraphy
 * font used for every Chinese glyph). The subset is built by
 *   scripts/build_msz_font.py
 * which lists glyphs in its CHARS constant. If a page renders a glyph
 * that ISN'T in CHARS, the font falls back through
 *   'Songti SC' -> 'STSong' -> 'Noto Serif CJK SC' -> serif
 * On Windows, where none of those are installed, the OS picks SimSun
 * (Ming serif) for some chars and Microsoft YaHei (sans) for others,
 * character by character. That's the "some look rounder than others"
 * inconsistency. It is INVISIBLE on macOS (where Songti SC is installed
 * and produces consistent Ming-style fallback), which is why this bug
 * keeps slipping into production.
 *
 * THIS MODULE
 * -----------
 * - Imports the auto-generated manifest emitted by build_msz_font.py.
 *   Single source of truth: the same script that bundles the woff2 also
 *   writes the JSON the runtime check reads. They cannot drift.
 * - Exports `assertGlyphsCovered(glyphs, contextName)` which, in dev,
 *   console.warn's a clear actionable message the first time a page
 *   tries to render an uncovered glyph.
 * - No-op in production builds (the warning is for developers; users
 *   shouldn't see anything).
 *
 * USAGE — call once from any component that renders Chinese glyphs:
 *   import { assertGlyphsCovered } from '../utils/glyphCoverage';
 *   useEffect(() => {
 *     assertGlyphsCovered(['道', '星', '晶', ...], 'EternalTreeScreen');
 *   }, []);
 *
 * If a glyph isn't covered, the dev console will say:
 *   [Glyph subset] EternalTreeScreen renders 2 glyph(s) NOT in the
 *   bundled Ma Shan Zheng subset: 龙, 鳳. They will silently fall back
 *   to a system serif. To fix: add them to CHARS in
 *   scripts/build_msz_font.py and run `python scripts/build_msz_font.py`.
 */

import subsetManifest from '../assets/fonts/ma-shan-zheng-subset.generated.json';

/** Set of every glyph in the bundled woff2. Built once at module load. */
const COVERED = new Set(subsetManifest.glyphs ?? []);

/** Warnings already emitted this session — keyed by `${context}|${missing}`
 *  so the same uncovered glyph in the same context only fires once. */
const SEEN = new Set();

/**
 * Warn (dev only) if any of `glyphs` is missing from the bundled subset.
 *
 * @param {Iterable<string>} glyphs - characters the caller intends to render.
 * @param {string} contextName - identifier used in the warning so the
 *                               developer knows WHICH page is uncovered.
 */
export function assertGlyphsCovered(glyphs, contextName = 'unknown') {
  if (import.meta.env.PROD) return;
  const missing = [];
  for (const g of glyphs) {
    if (!g) continue;
    // Only flag CJK characters. Latin letters, digits, punctuation, and
    // symbols (✓, ✦, ◇, etc.) aren't expected to be in a brush font
    // subset and would otherwise produce false positives.
    if (!/[㐀-鿿豈-﫿]/.test(g)) continue;
    if (!COVERED.has(g)) missing.push(g);
  }
  if (!missing.length) return;
  const unique = Array.from(new Set(missing));
  const key = `${contextName}|${unique.join('')}`;
  if (SEEN.has(key)) return;
  SEEN.add(key);
  /* eslint-disable no-console */
  console.warn(
    `[Glyph subset] ${contextName} renders ${unique.length} glyph(s) NOT in the bundled Ma Shan Zheng subset: ${unique.join(', ')}. ` +
    `They will silently fall back to a system serif on machines without Songti SC / STSong / Noto Serif CJK SC, producing the "rounder vs sharper" inconsistency. ` +
    `To fix: add them to CHARS in scripts/build_msz_font.py and run \`python scripts/build_msz_font.py\`.`
  );
  /* eslint-enable no-console */
}

/** Read-only access to the bundled set, for tooling / tests. */
export function getCoveredGlyphs() {
  return new Set(COVERED);
}
