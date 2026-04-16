/**
 * Materials editor — four sub-tabs (Herbs / Ores / Blood Cores / QI Stones).
 * Each sub-tab is its own CardGridEditor over a namespaced subtree of the
 * materials override (records.HERBS, records.ORES, records.BLOOD_CORES,
 * records.QI_STONES).
 */
import { useState } from 'react';
import CardGridEditor from './CardGridEditor.jsx';
import {
  HERBS,
  ORES,
  BLOOD_CORES,
  CULTIVATION_MATERIALS,
} from '../../data/materials.js';
import {
  HERB_SCHEMA,
  ORE_SCHEMA,
  BLOOD_CORE_SCHEMA,
  QI_STONE_SCHEMA,
} from '../schemas/materials.js';

const SUB_TABS = [
  { id: 'HERBS',       label: 'Herbs',       baseline: HERBS,                 schema: HERB_SCHEMA,       newRec: { rarity: 'Iron', gatherCost: 15 },                                  placeholder: 'New Herb ID' },
  { id: 'ORES',        label: 'Ores',        baseline: ORES,                  schema: ORE_SCHEMA,        newRec: { rarity: 'Iron', mineCost: 15 },                                    placeholder: 'New Ore ID' },
  { id: 'BLOOD_CORES', label: 'Blood Cores', baseline: BLOOD_CORES,           schema: BLOOD_CORE_SCHEMA, newRec: { rarity: 'Iron' },                                                  placeholder: 'New Blood Core ID' },
  { id: 'QI_STONES',   label: 'QI Stones',   baseline: CULTIVATION_MATERIALS, schema: QI_STONE_SCHEMA,   newRec: { rarity: 'Iron', gatherCost: 15, mineCost: 15, refinedQi: 5 },     placeholder: 'New QI Stone ID' },
];

export default function MaterialsEditor({ edited, onChangeRecords }) {
  const [tab, setTab] = useState(SUB_TABS[0].id);
  const sub = SUB_TABS.find((s) => s.id === tab);
  const all = edited.records || {};
  const subRecords = all[tab] || {};

  // Flatten partial-patch updates back into the namespaced structure.
  const onSubChange = (next) => {
    const nextAll = { ...all };
    if (Object.keys(next).length === 0) {
      delete nextAll[tab];
    } else {
      nextAll[tab] = next;
    }
    onChangeRecords(nextAll);
  };

  return (
    <div className="dz-materials-editor">
      <div className="dz-subtabs">
        {SUB_TABS.map((s) => (
          <button
            key={s.id}
            className={`dz-subtab ${tab === s.id ? 'active' : ''}`}
            onClick={() => setTab(s.id)}
          >
            {s.label} <span className="dz-subtab-count">({
              // baseline items + any newly added override-only items
              Object.keys(s.baseline).length +
              Object.keys(all[s.id] || {}).filter(k => !s.baseline[k]).length
            })</span>
          </button>
        ))}
      </div>
      <CardGridEditor
        baselineRecords={sub.baseline}
        editedRecords={subRecords}
        onChangeRecords={onSubChange}
        schema={sub.schema}
        displayLabel={(rec, key) => `${rec?.rarity ?? '?'} · ${rec?.name ?? key}`}
        allowAdd={true}
        newIdPlaceholder={sub.placeholder}
        initialNewRecord={sub.newRec}
        cardMinWidth="320px"
      />
    </div>
  );
}
