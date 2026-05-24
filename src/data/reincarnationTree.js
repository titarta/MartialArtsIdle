/**
 * reincarnationTree.js — 7-node reincarnation tree definition.
 *
 * All nodes cost 1 karma. Layout uses a 2-column CSS grid; connections
 * go right or down only.
 *
 * Grid:
 *   Col:  0            1
 *   Row0: [n_1] ──→  [n_2]
 *          ↓
 *   Row1: [n_3] ──→  [n_4]
 *          ↓
 *   Row2: [n_5]
 *          ↓
 *   Row3: [n_6]
 *          ↓
 *   Row4: [n_7]
 */

export const NODES = [
  {
    id: 'n_1',
    label: 'Devoted Path',
    cost: 1,
    prereqs: [],
    col: 0,
    row: 0,
    description: 'Gain +0.1% Qi/s for each karma spent on the tree.',
  },
  {
    id: 'n_2',
    label: 'Star Disciple',
    cost: 1,
    prereqs: ['n_1'],
    col: 1,
    row: 0,
    description: 'Unlock Star Disciple Cultivation. (Coming soon)',
  },
  {
    id: 'n_3',
    label: 'Crystalline Focus',
    cost: 1,
    prereqs: ['n_1'],
    col: 0,
    row: 1,
    description: '+20% increased Qi Crystal Qi bonus.',
  },
  {
    id: 'n_4',
    label: 'Discerning Eye',
    cost: 1,
    prereqs: ['n_3'],
    col: 1,
    row: 1,
    description: 'Common Qi Sparks are 40% less likely to appear.',
  },
  {
    id: 'n_5',
    label: 'Frugal Cultivation',
    cost: 1,
    prereqs: ['n_3'],
    col: 0,
    row: 2,
    description: '10% reduced producer purchase cost.',
  },
  {
    id: 'n_6',
    label: 'Sect Resonance',
    cost: 1,
    prereqs: ['n_5'],
    col: 0,
    row: 3,
    description: 'Producers gain +1% increased Qi/s for each producer of the same type owned.',
  },
  {
    id: 'n_7',
    label: "Senior's Guidance",
    cost: 1,
    prereqs: ['n_6'],
    col: 0,
    row: 4,
    description: "Producers gain +0.5% increased Qi/s for each producer of the previous type owned.",
  },
];

export const NODES_BY_ID = Object.fromEntries(NODES.map(n => [n.id, n]));

/** Sum of all node costs — used to compute treeQiMult ceiling. */
export const TREE_TOTAL_COST = NODES.reduce((s, n) => s + n.cost, 0); // 7
