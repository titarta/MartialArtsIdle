import { useState, useEffect, useMemo } from 'react';
import { SHOP_ITEMS, SHOP_CATEGORIES, SHOP_ITEMS_BY_ID, COSMETIC_SLOTS } from '../data/shopItems';

const BASE = import.meta.env.BASE_URL;

// ── Cosmetic preview asset resolution ───────────────────────────────────
// Map cosmetic id → preview info. Drives the visual "this is what
// you're buying" tile at the top of each card. For Tier-1 (CSS-tint)
// cosmetics, the filter string is duplicated from App.css so the card
// preview tints LIVE — player sees exactly what their cultivator /
// crystal will look like with the cosmetic equipped. For Tier-2
// placeholders (`comingSoon: true`), the silhouette filter hides
// detail so the player gets a teaser without spoiling shape.

const CULTIVATOR_SPRITES = [
  '/sprites/cultivator/t0_novice_normal.png',
  '/sprites/cultivator/t1_qi_transformation_normal.png',
  '/sprites/cultivator/t2_true_element_normal.png',
  '/sprites/cultivator/t3_separation_normal.png',
  '/sprites/cultivator/t4_immortal_ascension_normal.png',
  '/sprites/cultivator/t5_saint_normal.png',
  '/sprites/cultivator/t6_saint_king_normal.png',
  '/sprites/cultivator/t7_origin_returning_normal.png',
  '/sprites/cultivator/t8_origin_king_normal.png',
  '/sprites/cultivator/t9_void_king_normal.png',
  '/sprites/cultivator/t10_dao_source_normal.png',
  '/sprites/cultivator/t11_emperor_realm_normal.png',
  '/sprites/cultivator/t12_open_heaven_normal.png',
];

// Tier-1 cosmetic preview filters — mirror the body-class rules in
// App.css. Kept in sync manually; if you change one, change both.
const TINT_PREVIEW_FILTERS = {
  cos_char_crimson:    'hue-rotate(-95deg) saturate(1.35) brightness(0.95)',
  cos_char_verdant:    'hue-rotate(60deg) saturate(1.2) brightness(0.95)',
  cos_char_amethyst:   'hue-rotate(180deg) saturate(1.2) brightness(0.95)',
  cos_crystal_verdant: 'hue-rotate(110deg) saturate(1.25) brightness(0.95)',
  cos_crystal_amber:   'hue-rotate(-140deg) saturate(1.4) brightness(1.05)',
  cos_particles_jade:  'hue-rotate(110deg) saturate(1.3)',
  cos_particles_violet:'hue-rotate(180deg) saturate(1.3) brightness(1.1)',
};

/** Resolve preview info for a cosmetic item. Returns:
 *    { kind: 'sprite' | 'gradient', src?, filter?, gradient? }
 *  Used by CosmeticCard to render the top half. */
function getPreview(item) {
  // Coming-soon items: silhouette a sprite to hint without spoiling.
  if (item.comingSoon) {
    if (item.cosmeticSlot === COSMETIC_SLOTS.CHARACTER) {
      const idx = Math.min(CULTIVATOR_SPRITES.length - 1, Math.max(0, item.previewSprite ?? 5));
      return { kind: 'sprite', src: `${BASE}${CULTIVATOR_SPRITES[idx].replace(/^\//, '')}`, silhouette: true };
    }
    if (item.cosmeticSlot === COSMETIC_SLOTS.CRYSTAL) {
      const tier = Math.min(10, Math.max(1, item.previewSprite ?? 5));
      return { kind: 'sprite', src: `${BASE}crystals/crystal_${tier}.png`, silhouette: true };
    }
    if (item.cosmeticSlot === COSMETIC_SLOTS.PARTICLES) {
      return { kind: 'particle-icon', icon: item.icon };
    }
    if (item.cosmeticSlot === COSMETIC_SLOTS.BACKGROUND) {
      return { kind: 'bg-icon', icon: item.icon };
    }
  }
  // Tier-1 — live tint preview on a default cultivator / crystal sprite.
  if (item.cosmeticSlot === COSMETIC_SLOTS.CHARACTER) {
    return {
      kind: 'sprite',
      src: `${BASE}${CULTIVATOR_SPRITES[1].replace(/^\//, '')}`, // t1 — first "real" cultivator look
      filter: TINT_PREVIEW_FILTERS[item.id],
    };
  }
  if (item.cosmeticSlot === COSMETIC_SLOTS.CRYSTAL) {
    return {
      kind: 'sprite',
      src: `${BASE}crystals/crystal_5.png`,
      filter: TINT_PREVIEW_FILTERS[item.id],
    };
  }
  if (item.cosmeticSlot === COSMETIC_SLOTS.PARTICLES) {
    return { kind: 'particle-icon', icon: item.icon, filter: TINT_PREVIEW_FILTERS[item.id] };
  }
  if (item.cosmeticSlot === COSMETIC_SLOTS.BACKGROUND) {
    // Pick a representative inline gradient based on bodyClass — keeps
    // the bg preview self-contained without needing the actual bg image.
    if (item.effect?.bodyClass === 'cosmetic-bg-dawn') {
      return { kind: 'gradient', gradient: 'radial-gradient(ellipse at 50% 30%, rgba(255,180,80,.6), rgba(120,60,30,.85))' };
    }
    if (item.effect?.bodyClass === 'cosmetic-bg-twilight') {
      return { kind: 'gradient', gradient: 'radial-gradient(ellipse at 50% 30%, rgba(120,140,255,.6), rgba(40,20,80,.9))' };
    }
  }
  return { kind: 'icon', icon: item.icon };
}

/** Live "X:YY left" countdown for a timed buff. Runs its own 1 Hz tick so
 *  re-rendering this small label doesn't drag the whole inventory hook
 *  into a per-second update. */
function BuffCountdown({ expiresAtMs }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remainingMs = Math.max(0, expiresAtMs - now);
  const totalSec = Math.floor(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const label =
    h > 0 ? `${h}h ${String(m).padStart(2, '0')}m`
  : m > 0 ? `${m}m ${String(s).padStart(2, '0')}s`
  :         `${s}s`;
  return <span className="bls-buff-countdown">{label} left</span>;
}

// ─── Evolution sprite resolver ────────────────────────────────────────
// For multi-tier cosmetics (character + crystal), resolves the FULL
// sprite list across all tiers using the existing in-game assets as
// placeholders. When real Tier-2 skins ship, each skin will declare
// its own `assetPaths` array and this function picks from there.
function getEvolutionSprites(item) {
  if (item.cosmeticSlot === COSMETIC_SLOTS.CHARACTER) {
    return CULTIVATOR_SPRITES.map(s => `${BASE}${s.replace(/^\//, '')}`);
  }
  if (item.cosmeticSlot === COSMETIC_SLOTS.CRYSTAL) {
    return Array.from({ length: 10 }, (_, i) => `${BASE}crystals/crystal_${i + 1}.png`);
  }
  return [];
}

// ─── Cosmetic Card — Evolution Procession ─────────────────────────────
// Full-width card with ALL evolution stages laid out as an overlapping
// procession that recedes into depth. The early stages (revealed, in
// full colour) sit in FRONT — fully visible. Later stages (silhouetted)
// recede backward — each one slightly smaller, lower opacity, partially
// hidden behind the one in front. The whole procession fits inside the
// card width with NO horizontal scroll — overlap is calculated to
// guarantee fit while still leaving every silhouette legible.
function CosmeticCardProcession({ item, ownership, balance, onBuy, onEquip, onUnequip, busy }) {
  const sprites = getEvolutionSprites(item);
  const revealedCount = 3;
  const totalStages = sprites.length;

  // CTA state machine
  let stateClass, label, disabled, onClick;
  if (item.comingSoon) {
    stateClass = 'coming-soon'; label = 'Coming Soon'; disabled = true; onClick = null;
  } else {
    const owned    = ownership.isCosmeticOwned(item.id);
    const equipped = ownership.isCosmeticEquipped(item.id);
    if (!owned)         { stateClass = 'buyable';  label = `${item.cost} BL`; disabled = balance < item.cost || busy; onClick = () => onBuy(item.id); }
    else if (equipped)  { stateClass = 'equipped'; label = 'Equipped';        disabled = false; onClick = () => onUnequip(item.cosmeticSlot); }
    else                { stateClass = 'owned';    label = 'Equip';           disabled = false; onClick = () => onEquip(item.id); }
  }

  return (
    <div className={`bls-card bls-card-strip-variant bls-card-${stateClass}`}>
      {stateClass === 'equipped'    && <span className="bls-card-ribbon">EQUIPPED</span>}
      {stateClass === 'coming-soon' && <span className="bls-card-ribbon bls-card-ribbon-soon">COMING SOON</span>}

      <div className="bls-strip-header">
        <div className="bls-strip-name">{item.name}</div>
        <button
          type="button"
          className={`bls-card-cta bls-card-cta-${stateClass} bls-strip-cta`}
          onClick={onClick ?? undefined}
          disabled={disabled}
        >
          {label}
        </button>
      </div>

      {/* Procession — `--stage-count` lets CSS compute the per-stage
          horizontal step so the whole row fits the card width without
          scrolling. Each sprite is absolutely positioned with a CSS
          var index. Earlier stages sit on TOP (higher z-index) so the
          silhouettes recede behind.
          `data-slot` lets CSS apply slot-specific tuning — crystal
          sprites are variable-aspect (not uniform like cultivators)
          so they need a fixed slot box to avoid late-tier visual
          shrink. */}
      <div
        className="bls-procession"
        data-slot={item.cosmeticSlot}
        style={{ '--stage-count': totalStages }}
      >
        {sprites.map((src, i) => {
          // Each stage is a wrapper with TWO image layers: the colour
          // sprite on the bottom + the silhouetted sprite on top with
          // a CSS-driven opacity. The opacity ramps stage-by-stage so
          // stages 2 + 3 are PARTIALLY silhouetted (gradual fade) and
          // stage 4+ becomes fully shadowed. See CSS for the ramp math.
          return (
            <div
              key={i}
              className="bls-proc-stage"
              style={{
                '--stage-index': i,
                zIndex: totalStages - i, // earlier stages on top
              }}
              aria-label={i === 0
                ? `Stage ${i + 1}`
                : `Stage ${i + 1} — partially revealed`}
            >
              <img
                src={src}
                alt=""
                draggable="false"
                className="bls-proc-sprite-color"
              />
              <img
                src={src}
                alt=""
                draggable="false"
                className="bls-proc-sprite-silhouette"
              />
            </div>
          );
        })}
      </div>

      <div className="bls-strip-footer">
        <span className="bls-strip-footer-label">
          {revealedCount} of {totalStages} stages revealed · evolves with you
        </span>
      </div>
    </div>
  );
}

// ─── Cosmetic Card ─────────────────────────────────────────────────────
// Large grid cell with a sprite preview area on top + name/price/CTA
// underneath. Used in the Cosmetics tab. Drives the showcase feel —
// the preview shows the player exactly what they're buying (or, for
// Coming Soon cards, a silhouetted teaser).
function CosmeticCard({ item, ownership, balance, onBuy, onEquip, onUnequip, busy }) {
  const preview = getPreview(item);

  // State machine for the CTA + card variant
  let stateClass, label, disabled, onClick;
  if (item.comingSoon) {
    stateClass = 'coming-soon';
    label      = 'Coming Soon';
    disabled   = true;
    onClick    = null;
  } else {
    const owned    = ownership.isCosmeticOwned(item.id);
    const equipped = ownership.isCosmeticEquipped(item.id);
    if (!owned) {
      stateClass = 'buyable';
      label      = `${item.cost} BL`;
      disabled   = balance < item.cost || busy;
      onClick    = () => onBuy(item.id);
    } else if (equipped) {
      stateClass = 'equipped';
      label      = 'Equipped';
      disabled   = false;
      onClick    = () => onUnequip(item.cosmeticSlot);
    } else {
      stateClass = 'owned';
      label      = 'Equip';
      disabled   = false;
      onClick    = () => onEquip(item.id);
    }
  }

  return (
    <div className={`bls-card bls-card-${stateClass}`} data-slot={item.cosmeticSlot}>
      {/* Equipped ribbon — a small badge in the top-right corner so the
          player can spot equipped items at a glance from the grid. */}
      {stateClass === 'equipped' && <span className="bls-card-ribbon">EQUIPPED</span>}
      {stateClass === 'coming-soon' && <span className="bls-card-ribbon bls-card-ribbon-soon">COMING SOON</span>}

      <div className="bls-card-preview">
        {preview.kind === 'sprite' && (
          <img
            src={preview.src}
            alt=""
            draggable="false"
            className={`bls-card-preview-sprite${preview.silhouette ? ' bls-card-preview-silhouette' : ''}`}
            style={preview.filter ? { filter: preview.filter } : undefined}
          />
        )}
        {preview.kind === 'particle-icon' && (
          <div className="bls-card-preview-particles" style={preview.filter ? { filter: preview.filter } : undefined}>
            <span className="bls-card-preview-orb bls-card-preview-orb-1">{preview.icon}</span>
            <span className="bls-card-preview-orb bls-card-preview-orb-2">{preview.icon}</span>
            <span className="bls-card-preview-orb bls-card-preview-orb-3">{preview.icon}</span>
          </div>
        )}
        {preview.kind === 'gradient' && (
          <div className="bls-card-preview-bg" style={{ background: preview.gradient }} />
        )}
        {preview.kind === 'bg-icon' && (
          <div className="bls-card-preview-bg-icon">{preview.icon}</div>
        )}
        {preview.kind === 'icon' && (
          <div className="bls-card-preview-icon">{preview.icon}</div>
        )}
      </div>

      <div className="bls-card-body">
        <div className="bls-card-name">{item.name}</div>
        {/* Evolution badge — only on character/crystal cosmetics that
            evolve through realm/tier (i.e. NOT background or particle
            sets which are single-form). Signals "you grow into this"
            without spoiling the specific evolved shapes. */}
        {(item.cosmeticSlot === COSMETIC_SLOTS.CHARACTER) && (
          <div className="bls-card-evolution-badge">
            <span className="bls-card-evolution-dots" aria-hidden="true">
              <span /><span /><span /><span /><span />
            </span>
            <span className="bls-card-evolution-label">Evolves · 13 stages</span>
          </div>
        )}
        {(item.cosmeticSlot === COSMETIC_SLOTS.CRYSTAL) && (
          <div className="bls-card-evolution-badge">
            <span className="bls-card-evolution-dots" aria-hidden="true">
              <span /><span /><span /><span /><span />
            </span>
            <span className="bls-card-evolution-label">Evolves · 10 tiers</span>
          </div>
        )}
        <button
          type="button"
          className={`bls-card-cta bls-card-cta-${stateClass}`}
          onClick={onClick ?? undefined}
          disabled={disabled}
        >
          {label}
        </button>
      </div>
    </div>
  );
}

// ─── Buff Card ─────────────────────────────────────────────────────────
// Slightly larger than the QoL/consumable row — buffs deserve visual
// emphasis since they're the moment-to-moment "I'm powered up" purchases.
// Layout: large icon stamp + headline effect + duration + price/CTA.
function BuffCard({ item, ownership, balance, onBuy, busy }) {
  const activeBuff = ownership.activeBuffs.find(b => b.id === item.id);
  const headline   = (() => {
    const e = item.effect;
    if (!e) return '';
    if (e.type === 'qi_mult')          return `×${e.mult} QI/S`;
    if (e.type === 'crystal_tap_mult') return `×${e.mult} TAP`;
    if (e.type === 'producer_mult')    return `×${e.mult} RATE`;
    return '';
  })();
  const durationLabel = (() => {
    const ms = item.effect?.durationMs ?? 0;
    if (ms >= 3600_000) {
      const h = Math.round(ms / 3600_000);
      return `${h}h`;
    }
    const m = Math.round(ms / 60_000);
    return `${m}m`;
  })();
  const disabled = balance < item.cost || busy;

  return (
    <div className={`bls-buff-card${activeBuff ? ' bls-buff-card-active' : ''}`}>
      {activeBuff && <span className="bls-card-ribbon bls-card-ribbon-active">ACTIVE</span>}
      <div className="bls-buff-card-icon">{item.icon}</div>
      <div className="bls-buff-card-body">
        <div className="bls-buff-card-headline">{headline}</div>
        <div className="bls-buff-card-name">{item.name}</div>
        <div className="bls-buff-card-meta">
          <span className="bls-buff-card-duration">{durationLabel}</span>
          {activeBuff && <BuffCountdown expiresAtMs={activeBuff.expiresAtMs} />}
        </div>
      </div>
      <button
        type="button"
        className="bls-card-cta bls-card-cta-buyable"
        onClick={() => onBuy(item.id)}
        disabled={disabled}
      >
        {item.cost} BL
      </button>
    </div>
  );
}

// ─── Compact Row (Consumables + QoL) ──────────────────────────────────
// Utility items stay row-style — they don't need showcase treatment, the
// PRICE and the EFFECT are what the player cares about.
function CompactRow({ item, ownership, balance, onBuy, busy }) {
  const { state, label, disabled } = (() => {
    if (item.ownership === 'permanent' && ownership.hasQol(item.id)) {
      return { state: 'owned', label: 'Owned', disabled: true };
    }
    if (item.ownership === 'stackable') {
      const cur = ownership.getStack(item.id);
      const cap = item.maxStack ?? Infinity;
      if (cur >= cap) return { state: 'maxed', label: `Maxed (${cur}/${cap})`, disabled: true };
    }
    if (item.ownership === 'oneshot') {
      const cur = ownership.getConsumable(item.id);
      if (cur > 0) {
        return { state: 'owned-some', label: `${item.cost} BL`, disabled: balance < item.cost || busy };
      }
    }
    return { state: 'buyable', label: `${item.cost} BL`, disabled: balance < item.cost || busy };
  })();

  const stackCount   = item.ownership === 'stackable' ? ownership.getStack(item.id) : 0;
  const oneshotCount = item.ownership === 'oneshot'   ? ownership.getConsumable(item.id) : 0;

  return (
    <div className={`bls-item bls-item-${state}`}>
      <div className="bls-item-icon">{item.icon}</div>
      <div className="bls-item-body">
        <div className="bls-item-name">
          {item.name}
          {stackCount > 0 && <span className="bls-item-tag">×{stackCount}</span>}
          {oneshotCount > 0 && <span className="bls-item-tag">×{oneshotCount}</span>}
        </div>
        <div className="bls-item-desc">{item.desc}</div>
      </div>
      <button
        type="button"
        className="bls-item-buy"
        onClick={() => onBuy(item.id)}
        disabled={disabled}
      >
        {label}
      </button>
    </div>
  );
}

/**
 * Blood Lotus Spend Shop — modal where players SPEND their Blood Lotus
 * on buffs, consumables, QoL, and cosmetics. IAP "buy more Blood Lotus"
 * flow is a separate top-bar button (and a footer CTA here as a backup
 * for "ran out mid-purchase" moments).
 *
 * Tab visuals:
 *   buff       — big effect cards (×2 QI/S etc.)
 *   consumable — compact rows (utility)
 *   qol        — compact rows (utility)
 *   cosmetic   — showcase grid with sprite previews + silhouetted teasers
 */
export default function BloodLotusSpendShopModal({
  inventory,
  balance,
  onClose,
  onOpenTopUp,
}) {
  const [tab, setTab] = useState('buff');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);

  const itemsByCategory = useMemo(() => {
    const out = new Map();
    for (const cat of SHOP_CATEGORIES) out.set(cat.id, []);
    for (const item of SHOP_ITEMS) out.get(item.category)?.push(item);
    return out;
  }, []);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(id);
  }, [flash]);

  const handleBuy = (itemId) => {
    if (busy) return;
    setBusy(true);
    const result = inventory.purchase(itemId);
    setBusy(false);
    if (result.ok) {
      const item = SHOP_ITEMS_BY_ID[itemId];
      setFlash({ msg: `Purchased: ${item?.name ?? itemId}`, kind: 'ok' });
    } else {
      setFlash({ msg: result.error ?? 'Purchase failed', kind: 'err' });
    }
  };

  const items = itemsByCategory.get(tab) ?? [];

  // Group cosmetics by slot AND by tier (Tier-1 vs premium Coming Soon)
  // so the cosmetic tab can render multiple presentation layouts side
  // by side for evaluation.
  const cosmeticsBySlot = useMemo(() => {
    if (tab !== 'cosmetic') return null;
    const groups = {
      [COSMETIC_SLOTS.CHARACTER]:  { label: 'Cultivator Skins',   tier1: [], premium: [] },
      [COSMETIC_SLOTS.CRYSTAL]:    { label: 'Crystal Skins',      tier1: [], premium: [] },
      [COSMETIC_SLOTS.PARTICLES]:  { label: 'Particle Effects',   tier1: [], premium: [] },
      [COSMETIC_SLOTS.BACKGROUND]: { label: 'Backdrops',          tier1: [], premium: [] },
    };
    for (const it of items) {
      if (!it.cosmeticSlot || !groups[it.cosmeticSlot]) continue;
      if (it.comingSoon) groups[it.cosmeticSlot].premium.push(it);
      else               groups[it.cosmeticSlot].tier1.push(it);
    }
    return groups;
  }, [tab, items]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bls-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="bls-header">
          <img
            src={`${BASE}ui/shop_nav.png`}
            className="bls-header-icon"
            alt=""
            draggable="false"
          />
          <span className="bls-header-title">Blood Lotus Shop</span>
          <span className="bls-header-balance">
            {balance.toLocaleString()} <span className="bls-header-balance-suffix">BL</span>
          </span>
        </div>

        <div className="ach-tabs bls-tabs">
          {SHOP_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`ach-tab${tab === cat.id ? ' ach-tab-active' : ''}`}
              onClick={() => setTab(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {flash && (
          <div className={`bls-flash bls-flash-${flash.kind}`}>{flash.msg}</div>
        )}

        <div className="bls-body">
          {/* ── Cosmetics — showcase grid ──────────────────────────────
              Tier-1 (CSS-tint) cosmetics render in the regular grid.
              Tier-2 premium "Coming Soon" cards render TWICE — once in
              the Stack mockup and once in the Strip mockup — so the
              two layout options can be compared side by side. Once
              the user picks a layout, the loser is removed. */}
          {tab === 'cosmetic' && cosmeticsBySlot && (
            <div className="bls-cosmetic-sections">
              {Object.entries(cosmeticsBySlot).map(([slot, group]) => {
                if (group.tier1.length === 0 && group.premium.length === 0) return null;
                const isMultiTier = slot === COSMETIC_SLOTS.CHARACTER || slot === COSMETIC_SLOTS.CRYSTAL;
                return (
                  <div key={slot} className="bls-cosmetic-slot-group">
                    {/* Tier-1 tint variants — regular cards. */}
                    {group.tier1.length > 0 && (
                      <section className="bls-cosmetic-section">
                        <div className="bls-cosmetic-section-label">{group.label}</div>
                        <div className="bls-card-grid">
                          {group.tier1.map(item => (
                            <CosmeticCard
                              key={item.id}
                              item={item}
                              ownership={inventory}
                              balance={balance}
                              onBuy={handleBuy}
                              onEquip={(id)  => inventory.equip(id)}
                              onUnequip={(s) => inventory.unequip(s)}
                              busy={busy}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Premium Tier-2 multi-tier skins (cultivator +
                        crystal) — full-width procession cards that show
                        every evolution stage receding into depth. */}
                    {group.premium.length > 0 && isMultiTier && (
                      <section className="bls-cosmetic-section">
                        <div className="bls-cosmetic-section-label">{group.label} — Coming Soon</div>
                        <div className="bls-strip-list">
                          {group.premium.map(item => (
                            <CosmeticCardProcession
                              key={item.id}
                              item={item}
                              ownership={inventory}
                              balance={balance}
                              onBuy={handleBuy}
                              onEquip={(id)  => inventory.equip(id)}
                              onUnequip={(s) => inventory.unequip(s)}
                              busy={busy}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Single-form premium cosmetics (particles + backdrops)
                        — keep the regular card layout for these. */}
                    {group.premium.length > 0 && !isMultiTier && (
                      <section className="bls-cosmetic-section">
                        <div className="bls-cosmetic-section-label">{group.label} — Coming Soon</div>
                        <div className="bls-card-grid">
                          {group.premium.map(item => (
                            <CosmeticCard
                              key={item.id}
                              item={item}
                              ownership={inventory}
                              balance={balance}
                              onBuy={handleBuy}
                              onEquip={(id)  => inventory.equip(id)}
                              onUnequip={(s) => inventory.unequip(s)}
                              busy={busy}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Buffs — big effect cards ──────────────────────────── */}
          {tab === 'buff' && (
            <div className="bls-buff-grid">
              {items.map(item => (
                <BuffCard
                  key={item.id}
                  item={item}
                  ownership={inventory}
                  balance={balance}
                  onBuy={handleBuy}
                  busy={busy}
                />
              ))}
            </div>
          )}

          {/* ── Consumables + QoL — compact rows ──────────────────── */}
          {(tab === 'consumable' || tab === 'qol') && (
            items.length === 0 ? (
              <div className="bls-empty">Nothing here yet.</div>
            ) : (
              items.map(item => (
                <CompactRow
                  key={item.id}
                  item={item}
                  ownership={inventory}
                  balance={balance}
                  onBuy={handleBuy}
                  busy={busy}
                />
              ))
            )
          )}
        </div>

        <button type="button" className="bls-topup" onClick={onOpenTopUp}>
          Need more Blood Lotus? <span className="bls-topup-cta">Top Up</span>
        </button>
      </div>
    </div>
  );
}
