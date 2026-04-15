/**
 * FeatureGatesEditor — configure when each feature / nav tab unlocks.
 *
 * Editable gate types:
 *   always            — no params
 *   realm             — minRealmIndex (number)
 *   region_clear_any  — no params
 *   item_any          — no params
 *   item_category     — category (string)
 *   all               — shown read-only (composite gate, edit JSON manually)
 *   any               — shown read-only
 *
 * The override record for each feature shallow-merges onto the baseline, so
 * only changed fields need to be stored. However, to keep the editor simple
 * we always write the full record when any field changes.
 */

import { FEATURE_GATES } from '../../data/featureGates.js';

const GATE_TYPES = [
  { value: 'always',           label: 'Always unlocked' },
  { value: 'realm',            label: 'Realm level'     },
  { value: 'region_clear_any', label: 'First combat win' },
  { value: 'item_any',         label: 'Any item owned'  },
  { value: 'item_category',    label: 'Item in category' },
];

const FEATURE_ORDER = [
  'home', 'combat', 'character', 'gathering', 'mining', 'collection', 'production', 'settings', 'shop',
];

const FIXED_FEATURES = new Set(['home', 'settings']);

function GateParamEditor({ gate, onChange }) {
  if (gate.type === 'realm') {
    return (
      <label className="fge-param">
        Min realm index
        <input
          type="number"
          min={0}
          max={60}
          step={1}
          value={gate.minRealmIndex ?? 0}
          onChange={e => onChange({ ...gate, minRealmIndex: Number(e.target.value) })}
        />
      </label>
    );
  }
  if (gate.type === 'item_category') {
    return (
      <label className="fge-param">
        Category
        <select
          value={gate.category ?? 'herbs'}
          onChange={e => onChange({ ...gate, category: e.target.value })}
        >
          <option value="herbs">herbs</option>
          <option value="minerals">minerals</option>
          <option value="pills">pills</option>
          <option value="cultivation">cultivation</option>
        </select>
      </label>
    );
  }
  if (gate.type === 'all' || gate.type === 'any') {
    return (
      <span className="fge-complex">
        Complex gate — edit featureGates.override.json directly
      </span>
    );
  }
  return null;
}

export default function FeatureGatesEditor({ edited, onChangeRecords }) {
  const records = edited.records || {};

  function getFeature(id) {
    const baseline = FEATURE_GATES[id] ?? {};
    const override = records[id] ?? {};
    return { ...baseline, ...override };
  }

  function setFeature(id, newDef) {
    onChangeRecords({ ...records, [id]: newDef });
  }

  return (
    <div className="fge-root">
      <p className="fge-desc">
        Configure when each feature becomes accessible. Changes take effect after
        a full page reload.
      </p>
      <table className="fge-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th>Gate type</th>
            <th>Params</th>
            <th>Lock hint</th>
            <th>Unlock message</th>
          </tr>
        </thead>
        <tbody>
          {FEATURE_ORDER.filter(id => FEATURE_GATES[id]).map(id => {
            const def   = getFeature(id);
            const fixed = FIXED_FEATURES.has(id);
            return (
              <tr key={id} className={fixed ? 'fge-row-fixed' : ''}>
                <td className="fge-feature-id">{id}</td>

                {/* Gate type */}
                <td>
                  {fixed ? (
                    <span className="fge-fixed-label">always</span>
                  ) : (
                    <select
                      value={def.gate?.type ?? 'always'}
                      onChange={e => setFeature(id, {
                        ...def,
                        gate: { type: e.target.value },
                      })}
                    >
                      {GATE_TYPES.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  )}
                </td>

                {/* Gate params */}
                <td>
                  {fixed ? null : (
                    <GateParamEditor
                      gate={def.gate ?? { type: 'always' }}
                      onChange={gate => setFeature(id, { ...def, gate })}
                    />
                  )}
                </td>

                {/* Hint (tooltip on locked tab) */}
                <td>
                  <input
                    type="text"
                    className="fge-text"
                    value={def.hint ?? ''}
                    placeholder="Lock tooltip…"
                    disabled={fixed}
                    onChange={e => setFeature(id, { ...def, hint: e.target.value || null })}
                  />
                </td>

                {/* Unlock toast message */}
                <td>
                  <input
                    type="text"
                    className="fge-text"
                    value={def.unlockMsg ?? ''}
                    placeholder="Toast on unlock…"
                    disabled={fixed}
                    onChange={e => setFeature(id, { ...def, unlockMsg: e.target.value || null })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
