/**
 * Dev-tools build gate — single source of truth.
 *
 * DEV_TOOLS_ENABLED is true in:
 *   - Local dev server (`npm run dev`)
 *   - Designer mode (`npm run dev:designer` / `build:designer`)
 *
 * It is FALSE in every shipping mode (browser / native / steam / demo).
 *
 * Gates the three internal-only Settings actions (Export save, Import save,
 * Wipe save). Those buttons are convenience tools for debugging and
 * testing the "first-time download" experience — they are NOT meant to
 * ship to live builds. Export/Import in particular only round-trips the
 * main save blob (`mai_save`) and silently leaves the dozens of other
 * `mai_*` keys untouched, so they cannot serve as a real cloud-save
 * replacement; treating them as dev-only avoids the implicit promise.
 *
 * Same pattern + same expression as src/designer/enabled.js. Because this
 * resolves to a literal `false` at build time in shipping modes, Rollup
 * tree-shakes the gated branches out of the bundle.
 */
export const DEV_TOOLS_ENABLED =
  import.meta.env.MODE === 'designer' ||
  (import.meta.env.DEV && import.meta.env.MODE !== 'native');
