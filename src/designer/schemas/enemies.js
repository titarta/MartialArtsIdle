import { itemIdOptions, spriteOptions } from '../enumSources.js';

/**
 * Per-enemy schema. Values match the shape declared in src/data/enemies.js:
 *   {
 *     id, name, sprite, description,
 *     statMult: { hp, atk },
 *     drops: [{ itemId, chance, qty: [min, max] }],
 *     techniqueDrop?: { chance },
 *   }
 */
export default [
  { key: 'name',        type: 'string',   label: 'Display name' },
  { key: 'sprite',      type: 'enum',     label: 'Sprite',       options: spriteOptions,
    help: 'Base filename under public/sprites/enemies/. Pairs as {name}-idle.png and {name}-attack.png.' },
  { key: 'description', type: 'textarea', label: 'Description',  rows: 3 },

  {
    key: 'statMult',
    type: 'object',
    label: 'Stat multipliers',
    fields: [
      { key: 'hp',  type: 'number', label: 'HP mult',     step: 0.05, help: 'Scales enemy max HP vs. player base stats.' },
      { key: 'atk', type: 'number', label: 'Attack mult', step: 0.05, help: 'Scales enemy attack damage vs. player base stats.' },
    ],
  },

  {
    key: 'drops',
    type: 'array',
    label: 'Drops',
    itemSchema: [
      { key: 'itemId', type: 'enum',   label: 'Item',   options: itemIdOptions },
      { key: 'chance', type: 'number', label: 'Chance', min: 0, max: 1, step: 0.01,
        help: '0..1 probability per kill.' },
      { key: 'qty',    type: 'array',  label: 'Qty range [min, max]', itemType: 'number' },
    ],
  },

  {
    key: 'techniqueDrop',
    type: 'object',
    label: 'Technique drop',
    fields: [
      { key: 'chance', type: 'number', label: 'Chance', min: 0, max: 1, step: 0.01,
        help: 'Leave blank if this enemy does not drop techniques.' },
    ],
  },
];
