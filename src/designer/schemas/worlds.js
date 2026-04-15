import { enemyIdOptions } from '../enumSources.js';

/**
 * World record schema (src/data/worlds.js default export).
 * A world has top-level fields + an array of regions, each with its own
 * enemy pool, drops, herbs, and ores.
 */
const dropRow = [
  { key: 'itemId', type: 'string', label: 'Item id' }, // TODO: enum once items domain added
  { key: 'chance', type: 'number', label: 'Chance', min: 0, max: 1, step: 0.01 },
  { key: 'qty',    type: 'array',  label: 'Qty range [min, max]', itemType: 'number' },
];

const regionSchema = [
  { key: 'name',          type: 'string', label: 'Region name' },
  { key: 'minRealm',      type: 'string', label: 'Min realm label',
    help: 'Display text. Authoritative value is minRealmIndex.' },
  { key: 'minRealmIndex', type: 'number', label: 'Min realm index', min: 0, step: 1,
    help: 'Index into src/data/realms.js. 0 = Tempered Body Layer 1.' },
  {
    key: 'enemyPool',
    type: 'array',
    label: 'Enemy pool',
    itemSchema: [
      { key: 'enemyId', type: 'enum',   label: 'Enemy', options: enemyIdOptions },
      { key: 'weight',  type: 'number', label: 'Weight', min: 1, step: 1,
        help: 'Relative weight; higher = more likely.' },
    ],
  },
  { key: 'drops', type: 'array', label: 'Drops',  itemSchema: dropRow },
  { key: 'herbs', type: 'array', label: 'Herbs',  itemType: 'string' },
  { key: 'ores',  type: 'array', label: 'Ores',   itemType: 'string' },
];

export default [
  { key: 'id',             type: 'number', label: 'World id', min: 1, step: 1,
    help: 'Immutable. Changing breaks save-file references and enemy drop tables.' },
  { key: 'name',           type: 'string', label: 'World name' },
  { key: 'realms',         type: 'string', label: 'Realm range label',
    help: 'Display text like "Tempered Body → True Element".' },
  { key: 'minRealmIndex',  type: 'number', label: 'Min realm index', min: 0, step: 1 },
  { key: 'description',    type: 'textarea', label: 'Description', rows: 4 },
  { key: 'regions',        type: 'array', label: 'Regions', itemSchema: regionSchema },
];
