/**
 * Realm schema — src/data/realms.js items are { name, stage, cost }.
 * Indexed by array position (realm index = save-file identity).
 */
export default [
  { key: 'name',  type: 'string', label: 'Major realm',  help: 'e.g. "Qi Transformation"' },
  { key: 'stage', type: 'string', label: 'Sub-stage',    help: 'e.g. "Early Stage" or "Layer 3"' },
  { key: 'cost',  type: 'number', label: 'Qi cost',      min: 1, step: 1 },
];
