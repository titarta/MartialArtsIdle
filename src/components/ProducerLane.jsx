import { useMemo, useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameText } from '../i18n/gameText';
import { fmt, fmtRate } from '../utils/format';
import { getSpriteTier, resolveSprite, resolveTierFor, SPRITE_TIERS } from '../data/producers';

/** Visible-unit cap in the sprite stack. Mobile gets fewer via CSS-only path
 *  (the overflow `+N` chip shifts left automatically when stack overflows). */
const MAX_VISIBLE_UNITS = 20;

const BASE = import.meta.env.BASE_URL;

/** Render a sprite — handles both emoji placeholders and image paths.
 *  Path detection: strings starting with `/` are treated as `public/`-relative
 *  PNG paths and rendered via <img>. Anything else (emoji glyphs) renders
 *  as text. The global image-rendering CSS rule applies pixelated upscaling
 *  to imgs automatically (see App.css). */
function Sprite({ sprite, className }) {
  if (typeof sprite === 'string' && sprite.startsWith('/')) {
    return (
      <img
        src={`${BASE}${sprite.replace(/^\//, '')}`}
        alt=""
        className={className}
        draggable={false}
      />
    );
  }
  return <span className={className} aria-hidden="true">{sprite}</span>;
}

/**
 * One Cookie-Clicker-style lane in the CultivationScreen producer list.
 *
 * Layout (left → right):
 *   [Leader sprite] [Name + meta + tier badge] [Sprite stack with overflow] [Buy button]
 *
 * The leader sprite + every unit in the stack swap to a tier-specific sprite
 * variant when ownership crosses 10 / 25 / 50 (see SPRITE_TIERS in producers.js).
 * CSS class `pl-tier-<bronze|silver|gold|mythic>` drives the glow escalation.
 *
 * A short celebration animation plays on threshold crossings via the
 * `pl-celebrate` class — the lane briefly scales + pulses gold/violet.
 */
export default function ProducerLane({
  producer,
  owned,
  unlocked,
  buyMode,
  qi,
  producers,
  onBuy,
  onShowDetail,
  // 2026-05-21 Dial-9 — Tinker's Bargain (uncommon spark) gives -30% on the
  // next 5 producer purchases. CultivationScreen passes the active discount
  // fraction (0..1) so the displayed cost matches what spendQi will actually
  // bill. Defaults to 0 → identity / no discount.
  costDiscount = 0,
  // tree.modifiers from useReincarnationTree — gates the disciple's
  // Transcended tier on the disc_transcend Eternal Tree node.
  treeMods = {},
}) {
  const { t } = useTranslation('ui');
  const gt = useGameText();
  const pName = gt('producers', producer.id, 'name', producer.name);
  // Resolve current tier + sprite. Tier null when 0 owned. resolveTierFor
  // respects the producer's transcendedNode gate; resolveSprite falls back
  // to the producer's highest available sprite if the tier exceeds the
  // array length (e.g. other producers at 100+ owned still render Mythic).
  const tier = unlocked ? resolveTierFor(producer, owned, treeMods) : null;
  const spriteIdx = tier?.idx ?? 0;
  const sprite = resolveSprite(producer, spriteIdx) ?? '◆';

  // Threshold-crossing celebration. Watch tier transitions; on change, briefly
  // toggle the `.pl-celebrate` class so CSS plays the burst animation. The
  // ref tracks the last tier name so we don't fire on every render.
  const prevTierNameRef = useRef(tier?.name ?? null);
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    const next = tier?.name ?? null;
    const prev = prevTierNameRef.current;
    // Only fire on upward transitions (null→bronze, bronze→silver, etc.).
    // Ranks derived from SPRITE_TIERS so new tiers (e.g. 'transcended' added
    // 2026-06-08) auto-include in the upward-transition detection. Hardcoded
    // 4-tier array silently no-op'd at Mythic→Transcended.
    const ranks = SPRITE_TIERS.map(t => t.name);
    const prevRank = ranks.indexOf(prev);
    const nextRank = ranks.indexOf(next);
    if (nextRank > prevRank && next != null) {
      setCelebrating(true);
      const timer = setTimeout(() => setCelebrating(false), 1400);
      prevTierNameRef.current = next;
      return () => clearTimeout(timer);
    }
    prevTierNameRef.current = next;
  }, [tier?.name]);

  // Resolve the effective buy count for the active mode (1 | 10 | 100).
  // All-or-nothing: the buy succeeds only if the player can afford every
  // unit in the batch. Affordability is enforced by the button-enable
  // check below; this resolver just returns the count.
  const resolvedCount = useMemo(() => {
    if (!unlocked) return 0;
    return buyMode;
  }, [buyMode, unlocked]);

  const displayCost = useMemo(() => {
    if (!unlocked) return 0;
    const n = Math.max(1, resolvedCount);
    const raw = producers.getCost(producer.id, n);
    if (costDiscount > 0) {
      // Match the rounding used in CultivationScreen.handleBuy so the shown
      // cost matches what spendQi will actually deduct on click.
      return Math.max(1, Math.ceil(raw * (1 - costDiscount)));
    }
    return raw;
  }, [producer.id, producers, resolvedCount, unlocked, costDiscount]);

  // Locked state — Cookie-Clicker-style "teaser" reveal. Show the actual
  // producer sprite as a black silhouette so the player sees the shape but
  // not the detail, paired with a "???" name and an unlock-realm hint.
  // Falls back to the lock emoji if the producer has no sprite (shouldn't
  // happen with current data, but defensive). Click still opens the detail
  // modal so the player can read what they're working toward.
  if (!unlocked) {
    const minRealm = producer.unlock?.minRealmIndex ?? '?';
    const teaserSprite = producer.sprites?.[0] ?? '🔒';
    return (
      <div className="pl-lane pl-locked" aria-disabled="true">
        <button
          className="pl-leader pl-leader-clickable"
          onClick={() => onShowDetail?.(producer)}
          aria-label={t('producer.detailsLabel', { name: pName })}
          type="button"
        >
          <Sprite sprite={teaserSprite} className="pl-leader-sprite pl-leader-silhouette" />
        </button>
        <div className="pl-body">
          <div className="pl-caption">
            <span className="pl-name pl-name-locked">{t('producer.lockedName')}</span>
            <span className="pl-sep">·</span>
            <span className="pl-rate">{t('producer.unlocksAt', { n: minRealm })}</span>
          </div>
          <div className="pl-stack pl-stack-empty" aria-hidden="true"></div>
        </div>
        <div className="pl-buy-zone pl-buy-zone-locked">{t('common.locked')}</div>
      </div>
    );
  }

  const affordable = resolvedCount > 0 && qi >= displayCost;
  const totalQiPerSec = owned * producer.startQiPerSec;
  const tierClass = tier ? `pl-tier-${tier.name}` : 'pl-tier-empty';

  // Visible-units cap — `overflow: hidden` on .pl-stack clips the right side
  // when more sprites fit than the row can hold. The always-visible ×N chip
  // (positioned at the right edge of the stack, z-index above the sprites)
  // carries the real count regardless of how many fit visually.
  const visible = Math.min(owned, MAX_VISIBLE_UNITS);

  return (
    <div className={`pl-lane ${tierClass}${celebrating ? ' pl-celebrate' : ''}`}>
      <button
        className="pl-leader pl-leader-clickable"
        onClick={() => onShowDetail?.(producer)}
        aria-label={t('producer.detailsLabel', { name: pName })}
        type="button"
      >
        <Sprite sprite={sprite} className="pl-leader-sprite" />
      </button>

      <div className="pl-body">
        <div className="pl-caption">
          <span className="pl-name">{pName}</span>
          {owned > 0 && (
            <>
              <span className="pl-sep">·</span>
              <span className="pl-rate">{t('producer.ratePerSec', { rate: fmtRate(totalQiPerSec) })}</span>
            </>
          )}
        </div>
        <div className="pl-stack">
          {Array.from({ length: visible }).map((_, i) => (
            <Sprite key={i} sprite={sprite} className="pl-unit" />
          ))}
          {owned > 0 && <div className="pl-total">×{owned}</div>}
        </div>
      </div>

      <button
        className={`pl-buy${affordable ? '' : ' pl-buy-disabled'}`}
        onClick={() => onBuy(producer.id, resolvedCount)}
        disabled={!affordable}
      >
        <span className="pl-buy-count">×{buyMode}</span>
        <span className="pl-buy-cost">{t('producer.cost', { n: fmt(displayCost) })}</span>
      </button>
    </div>
  );
}
