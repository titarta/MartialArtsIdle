import { useState } from 'react';
import JourneyBody       from './JourneyBody';
import AchievementsBody  from './AchievementsBody';
import StatsBody         from './StatsBody';

/**
 * Progress Hub modal — consolidates the three "look at how I'm doing"
 * surfaces (Cultivation Journey, Achievements, and the new Stats panel)
 * into a single modal with a three-tab chip row at the top.
 *
 * Net effect on the TopBar: replaces the previous 🗺️ Journey + 🏆
 * Achievements buttons with one 📊 Progress button — small wins on
 * mobile screen real estate, and a place to land the new Stats screen
 * without claiming a 7th nav slot.
 *
 * Tab state is local — no persistence. Default landing is "Journey"
 * because it's the most-used of the three; players opening the hub
 * usually want to see "where am I at" most of the time.
 *
 * Reuses the existing .achievements-modal panel chrome + the .ach-tabs
 * chip-row pattern, both of which are already canonical after the
 * visual-consistency pass.
 */
const TABS = [
  { id: 'journey',      label: 'Journey'      },
  { id: 'achievements', label: 'Achievements' },
  { id: 'stats',        label: 'Stats'        },
];

function ProgressHubModal({ realmIndex, achievements, stats, qiRef, rateRef, onClose }) {
  const [tab, setTab] = useState('journey');

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
          {tab === 'journey'      && <JourneyBody realmIndex={realmIndex} />}
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

export default ProgressHubModal;
