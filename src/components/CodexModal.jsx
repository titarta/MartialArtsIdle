import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AchievementsBody  from './AchievementsBody';
import StatsBody         from './StatsBody';
import WardrobeTab       from './WardrobeTab';
import CodexSectionsBody from './CodexSectionsBody';
import { loadGarden,  getGardenCodexEntries,  getGardenCodexProgress  } from '../data/spiritGarden';
import { loadMerge,   getRosterCodexEntries,  getRosterCodexProgress  } from '../data/discipleMerge';
import { loadFurnace, getFurnaceCodexEntries, getFurnaceCodexProgress } from '../data/furnace';

/**
 * Codex — TopBar paper-roll modal.
 *
 * Tabs (in order):
 *   1. Wardrobe       — owned cosmetics (always available)
 *   2. Achievements   — unlocked + progress (always available)
 *   3. Stats          — lifetime stats (always available)
 *   4. Garden         — plant + recipe almanac (gated on garden producer unlock)
 *   5. Roster         — disciple rank ladder (gated on disciple producer owned ≥ 1)
 *   6. Furnace        — material/pill/foundation catalogue
 *                       (gated on Meridian Furnace producer unlock)
 *
 * Minigame tabs only appear once the corresponding minigame is unlocked.
 * The `gating` prop carries flat booleans from App.jsx (which knows the
 * producer-unlock + owned-count state).
 */

const ALL_TABS = ['wardrobe', 'achievements', 'stats', 'garden', 'roster', 'furnace'];
const ALWAYS_VISIBLE = new Set(['wardrobe', 'achievements', 'stats']);

function CodexModal({
  achievements,
  stats,
  qiRef,
  rateRef,
  inventory,
  // Minigame-unlock gating from App.jsx. Each flag = is the matching codex
  // tab visible. Default false so the modal can render before the parent
  // wires them in.
  gating = { garden: false, roster: false, furnace: false },
  // discipleTranscendUnlocked: lets the Roster codex pick the right sprite
  // for T5+ ranks (mirrors the in-roster gating).
  discipleTranscendUnlocked = false,
  onNavigateBazaar,
  onClose,
}) {
  const { t } = useTranslation('ui');

  // Filter tabs by gating. Memoised so changes to gating only re-derive
  // when the relevant flags change.
  const visibleTabs = useMemo(
    () => ALL_TABS.filter(id => ALWAYS_VISIBLE.has(id) || gating[id]),
    [gating]
  );

  const [tab, setTab] = useState('wardrobe');
  // If the active tab got hidden between renders (rare — e.g. a save load
  // dropped a producer unlock), snap to wardrobe.
  const safeTab = visibleTabs.includes(tab) ? tab : 'wardrobe';

  const TAB_LABELS = {
    wardrobe:     t('codex.tabWardrobe'),
    achievements: t('codex.tabAchievements'),
    stats:        t('codex.tabStats'),
    garden:       t('codex.tabGarden'),
    roster:       t('codex.tabRoster'),
    furnace:      t('codex.tabFurnace'),
  };

  // Load minigame state ON DEMAND when a relevant tab is active (avoids
  // touching localStorage for sections the player isn't viewing).
  const gardenState  = (safeTab === 'garden')  ? loadGarden()  : null;
  const rosterState  = (safeTab === 'roster')  ? loadMerge()   : null;
  const furnaceState = (safeTab === 'furnace') ? loadFurnace() : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="progress-hub-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label={t('common.closeAriaLabel')}>✕</button>

        <div className="ach-tabs progress-hub-tabs">
          {visibleTabs.map(id => (
            <button
              key={id}
              className={`ach-tab${safeTab === id ? ' ach-tab-active' : ''}`}
              onClick={() => setTab(id)}
            >
              {TAB_LABELS[id]}
            </button>
          ))}
        </div>

        <div className="progress-hub-body">
          {safeTab === 'wardrobe' && (
            <WardrobeTab
              inventory={inventory}
              onBrowseBazaar={() => {
                onClose?.();
                onNavigateBazaar?.();
              }}
            />
          )}
          {safeTab === 'achievements' && achievements && <AchievementsBody achievements={achievements} />}
          {safeTab === 'stats' && (
            <StatsBody
              stats={stats}
              qiRef={qiRef}
              rateRef={rateRef}
              achievements={achievements}
            />
          )}
          {safeTab === 'garden' && gardenState && (
            <CodexSectionsBody
              sections={getGardenCodexEntries(gardenState)}
              progress={getGardenCodexProgress(gardenState)}
            />
          )}
          {safeTab === 'roster' && rosterState && (
            <CodexSectionsBody
              sections={getRosterCodexEntries(rosterState, discipleTranscendUnlocked)}
              progress={getRosterCodexProgress(rosterState)}
            />
          )}
          {safeTab === 'furnace' && furnaceState && (
            <CodexSectionsBody
              sections={getFurnaceCodexEntries(furnaceState)}
              progress={getFurnaceCodexProgress(furnaceState)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default CodexModal;
