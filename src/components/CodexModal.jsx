import { useState } from 'react';
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
 * A one-shot migration tutorial fires once per existing save to explain
 * the rename (see ANNALS_TO_CODEX_MIGRATION in tutorialCards.js).
 */
const TABS = [
  { id: 'wardrobe',     label: 'Wardrobe'     },
  { id: 'achievements', label: 'Achievements' },
  { id: 'stats',        label: 'Stats'        },
];

function CodexModal({
  achievements,
  stats,
  qiRef,
  rateRef,
  inventory,
  onNavigateBazaar,
  onClose,
}) {
  const [tab, setTab] = useState('wardrobe');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="progress-hub-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="ach-tabs progress-hub-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`ach-tab${tab === t.id ? ' ach-tab-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
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
