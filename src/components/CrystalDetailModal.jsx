import { fmt } from '../utils/format';
import { useTranslation } from 'react-i18next';
import DetailModal from './DetailModal';
import {
  getCrystalQiMult,
  CRYSTAL_MULT_PER_LEVEL,
  MAX_CRYSTAL_LEVEL,
} from '../hooks/useQiCrystal';

const BASE = import.meta.env.BASE_URL;

// Visual tier thresholds — mirrors useQiCrystal / HomeScreen / CultivationScreen
// /CrystalFeedModal so the modal can compute "next evolution level". Keep in
// sync if those move (10 entries: T1=L1 ... T9=L80 ... T10=L100).
const CRYSTAL_TIER_THRESHOLDS = [100, 80, 70, 60, 50, 40, 30, 20, 10, 1];
const CRYSTAL_TIER_VALUES     = [ 10,  9,  8,  7,  6,  5,  4,  3,  2, 1];

function getCrystalTier(level) {
  if (level <= 0) return 0;
  for (let i = 0; i < CRYSTAL_TIER_THRESHOLDS.length; i++) {
    if (level >= CRYSTAL_TIER_THRESHOLDS[i]) return CRYSTAL_TIER_VALUES[i];
  }
  return 1;
}

/** Find the next tier threshold above `currentLevel`. Returns null if maxed. */
function getNextTierInfo(currentLevel) {
  // Walk THRESHOLDS in ascending tier order — find the first tier whose
  // threshold is strictly above the current level.
  const pairs = CRYSTAL_TIER_THRESHOLDS
    .map((thresh, i) => ({ thresh, tier: CRYSTAL_TIER_VALUES[i] }))
    .sort((a, b) => a.tier - b.tier); // T1, T2, T3 ...
  for (const { thresh, tier } of pairs) {
    if (thresh > currentLevel) {
      return { tier, level: thresh };
    }
  }
  return null;
}

/**
 * Crystal detail modal — opens when the player taps the Qi Crystal level
 * chip on HomeScreen. Mirrors ProducerDetailModal's layout so the two
 * detail screens feel consistent.
 *
 * Shows:
 *   - Current visual tier + evocative name + sprite
 *   - Level / max level
 *   - Current cultivation multiplier
 *   - Next evolution preview: tier, name, sprite, level threshold,
 *     levels remaining, and the multiplier the player will have once they
 *     reach it.
 *   - "Crystal fully evolved" state when at max.
 */
export default function CrystalDetailModal({ level, onClose }) {
  const { t } = useTranslation('ui');

  const tier        = getCrystalTier(level);
  const tierName    = t(`crystalTierNames.${tier}`) ?? 'Qi Crystal';
  const sprite      = `${BASE}crystals/crystal_${Math.max(1, tier)}.png`;
  const crystalMult = getCrystalQiMult(level);
  const isMaxed     = level >= MAX_CRYSTAL_LEVEL;

  const nextInfo   = getNextTierInfo(level);
  const nextSprite = nextInfo ? `${BASE}crystals/crystal_${nextInfo.tier}.png` : null;
  const nextName   = nextInfo ? t(`crystalTierNames.${nextInfo.tier}`) : null;
  const nextMult   = nextInfo ? getCrystalQiMult(nextInfo.level) : null;
  const levelsAway = nextInfo ? Math.max(0, nextInfo.level - level) : 0;

  return (
    <DetailModal open onClose={onClose} className="pdm-modal" ariaLabel={t('crystalDetail.name')}>
      <button className="modal-close" onClick={onClose} aria-label={t('common.closeAriaLabel')}>✕</button>

        <div className="pdm-hero">
          <img
            src={sprite}
            alt=""
            className="pdm-hero-sprite"
            draggable={false}
          />
          <span className={`pdm-tier-badge pdm-badge-tier-${tier}`}>
            T{tier} · {tierName}
          </span>
        </div>

        <div className="pdm-name">{t('crystalDetail.name')}</div>

        <div className="pdm-stats">
          <div className="pdm-stat-row">
            <span className="pdm-stat-label">{t('crystalDetail.levelLabel')}</span>
            <span className="pdm-stat-value">
              {level} / {MAX_CRYSTAL_LEVEL}
              {isMaxed && <span className="pdm-stat-mult"> (max)</span>}
            </span>
          </div>
          <div className="pdm-stat-row pdm-stat-row-emph">
            <span className="pdm-stat-label">{t('crystalDetail.cultivationBonus')}</span>
            <span className="pdm-stat-value">×{crystalMult.toFixed(3)}</span>
          </div>
          <div className="pdm-stat-row">
            <span className="pdm-stat-label">{t('crystalDetail.perLevel')}</span>
            <span className="pdm-stat-value">+{(CRYSTAL_MULT_PER_LEVEL * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Next evolution preview — sprite + name are SILHOUETTED so the
            player isn't spoiled on the next tier's appearance. Only the
            level threshold and the projected bonus are revealed (useful
            gameplay numbers, not visual spoilers). The silhouette + name
            unveil naturally when the player reaches that tier in-game. */}
        {nextInfo ? (
          <div className="cdm-next">
            <div className="cdm-next-header">{t('crystalDetail.nextEvolution')}</div>
            <div className="cdm-next-row">
              <div className="cdm-next-sprite-wrap">
                <img
                  src={nextSprite}
                  alt=""
                  className="cdm-next-sprite cdm-next-sprite-silhouette"
                  draggable={false}
                />
                <span className="cdm-next-sprite-mystery" aria-hidden="true">?</span>
              </div>
              <div className="cdm-next-body">
                <div className="cdm-next-name cdm-next-name-mystery">
                  T{nextInfo.tier} · <span className="cdm-next-mystery-text">???</span>
                </div>
                <div className="cdm-next-meta">
                  {t('crystalDetail.reachesAt', { n: nextInfo.level })}
                  {levelsAway > 0 && (
                    <> · <strong>{levelsAway}</strong> {t('crystalDetail.levelsAway', { n: levelsAway })}</>
                  )}
                </div>
                <div className="cdm-next-meta">
                  {t('crystalDetail.bonusAt', { n: nextInfo.tier })} <strong>×{nextMult.toFixed(3)}</strong>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="cdm-next cdm-next-maxed">
            <div className="cdm-next-header">{t('crystalDetail.fullyEvolved')}</div>
            <div className="cdm-next-meta">
              {t('crystalDetail.fullyEvolvedDesc')}
            </div>
          </div>
        )}
    </DetailModal>
  );
}
