/**
 * RecordEditor — master/detail UI for a record-map or indexed-array domain.
 *
 * Left column: searchable list of records from the BASELINE source data
 * (so designers can edit any existing record without it needing an override
 * entry first). Dirty records are flagged.
 *
 * Right column: SchemaForm for the currently selected record, seeded with
 * (baseline ∪ override patch) and writing back as a partial patch.
 *
 * The parent (Designer.jsx) passes:
 *   baselineRecords — map or indexed array of original records (read-only)
 *   editedRecords   — current override.records map (keyed by id or index str)
 *   onChangeRecords — (nextRecords) => void
 *   schema          — field descriptors for SchemaForm
 *   idField         — where the id lives on each record (default 'id')
 *   isArrayIndex    — if true, keys are index strings and display shows order
 *   displayLabel    — (baseline, key) => string for the list row
 */

import { useMemo, useState } from 'react';
import SchemaForm from '../SchemaForm.jsx';

export default function RecordEditor({
  baselineRecords,
  editedRecords,
  onChangeRecords,
  schema,
  idField = 'id',
  isArrayIndex = false,
  displayLabel,
  allowAdd = false,
  newIdPlaceholder = 'new_id',
  initialNewRecord = {},
}) {
  const baselineList = useMemo(() => toBaselineList(baselineRecords, idField, isArrayIndex), [baselineRecords, idField, isArrayIndex]);
  const [selectedKey, setSelectedKey] = useState(() => baselineList[0]?.key ?? null);
  const [filter, setFilter] = useState('');

  const selectedBaseline = selectedKey != null ? baselineList.find((r) => r.key === selectedKey)?.record : null;
  const selectedPatch    = selectedKey != null ? editedRecords[selectedKey] : null;
  // Merge baseline + patch for the form's seed value.
  const mergedValue = selectedBaseline
    ? { ...selectedBaseline, ...(selectedPatch || {}) }
    : (selectedPatch || null);

  const onFormChange = (next) => {
    // Compute the partial patch: fields where merged differs from baseline.
    const base = selectedBaseline || {};
    const patch = {};
    let hasPatch = false;
    for (const k of new Set([...Object.keys(base), ...Object.keys(next)])) {
      if (JSON.stringify(base[k]) !== JSON.stringify(next[k])) {
        if (next[k] === undefined) {
          patch[k] = null; // deletion sentinel
        } else {
          patch[k] = next[k];
        }
        hasPatch = true;
      }
    }

    const nextRecords = { ...editedRecords };
    if (hasPatch) {
      nextRecords[selectedKey] = patch;
    } else {
      delete nextRecords[selectedKey];
    }
    onChangeRecords(nextRecords);
  };

  const discardThisRecord = () => {
    const nextRecords = { ...editedRecords };
    delete nextRecords[selectedKey];
    onChangeRecords(nextRecords);
  };

  const addNewRecord = () => {
    const newId = prompt(`New record id (${newIdPlaceholder}):`, '');
    if (!newId) return;
    if (baselineRecords[newId] || editedRecords[newId]) {
      alert(`Record "${newId}" already exists.`);
      return;
    }
    onChangeRecords({ ...editedRecords, [newId]: { ...initialNewRecord } });
    setSelectedKey(newId);
  };

  const filtered = useMemo(() => {
    if (!filter) return baselineList;
    const q = filter.toLowerCase();
    return baselineList.filter((r) => {
      const lbl = displayLabel ? displayLabel(r.record, r.key) : `${r.key}`;
      return String(r.key).toLowerCase().includes(q) || lbl.toLowerCase().includes(q);
    });
  }, [baselineList, filter, displayLabel]);

  // Additionally include any records that only exist in the override (new ids).
  const extraKeys = Object.keys(editedRecords).filter((k) => !baselineList.some((b) => b.key === k));

  const selectedIsNew = selectedKey != null && !baselineRecords[selectedKey];

  return (
    <div className="dz-record-editor">
      <aside className="dz-rec-list">
        <div className="dz-rec-list-header">
          <input
            className="dz-input"
            placeholder="Search…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {allowAdd && (
            <button className="dz-btn dz-btn-ghost dz-add-btn" onClick={addNewRecord}>+ New</button>
          )}
        </div>
        <ul>
          {filtered.map((r) => (
            <li key={r.key}>
              <button
                className={`dz-rec-item ${selectedKey === r.key ? 'active' : ''} ${editedRecords[r.key] ? 'dirty' : ''}`}
                onClick={() => setSelectedKey(r.key)}
              >
                <span className="dz-rec-item-label">
                  {displayLabel ? displayLabel(r.record, r.key) : r.key}
                </span>
                {editedRecords[r.key] && <span className="dz-rec-dot" />}
              </button>
            </li>
          ))}
          {extraKeys.length > 0 && (
            <>
              <li className="dz-rec-list-sep">New records</li>
              {extraKeys.map((k) => (
                <li key={k}>
                  <button
                    className={`dz-rec-item ${selectedKey === k ? 'active' : ''} dirty`}
                    onClick={() => setSelectedKey(k)}
                  >
                    <span className="dz-rec-item-label">{k}</span>
                    <span className="dz-rec-dot" />
                  </button>
                </li>
              ))}
            </>
          )}
        </ul>
      </aside>

      <section className="dz-rec-detail">
        {selectedKey == null ? (
          <div className="dz-loading">Select a record on the left.</div>
        ) : (
          <>
            <div className="dz-rec-detail-header">
              <span className="dz-rec-detail-id">{selectedKey}</span>
              {selectedIsNew && <span className="dz-badge">new</span>}
              {editedRecords[selectedKey] && !selectedIsNew && (
                <button className="dz-btn dz-btn-ghost" onClick={discardThisRecord}>
                  Revert to baseline
                </button>
              )}
            </div>
            <SchemaForm
              schema={schema}
              value={mergedValue || {}}
              onChange={onFormChange}
            />
          </>
        )}
      </section>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function toBaselineList(records, idField, isArrayIndex) {
  if (isArrayIndex) {
    // baselineRecords is an array; key = index string
    return records.map((record, i) => ({ key: String(i), record }));
  }
  // baselineRecords is a map or array with id field
  if (Array.isArray(records)) {
    return records.map((record) => ({ key: String(record[idField]), record }));
  }
  return Object.keys(records).map((key) => ({ key, record: records[key] }));
}
