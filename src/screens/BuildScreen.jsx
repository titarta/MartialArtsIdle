import { useState } from 'react';
import GearSlotModal from '../components/GearSlotModal';
import { LAW_RARITY } from '../data/laws';

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

function BuildScreen({ cultivation }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const { activeLaw, isLawUnlocked } = cultivation;
  const rarity = LAW_RARITY[activeLaw.rarity];

  return (
    <div className="screen build-screen">
      <h1>Equipment</h1>
      <p className="subtitle">Gear, laws, and techniques</p>

      {/* ── Artefacts + Law side by side ── */}
      <div className="build-top-row">
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

        <section className="build-section build-law-section">
          <h2 className="build-section-title">Cultivation Law</h2>
          <div className={`build-law-card ${!isLawUnlocked ? 'build-law-locked' : ''}`}>

            {/* Header */}
            <div className="law-header">
              <span className="law-name">{activeLaw.name}</span>
              <div className="law-badges">
                <span className="law-badge law-element">{activeLaw.element}</span>
                <span className="law-badge law-rarity-badge" style={{ color: rarity.color, borderColor: rarity.color }}>
                  {rarity.label}
                </span>
              </div>
            </div>

            {/* Flavour */}
            <p className="law-flavour">"{activeLaw.flavour}"</p>

            <div className="law-divider" />

            {/* Cultivation speed */}
            <div className="law-stat-row">
              <span className="law-stat-label">Cultivation Speed</span>
              <span className="law-stat-value">×{activeLaw.cultivationSpeedMult.toFixed(1)}</span>
            </div>

            <div className="law-divider" />

            {/* Passives */}
            <div className="law-passives">
              <span className="law-stat-label">
                Passives ({activeLaw.passives.length}/{rarity.passiveSlots})
              </span>
              {activeLaw.passives.map((p) => (
                <div key={p.name} className="law-passive">
                  <span className="law-passive-name">{p.name}</span>
                  <span className="law-passive-desc">{p.description}</span>
                </div>
              ))}
            </div>

            <div className="law-divider" />

            {/* Realm requirement */}
            <div className="law-req-row">
              <span className="law-stat-label">Requires</span>
              <span className={`law-req-status ${isLawUnlocked ? 'law-req-met' : 'law-req-locked'}`}>
                {isLawUnlocked ? '✓' : '🔒'} {activeLaw.realmRequirementLabel}
              </span>
            </div>

          </div>
        </section>
      </div>

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
