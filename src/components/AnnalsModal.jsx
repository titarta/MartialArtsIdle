import { useState } from 'react';
import AchievementsBody  from './AchievementsBody';
import StatsBody         from './StatsBody';

/**
 * Annals — TopBar 📊 modal (post nav-audit).
 *
 * The old ProgressHubModal had three tabs (Journey / Achievements / Stats).
 * Journey was promoted to a full bottom-nav screen (see JourneyScreen.jsx);
 * Achievements + Stats are review surfaces that the player checks on briefly,
 * so they stay as a chip-anchored modal. Two tabs, default Achievements
 * (that's where the badge dot points to).
 *
 * Renamed from ProgressHubModal so the modal name matches the player-facing
 * label and so the activeModal key ('annals') doesn't lie about contents.
 */
const TABS = [
  { id: 'achievements', label: 'Achievements' },
  { id: 'stats',        label: 'Stats'        },
];

function AnnalsModal({ achievements, stats, qiRef, rateRef, onClose }) {
  const [tab, setTab] = useState('achievements');

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

export default AnnalsModal;
