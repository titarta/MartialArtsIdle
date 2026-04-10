import { useState } from 'react';
import GearSlotModal from '../components/GearSlotModal';

// col/row are 1-indexed CSS grid positions (3 columns, 5 rows)
const GEAR_SLOTS = [
  { id: 'head',   label: 'Head',   type: 'head',   col: 2, row: 1 },

  { id: 'ring_1', label: 'Ring',   type: 'ring',   col: 1, row: 2 },
  { id: 'neck',   label: 'Neck',   type: 'neck',   col: 2, row: 2 },
  { id: 'ring_2', label: 'Ring',   type: 'ring',   col: 3, row: 2 },

  { id: 'weapon', label: 'Weapon', type: 'weapon', col: 1, row: 3 },
  { id: 'body',   label: 'Body',   type: 'body',   col: 2, row: 3 },
  { id: 'hands',  label: 'Hands',  type: 'hands',  col: 3, row: 3 },

  { id: 'waist',  label: 'Waist',  type: 'waist',  col: 2, row: 4 },

  { id: 'ring_3', label: 'Ring',   type: 'ring',   col: 1, row: 5 },
  { id: 'feet',   label: 'Feet',   type: 'feet',   col: 2, row: 5 },
  { id: 'ring_4', label: 'Ring',   type: 'ring',   col: 3, row: 5 },
];

function BuildScreen() {
  const [selectedSlot, setSelectedSlot] = useState(null);

  return (
    <div className="screen build-screen">
      <h1>Equipment</h1>
      <p className="subtitle">Gear, laws, and techniques</p>

      {/* ── Artefact body layout ── */}
      <section className="build-section">
        <h2 className="build-section-title">Artefacts</h2>
        <div className="gear-body-layout">
          {GEAR_SLOTS.map((slot) => (
            <button
              key={slot.id}
              className="inv-slot gear-slot"
              style={{ gridColumn: slot.col, gridRow: slot.row }}
              onClick={() => setSelectedSlot(slot)}
            >
              <span className="gear-slot-glyph">+</span>
              <span className="inv-name gear-slot-name">{slot.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Cultivation Law ── */}
      <section className="build-section">
        <h2 className="build-section-title">Cultivation Law</h2>
        <div className="card build-slot-wide">
          <span className="build-slot-label">Active Law</span>
          <p className="build-slot-empty">No law cultivated</p>
        </div>
      </section>

      {/* ── Secret Techniques ── */}
      <section className="build-section">
        <h2 className="build-section-title">Secret Techniques</h2>
        <div className="card-grid">
          {['Technique I', 'Technique II', 'Technique III'].map((t) => (
            <div key={t} className="card build-slot">
              <span className="build-slot-label">{t}</span>
              <p className="build-slot-empty">None</p>
            </div>
          ))}
        </div>
      </section>

      {selectedSlot && (
        <GearSlotModal slot={selectedSlot} onClose={() => setSelectedSlot(null)} />
      )}
    </div>
  );
}

export default BuildScreen;
