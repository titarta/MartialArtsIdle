import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameText } from '../i18n/gameText';
import {
  SHOP_ITEMS,
  SHOP_BUNDLES,
  SHOP_CATEGORIES,
  SHOP_ITEMS_BY_ID,
  COSMETIC_SLOTS,
  getFeaturedItemForToday,
} from '../data/shopItems';

const BASE = import.meta.env.BASE_URL;

// Render a shop item icon: an <img> when `icon` is a /asset path, otherwise the
// emoji string as-is. image-rendering follows the global Settings toggle (the
// `.rendering-pixelated img` rule), so no per-element hardcode here.
function ShopIcon({ icon, size }) {
  if (typeof icon === 'string' && icon.startsWith('/')) {
    return (
      <img
        src={`${BASE}${icon.replace(/^\//, '')}`}
        alt=""
        draggable="false"
        style={{ width: size, height: size, objectFit: 'contain', verticalAlign: 'middle' }}
      />
    );
  }
  return icon;
}

// ── Cosmetic procession asset resolution ───────────────────────────────
// Each cosmetic slot evolves through a different number of stages. The
// procession card reveals the first 3 in colour and silhouettes the rest
// (sells the shape without spoiling late-game forms). All slot art is
// placeholder for v1 - the player's current cultivator / crystal sprites
// fill in until premium pixel art ships per skin.

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
  const { t } = useTranslation('ui');
  return <span className="bls-buff-countdown">{t('bazaar.timeLeft', { n: label })}</span>;
}

function getSkinSprites(item) {
  if (item.cosmeticSlot === COSMETIC_SLOTS.CHARACTER) {
    return CULTIVATOR_SPRITES.map(s => `${BASE}${s.replace(/^\//, '')}`);
  }
  if (item.cosmeticSlot === COSMETIC_SLOTS.CRYSTAL) {
    return Array.from({ length: 10 }, (_, i) => `${BASE}crystals/crystal_${i + 1}.png`);
  }
  // Particles / backdrop slots: 6 abstract stages. We fall back to the
  // cultivator sprite set sliced into 6 (the procession CSS treats them
  // like everything else - first 3 colour, rest silhouette) for the v1
  // placeholder phase. When real particle/backdrop assets ship this
  // helper grows a per-slot branch.
  return CULTIVATOR_SPRITES.slice(0, 6).map(s => `${BASE}${s.replace(/^\//, '')}`);
}

/** Slot label used on the card header chip. */
function slotLabel(slot) {
  if (slot === COSMETIC_SLOTS.CHARACTER)  return 'Cultivator';
  if (slot === COSMETIC_SLOTS.CRYSTAL)    return 'Crystal';
  if (slot === COSMETIC_SLOTS.PARTICLES)  return 'Particles';
  if (slot === COSMETIC_SLOTS.BACKGROUND) return 'Backdrop';
  return 'Skin';
}

/**
 * SkinCard — the canonical cosmetic card (Bazaar v2, 2026-05-27).
 *
 * One shape for every cosmetic slot. Renders a procession of the skin's
 * sprite stages: the first 3 in colour, the remainder silhouetted behind
 * a soft mist veil so the player sees the shape arc without spoiling
 * late-game forms. The header has the skin name + slot chip; the foot
 * has the stage-revealed count + a single Buy CTA with an explicit
 * lotus-tagged price.
 *
 * No equip / unequip here. Once bought the card disappears from the
 * Bazaar and lives in Codex > Wardrobe for equipping.
 */
/**
 * ParticleShowcase — preview for the PARTICLES cosmetic slot.
 * Shows 5 animated orbs using the 3-layer mask pipeline with the actual
 * qi_orb_c9_N variant for that item. Each orb gets an explicit tier color
 * sampled across the full spectrum (blue → cyan → violet+gold → purple+gold
 * → orange-gold) so the card always shows the shape across multiple tints,
 * regardless of which crystal tier the player is currently at.
 */
function ParticleShowcase({ variant = '1' }) {
  const maskBase = `${BASE}sprites/vfx/qi_particles/qi_orb_c9_${variant}`;
  // Five representative tier tints: T2 blue, T3 cyan, T6 violet+gold,
  // T9 purple+gold, T10 orange-gold.
  const orbs = [
    { x: 12, delay: 0.0, pc: '#3377aa', sc: '#88bbdd' },
    { x: 30, delay: 1.4, pc: '#00aaaa', sc: '#aaffee' },
    { x: 50, delay: 0.7, pc: '#4e17bb', sc: '#e8d870' },
    { x: 70, delay: 2.1, pc: '#9c4492', sc: '#f6dd84' },
    { x: 88, delay: 0.4, pc: '#ff9900', sc: '#ffe566' },
  ];
  return (
    <div className="bls-skin-proc bls-skin-proc-particles" aria-hidden="true">
      {orbs.map((o, i) => (
        <div
          key={i}
          className="bls-particle-orb"
          style={{
            left:               `${o.x}%`,
            width:              '44px',
            height:             '44px',
            animationDelay:     `${o.delay}s`,
            '--pc':             o.pc,
            '--sc':             o.sc,
            '--mask-primary':   `url(${maskBase}_mask_primary.png)`,
            '--mask-secondary': `url(${maskBase}_mask_secondary.png)`,
            '--mask-shine':     `url(${maskBase}_mask_shine.png)`,
            '--orig-orb':       `url(${maskBase}.png)`,
          }}
        >
          <div className="layer-p" />
          <div className="layer-s" />
          <div className="layer-g" />
        </div>
      ))}
    </div>
  );
}

function SkinCard({ item, balance, onBuy, busy }) {
  const { t } = useTranslation('ui');
  const gt = useGameText();
  const sprites    = getSkinSprites(item);
  const revealed   = 3;
  const totalCount = sprites.length;
  const disabled   = balance < item.cost || busy;
  const isParticles     = item.cosmeticSlot === COSMETIC_SLOTS.PARTICLES;
  const particleVariant = isParticles
    ? (item.id.match(/cos_particles_c9_(\d+)/)?.[1] ?? '1')
    : null;
  return (
    <div className="bls-skin-card" data-slot={item.cosmeticSlot}>
      <div className="bls-skin-card-head">
        <div className="bls-skin-card-titles">
          <div className="bls-skin-card-name">{gt('shopItems', item.id, 'name', item.name)}</div>
          <div className="bls-skin-card-kicker">
            {isParticles
              ? t('bazaar.particleKicker')
              : t('bazaar.evolvesThrough', { n: totalCount })}
          </div>
        </div>
        <span className="bls-skin-card-slot">{slotLabel(item.cosmeticSlot)}</span>
      </div>

      {/* Particles slot: drifting qi-orb showcase. Other slots: the
          procession (first 3 colour, rest silhouetted). data-slot on
          the procession picks the breathing animation (character bob
          vs crystal glow). */}
      {isParticles ? (
        <ParticleShowcase variant={particleVariant} />
      ) : (
        <div
          className="bls-skin-proc"
          data-slot={item.cosmeticSlot}
          style={{ '--stage-count': totalCount }}
        >
          {sprites.map((src, i) => (
            <div
              key={i}
              className="bls-skin-stage"
              style={{ '--stage-index': i }}
            >
              <img src={src} alt="" draggable="false" className="bls-skin-stage-color" />
              <img src={src} alt="" draggable="false" className="bls-skin-stage-silhouette" />
            </div>
          ))}
        </div>
      )}

      <div className="bls-skin-card-foot">
        <span className="bls-skin-foot-label">
          {isParticles
            ? <>{t('bazaar.particlePreviewPre')} <b>{t('bazaar.particlePreviewBold')}</b></>
            : t('bazaar.stagesRevealed', { n: revealed, total: totalCount })}
        </span>
        <button
          type="button"
          className="bls-skin-buy"
          onClick={() => onBuy(item.id)}
          disabled={disabled}
        >
          <span className="bls-skin-buy-lotus" aria-hidden="true" />
          <span className="bls-skin-buy-amt">{item.cost.toLocaleString()}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * BundleCard — a Fortnite-style theme pack (Bazaar v2).
 *
 * Violet-purple chrome distinguishes the bundle from single-skin cards.
 * Header carries the bundle name + a short tagline. Body shows each
 * component as a mini-row (small procession + name + slot type + its
 * individual strike-through price). Footer has the total strike-through
 * + bundle price + a single "Claim Pack" CTA.
 */
function BundleCard({ bundle, balance, onBuy, busy }) {
  const { t } = useTranslation('ui');
  const gt = useGameText();
  const disabled = balance < bundle.cost || busy;
  const components = (bundle.components ?? [])
    .map(id => SHOP_ITEMS_BY_ID[id])
    .filter(Boolean);
  return (
    <div className="bls-bundle">
      <span className="bls-bundle-ribbon">{t('bazaar.themePack')}</span>
      <span className="bls-bundle-save-ribbon">{t('bazaar.savePack', { n: bundle.saveAmount?.toLocaleString() ?? '' })}</span>

      <div className="bls-bundle-head">
        <div className="bls-bundle-name">{gt('shopBundles', bundle.id, 'name', bundle.name)}</div>
        <div className="bls-bundle-tag">{gt('shopBundles', bundle.id, 'desc', bundle.desc)}</div>
      </div>

      <div className="bls-bundle-pieces">
        {components.map(c => {
          const isParticles = c.cosmeticSlot === COSMETIC_SLOTS.PARTICLES;
          const sprites = getSkinSprites(c).slice(0, 6);
          return (
            <div className="bls-bundle-piece" key={c.id}>
              {isParticles ? (
                <div className="bls-skin-proc bls-skin-proc-mini bls-skin-proc-particles bls-skin-proc-particles-mini" aria-hidden="true">
                  <span className="bls-particle-orb" style={{ left: '18%', width: '12px', height: '12px', animationDelay: '0s'   }}>
                    <img src={`${BASE}sprites/vfx/qi_particles/qi_orb_bright.png`} alt="" draggable="false" />
                  </span>
                  <span className="bls-particle-orb" style={{ left: '50%', width: '9px',  height: '9px',  animationDelay: '1.4s' }}>
                    <img src={`${BASE}sprites/vfx/qi_particles/qi_orb_small.png`} alt="" draggable="false" />
                  </span>
                  <span className="bls-particle-orb" style={{ left: '78%', width: '10px', height: '10px', animationDelay: '0.6s' }}>
                    <img src={`${BASE}sprites/vfx/qi_particles/qi_spark_star.png`} alt="" draggable="false" />
                  </span>
                </div>
              ) : (
                <div
                  className="bls-skin-proc bls-skin-proc-mini"
                  data-slot={c.cosmeticSlot}
                  style={{ '--stage-count': sprites.length }}
                >
                  {sprites.map((src, i) => (
                    <div
                      key={i}
                      className="bls-skin-stage"
                      style={{ '--stage-index': i }}
                    >
                      <img src={src} alt="" draggable="false" className="bls-skin-stage-color" />
                      <img src={src} alt="" draggable="false" className="bls-skin-stage-silhouette" />
                    </div>
                  ))}
                </div>
              )}
              <div className="bls-bundle-piece-meta">
                <div className="bls-bundle-piece-name">{gt('shopItems', c.id, 'name', c.name)}</div>
                <div className="bls-bundle-piece-type">{slotLabel(c.cosmeticSlot)}</div>
              </div>
              <span className="bls-bundle-piece-strike">{c.cost?.toLocaleString() ?? ''}</span>
            </div>
          );
        })}
      </div>

      <div className="bls-bundle-foot">
        <div className="bls-bundle-price-stack">
          <span className="bls-bundle-price-strike">{t('bazaar.blPrice', { n: bundle.originalCost?.toLocaleString() })}</span>
          <span className="bls-bundle-price">
            <span className="bls-skin-buy-lotus" aria-hidden="true" />
            {bundle.cost.toLocaleString()}
          </span>
        </div>
        <button
          type="button"
          className="bls-bundle-buy"
          onClick={() => onBuy(bundle.id)}
          disabled={disabled}
        >
          {t('bazaar.claimPack')}
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
  const { t } = useTranslation('ui');
  const gt = useGameText();
  // Match by effect TYPE, not itemId: buffs are one-per-type now, so every
  // duration product of the same buff reads as active (and shares its timer)
  // when that buff is running.
  const activeBuff = ownership.activeBuffs.find(b => b.type === item.effect?.type);
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
  const cleanName = gt('shopItems', item.id, 'name', item.name).replace(/\s*[—-]\s*\d+\s*[hm]\s*$/i, '');
  const disabled  = balance < item.cost || busy;

  return (
    <div className={`bls-buff-tile${activeBuff ? ' bls-buff-tile-active' : ''}`}>
      {activeBuff && <span className="bls-buff-tile-ribbon">{t('bazaar.active')}</span>}
      <div className="bls-buff-tile-icon"><ShopIcon icon={item.icon} size={34} /></div>
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
        {t('bazaar.blPrice', { n: item.cost })}
      </button>
    </div>
  );
}

function CompactRow({ item, ownership, balance, onBuy, busy }) {
  const { t } = useTranslation('ui');
  const gt = useGameText();
  const { state, label, disabled } = (() => {
    if (item.ownership === 'permanent' && ownership.hasQol(item.id)) {
      return { state: 'owned', label: t('bazaar.owned'), disabled: true };
    }
    if (item.ownership === 'stackable') {
      const cur = ownership.getStack(item.id);
      const cap = item.maxStack ?? Infinity;
      if (cur >= cap) return { state: 'maxed', label: t('bazaar.maxed', { n: cur, max: cap }), disabled: true };
    }
    if (item.ownership === 'oneshot') {
      const cur = ownership.getConsumable(item.id);
      if (cur > 0) {
        return { state: 'owned-some', label: t('bazaar.blPrice', { n: item.cost }), disabled: balance < item.cost || busy };
      }
    }
    return { state: 'buyable', label: t('bazaar.blPrice', { n: item.cost }), disabled: balance < item.cost || busy };
  })();

  const stackCount   = item.ownership === 'stackable' ? ownership.getStack(item.id) : 0;
  const oneshotCount = item.ownership === 'oneshot'   ? ownership.getConsumable(item.id) : 0;

  return (
    <div className={`bls-item bls-item-${state}`}>
      <div className="bls-item-icon"><ShopIcon icon={item.icon} size={32} /></div>
      <div className="bls-item-body">
        <div className="bls-item-name">
          {gt('shopItems', item.id, 'name', item.name)}
          {stackCount > 0 && <span className="bls-item-tag">×{stackCount}</span>}
          {oneshotCount > 0 && <span className="bls-item-tag">×{oneshotCount}</span>}
        </div>
        <div className="bls-item-desc">{gt('shopItems', item.id, 'desc', item.desc)}</div>
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
  const { t } = useTranslation('ui');
  const gt = useGameText();
  if (!featured) return null;
  const { item, originalCost, discountedCost, endsAtMs } = featured;
  const disabled = balance < discountedCost || busy;
  const isSkin = item.ownership === 'cosmetic';
  return (
    <div className="sbz-featured" aria-label={t('bazaar.todaysPick')}>
      <span className="sbz-featured-ribbon">{t('bazaar.todaysPick')}</span>

      <div className="sbz-featured-preview">
        <span className="sbz-featured-halo" aria-hidden="true" />
        {isSkin ? (
          (() => {
            const sprites = getSkinSprites(item).slice(0, 5);
            return (
              <div
                className="bls-skin-proc bls-skin-proc-mini"
                data-slot={item.cosmeticSlot}
                style={{ '--stage-count': sprites.length }}
              >
                {sprites.map((src, i) => (
                  <div
                    key={i}
                    className="bls-skin-stage"
                    style={{ '--stage-index': i }}
                  >
                    <img src={src} alt="" draggable="false" className="bls-skin-stage-color" />
                    <img src={src} alt="" draggable="false" className="bls-skin-stage-silhouette" />
                  </div>
                ))}
              </div>
            );
          })()
        ) : (
          <span className="sbz-featured-preview-icon"><ShopIcon icon={item.icon} size={48} /></span>
        )}
      </div>

      <div className="sbz-featured-body">
        <span className="sbz-featured-eyebrow">{t('bazaar.limitedOffering')}</span>
        <span className="sbz-featured-name">{gt('shopItems', item.id, 'name', item.name)}</span>
        <span className="sbz-featured-desc">{gt('shopItems', item.id, 'desc', item.desc)}</span>

        <div className="sbz-featured-cta">
          <button
            type="button"
            className="sbz-featured-buy"
            onClick={() => onBuy(item.id)}
            disabled={disabled}
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
  const { t } = useTranslation('ui');
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
  return <span className="sbz-featured-timer">{t('bazaar.resetsIn', { time: label })}</span>;
}

/**
 * Spirit Bazaar — full screen.
 *
 * Layout: header (back · title · balance · Top Up) on top, jump-rail for
 * the four categories, then a single scrollable storefront with one
 * section per category. Cosmetics aisle (v2, 2026-05-27) renders theme
 * BUNDLES first (the deal-driver), then SkinCards grouped by slot. No
 * equip / unequip in the store - once bought, items vanish here and the
 * player equips them in Codex > Wardrobe.
 */
export default function SpiritBazaarScreen({
  inventory,
  balance,
  onBack,
  onOpenTopUp,
  onOpenCodex,
}) {
  const { t } = useTranslation('ui');
  const [busy, setBusy]   = useState(false);
  const [flash, setFlash] = useState(null);
  const [activeCat, setActiveCat] = useState('buff');
  const bodyRef = useRef(null);
  const railRef = useRef(null);
  const indicatorRef = useRef(null);
  const scrollLockUntilRef = useRef(0);

  const itemsByCategory = useMemo(() => {
    const out = new Map();
    for (const cat of SHOP_CATEGORIES) out.set(cat.id, []);
    for (const item of SHOP_ITEMS) out.get(item.category)?.push(item);
    return out;
  }, []);

  // Cosmetics grouped by slot. Hides items already owned (those live in
  // Codex > Wardrobe now). Only renders a slot section if it has at
  // least one available item.
  const cosmeticsBySlot = useMemo(() => {
    const groups = {
      [COSMETIC_SLOTS.CHARACTER]:  { label: t('bazaar.slotCharacter'), items: [] },
      [COSMETIC_SLOTS.CRYSTAL]:    { label: t('bazaar.slotCrystal'),    items: [] },
      [COSMETIC_SLOTS.PARTICLES]:  { label: t('bazaar.slotParticles'),  items: [] },
      [COSMETIC_SLOTS.BACKGROUND]: { label: t('bazaar.slotBackdrop'),   items: [] },
    };
    const cosmetics = itemsByCategory.get('cosmetic') ?? [];
    for (const it of cosmetics) {
      if (!it.cosmeticSlot || !groups[it.cosmeticSlot]) continue;
      if (inventory.isCosmeticOwned(it.id)) continue;
      groups[it.cosmeticSlot].items.push(it);
    }
    return groups;
  }, [itemsByCategory, inventory, t]);

  // Bundles available to the player. A bundle hides the moment any of
  // its components is owned (the discount stops making sense once the
  // player has paid piecemeal). The remaining components stay buyable
  // as singles.
  const availableBundles = useMemo(
    () => SHOP_BUNDLES.filter(b => inventory.isBundleAvailable?.(b.id) ?? true),
    [inventory]
  );

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
      setFlash({ msg: t('bazaar.purchasedFlash', { name: item?.name ?? itemId }), kind: 'ok' });
    } else {
      setFlash({ msg: result.error ?? t('bazaar.purchaseFailed'), kind: 'err' });
    }
  };

  const jumpTo = (id, cat) => {
    const target = bodyRef.current?.querySelector(`#${id}`);
    if (!target) return;
    if (cat) {
      setActiveCat(cat);
      scrollLockUntilRef.current = Date.now() + 600;
    }
    target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

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
      if (Date.now() < scrollLockUntilRef.current) return;
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length === 0) return;
      visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      const id = visible[0].target.id;
      const cat = sectionToCat[id];
      if (cat) setActiveCat(cat);
    }, {
      root,
      rootMargin: '-52px 0px -60% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });
    targets.forEach(t => io.observe(t));
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const rail = railRef.current;
    const ind  = indicatorRef.current;
    if (!rail || !ind) return undefined;
    const place = () => {
      const tab = rail.querySelector(`.tab-rail-tab[data-cat="${activeCat}"]`);
      if (!tab) return;
      ind.style.width = `${tab.offsetWidth - 4}px`;
      ind.style.transform = `translateX(${tab.offsetLeft + 2}px)`;
    };
    place();
    if (document.fonts?.ready) document.fonts.ready.then(place).catch(() => {});
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [activeCat]);

  const buffs       = itemsByCategory.get('buff')       ?? [];
  const consumables = itemsByCategory.get('consumable') ?? [];
  const qolAll      = itemsByCategory.get('qol') ?? [];
  const qol         = qolAll.filter(item => {
    if (item.ownership === 'permanent') return !inventory.hasQol(item.id);
    if (item.ownership === 'stackable') {
      const cap = item.maxStack ?? Infinity;
      return inventory.getStack(item.id) < cap;
    }
    return true;
  });
  const cosmeticsCount =
    availableBundles.length +
    Object.values(cosmeticsBySlot).reduce((sum, g) => sum + g.items.length, 0);

  const featured = useMemo(() => getFeaturedItemForToday(), []);

  return (
    <div className="spirit-bazaar-screen">

      <header className="sbz-screen-head sbz-screen-head-compact">
        <div className="sbz-head-row">
          <button className="sbz-back-chip" onClick={onBack} aria-label={t('common.back')}>
            <span className="sbz-back-arrow">‹</span> {t('bazaar.back')}
          </button>

          <div className="sbz-title-block sbz-title-block-compact">
            <div className="sbz-eyebrow">{t('bazaar.eyebrow')}</div>
            <div className="sbz-title">{t('bazaar.title')}</div>
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
              {t('bazaar.topUp')}
            </button>
          </div>
        </div>
      </header>

      {flash && (
        <div className={`bls-flash bls-flash-${flash.kind}`}>{flash.msg}</div>
      )}

      <div className="bls-body sbz-body" ref={bodyRef}>

        <div className="sbz-featured-wrap">
          <FeaturedHero
            featured={featured}
            balance={balance}
            busy={busy}
            onBuy={handleBuy}
          />
        </div>

        <nav className="tab-rail tab-rail-sticky" ref={railRef} aria-label={t('bazaar.navAriaLabel')}>
          <button
            type="button"
            data-cat="buff"
            className={`tab-rail-tab${activeCat === 'buff' ? ' tab-rail-tab-active' : ''}`}
            onClick={() => jumpTo('sec-buff', 'buff')}
          >
            {t('bazaar.tabBuffs')} <span className="tab-rail-count">{buffs.length || '—'}</span>
          </button>
          <button
            type="button"
            data-cat="consumable"
            className={`tab-rail-tab${activeCat === 'consumable' ? ' tab-rail-tab-active' : ''}`}
            onClick={() => jumpTo('sec-consumable', 'consumable')}
          >
            {t('bazaar.tabConsumables')} <span className="tab-rail-count">{consumables.length || '—'}</span>
          </button>
          <button
            type="button"
            data-cat="qol"
            className={`tab-rail-tab${activeCat === 'qol' ? ' tab-rail-tab-active' : ''}`}
            onClick={() => jumpTo('sec-qol', 'qol')}
          >
            {t('bazaar.tabQol')} <span className="tab-rail-count">{qol.length || '—'}</span>
          </button>
          <button
            type="button"
            data-cat="cosmetic"
            className={`tab-rail-tab${activeCat === 'cosmetic' ? ' tab-rail-tab-active' : ''}`}
            onClick={() => jumpTo('sec-cosmetic', 'cosmetic')}
          >
            {t('bazaar.tabCosmetics')} <span className="tab-rail-count">{cosmeticsCount || '—'}</span>
          </button>
          <span className="tab-rail-indicator" ref={indicatorRef} aria-hidden="true" />
        </nav>

        <section id="sec-buff" className="bls-section">
          <header className="bls-section-header">
            <h3 className="bls-section-title">{t('bazaar.sectionBuffs')}</h3>
            <span className="bls-section-tag">{t('bazaar.buffsTag')}</span>
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

        <section id="sec-consumable" className="bls-section">
          <header className="bls-section-header">
            <h3 className="bls-section-title">{t('bazaar.sectionConsumables')}</h3>
            <span className="bls-section-tag">{t('bazaar.consumablesTag')}</span>
            <span className="bls-section-count">{consumables.length}</span>
          </header>
          {consumables.length === 0 ? (
            <div className="bls-empty">{t('bazaar.comingSoon')}</div>
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

        <section id="sec-qol" className="bls-section">
          <header className="bls-section-header">
            <h3 className="bls-section-title">{t('bazaar.sectionQol')}</h3>
            <span className="bls-section-tag">{t('bazaar.qolTag')}</span>
            <span className="bls-section-count">{qol.length}</span>
          </header>
          {qol.length === 0 ? (
            <div className="bls-empty">{t('bazaar.comingSoon')}</div>
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

        {/* Cosmetics aisle (v2) — bundles first, then singles by slot.
            Already-owned items hide; cards bought here disappear and
            move to Codex > Wardrobe. */}
        <section id="sec-cosmetic" className="bls-section">
          <header className="bls-section-header">
            <h3 className="bls-section-title">{t('bazaar.sectionCosmetics')}</h3>
            <span className="bls-section-tag">{t('bazaar.cosmeticsTag')}</span>
            <span className="bls-section-count">{cosmeticsCount}</span>
          </header>

          {availableBundles.length > 0 && (
            <div className="bls-cosmetic-section">
              <div className="bls-cosmetic-section-label bls-cosmetic-section-label-bundles">
                {t('bazaar.themePacks')}
                <span className="bls-cosmetic-section-count">{availableBundles.length}</span>
              </div>
              {availableBundles.map(b => (
                <BundleCard
                  key={b.id}
                  bundle={b}
                  balance={balance}
                  onBuy={handleBuy}
                  busy={busy}
                />
              ))}
            </div>
          )}

          {Object.entries(cosmeticsBySlot).map(([slot, group]) => {
            if (group.items.length === 0) return null;
            return (
              <div key={slot} className="bls-cosmetic-section">
                <div className="bls-cosmetic-section-label">
                  {group.label}
                  <span className="bls-cosmetic-section-count">{group.items.length}</span>
                </div>
                {group.items.map(item => (
                  <SkinCard
                    key={item.id}
                    item={item}
                    balance={balance}
                    onBuy={handleBuy}
                    busy={busy}
                  />
                ))}
              </div>
            );
          })}

          {availableBundles.length === 0 && cosmeticsCount === 0 && (
            <div className="bls-empty">
              {t('bazaar.allOwned')} <button type="button" className="bls-inline-link" onClick={onOpenCodex}>{t('bazaar.codexWardrobeLink')}</button>
            </div>
          )}
        </section>
      </div>

    </div>
  );
}
