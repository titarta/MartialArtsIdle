import { useEffect, useRef, useState } from 'react';
import { QI_SPARK_BY_ID, SPARK_RARITY, SPARK_COPY } from '../data/qiSparks';

const BASE = import.meta.env.BASE_URL;

/**
 * Inactivity timeout: the modal auto-resolves (picks leftmost) if the
 * player does not interact. 60 seconds is calibrated against playtest
 * data; any tap, reroll, or hover counts as activity and resets the
 * timer, so an engaged player effectively never times out.
 */
const CHOICE_TIMEOUT_MS = 60_000;

/** Bold-aware mini-renderer: `**foo**` becomes <strong>foo</strong>. */
function renderEffect(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

/** Pixel sprite when icon looks like a path, emoji glyph otherwise. */
function CardIcon({ icon }) {
  if (typeof icon === 'string' && icon.startsWith('/')) {
    return (
      <img
        src={`${BASE}${icon.replace(/^\//, '')}`}
        alt=""
        className="spk-icon-img"
        draggable={false}
      />
    );
  }
  return <span className="spk-icon-emoji" aria-hidden="true">{icon}</span>;
}

/**
 * Resolve the display icon for a spark id. Priority:
 *   1. SPARK_COPY[id].icon (explicit override, e.g. producer sprite for
 *      legendaries, themed emoji for common/uncommon)
 *   2. mechanic-tier cards reuse the medallion icon the upgrades shop
 *      already shows (ui/upgrade_<mechanicId>.png)
 *   3. fallback to a generic spark glyph
 */
function iconFor(sparkId) {
  const copy = SPARK_COPY[sparkId];
  if (copy?.icon) return copy.icon;
  const card = QI_SPARK_BY_ID[sparkId];
  if (card?.kind === 'mechanic' && card.mechanicId) {
    return `/ui/upgrade_${card.mechanicId}.png`;
  }
  return '✦';
}

/**
 * A single inscribed-card slot: card body plus the Pick button below.
 * Cards are the same dimensions regardless of rarity. Frame ornament,
 * accent color, and motion escalate from common to legendary; see
 * `.spk-card-*` rules in App.css for the rarity vocabulary.
 *
 * The whole card surface is clickable (picks this spark). The Pick
 * button is a separate visual affordance reinforcing the same action,
 * so players never have to hunt for the commit moment.
 */
function SparkCardSlot({ sparkId, onPick }) {
  const card = QI_SPARK_BY_ID[sparkId];
  if (!card) return null;
  const rarity     = SPARK_RARITY[card.rarity] ?? SPARK_RARITY.common;
  const copy       = SPARK_COPY[sparkId];
  const effectText = copy?.effectText ?? card.description ?? '';
  const icon       = iconFor(sparkId);
  const sealGlyph  = copy?.sealGlyph ?? null;

  // Legendary gets the ember-mote layer for drift animation. The
  // markup is the same across rarities so the React tree shape stays
  // stable; CSS hides the embers on non-legendary cards.
  const isLegendary = card.rarity === 'legendary';
  const isUncommon  = card.rarity === 'uncommon';

  return (
    <div className={`spk-slot spk-slot-${card.rarity}`}>
      <article
        className={`spk-card spk-card-${card.rarity}`}
        role="button"
        tabIndex={0}
        onClick={() => onPick(sparkId)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPick(sparkId);
          }
        }}
        aria-label={`Pick ${card.name}`}
      >
        <span className="spk-grain" aria-hidden="true" />
        <span className="spk-mark"  aria-hidden="true" />
        <span className="spk-corner spk-corner-tl" aria-hidden="true" />
        <span className="spk-corner spk-corner-tr" aria-hidden="true" />
        <span className="spk-corner spk-corner-bl" aria-hidden="true" />
        <span className="spk-corner spk-corner-br" aria-hidden="true" />

        {isLegendary && (
          <span className="spk-embers" aria-hidden="true">
            <i /><i /><i /><i />
          </span>
        )}

        <div className="spk-inner">
          <div className="spk-kicker">{rarity.label}</div>
          <div className="spk-icon-area">
            <span className="spk-icon-glow" />
            <span className="spk-icon-glyph"><CardIcon icon={icon} /></span>
          </div>
          <hr className="spk-rule" />
          <h3 className="spk-name">{card.name}</h3>
          <div className="spk-effect-wrap">
            <p className="spk-effect">{renderEffect(effectText)}</p>
          </div>
        </div>

        {(isUncommon || isLegendary) && (
          <span className="spk-seal" aria-hidden="true">
            {sealGlyph ?? (isLegendary ? '灵' : '玉')}
          </span>
        )}
      </article>
    </div>
  );
}

/**
 * Two-card pick modal with the inscribed-cards aesthetic. Vertically
 * centered on the screen via the overlay; cards live in a horizontal
 * pair below the title. Reroll button + meta strip pin to the bottom.
 *
 * Props:
 *   offer:             { id, cards, offerFreeRerollsLeft, offerPaidRerollsUsed }
 *   bloodLotusBalance: number (for paid reroll affordability check)
 *   nextRerollCostFor: (cardIndex) => number | () => number
 *   onChoose(sparkId)
 *   onRerollOffer()    | onRerollCard()   (legacy alias)
 *   onSkip()           (called on inactivity timeout, picks leftmost)
 *   pityCounter, pityThreshold, legendaryChance, legendaryPoolInfo
 */
function QiSparkChoiceModal({
  offer,
  bloodLotusBalance,
  nextRerollCostFor,
  onChoose,
  onRerollOffer,
  onRerollCard,         // legacy prop name; same shape
  onSkip,
  pityCounter = 0,
  pityThreshold = 17,
  legendaryChance = 0.06,
  legendaryPoolInfo = null,
}) {
  const rerollFn = onRerollOffer ?? onRerollCard;

  // Auto-skip after timeout. onSkip is captured via ref so the timer
  // does not reset on every parent render.
  const onSkipRef = useRef(onSkip);
  onSkipRef.current = onSkip;

  // Activity nonce bumps on user interaction so the timer resets.
  const [activityNonce, setActivityNonce] = useState(0);
  const bumpActivity = () => setActivityNonce(n => n + 1);

  useEffect(() => {
    if (!offer) return;
    const id = setTimeout(() => onSkipRef.current?.(), CHOICE_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [offer?.id, activityNonce]);

  // Wrap pick + reroll so they count as activity.
  const handlePick = (sparkId) => { bumpActivity(); onChoose?.(sparkId); };
  const handleReroll = () => { bumpActivity(); rerollFn?.(); };

  if (!offer) return null;

  // Reroll cost: tier-locked redesign uses one offer-level cost. The
  // legacy per-card signature is accepted and resolved against index 0.
  const rerollCost = typeof nextRerollCostFor === 'function'
    ? (nextRerollCostFor(0) ?? 0)
    : 0;
  const freeLeft        = offer.offerFreeRerollsLeft ?? 0;
  const isFreeReroll    = freeLeft > 0;
  const canAffordReroll = isFreeReroll || (bloodLotusBalance ?? 0) >= rerollCost;

  // Offer-level rarity (all cards share the same tier under tier-locked).
  const firstCard        = offer.cards?.[0] ? QI_SPARK_BY_ID[offer.cards[0]] : null;
  const offerRarity      = firstCard?.rarity ?? 'common';
  const offerRarityLabel = SPARK_RARITY[offerRarity]?.label ?? '';

  const pityRemaining  = Math.max(0, pityThreshold - pityCounter);
  const pityImminent   = pityRemaining <= 3;
  const pityGuaranteed = pityRemaining === 0;
  const chancePct      = Math.round(legendaryChance * 100);

  // Footer composes one of three states depending on legendary pool
  // visibility and pity status. Keeps players informed about why a
  // legendary may or may not be reachable on this draw.
  const renderFooter = () => {
    const eligible = legendaryPoolInfo?.eligibleCount ?? 0;
    const total    = legendaryPoolInfo?.totalCount    ?? 0;
    const next     = legendaryPoolInfo?.nextUnlock;

    if (eligible === 0 && next) {
      return (
        <div className="spk-meta spk-meta-locked">
          <span>🔒 Legendaries unlock with <strong>{next.producerName}</strong></span>
        </div>
      );
    }
    if (eligible === 0) {
      return (
        <div className={`spk-meta${pityImminent ? ' spk-meta-pity-soon' : ''}${pityGuaranteed ? ' spk-meta-pity-now' : ''}`}>
          <span>✦ <strong>{chancePct}%</strong> legendary</span>
          <span className="spk-meta-sep">·</span>
          <span>
            {pityGuaranteed
              ? <>⚡ <strong>Next: guaranteed legendary</strong></>
              : pityImminent
                ? <>⚡ Pity in <strong>{pityRemaining}</strong> {pityRemaining === 1 ? 'realm' : 'realms'}</>
                : <>pity in <strong>{pityRemaining}</strong> realms</>}
          </span>
        </div>
      );
    }
    const poolText = (total > 0 && eligible < total)
      ? <><strong>{eligible} of {total}</strong> in pool</>
      : <>full pool</>;
    return (
      <div className={`spk-meta${pityImminent ? ' spk-meta-pity-soon' : ''}${pityGuaranteed ? ' spk-meta-pity-now' : ''}`}>
        <span>✦ <strong>{chancePct}%</strong> legendary</span>
        <span className="spk-meta-sep">·</span>
        <span>{poolText}</span>
        <span className="spk-meta-sep">·</span>
        <span>
          {pityGuaranteed
            ? <>⚡ <strong>guaranteed</strong></>
            : <>pity in <strong>{pityRemaining}</strong></>}
        </span>
      </div>
    );
  };

  return (
    <div className="modal-overlay spk-overlay" onMouseMove={bumpActivity}>
      <div className="spk-modal" onClick={e => e.stopPropagation()}>

        <div className="spk-head">
          <h2 className="spk-title">Qi Spark</h2>
          <p className="spk-sub">
            a <span className={`spk-tier-pill spk-tier-${offerRarity}`}>{offerRarityLabel}</span> offer, choose one
          </p>
        </div>

        <div className="spk-pair">
          {offer.cards.map((sparkId, idx) => (
            <SparkCardSlot
              key={`${sparkId}-${idx}`}
              sparkId={sparkId}
              onPick={handlePick}
            />
          ))}
        </div>

        <div className="spk-actions">
          <button
            type="button"
            className={`spk-reroll${isFreeReroll ? ' spk-reroll-free' : ''}${!canAffordReroll ? ' spk-reroll-locked' : ''}`}
            disabled={!canAffordReroll}
            onClick={handleReroll}
            title={
              isFreeReroll       ? 'Reroll both cards, free'
              : !canAffordReroll ? `Need ${rerollCost} Blood Lotus to reroll`
              :                    `Reroll both cards, ${rerollCost} Blood Lotus`
            }
          >
            ↺ Reroll pair{' '}
            <span className="spk-reroll-cost">
              {isFreeReroll ? 'free' : `· ${rerollCost} BL`}
            </span>
          </button>

          {renderFooter()}
        </div>

      </div>
    </div>
  );
}

export default QiSparkChoiceModal;
