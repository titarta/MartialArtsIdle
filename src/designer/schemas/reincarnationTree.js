/**
 * Reincarnation Tree node schema (src/data/reincarnationTree.js NODES).
 *
 * 7-node flat tree. Each node has identity (id) + display (label, description) +
 * layout (col, row) + gameplay (cost, prereqs).
 * The actual *effect* is resolved at runtime by useReincarnationTree.js modifiers
 * — changing description text alone won't change behaviour.
 */

export default [
  { key: 'id',          type: 'string',   label: 'Id (immutable)',
    help: 'Stable identifier matched by the runtime resolver in useReincarnationTree.js.' },
  { key: 'label',       type: 'string',   label: 'Display name' },
  { key: 'description', type: 'textarea', label: 'Description', rows: 3 },
  { key: 'cost',        type: 'number',   label: 'Karma cost', min: 1, step: 1,
    help: 'All nodes currently cost 1 karma. Edit with care.' },
  { key: 'prereqs',     type: 'array',    label: 'Prereqs (node ids)', itemType: 'string' },
  { key: 'col',         type: 'number',   label: 'Column (0=left)',  min: 0, step: 1,
    help: 'CSS grid column for the tree layout.' },
  { key: 'row',         type: 'number',   label: 'Row (0=top)',      min: 0, step: 1,
    help: 'CSS grid row for the tree layout.' },
];
