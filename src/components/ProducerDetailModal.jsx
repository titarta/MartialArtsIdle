import { useTranslation } from 'react-i18next';
import { useGameText } from '../i18n/gameText';
import { fmt, fmtRate } from '../utils/format';
import DetailModal from './DetailModal';
import { getSpriteTier, SPRITE_TIERS, resolveSprite, resolveTierFor } from '../data/producers';
import { getMinigame } from '../data/minigames';
import './minigames/minigames.css';

const BASE = import.meta.env.BASE_URL;

/** Render the leader sprite at large size for the modal header. When
 *  `silhouette` is true, the sprite renders as a hard-edged black cutout
 *  via the inline SVG filter — preserves the "what's coming next?" tease
 *  even when the player taps a locked producer to read its unlock info. */
function HeroSprite({ sprite, silhouette }) {
  const cls = `pdm-hero-sprite${silhouette ? ' pdm-hero-silhouette' : ''}`;
  if (typeof sprite === 'string' && sprite.startsWith('/')) {
    return (
      <img
        src={`${BASE}${sprite.replace(/^\//, '')}`}
        alt=""
        className={cls}
        draggable={false}
      />
    );
  }
  return <span className={`${cls} pdm-hero-emoji`} aria-hidden="true">{sprite}</span>;
}

/**
 * Modal that opens when the player taps a producer's leader sprite in the
 * Cultivation screen lane. Surfaces:
 *   - lore description (producer.desc — the player-facing "why this is stronger")
 *   - owned count + current tier + next tier threshold
 *   - per-unit qi/s after upgrade multipliers
 *   - this producer's total qi/s contribution + percentage of total game rate
 *
 * Locked producers show the unlock hint instead of stats.
 */
export default function ProducerDetailModal({
  producer,
  owned,
  unlocked,
  upgradeMult,         // multiplier from producer-doubling upgrades for this id
  // Any extra producer-id-specific multiplier that should be reflected in
  // the displayed per-unit qi/s. For the disciple producer this is the
  // Roster (merge grid) bonus (× 1 + boardSum / 100). Defaults to 1 so
  // every other producer's stats are unaffected. The same value must
  // already be folded into baseGameRate by the caller so the share-of-
  // production line is consistent with reality.
  extraMult = 1,
  baseGameRate,        // base production qi/s = BASE_RATE + sum(producer raw outputs)
  onEnterMinigame,     // (producerId) => void — opens the Mythic-tier minigame
  minigameUnlocked,    // Eternal Tree keeps this Hidden Art open across lives
  // tree.modifiers from useReincarnationTree — gates the disciple's
  // Transcended tier on the disc_transcend Eternal Tree node.
  treeMods = {},
  onClose,
}) {
  const { t } = useTranslation('ui');
  const gt = useGameText();
  const pName = gt('producers', producer.id, 'name', producer.name);
  // resolveTierFor respects producer.transcendedNode so the disciple's
  // Transcended tier only appears after disc_transcend is purchased.
  const tier      = unlocked ? resolveTierFor(producer, owned, treeMods) : null;
  const spriteIdx = tier?.idx ?? 0;
  // resolveSprite falls back to the producer's highest available sprite so
  // tiers added later (e.g. transcended) don't drop other producers to Bronze.
  const sprite    = resolveSprite(producer, spriteIdx) ?? '◆';
  const minigame  = getMinigame(producer.id);
  // Hidden Arts are gated ONLY by their Eternal Tree node (roster/garden/
  // furnace), which stays unlocked across lives. This makes the minigames a
  // deliberate prestige reward: run 1 stays a clean, simple climb, and the
  // arts arrive on run 2+ as new mechanics. Reaching Mythic tier in-run no
  // longer opens them — that leaked the mechanic into the first run.
  const canEnterMinigame = !!minigameUnlocked;

  const upMult        = upgradeMult ?? 1;
  const xMult         = extraMult   ?? 1;
  const perUnitRate   = producer.startQiPerSec * upMult * xMult;
  const totalFromHere = owned * perUnitRate;
  // Share is computed against BASE production (sum of all producer raw
  // outputs + the BASE_RATE baseline), not the live qi/s. Percent
  // multipliers (crystal, sparks, focus, pills, etc.) apply equally to
  // every producer, so they cancel out of the share calc. This way the
  // numbers across all producers actually add up — and the player sees
  // each producer's TRUE relative contribution to their loadout.
  const sharePct = baseGameRate > 0
    ? (totalFromHere / baseGameRate) * 100
    : 0;

  // Find the next-tier threshold for the "X more to reach Silver/Gold/Mythic" line.
  // SPRITE_TIERS is in ascending minOwned order — pick the first one greater
  // than the current count.
  const nextTier = unlocked
    ? SPRITE_TIERS.find(tier => tier.minOwned > owned) ?? null
    : null;

  return (
    <DetailModal open onClose={onClose} className="pdm-modal" ariaLabel={unlocked ? `${pName} details` : t('producerDetail.lockedAriaLabel')}>
      <button className="modal-close" onClick={onClose} aria-label={t('common.closeAriaLabel')}>✕</button>

        <div className="pdm-hero">
          <HeroSprite sprite={sprite} silhouette={!unlocked} />
          {tier && (
            <span className={`pdm-tier-badge pdm-badge-${tier.name}`}>
              {tier.label}
            </span>
          )}
        </div>

        {/* Spoiler-free name for locked producers — the silhouette + "???"
            keeps the Cookie-Clicker mystery; the unlock-realm hint below
            tells the player when to expect it without revealing what. */}
        <div className={`pdm-name${!unlocked ? ' pdm-name-locked' : ''}`}>
          {unlocked ? pName : t('common.unknown')}
        </div>

        {!unlocked ? (
          <div className="pdm-locked">
            <div className="pdm-locked-icon">🔒</div>
            <div className="pdm-locked-text">
              {t('producerDetail.unlocksAt', { n: producer.unlock?.minRealmIndex ?? '?' })}
            </div>
          </div>
        ) : (
          <>
            <p className="pdm-lore">{gt('producers', producer.id, 'desc', producer.desc)}</p>

            <div className="pdm-stats">
              <div className="pdm-stat-row">
                <span className="pdm-stat-label">{t('producerDetail.owned')}</span>
                <span className="pdm-stat-value">×{owned}</span>
              </div>
              <div className="pdm-stat-row">
                <span className="pdm-stat-label">{t('producerDetail.perUnit')}</span>
                <span className="pdm-stat-value">
                  {fmtRate(perUnitRate)} Qi/s
                  {upMult > 1 && (
                    <span className="pdm-stat-mult"> {t('producerDetail.upgrades', { n: upMult })}</span>
                  )}
                  {xMult > 1 && (
                    <span className="pdm-stat-mult pdm-stat-mult-roster"> {t('producerDetail.roster', { n: xMult.toFixed(2) })}</span>
                  )}
                </span>
              </div>
              <div className="pdm-stat-row pdm-stat-row-emph">
                <span className="pdm-stat-label">{t('producerDetail.baseContribution')}</span>
                <span className="pdm-stat-value">
                  {fmtRate(totalFromHere)} Qi/s
                </span>
              </div>
              <div className="pdm-stat-row">
                <span className="pdm-stat-label">{t('producerDetail.shareOfProduction')}</span>
                <span className="pdm-stat-value">
                  {sharePct < 0.05 && totalFromHere > 0 ? '<0.1' : sharePct.toFixed(1)}%
                </span>
              </div>
              {nextTier && (
                <div className="pdm-stat-row">
                  <span className="pdm-stat-label">{t('producerDetail.nextTier', { label: nextTier.label })}</span>
                  <span className="pdm-stat-value">
                    {t('producerDetail.moreToNextTier', { n: nextTier.minOwned - owned })}
                  </span>
                </div>
              )}
            </div>

            {minigame && (canEnterMinigame || import.meta.env.DEV) && (
              <div className="pdm-minigame">
                <button
                  type="button"
                  className={`pdm-mg-enter${canEnterMinigame ? '' : ' pdm-mg-enter-dev'}`}
                  onClick={() => onEnterMinigame?.(producer.id)}
                >
                  <span className="pdm-mg-glyph" aria-hidden="true">{minigame.glyph}</span>
                  <span className="pdm-mg-text">
                    <span className="pdm-mg-kicker">
                      {canEnterMinigame
                        ? (minigame.ready ? t('producerDetail.hiddenArtUnlocked') : t('producerDetail.comingSoon'))
                        : 'Preview · dev'}
                    </span>
                    <span className="pdm-mg-name">{gt('minigames', producer.id, 'name', minigame.name)}</span>
                  </span>
                  <span className="pdm-mg-arrow" aria-hidden="true">▶</span>
                </button>
                {!canEnterMinigame && (
                  <div className="pdm-mg-locknote">{t('producerDetail.mythicLockNote')}</div>
                )}
              </div>
            )}
          </>
        )}
    </DetailModal>
  );
}
