import { useMemo } from 'react';
import {
  SHOP_ITEMS,
  SHOP_ITEMS_BY_ID,
  COSMETIC_SLOTS,
} from '../data/shopItems';

const BASE = import.meta.env.BASE_URL;

// Lifted from SpiritBazaarScreen so previews look identical between
// Bazaar and Wardrobe. Cultivator + crystal sprites use a mid-tier
// (t1 character / tier-5 crystal) so the tint reads against a familiar
// base. Particles + backgrounds fall back to the item icon / gradient.
const CULTIVATOR_SPRITE = `${BASE}sprites/cultivator/t1_qi_transformation_normal.png`;
const CRYSTAL_SPRITE    = `${BASE}crystals/crystal_5.png`;

const TINT_FILTERS = {
  cos_char_crimson:     'hue-rotate(-95deg) saturate(1.35) brightness(0.95)',
  cos_char_verdant:     'hue-rotate(60deg) saturate(1.2) brightness(0.95)',
  cos_char_amethyst:    'hue-rotate(180deg) saturate(1.2) brightness(0.95)',
  cos_crystal_verdant:  'hue-rotate(110deg) saturate(1.25) brightness(0.95)',
  cos_crystal_amber:    'hue-rotate(-140deg) saturate(1.4) brightness(1.05)',
  cos_particles_jade:   'hue-rotate(110deg) saturate(1.3)',
  cos_particles_violet: 'hue-rotate(180deg) saturate(1.3) brightness(1.1)',
};

const SLOT_ORDER = [
  COSMETIC_SLOTS.CHARACTER,
  COSMETIC_SLOTS.CRYSTAL,
  COSMETIC_SLOTS.PARTICLES,
  COSMETIC_SLOTS.BACKGROUND,
];

const SLOT_LABELS = {
  [COSMETIC_SLOTS.CHARACTER]:  'Cultivator',
  [COSMETIC_SLOTS.CRYSTAL]:    'Crystal',
  [COSMETIC_SLOTS.PARTICLES]:  'Particles',
  [COSMETIC_SLOTS.BACKGROUND]: 'Backdrop',
};

// Default "what's worn when no skin is equipped" tile per slot. Mirrors
// the mockup's "DEFAULT" pill so the player understands an empty slot
// still shows something on the cultivator. Kept terse — the tile is
// inspectational, not interactive.
const SLOT_DEFAULTS = {
  [COSMETIC_SLOTS.CHARACTER]:  { icon: '🧘',  name: 'White-gold robes',  desc: 'The default cultivator look that ships with your path.' },
  [COSMETIC_SLOTS.CRYSTAL]:    { icon: '◆',   name: 'Spirit Crystal',    desc: 'The default qi crystal, white-gold across all tiers.' },
  [COSMETIC_SLOTS.PARTICLES]:  { icon: '✨',  name: 'White-gold motes',  desc: 'The default qi particle flow that comes with your path.' },
  [COSMETIC_SLOTS.BACKGROUND]: { icon: '🏔',  name: 'Mountain Path',     desc: 'The default lacquered backdrop of your meditation hall.' },
};

function CosmeticPreview({ item }) {
  if (!item) return null;
  if (item.cosmeticSlot === COSMETIC_SLOTS.CHARACTER) {
    return (
      <img
        src={CULTIVATOR_SPRITE}
        alt=""
        className="wdb-tile-preview-sprite"
        draggable="false"
        style={TINT_FILTERS[item.id] ? { filter: TINT_FILTERS[item.id] } : undefined}
      />
    );
  }
  if (item.cosmeticSlot === COSMETIC_SLOTS.CRYSTAL) {
    return (
      <img
        src={CRYSTAL_SPRITE}
        alt=""
        className="wdb-tile-preview-sprite"
        draggable="false"
        style={TINT_FILTERS[item.id] ? { filter: TINT_FILTERS[item.id] } : undefined}
      />
    );
  }
  if (item.cosmeticSlot === COSMETIC_SLOTS.PARTICLES) {
    return (
      <span
        className="wdb-tile-preview-icon"
        style={TINT_FILTERS[item.id] ? { filter: TINT_FILTERS[item.id] } : undefined}
      >
        {item.icon}
      </span>
    );
  }
  if (item.cosmeticSlot === COSMETIC_SLOTS.BACKGROUND) {
    if (item.effect?.bodyClass === 'cosmetic-bg-dawn') {
      return <div className="wdb-tile-preview-bg" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(255,180,80,.7), rgba(120,60,30,.85))' }} />;
    }
    if (item.effect?.bodyClass === 'cosmetic-bg-twilight') {
      return <div className="wdb-tile-preview-bg" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(120,140,255,.7), rgba(40,20,80,.9))' }} />;
    }
  }
  return <span className="wdb-tile-preview-icon">{item?.icon ?? '◇'}</span>;
}

/**
 * WardrobeTab — owned cosmetics by slot.
 *
 * Reads `inventory.inv.cosmetics` ({ [itemId]: true }) and
 * `inventory.inv.equipped` ({ [slot]: itemId }). Per slot:
 *   - If a cosmetic is equipped, render the equipped tile at the top
 *     with an "EQUIPPED" ribbon and an Unequip button.
 *   - Render the rest of the owned items for that slot as a 2-col
 *     closet grid; tapping a closet tile equips it.
 *   - If nothing is owned for that slot, show a "default" tile + a
 *     bazaar nudge so the player knows where to buy more.
 *
 * Tap-to-equip uses inventory.equip(id); the unequip button calls
 * inventory.unequip(slot). Both come from useShopInventory.
 */
function WardrobeTab({ inventory, onBrowseBazaar }) {
  // Group every owned cosmetic by slot so we render each section in
  // SLOT_ORDER below regardless of declaration order in shopItems.js.
  const ownedBySlot = useMemo(() => {
    const groups = { character: [], crystal: [], particles: [], background: [] };
    const owned = inventory?.inv?.cosmetics ?? {};
    for (const item of SHOP_ITEMS) {
      if (item.category !== 'cosmetic') continue;
      if (item.comingSoon) continue;          // Coming-soon cards can't be owned
      if (!owned[item.id]) continue;
      const slot = item.cosmeticSlot;
      if (!slot || !groups[slot]) continue;
      groups[slot].push(item);
    }
    return groups;
  }, [inventory?.inv?.cosmetics]);

  const equipped = inventory?.inv?.equipped ?? {};

  const totalOwned    = SLOT_ORDER.reduce((s, slot) => s + ownedBySlot[slot].length, 0);
  const totalEquipped = SLOT_ORDER.reduce((s, slot) => s + (equipped[slot] ? 1 : 0), 0);

  return (
    <div className="wdb-tab">
      <div className="wdb-body">
        {SLOT_ORDER.map(slot => {
          const items       = ownedBySlot[slot];
          const equippedId  = equipped[slot] ?? null;
          const equippedItem = equippedId ? SHOP_ITEMS_BY_ID[equippedId] : null;
          // Equipped tile lives on top; the rest (owned but not worn)
          // fill the closet grid below. If nothing is owned, we render
          // the default tile + a bazaar nudge instead.
          const closet = items.filter(it => it.id !== equippedId);

          return (
            <section key={slot} className="wdb-slot-section">
              <div className="wdb-slot-head">
                <span className="wdb-slot-name">{SLOT_LABELS[slot]}</span>
                <span className="wdb-slot-rule" aria-hidden="true" />
                <span className="wdb-slot-count">
                  {items.length === 0
                    ? 'none owned'
                    : `${equippedItem ? '1 equipped · ' : ''}${items.length} owned`}
                </span>
              </div>

              {equippedItem ? (
                <div className="wdb-eq-tile">
                  <span className="wdb-eq-ribbon">EQUIPPED</span>
                  <div className="wdb-eq-preview">
                    <CosmeticPreview item={equippedItem} />
                  </div>
                  <div className="wdb-eq-body">
                    <div className="wdb-eq-name">{equippedItem.name}</div>
                    <div className="wdb-eq-desc">{equippedItem.desc}</div>
                  </div>
                  <div className="wdb-eq-actions">
                    <button
                      type="button"
                      className="wdb-eq-btn"
                      onClick={() => inventory.unequip(slot)}
                    >
                      Unequip
                    </button>
                  </div>
                </div>
              ) : (
                <div className="wdb-eq-tile wdb-eq-tile-default">
                  <span className="wdb-eq-ribbon">DEFAULT</span>
                  <div className="wdb-eq-preview">
                    <span className="wdb-tile-preview-icon">{SLOT_DEFAULTS[slot].icon}</span>
                  </div>
                  <div className="wdb-eq-body">
                    <div className="wdb-eq-name">{SLOT_DEFAULTS[slot].name}</div>
                    <div className="wdb-eq-desc">{SLOT_DEFAULTS[slot].desc}</div>
                  </div>
                  <div className="wdb-eq-actions">
                    <span className="wdb-eq-active-label">Active</span>
                  </div>
                </div>
              )}

              {closet.length > 0 && (
                <div className="wdb-closet-grid">
                  {closet.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className="wdb-closet-tile"
                      onClick={() => inventory.equip(item.id)}
                    >
                      <div className="wdb-tile-preview">
                        <CosmeticPreview item={item} />
                      </div>
                      <div className="wdb-tile-name">{item.name}</div>
                      <div className="wdb-tile-cta">Equip</div>
                    </button>
                  ))}
                </div>
              )}

              {items.length === 0 && (
                <button
                  type="button"
                  className="wdb-bazaar-nudge"
                  onClick={onBrowseBazaar}
                >
                  <span className="wdb-bazaar-nudge-text">
                    No cosmetics owned in this slot.
                  </span>
                  <span className="wdb-bazaar-nudge-link">Browse Bazaar →</span>
                </button>
              )}
            </section>
          );
        })}
      </div>

      <div className="wdb-footer">
        <span>
          <b>{totalOwned}</b> cosmetic{totalOwned === 1 ? '' : 's'} owned · <b>{totalEquipped}</b> equipped
        </span>
        <button type="button" className="wdb-footer-link" onClick={onBrowseBazaar}>
          Bazaar →
        </button>
      </div>
    </div>
  );
}

export default WardrobeTab;
