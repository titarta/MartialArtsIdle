import { useState, useCallback, useRef } from 'react';
import TechniqueSlotModal from '../components/TechniqueSlotModal';
import { LAW_RARITY } from '../data/laws';
import { TECHNIQUE_QUALITY, TYPE_COLOR, getCooldown } from '../data/techniques';
import { QUALITY, getSlotBonuses } from '../data/artefacts';
import { MOD } from '../data/stats';

// ── Stat label map for tooltips ──────────────────────────────────────────────
const STAT_LABELS = {
  physical_damage:  'Phys. Dmg',
  elemental_damage: 'Elem. Dmg',
  defense:          'Defense',
  elemental_defense:'Elem. Def',
  soul_toughness:   'Soul Tough.',
  health:           'Health',
  essence:          'Essence',
  soul:             'Soul',
  body:             'Body',
  exploit_chance:   'Exploit %',
};

function statLabel(stat) {
  return STAT_LABELS[stat] || stat.replace(/_/g, ' ');
}

function formatBonus(b) {
  if (b.type === MOD.INCREASED) return `+${Math.round(b.value * 100)}% ${statLabel(b.stat)}`;
  return `+${b.value} ${statLabel(b.stat)}`;
}

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

const SLOT_LABELS = ['I', 'II', 'III'];

// ── Artefact Tooltip ─────────────────────────────────────────────────────────

function ArtefactTooltip({ artefact, affixes, style }) {
  if (!artefact) return null;
  const quality = QUALITY[artefact.rarity];
  const baseBonuses = getSlotBonuses(artefact.slot, artefact.rarity);

  return (
    <div className="art-tooltip" style={style}>
      <span className="art-tooltip-name" style={{ color: quality?.color }}>{artefact.name}</span>
      <span className="art-tooltip-quality" style={{ color: quality?.color }}>{quality?.label}</span>
      {baseBonuses.length > 0 && (
        <div className="art-tooltip-section">
          {baseBonuses.map((b, i) => (
            <span key={i} className="art-tooltip-line">{formatBonus(b)}</span>
          ))}
        </div>
      )}
      {affixes && affixes.length > 0 && (
        <div className="art-tooltip-section art-tooltip-affixes">
          {affixes.map((a, i) => (
            <span key={i} className="art-tooltip-line art-tooltip-affix">{formatBonus(a)}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Hook: tooltip position tracking via mouse/touch ──────────────────────────

function useTooltipPos() {
  const [pos, setPos] = useState(null);
  const touchTimer = useRef(null);

  const onMouseEnter = useCallback((e) => {
    setPos({ x: e.clientX + 12, y: e.clientY + 12 });
  }, []);

  const onMouseMove = useCallback((e) => {
    setPos({ x: e.clientX + 12, y: e.clientY + 12 });
  }, []);

  const onMouseLeave = useCallback(() => {
    setPos(null);
  }, []);

  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    touchTimer.current = setTimeout(() => {
      setPos({ x: t.clientX, y: t.clientY - 80 });
    }, 500);
  }, []);

  const onTouchEnd = useCallback(() => {
    clearTimeout(touchTimer.current);
    setPos(null);
  }, []);

  const onTouchMove = useCallback(() => {
    clearTimeout(touchTimer.current);
    setPos(null);
  }, []);

  return {
    pos,
    handlers: { onMouseEnter, onMouseMove, onMouseLeave, onTouchStart, onTouchEnd, onTouchMove },
  };
}

// ── Inline Artefact Picker ───────────────────────────────────────────────────

function InlineArtefactPicker({ slot, artefacts, onClose }) {
  const available = artefacts.getOwnedForSlot(slot.type);
  const equipped  = artefacts.getEquipped(slot.id);
  const tooltip   = useTooltipPos();
  const [hoveredUid, setHoveredUid] = useState(null);

  const hoveredArt = hoveredUid ? available.find(a => a.uid === hoveredUid) : null;
  const hoveredAffixes = hoveredUid
    ? (artefacts.owned.find(o => o.uid === hoveredUid)?.affixes ?? [])
    : [];

  return (
    <div className="art-inline-picker">
      <div className="art-inline-picker-header">
        <span className="art-inline-picker-title">{slot.label} - Select Artefact</span>
        <button className="art-inline-picker-close" onClick={onClose}>x</button>
      </div>
      {available.length === 0 ? (
        <p className="art-pick-empty">No artefacts for this slot</p>
      ) : (
        <div className="art-inline-picker-grid">
          {available.map(a => {
            const quality = QUALITY[a.rarity];
            const isEquipped = equipped?.uid === a.uid;
            return (
              <button
                key={a.uid}
                className={`art-inline-card${isEquipped ? ' art-inline-card-equipped' : ''}`}
                style={{ borderColor: isEquipped ? quality?.color : undefined }}
                onClick={() => {
                  if (isEquipped) {
                    artefacts.unequip(slot.id);
                  } else {
                    artefacts.equip(slot.id, a.uid);
                  }
                  onClose();
                }}
                onMouseEnter={(e) => {
                  setHoveredUid(a.uid);
                  tooltip.handlers.onMouseEnter(e);
                }}
                onMouseMove={tooltip.handlers.onMouseMove}
                onMouseLeave={(e) => {
                  setHoveredUid(null);
                  tooltip.handlers.onMouseLeave(e);
                }}
                onTouchStart={(e) => {
                  setHoveredUid(a.uid);
                  tooltip.handlers.onTouchStart(e);
                }}
                onTouchEnd={(e) => {
                  setHoveredUid(null);
                  tooltip.handlers.onTouchEnd(e);
                }}
                onTouchMove={tooltip.handlers.onTouchMove}
              >
                <span className="art-inline-card-name" style={{ color: quality?.color }}>{a.name}</span>
                {isEquipped && <span className="art-inline-card-tag">Equipped</span>}
              </button>
            );
          })}
        </div>
      )}

      {tooltip.pos && hoveredArt && (
        <ArtefactTooltip
          artefact={hoveredArt}
          affixes={hoveredAffixes}
          style={{ position: 'fixed', left: tooltip.pos.x, top: tooltip.pos.y }}
        />
      )}
    </div>
  );
}

// ── Law Picker Modal ─────────────────────────────────────────────────────────

function LawPickerModal({ ownedLaws, activeLaw, onSelect, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content law-picker-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>x</button>
        <h2 className="modal-title">Select Cultivation Law</h2>
        <div className="law-picker-list">
          {ownedLaws.map(law => {
            const rarity = LAW_RARITY[law.rarity];
            const isActive = law.id === activeLaw.id;
            return (
              <button
                key={law.id}
                className={`law-picker-card${isActive ? ' law-picker-card-active' : ''}`}
                onClick={() => { onSelect(law.id); onClose(); }}
              >
                <div className="law-picker-card-header">
                  <span className="law-picker-card-name">{law.name}</span>
                  <div className="law-badges">
                    <span className="law-badge law-element">{law.element}</span>
                    <span className="law-badge law-rarity-badge" style={{ color: rarity.color, borderColor: rarity.color }}>
                      {rarity.label}
                    </span>
                  </div>
                </div>
                <div className="law-picker-card-stats">
                  <span>Cult. Speed: x{law.cultivationSpeedMult.toFixed(1)}</span>
                  <span>Ess: {law.essenceMult} / Soul: {law.soulMult} / Body: {law.bodyMult}</span>
                </div>
                {isActive && <span className="law-picker-card-active-tag">Active</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Technique Slot Card ──────────────────────────────────────────────────────

function TechSlotCard({ index, tech, onClick }) {
  if (!tech) {
    return (
      <button className="card build-slot build-tech-slot" onClick={onClick}>
        <span className="build-slot-label">Technique {SLOT_LABELS[index]}</span>
        <p className="build-slot-empty">None</p>
      </button>
    );
  }

  const quality = TECHNIQUE_QUALITY[tech.quality];
  const cd      = getCooldown(tech.type, tech.quality);

  return (
    <button className="card build-slot build-tech-slot build-tech-filled" onClick={onClick}>
      <span className="build-slot-label">Technique {SLOT_LABELS[index]}</span>
      <span className="build-tech-name">{tech.name}</span>
      <div className="build-tech-badges">
        <span className="build-tech-badge" style={{ color: TYPE_COLOR[tech.type], borderColor: TYPE_COLOR[tech.type] }}>
          {tech.type}
        </span>
        <span className="build-tech-badge" style={{ color: quality.color, borderColor: quality.color }}>
          {quality.label}
        </span>
        <span className="build-tech-badge build-tech-rank">{tech.rank}</span>
      </div>
      <span className="build-tech-cd">CD: {cd.toFixed(1)}s</span>
    </button>
  );
}

// ── Main BuildScreen ─────────────────────────────────────────────────────────

function BuildScreen({ cultivation, techniques, artefacts }) {
  const [selectedSlot,     setSelectedSlot]     = useState(null);
  const [selectedTechSlot, setSelectedTechSlot] = useState(null);
  const [lawPickerOpen,    setLawPickerOpen]    = useState(false);

  const { activeLaw, setActiveLaw, isLawUnlocked, realmIndex, ownedLaws } = cultivation;
  const rarity = LAW_RARITY[activeLaw.rarity];

  // Gear slot hover tooltip
  const gearTooltip = useTooltipPos();
  const [hoveredSlotId, setHoveredSlotId] = useState(null);

  const hoveredArt = hoveredSlotId ? artefacts.getEquipped(hoveredSlotId) : null;
  const hoveredGearAffixes = hoveredSlotId
    ? (() => {
        const uid = artefacts.equipped[hoveredSlotId];
        if (!uid) return [];
        return artefacts.owned.find(o => o.uid === uid)?.affixes ?? [];
      })()
    : [];

  const handleEquip = (slotIndex, id) => {
    if (id === null) {
      techniques.unequip(slotIndex);
    } else {
      techniques.equip(slotIndex, id);
    }
    setSelectedTechSlot(null);
  };

  return (
    <div className="screen build-screen">
      <h1>Equipment</h1>
      <p className="subtitle">Gear, laws, and techniques</p>

      {/* -- Law + Artefacts side by side -- */}
      <div className="build-top-row">

        {/* Law card - LEFT / TOP on mobile */}
        <section className="build-section build-law-compact-section" onClick={() => setLawPickerOpen(true)}>
          <h2 className="build-section-title">Cultivation Law</h2>
          <div className={`build-law-card build-law-card-compact${!isLawUnlocked ? ' build-law-locked' : ''}`}>
            <div className="law-header">
              <span className="law-name">{activeLaw.name}</span>
              <div className="law-badges">
                <span className="law-badge law-element">{activeLaw.element}</span>
                <span className="law-badge law-rarity-badge" style={{ color: rarity.color, borderColor: rarity.color }}>
                  {rarity.label}
                </span>
              </div>
            </div>

            <p className="law-flavour">"{activeLaw.flavour}"</p>

            <div className="law-divider" />

            <div className="law-stat-row">
              <span className="law-stat-label">Cult. Speed</span>
              <span className="law-stat-value">x{activeLaw.cultivationSpeedMult.toFixed(1)}</span>
            </div>

            <div className="law-divider" />

            <div className="law-stat-row">
              <span className="law-stat-label">Essence</span>
              <span className="law-stat-value">{activeLaw.essenceMult}</span>
            </div>
            <div className="law-stat-row">
              <span className="law-stat-label">Soul</span>
              <span className="law-stat-value">{activeLaw.soulMult}</span>
            </div>
            <div className="law-stat-row">
              <span className="law-stat-label">Body</span>
              <span className="law-stat-value">{activeLaw.bodyMult}</span>
            </div>

            <div className="law-divider" />

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

            <div className="law-req-row">
              <span className="law-stat-label">Requires</span>
              <span className={`law-req-status ${isLawUnlocked ? 'law-req-met' : 'law-req-locked'}`}>
                {isLawUnlocked ? '\u2713' : '\uD83D\uDD12'} {activeLaw.realmRequirementLabel}
              </span>
            </div>

            <span className="law-tap-hint">Tap to change</span>
          </div>
        </section>

        {/* Artefact grid - RIGHT / BOTTOM on mobile */}
        <section className="build-section build-artefact-section">
          <h2 className="build-section-title">Artefacts</h2>
          <div className="gear-body-layout">
            {GEAR_SLOTS.map((slot) => {
              const art     = artefacts.getEquipped(slot.id);
              const quality = art ? QUALITY[art.rarity] : null;
              return (
                <button
                  key={slot.id}
                  className={`inv-slot gear-slot${art ? ' gear-slot-filled' : ''}`}
                  style={{
                    gridColumn:  slot.col,
                    gridRow:     slot.row,
                    borderColor: quality?.color,
                    borderStyle: art ? 'solid' : undefined,
                  }}
                  onClick={() => setSelectedSlot(selectedSlot?.id === slot.id ? null : slot)}
                  onMouseEnter={(e) => {
                    if (art) {
                      setHoveredSlotId(slot.id);
                      gearTooltip.handlers.onMouseEnter(e);
                    }
                  }}
                  onMouseMove={(e) => {
                    if (art) gearTooltip.handlers.onMouseMove(e);
                  }}
                  onMouseLeave={(e) => {
                    setHoveredSlotId(null);
                    gearTooltip.handlers.onMouseLeave(e);
                  }}
                  onTouchStart={(e) => {
                    if (art) {
                      setHoveredSlotId(slot.id);
                      gearTooltip.handlers.onTouchStart(e);
                    }
                  }}
                  onTouchEnd={(e) => {
                    setHoveredSlotId(null);
                    gearTooltip.handlers.onTouchEnd(e);
                  }}
                  onTouchMove={gearTooltip.handlers.onTouchMove}
                >
                  {art ? (
                    <>
                      <span className="gear-slot-quality-dot" style={{ background: quality.color }} />
                      <span className="gear-slot-name gear-slot-name-filled" style={{ color: quality.color }}>
                        {art.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="gear-slot-glyph">+</span>
                      <span className="inv-name gear-slot-name">{slot.label}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Gear hover tooltip */}
          {gearTooltip.pos && hoveredArt && (
            <ArtefactTooltip
              artefact={hoveredArt}
              affixes={hoveredGearAffixes}
              style={{ position: 'fixed', left: gearTooltip.pos.x, top: gearTooltip.pos.y }}
            />
          )}

          {/* Inline artefact picker */}
          {selectedSlot && (
            <InlineArtefactPicker
              slot={selectedSlot}
              artefacts={artefacts}
              onClose={() => setSelectedSlot(null)}
            />
          )}
        </section>
      </div>

      {/* -- Secret Techniques -- */}
      <section className="build-section">
        <h2 className="build-section-title">Secret Techniques</h2>
        <div className="card-grid">
          {[0, 1, 2].map(i => (
            <TechSlotCard
              key={i}
              index={i}
              tech={techniques.equippedTechniques[i]}
              onClick={() => setSelectedTechSlot(i)}
            />
          ))}
        </div>
      </section>

      {/* Law picker modal */}
      {lawPickerOpen && (
        <LawPickerModal
          ownedLaws={ownedLaws}
          activeLaw={activeLaw}
          onSelect={setActiveLaw}
          onClose={() => setLawPickerOpen(false)}
        />
      )}

      {selectedTechSlot !== null && (
        <TechniqueSlotModal
          slotIndex={selectedTechSlot}
          currentId={techniques.slots[selectedTechSlot]}
          realmIndex={realmIndex}
          ownedTechniques={techniques.ownedTechniques}
          onEquip={handleEquip}
          onClose={() => setSelectedTechSlot(null)}
        />
      )}
    </div>
  );
}

export default BuildScreen;
