import { itemIdOptions, rarityOptions } from '../enumSources.js';

/**
 * Crafting singleton tables (src/data/crafting.js). The override file keys
 * each record by the singleton name (SLOT_BRACKETS, TRANSMUTE_QTY, etc.)
 * and stores a full replacement object — not per-field patches.
 */

const costRow = [
  { key: 'itemId', type: 'enum',   label: 'Material', options: itemIdOptions },
  { key: 'qty',    type: 'number', label: 'Qty',      min: 1, step: 1 },
];

const bracketRow = [
  { key: 'label',       type: 'enum',   label: 'Label', options: rarityOptions },
  { key: 'tier',        type: 'number', label: 'Tier', min: 1, max: 5, step: 1 },
  { key: 'count',       type: 'number', label: 'Slot count', min: 1, step: 1 },
  { key: 'color',       type: 'string', label: 'UI color', help: 'CSS hex, e.g. #9ca3af' },
  { key: 'mineralStat', type: 'enum',   label: 'Stat mineral (hone/add)',  options: itemIdOptions },
  { key: 'mineralMod',  type: 'enum',   label: 'Modifier mineral (replace)', options: itemIdOptions },
];

/*
 * Meta-schema describing each singleton. The CraftingEditor picks the right
 * form per singleton name.
 */
export const CRAFTING_SINGLETONS = [
  {
    key: 'SLOT_BRACKETS',
    label: 'Transmutation slot brackets',
    description: 'One bracket per rarity tier. Defines slot counts and materials per rarity.',
    type: 'list',              // array of objects
    itemSchema: bracketRow,
  },
  {
    key: 'TRANSMUTE_QTY',
    label: 'Transmute quantities',
    description: 'Materials consumed per transmute operation.',
    type: 'object',
    fields: [
      { key: 'hone',    type: 'number', label: 'Hone (randomise value)', min: 1, step: 1 },
      { key: 'replace', type: 'number', label: 'Replace (swap modifier)', min: 1, step: 1 },
      { key: 'add',     type: 'number', label: 'Add (fill empty slot)', min: 1, step: 1 },
    ],
  },
  {
    key: 'UPGRADE_COSTS',
    label: 'Upgrade costs',
    description: 'Cost to upgrade an artefact / technique / law to the next rarity.',
    type: 'object',
    fields: [
      { key: 'Iron',   type: 'array', label: 'Iron',   itemSchema: costRow },
      { key: 'Bronze', type: 'array', label: 'Bronze', itemSchema: costRow },
      { key: 'Silver', type: 'array', label: 'Silver', itemSchema: costRow },
      { key: 'Gold',   type: 'array', label: 'Gold',   itemSchema: costRow },
    ],
  },
];
