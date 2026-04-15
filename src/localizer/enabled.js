/**
 * Localizer panel build gate — mirrors src/designer/enabled.js exactly.
 *
 * LOCALIZER_ENABLED is true in local dev and explicit localizer mode only.
 * In all ship builds (browser, native, steam, demo) this resolves to false
 * and Rollup tree-shakes the entire src/localizer/* subtree.
 */
export const LOCALIZER_ENABLED =
  import.meta.env.MODE === 'localizer' ||
  (import.meta.env.DEV && import.meta.env.MODE !== 'native');
