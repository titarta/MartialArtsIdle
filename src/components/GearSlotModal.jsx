const SLOT_DESC = {
  head:    'Headbands, crowns, and jade hairpins. Enhances spiritual defence and focus during cultivation.',
  neck:    'Pendants and talismans worn close to the heart. Provides soul protection and elemental resistance.',
  body:    'Robes and battle vests. The primary defensive piece — protects against physical and elemental damage.',
  hands:   'Bracers and gauntlets. Enhances strikes, improves blocking, and channels elemental energy through blows.',
  waist:   'Sashes and belts. Stabilises the dantian, improves qi circulation, and allows weapon carry.',
  feet:    'Boots and sandals. Improves movement, footwork, and dodge during combat.',
  ring:    'Power rings focus combat stats through the meridians; spatial rings provide extra storage.',
  weapon:  'Swords, polearms, and other weapons. Provide flat damage to the attack formula and unlock secret techniques.',
};

function GearSlotModal({ slot, onClose }) {
  if (!slot) return null;

  const desc = SLOT_DESC[slot.type] ?? 'An equipment slot.';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>x</button>

        <div className="modal-sprite gear-slot-empty-icon">
          <span className="gear-slot-empty-glyph">?</span>
        </div>

        <h2 className="modal-title">{slot.label}</h2>
        <span className="modal-rarity" style={{ color: 'var(--text-muted)' }}>Empty Slot</span>
        <p className="modal-desc">{desc}</p>
      </div>
    </div>
  );
}

export default GearSlotModal;
