import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  SHOP_ITEMS,
  SHOP_CATEGORIES,
  SHOP_ITEMS_BY_ID,
  COSMETIC_SLOTS,
  getFeaturedItemForToday,
} from '../data/shopItems';

const BASE = import.meta.env.BASE_URL;

// ── Cosmetic preview asset resolution ───────────────────────────────────
// Lifted verbatim from the legacy BloodLotusSpendShopModal. The card
// internals (preview tiles, buy CTA state machines) are unchanged from
// when this was a modal — only the outer chrome moved from .modal-overlay
// to a screen route per the nav-audit.

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

const TINT_PREVIEW_FILTERS = {
  cos_char_crimson:    'hue-rotate(-95deg) saturate(1.35) brightness(0.95)',
  cos_char_verdant:    'hue-rotate(60deg) saturate(1.2) brightness(0.95)',
  cos_char_amethyst:   'hue-rotate(180deg) saturate(1.2) brightness(0.95)',
  cos_crystal_verdant: 'hue-rotate(110deg) saturate(1.25) brightness(0.95)',
  cos_crystal_amber:   'hue-rotate(-140deg) saturate(1.4) brightness(1.05)',
  cos_particles_jade:  'hue-rotate(110deg) saturate(1.3)',
  cos_particles_violet:'hue-rotate(180deg) saturate(1.3) brightness(1.1)',
};

function getPreview(item) {
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
  if (item.cosmeticSlot === COSMETIC_SLOTS.CHARACTER) {
    return {
      kind: 'sprite',
      src: `${BASE}${CULTIVATOR_SPRITES[1].replace(/^\//, '')}`,
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
    if (item.effect?.bodyClass === 'cosmetic-bg-dawn') {
      return { kind: 'gradient', gradient: 'radial-gradient(ellipse at 50% 30%, rgba(255,180,80,.6), rgba(120,60,30,.85))' };
    }
    if (item.effect?.bodyClass === 'cosmetic-bg-twilight') {
      return { kind: 'gradient', gradient: 'radial-gradient(ellipse at 50% 30%, rgba(120,140,255,.6), rgba(40,20,80,.9))' };
    }
  }
  return { kind: 'icon', icon: item.icon };
}

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

function getEvolutionSprites(item) {
  if (item.cosmeticSlot === COSMETIC_SLOTS.CHARACTER) {
    return CULTIVATOR_SPRITES.map(s => `${BASE}${s.replace(/^\//, '')}`);
  }
  if (item.cosmeticSlot === COSMETIC_SLOTS.CRYSTAL) {
    return Array.from({ length: 10 }, (_, i) => `${BASE}crystals/crystal_${i + 1}.png`);
  }
  return [];
}

function CosmeticCardProcession({ item, ownership, balance, onBuy, onEquip, onUnequip, busy }) {
  const sprites = getEvolutionSprites(item);
  const revealedCount = 3;
  const totalStages = sprites.length;

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

      <div
        className="bls-procession"
        data-slot={item.cosmeticSlot}
        style={{ '--stage-count': totalStages }}
      >
        {sprites.map((src, i) => (
          <div
            key={i}
            className="bls-proc-stage"
            style={{
              '--stage-index': i,
              zIndex: totalStages - i,
            }}
            aria-label={i === 0
              ? `Stage ${i + 1}`
              : `Stage ${i + 1}: partially revealed`}
          >
            <img src={src} alt="" draggable="false" className="bls-proc-sprite-color" />
            <img src={src} alt="" draggable="false" className="bls-proc-sprite-silhouette" />
          </div>
        ))}
      </div>

      <div className="bls-strip-footer">
        <span className="bls-strip-footer-label">
          {revealedCount} of {totalStages} stages revealed · evolves with you
        </span>
      </div>
    </div>
  );
}

function CosmeticCard({ item, ownership, balance, onBuy, onEquip, onUnequip, busy }) {
  const preview = getPreview(item);

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

/**
 * BuffCard — compact 2-up tile per the bazaar mockup.
 *
 * Shape: ACTIVE ribbon (when applicable) at top-left, icon stamp centered
 * top, headline (×2 QI/S) as the visual anchor, name as a soft purple
 * line, duration chip + time-left meta, and a full-width Buy CTA at the
 * bottom. Stacks neatly in a 2-col grid so 4 buffs fit in roughly the
 * vertical space a single legacy strip used to occupy.
 *
 * The "1h" suffix already baked into item.name (e.g. "Crimson Aura — 1h")
 * is stripped here, because the duration chip carries that information.
 */
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
  // Strip a trailing " — 1h" / " - 4h" duration suffix from the name; the
  // duration chip below already carries that signal, and the tile is too
  // narrow to repeat it without truncation.
  const cleanName = (item.name ?? '').replace(/\s*[—-]\s*\d+\s*[hm]\s*$/i, '');
  const disabled  = balance < item.cost || busy;

  return (
    <div className={`bls-buff-tile${activeBuff ? ' bls-buff-tile-active' : ''}`}>
      {activeBuff && <span className="bls-buff-tile-ribbon">ACTIVE</span>}
      <div className="bls-buff-tile-icon">{item.icon}</div>
      <div className="bls-buff-tile-headline">{headline}</div>
      <div className="bls-buff-tile-name">{cleanName}</div>
      <div className="bls-buff-tile-meta">
        <span className="bls-buff-tile-duration">{durationLabel}</span>
        {activeBuff && <BuffCountdown expiresAtMs={activeBuff.expiresAtMs} />}
      </div>
      <button
        type="button"
        className={`bls-buff-tile-buy${disabled ? ' bls-buff-tile-buy-dim' : ''}`}
        onClick={() => onBuy(item.id)}
        disabled={disabled}
      >
        {item.cost} BL
      </button>
    </div>
  );
}

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
 * FeaturedHero — the "Today's Pick" hero card. Renders a vermillion-haloed
 * preview, ribbon, strike-through original price + discounted price, a
 * countdown to local-midnight reset, and the single Buy CTA. Sourced from
 * `getFeaturedItemForToday()` so the 7-day rotation lives in the data
 * layer; this component is dumb.
 */
function FeaturedHero({ featured, balance, busy, onBuy }) {
  if (!featured) return null;
  const { item, originalCost, discountedCost, endsAtMs } = featured;
  const owned = false; // featured items are not flagged owned even if the
                       // player has bought them before — the discount is
                       // the offer, not the ownership state. Cosmetic-
                       // ownership is enforced inside onBuy.
  const disabled = balance < discountedCost || busy;
  const preview = getPreview(item);

  return (
    <div className="sbz-featured" aria-label="Today's pick">
      <span className="sbz-featured-ribbon">Today's Pick</span>

      <div className="sbz-featured-preview">
        <span className="sbz-featured-halo" aria-hidden="true" />
        {preview.kind === 'sprite' && (
          <img
            src={preview.src}
            alt=""
            draggable="false"
            className="sbz-featured-preview-sprite"
            style={preview.filter ? { filter: preview.filter } : undefined}
          />
        )}
        {preview.kind === 'icon' && (
          <span className="sbz-featured-preview-icon">{preview.icon}</span>
        )}
        {preview.kind === 'particle-icon' && (
          <span className="sbz-featured-preview-icon">{preview.icon}</span>
        )}
        {preview.kind === 'gradient' && (
          <div className="sbz-featured-preview-bg" style={{ background: preview.gradient }} />
        )}
        {preview.kind === 'bg-icon' && (
          <span className="sbz-featured-preview-icon">{preview.icon}</span>
        )}
      </div>

      <div className="sbz-featured-body">
        <span className="sbz-featured-eyebrow">Limited Offering</span>
        <span className="sbz-featured-name">{item.name}</span>
        <span className="sbz-featured-desc">{item.desc}</span>

        <div className="sbz-featured-cta">
          <button
            type="button"
            className="sbz-featured-buy"
            onClick={() => onBuy(item.id)}
            disabled={disabled || owned}
          >
            <span className="sbz-featured-buy-lotus" aria-hidden="true" />
            {discountedCost} <span className="sbz-featured-buy-unit">BL</span>
          </button>
          <div className="sbz-featured-meta">
            <span className="sbz-featured-strike">{originalCost} BL</span>
            <FeaturedCountdown endsAtMs={endsAtMs} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedCountdown({ endsAtMs }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const remainingMs = Math.max(0, endsAtMs - now);
  const totalSec = Math.floor(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const label = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
  return <span className="sbz-featured-timer">Resets in {label}</span>;
}

/**
 * Spirit Bazaar — full screen (post nav-audit).
 *
 * Was BloodLotusSpendShopModal; the audit promoted it to a screen because a
 * 4-category shop with timed buffs, owned-state, equip flow, and cosmetic
 * previews wants the full viewport. TopBar 🏮 routes here via
 * navigate('spirit-bazaar'). The IAP "Top Up" flow remains a separate modal
 * (it is a real-money transaction with a discrete start/end).
 *
 * Layout: header (back chip + title + lotus balance card) on top, jump-rail
 * for the four categories, then a single scrollable storefront with one
 * section per category. The interior card / row components are unchanged
 * from the legacy modal — only the outer chrome moved.
 */
export default function SpiritBazaarScreen({
  inventory,
  balance,
  onBack,
  onOpenTopUp,
  onOpenCodex,
}) {
  const [busy, setBusy]   = useState(false);
  const [flash, setFlash] = useState(null);
  // activeCat drives the .sbz-cat-tab-active class. Set by jumpTo (on tap)
  // and updated by the IntersectionObserver below so the rail tracks
  // whichever aisle is on screen as the player scrolls.
  const [activeCat, setActiveCat] = useState('buff');
  const bodyRef = useRef(null);
  const railRef = useRef(null);
  const indicatorRef = useRef(null);

  const itemsByCategory = useMemo(() => {
    const out = new Map();
    for (const cat of SHOP_CATEGORIES) out.set(cat.id, []);
    for (const item of SHOP_ITEMS) out.get(item.category)?.push(item);
    return out;
  }, []);

  const cosmeticsBySlot = useMemo(() => {
    const groups = {
      [COSMETIC_SLOTS.CHARACTER]:  { label: 'Cultivator Skins',   tier1: [], premium: [] },
      [COSMETIC_SLOTS.CRYSTAL]:    { label: 'Crystal Skins',      tier1: [], premium: [] },
      [COSMETIC_SLOTS.PARTICLES]:  { label: 'Particle Effects',   tier1: [], premium: [] },
      [COSMETIC_SLOTS.BACKGROUND]: { label: 'Backdrops',          tier1: [], premium: [] },
    };
    const cosmetics = itemsByCategory.get('cosmetic') ?? [];
    for (const it of cosmetics) {
      if (!it.cosmeticSlot || !groups[it.cosmeticSlot]) continue;
      if (it.comingSoon) groups[it.cosmeticSlot].premium.push(it);
      else               groups[it.cosmeticSlot].tier1.push(it);
    }
    return groups;
  }, [itemsByCategory]);

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

  const jumpTo = (id, cat) => {
    const target = bodyRef.current?.querySelector(`#${id}`);
    if (!target || !bodyRef.current) return;
    if (cat) setActiveCat(cat);
    bodyRef.current.scrollTo({
      top: target.offsetTop - 8,
      behavior: 'smooth',
    });
  };

  // Track which aisle is on screen so the rail's active chip follows the
  // player's scroll position. IntersectionObserver fires when 35% of an
  // aisle's header is visible; whichever fired most recently wins.
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return undefined;
    const targets = ['sec-buff', 'sec-consumable', 'sec-qol', 'sec-cosmetic']
      .map(id => root.querySelector(`#${id}`))
      .filter(Boolean);
    if (targets.length === 0) return undefined;
    const sectionToCat = {
      'sec-buff':       'buff',
      'sec-consumable': 'consumable',
      'sec-qol':        'qol',
      'sec-cosmetic':   'cosmetic',
    };
    const io = new IntersectionObserver((entries) => {
      // Pick the entry with the largest intersection ratio that's actually
      // intersecting; ignore entries that just exited the viewport.
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length === 0) return;
      visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      const id = visible[0].target.id;
      const cat = sectionToCat[id];
      if (cat) setActiveCat(cat);
    }, {
      root,
      // top sticky-rail clears ~50px so push the trigger band down a bit
      rootMargin: '-60px 0px -45% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });
    targets.forEach(t => io.observe(t));
    return () => io.disconnect();
  }, []);

  // Slide the gold underline indicator under the active tab. Re-measures
  // on activeCat change and after fonts settle (Cinzel's woff2 metrics
  // may differ from the system-serif fallback used during initial paint).
  useLayoutEffect(() => {
    const rail = railRef.current;
    const ind  = indicatorRef.current;
    if (!rail || !ind) return undefined;
    const place = () => {
      const tab = rail.querySelector(`.sbz-cat-tab[data-cat="${activeCat}"]`);
      if (!tab) return;
      // Indicator width tracks the label, not the tap-target; nudge in 2px
      // L+R so the underline lines up under the text rather than the padding.
      ind.style.width = `${tab.offsetWidth - 4}px`;
      ind.style.transform = `translateX(${tab.offsetLeft + 2}px)`;
    };
    place();
    // Re-place once fonts settle (no-op if already metric-stable).
    if (document.fonts?.ready) document.fonts.ready.then(place).catch(() => {});
    // Re-place on viewport resize (orientation change, etc).
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [activeCat]);

  const buffs       = itemsByCategory.get('buff')       ?? [];
  const consumables = itemsByCategory.get('consumable') ?? [];
  // QoL filtering per content-audit rule: permanent QoL hides once
  // owned (the perk surfaces in Settings → Active Perks now), and
  // stackable QoL hides only when the stack is at its maxStack. The
  // raw catalog still feeds the section header count so players see
  // how the section shrinks as they buy.
  const qolAll      = itemsByCategory.get('qol') ?? [];
  const qol         = qolAll.filter(item => {
    if (item.ownership === 'permanent') return !inventory.hasQol(item.id);
    if (item.ownership === 'stackable') {
      const cap = item.maxStack ?? Infinity;
      return inventory.getStack(item.id) < cap;
    }
    return true; // unknown ownership shapes fall through
  });
  const cosmeticsCount = (itemsByCategory.get('cosmetic') ?? []).length;

  // Featured "Today's Pick" — 7-day rotation keyed on local weekday.
  // Memoised once per render; the inner countdown handles the per-minute
  // tick so we don't churn this object every second.
  const featured = useMemo(() => getFeaturedItemForToday(), []);

  return (
    <div className="spirit-bazaar-screen">

      {/* Compact header — back · title · balance pill · top-up. The
          calligraphy "市" watermark is painted by .sbz-screen-head::before. */}
      <header className="sbz-screen-head sbz-screen-head-compact">
        <div className="sbz-head-row">
          <button
            className="sbz-back-chip"
            onClick={onBack}
            aria-label="Back"
          >
            <span className="sbz-back-arrow">‹</span> Back
          </button>

          <div className="sbz-title-block sbz-title-block-compact">
            <div className="sbz-eyebrow">The Spirit</div>
            <div className="sbz-title">Bazaar</div>
          </div>

          <div className="sbz-balance sbz-balance-compact">
            <img
              src={`${BASE}sprites/items/blood_lotus.png`}
              className="sbz-balance-icon"
              alt=""
              draggable="false"
            />
            <span className="sbz-balance-amount">{balance.toLocaleString()}</span>
            <button type="button" className="sbz-topup-chip" onClick={onOpenTopUp}>
              + Top Up
            </button>
          </div>
        </div>
      </header>

      {flash && (
        <div className={`bls-flash bls-flash-${flash.kind}`}>{flash.msg}</div>
      )}

      <div className="bls-body sbz-body" ref={bodyRef}>

        {/* FEATURED HERO — "Today's Pick" */}
        <div className="sbz-featured-wrap">
          <FeaturedHero
            featured={featured}
            balance={balance}
            busy={busy}
            onBuy={handleBuy}
          />
        </div>

        {/* Category nav — plain text tabs with a sliding gold underline.
            Pattern reference: iOS Music / Spotify / App Store. The nav's
            only job is "here are the sections, here's the one you're
            viewing." It's not a design statement; the shop content
            (Featured Hero, buff tiles, Buy CTAs) gets to carry the
            visual focus. Active state is driven by activeCat (set on
            tap + by the IntersectionObserver above); the indicator is
            measured against the active tab in the useLayoutEffect above. */}
        <nav className="sbz-cat-rail" ref={railRef} aria-label="Bazaar sections">
          <button
            type="button"
            data-cat="buff"
            className={`sbz-cat-tab${activeCat === 'buff' ? ' sbz-cat-tab-active' : ''}`}
            onClick={() => jumpTo('sec-buff', 'buff')}
          >
            Buffs <span className="sbz-cat-count">{buffs.length || '—'}</span>
          </button>
          <button
            type="button"
            data-cat="consumable"
            className={`sbz-cat-tab${activeCat === 'consumable' ? ' sbz-cat-tab-active' : ''}`}
            onClick={() => jumpTo('sec-consumable', 'consumable')}
          >
            Consumables <span className="sbz-cat-count">{consumables.length || '—'}</span>
          </button>
          <button
            type="button"
            data-cat="qol"
            className={`sbz-cat-tab${activeCat === 'qol' ? ' sbz-cat-tab-active' : ''}`}
            onClick={() => jumpTo('sec-qol', 'qol')}
          >
            QoL <span className="sbz-cat-count">{qol.length || '—'}</span>
          </button>
          <button
            type="button"
            data-cat="cosmetic"
            className={`sbz-cat-tab${activeCat === 'cosmetic' ? ' sbz-cat-tab-active' : ''}`}
            onClick={() => jumpTo('sec-cosmetic', 'cosmetic')}
          >
            Cosmetics <span className="sbz-cat-count">{cosmeticsCount || '—'}</span>
          </button>
          <span className="sbz-cat-indicator" ref={indicatorRef} aria-hidden="true" />
        </nav>
        {/* Buffs aisle */}
        <section id="sec-buff" className="bls-section">
          <header className="bls-section-header">
            <h3 className="bls-section-title">Buffs</h3>
            <span className="bls-section-tag">Power-ups · stack with everything</span>
            <span className="bls-section-count">{buffs.length}</span>
          </header>
          <div className="bls-buff-grid">
            {buffs.map(item => (
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
        </section>

        {/* Consumables aisle */}
        <section id="sec-consumable" className="bls-section">
          <header className="bls-section-header">
            <h3 className="bls-section-title">Consumables</h3>
            <span className="bls-section-tag">One-shot talismans · keep until used</span>
            <span className="bls-section-count">{consumables.length}</span>
          </header>
          {consumables.length === 0 ? (
            <div className="bls-empty">More relics coming to the shelves…</div>
          ) : (
            consumables.map(item => (
              <CompactRow
                key={item.id}
                item={item}
                ownership={inventory}
                balance={balance}
                onBuy={handleBuy}
                busy={busy}
              />
            ))
          )}
        </section>

        {/* QoL aisle */}
        <section id="sec-qol" className="bls-section">
          <header className="bls-section-header">
            <h3 className="bls-section-title">Quality of Life</h3>
            <span className="bls-section-tag">Permanent unlocks · less friction, more cultivation</span>
            <span className="bls-section-count">{qol.length}</span>
          </header>
          {qol.length === 0 ? (
            <div className="bls-empty">More relics coming to the shelves…</div>
          ) : (
            qol.map(item => (
              <CompactRow
                key={item.id}
                item={item}
                ownership={inventory}
                balance={balance}
                onBuy={handleBuy}
                busy={busy}
              />
            ))
          )}
        </section>

        {/* Cosmetics aisle */}
        <section id="sec-cosmetic" className="bls-section">
          <header className="bls-section-header">
            <h3 className="bls-section-title">Cosmetics</h3>
            <span className="bls-section-tag">Recolours · skins · backdrops</span>
            <span className="bls-section-count">{cosmeticsCount}</span>
          </header>
          <div className="bls-cosmetic-sections">
            {Object.entries(cosmeticsBySlot).map(([slot, group]) => {
              if (group.tier1.length === 0 && group.premium.length === 0) return null;
              const isMultiTier = slot === COSMETIC_SLOTS.CHARACTER || slot === COSMETIC_SLOTS.CRYSTAL;
              // Content-audit rule: hide a tier-1 cosmetic card the moment
              // it's owned. The owned version moves to the Codex →
              // Wardrobe tab; the Bazaar slot shows a "view in Codex"
              // callout when ALL its tier-1 cards have been bought.
              const tier1Available = group.tier1.filter(it => !inventory.isCosmeticOwned(it.id));
              const tier1OwnedCount = group.tier1.length - tier1Available.length;
              const tier1AllOwned   = group.tier1.length > 0 && tier1Available.length === 0;
              return (
                <div key={slot} className="bls-cosmetic-slot-group">
                  {group.tier1.length > 0 && !tier1AllOwned && (
                    <section className="bls-cosmetic-section">
                      <div className="bls-cosmetic-section-label">
                        {group.label}
                        {tier1OwnedCount > 0 && (
                          <button
                            type="button"
                            className="bls-cosmetic-section-owned-chip"
                            onClick={onOpenCodex}
                          >
                            {tier1OwnedCount} owned · in Codex →
                          </button>
                        )}
                      </div>
                      <div className="bls-card-grid">
                        {tier1Available.map(item => (
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
                  {tier1AllOwned && (
                    <section className="bls-cosmetic-section">
                      <div className="bls-cosmetic-section-label">{group.label}</div>
                      <button
                        type="button"
                        className="bls-cosmetic-all-owned-callout"
                        onClick={onOpenCodex}
                      >
                        <span className="bls-cosmetic-all-owned-text">
                          Owned: <b>{tier1OwnedCount}</b> · view in Codex
                        </span>
                        <span className="bls-cosmetic-all-owned-link">→</span>
                      </button>
                    </section>
                  )}
                  {group.premium.length > 0 && isMultiTier && (
                    <section className="bls-cosmetic-section">
                      <div className="bls-cosmetic-section-label">{group.label} · Coming Soon</div>
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
                  {group.premium.length > 0 && !isMultiTier && (
                    <section className="bls-cosmetic-section">
                      <div className="bls-cosmetic-section-label">{group.label} · Coming Soon</div>
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
        </section>
      </div>

    </div>
  );
}
