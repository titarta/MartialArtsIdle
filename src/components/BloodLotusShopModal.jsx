import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BLOOD_LOTUS_PACKAGES,
  purchaseBloodLotus,
  getBloodLotusBalance,
} from '../systems/bloodLotus';
import { restorePurchases } from '../iap/iapService';

const BASE = import.meta.env.BASE_URL;

/**
 * Per-tier presentation metadata. The pack DATA lives in
 * src/systems/bloodLotus.js (id / amount / price / label) — this file
 * only declares how each tier *presents* itself in the IAP shop:
 *
 *   rank   — 1..6 ladder position, drives the metal tier escalation
 *   badge  — small marketing label centred on the card top (Popular /
 *            Best Value etc.). null = no badge for this tier.
 *   tone   — bronze / silver / gold / radiant. Toggles CSS variants on
 *            the card (border, gem colour, badge background, shimmer).
 *   layout — 'small' | 'banner' | 'hero'
 *              small  → compact tile in the 2-col grid (T1–T4)
 *              banner → single-row stretched tile (T5 Treasury)
 *              hero   → full-width premium card with shimmer (T6 only)
 */
const TIER_META = {
  blood_lotus_1: { rank: 1, badge: null,         tone: 'bronze',  layout: 'small'  },
  blood_lotus_2: { rank: 2, badge: 'Popular',    tone: 'bronze',  layout: 'small'  },
  blood_lotus_3: { rank: 3, badge: null,         tone: 'silver',  layout: 'small'  },
  blood_lotus_4: { rank: 4, badge: 'Big Saver',  tone: 'silver',  layout: 'small'  },
  blood_lotus_5: { rank: 5, badge: 'Mega Value', tone: 'gold',    layout: 'banner' },
  blood_lotus_6: { rank: 6, badge: 'Best Value', tone: 'radiant', layout: 'hero'   },
};

/** $4.99 → 4.99 */
function parseUsd(price) {
  return parseFloat(String(price).replace(/[^0-9.]/g, ''));
}

/** Bonus % of this pack's BL/$ rate over the baseline (smallest) pack. */
function bonusPctOver(pkg, basePkg) {
  const rate     = pkg.amount     / parseUsd(pkg.price);
  const baseRate = basePkg.amount / parseUsd(basePkg.price);
  return Math.round(((rate / baseRate) - 1) * 100);
}

/**
 * What this pack's BL would have cost if priced at the baseline rate —
 * rounded up to the next .99 so it reads as a believable strike-through
 * "original" price (e.g. $109.99 → $99.99 for Heaven's Fortune).
 */
function fakeBasePrice(pkg, basePkg) {
  const baseRate    = basePkg.amount / parseUsd(basePkg.price);
  const equivalent  = pkg.amount / baseRate;
  const ceilDollars = Math.ceil(equivalent);
  return Math.max(parseUsd(pkg.price) + 1, ceilDollars) - 0.01;
}

/** Round per-pack BL/$ rate for display ("455 BL / $"). */
function ratePerDollar(pkg) {
  return Math.round(pkg.amount / parseUsd(pkg.price));
}

export default function BloodLotusShopModal({ onClose, onBalanceChange, addToast }) {
  const { t } = useTranslation('ui');
  const [pending, setPending] = useState(null);
  const [balance, setBalance] = useState(() => getBloodLotusBalance());

  // Live-sync the balance pip in the header. Balance changes (purchases,
  // milestones, perk grants) all dispatch this event from bloodLotus.js.
  useEffect(() => {
    const refresh = () => setBalance(getBloodLotusBalance());
    window.addEventListener('blood-lotus-changed', refresh);
    return () => window.removeEventListener('blood-lotus-changed', refresh);
  }, []);

  // Success / error routed through the global toast stack, NOT an inline
  // bar inside the modal. The earlier inline bar pushed the pack grid
  // down (broke the no-shift rule) and - more critically - sat at the
  // TOP of the modal, so a player buying the bottom pack (Heaven's
  // Fortune, T6) couldn't see the confirmation at all.
  const fire = useCallback((toast) => {
    if (typeof addToast === 'function') addToast(toast);
  }, [addToast]);

  const buy = useCallback(async (pkg) => {
    setPending(pkg.id);
    const result = await purchaseBloodLotus(pkg.id);
    setPending(null);
    if (result.ok) {
      fire({
        type:    'success',
        kicker:  t('shop.toastKicker'),
        glyph:   '蓮',  // lotus
        message: t('shop.purchaseSuccess', { amount: pkg.amount.toLocaleString() }),
        duration: 4500,
      });
      setBalance(getBloodLotusBalance());
      onBalanceChange?.(getBloodLotusBalance());
    } else if (!result.cancelled) {
      fire({
        type:    'error',
        kicker:  t('shop.purchaseFailed'),
        glyph:   '失',  // loss / fail
        message: result.error ?? t('common.genericError'),
        duration: 5500,
      });
    }
  }, [onBalanceChange, fire]);

  const restore = useCallback(async () => {
    setPending('restore');
    try {
      await restorePurchases();
    } catch (e) {
      fire({
        type:    'error',
        kicker:  t('shop.restoreFailed'),
        glyph:   '失',
        message: e?.message ?? t('shop.restoreFailed'),
        duration: 5500,
      });
    } finally {
      setPending(null);
    }
  }, [fire]);

  const basePkg = BLOOD_LOTUS_PACKAGES[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="blood-lotus-shop-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label={t('common.closeAriaLabel')}>✕</button>

        <header className="blshop-header">
          <div className="blshop-title-block">
            <span className="blshop-eyebrow">{t('shop.eyebrow')}</span>
            <h2 className="blshop-title">{t('shop.title')}</h2>
          </div>
          <div className="blshop-balance" aria-label={t('shop.balanceAriaLabel')}>
            <img
              src={`${BASE}sprites/items/blood_lotus.png`}
              className="blshop-balance-icon"
              alt=""
              draggable="false"
            />
            <div className="blshop-balance-stack">
              <span className="blshop-balance-label">{t('shop.balanceCurrent')}</span>
              <span className="blshop-balance-amount">{balance.toLocaleString()}</span>
            </div>
          </div>
        </header>

        {/* (Inline success/error bar removed 2026-05-27. Was a fixed-
            position div at the top of the modal that shifted the pack
            grid down on appear/dismiss - broke the no-shift rule, and
            was invisible when the player bought the bottom Heaven's
            Fortune pack. Both outcomes now route through the global
            toast stack via the `addToast` prop.) */}

        <div className="blshop-grid">
          {BLOOD_LOTUS_PACKAGES.map((pkg) => {
            const meta   = TIER_META[pkg.id] ?? { rank: 0, badge: null, tone: 'bronze', layout: 'small' };
            const bonus  = bonusPctOver(pkg, basePkg);
            const strike = bonus > 0 ? fakeBasePrice(pkg, basePkg) : null;
            const rate   = ratePerDollar(pkg);
            return (
              <PackCard
                key={pkg.id}
                pkg={pkg}
                meta={meta}
                bonus={bonus}
                strike={strike}
                rate={rate}
                pending={pending === pkg.id}
                disabled={pending !== null}
                onBuy={() => buy(pkg)}
                t={t}
              />
            );
          })}
        </div>

        <footer className="blshop-footer">
          <span className="blshop-fineprint">
            {t('shop.finePrint')}
          </span>
          <button
            className="blshop-restore"
            onClick={restore}
            disabled={pending !== null}
            type="button"
          >
            {pending === 'restore' ? t('shop.restoring') : t('shop.restorePurchases')}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Pack card — one of three layouts (small / banner / hero), driven by
   meta.layout. The hero card adds an animated gold-shimmer sweep + a
   stronger "SAVE $X" callout below the strikethrough.
   ──────────────────────────────────────────────────────────────────────── */
function PackCard({ pkg, meta, bonus, strike, rate, pending, disabled, onBuy, t }) {
  const isHero   = meta.layout === 'hero';
  const isBanner = meta.layout === 'banner';
  const savedDollars = strike != null ? (strike - parseUsd(pkg.price)).toFixed(0) : null;

  return (
    <button
      type="button"
      className={[
        'blshop-pack',
        `blshop-pack--${meta.tone}`,
        `blshop-pack--${meta.layout}`,
        pending ? 'is-pending' : '',
      ].filter(Boolean).join(' ')}
      onClick={onBuy}
      disabled={disabled}
      data-rank={meta.rank}
    >
      {/* Hero-only: animated shimmer sweep across the card */}
      {isHero && <span className="blshop-pack-shimmer" aria-hidden="true" />}

      {/* Top-centre marketing badge (Popular / Best Value etc.) */}
      {meta.badge && (
        <span className={`blshop-pack-badge blshop-pack-badge--${meta.tone}`}>
          {isHero && <span className="blshop-pack-badge-flare" aria-hidden="true">✦</span>}
          {t(`shop.badge.${meta.badge === 'Popular' ? 'popular' : meta.badge === 'Big Saver' ? 'bigSaver' : meta.badge === 'Mega Value' ? 'megaValue' : 'bestValue'}`)}
          {isHero && <span className="blshop-pack-badge-flare" aria-hidden="true">✦</span>}
        </span>
      )}

      {/* (Bonus chip moved into the buy section below — see the
          .blshop-pack-perks row. Previously this was absolutely positioned
          at top:10/right:10 and conflicted with the marketing badge on
          small cards / with the price column on the banner.) */}

      <div className="blshop-pack-icon" aria-hidden="true">
        <img
          src={`${BASE}sprites/items/${pkg.id}.png`}
          alt=""
          draggable="false"
        />
      </div>

      <div className="blshop-pack-body">
        <span className="blshop-pack-label">{t(`shop.packages.${pkg.id}`, { defaultValue: pkg.label })}</span>
        <div className="blshop-pack-amount-row">
          <span className="blshop-pack-amount">{pkg.amount.toLocaleString()}</span>
          <span className="blshop-pack-amount-unit">BL</span>
        </div>
        <span className="blshop-pack-rate">{rate} BL / $</span>
      </div>

      <div className="blshop-pack-buy">
        {pending ? (
          <span className="blshop-pack-price-pending">{t('shop.processing')}</span>
        ) : (
          <>
            <div className="blshop-pack-price-row">
              {strike != null && (
                <span className="blshop-pack-strike">${strike.toFixed(2)}</span>
              )}
              <span className="blshop-pack-price">{pkg.price}</span>
            </div>
            {(bonus > 0 || ((isHero || isBanner) && savedDollars > 0)) && (
              <div className="blshop-pack-perks">
                {bonus > 0 && (
                  <span
                    className="blshop-pack-bonus"
                    aria-label={t('shop.bonusAriaLabel', { bonus })}
                  >
                    +{bonus}%
                  </span>
                )}
                {(isHero || isBanner) && savedDollars > 0 && (
                  <span className="blshop-pack-save">{t('shop.save', { dollars: savedDollars })}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </button>
  );
}
