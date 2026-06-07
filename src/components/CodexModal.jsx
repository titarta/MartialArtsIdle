import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AchievementsBody  from './AchievementsBody';
import StatsBody         from './StatsBody';
import WardrobeTab       from './WardrobeTab';

/**
 * Codex — TopBar paper-roll modal (post content-audit).
 *
 * Renamed from AnnalsModal. The audit added a third surface: Wardrobe.
 * Owned cosmetics now live here (grouped by slot, equip / unequip in
 * place) so the Bazaar can hide owned cards from its main grid. The
 * Achievements + Stats tabs stay unchanged from the Annals build.
 *
 * Tab order: Wardrobe first (fashion is the most-visited surface after
 * a cosmetic purchase), Achievements second (badge dot lives on the
 * TopBar button), Stats third. Default tab is Wardrobe.
 *
 * (Earlier builds fired an ANNALS_TO_CODEX_MIGRATION returning-player
 * tutorial card to explain the rename. That card has been removed -
 * see the comment in src/data/tutorialCards.js TUTORIAL_IDS block.)
 */
const TAB_IDS = ['wardrobe', 'achievements', 'stats'];

function CodexModal({
  achievements,
  stats,
  qiRef,
  rateRef,
  inventory,
  onNavigateBazaar,
  onClose,
}) {
  const { t } = useTranslation('ui');
  const [tab, setTab] = useState('wardrobe');

  const TAB_LABELS = {
    wardrobe:     t('codex.tabWardrobe'),
    achievements: t('codex.tabAchievements'),
    stats:        t('codex.tabStats'),
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="progress-hub-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label={t('common.closeAriaLabel')}>✕</button>

        <div className="ach-tabs progress-hub-tabs">
          {TAB_IDS.map(id => (
            <button
              key={id}
              className={`ach-tab${tab === id ? ' ach-tab-active' : ''}`}
              onClick={() => setTab(id)}
            >
              {TAB_LABELS[id]}
            </button>
          ))}
        </div>

        <div className="progress-hub-body">
          {tab === 'wardrobe' && (
            <WardrobeTab
              inventory={inventory}
              onBrowseBazaar={() => {
                onClose?.();
                onNavigateBazaar?.();
              }}
            />
          )}
          {tab === 'achievements' && achievements && <AchievementsBody achievements={achievements} />}
          {tab === 'stats'        && (
            <StatsBody
              stats={stats}
              qiRef={qiRef}
              rateRef={rateRef}
              achievements={achievements}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default CodexModal;
