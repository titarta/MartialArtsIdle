import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameText } from '../i18n/gameText';
import { recordStat } from '../systems/statsRecorder';
import AchievementPlaque from './AchievementPlaque';

const LOCKED_ICON = '?';

/**
 * Single achievement square. Cookie-Clicker-style badge: just the icon
 * (or a red "?" when locked) so many entries fit in a small grid. Tap
 * to surface the title and description in the trophy plaque modal.
 *
 * Locked rendering respects two hide modes (the plaque itself handles
 * the obscured-text variants):
 *   hidden:true     title and desc both hidden as "???"
 *   secretDesc:true title visible, desc hidden
 */
function AchievementBadge({ achievement, unlocked, selected, onSelect }) {
  const { t } = useTranslation('ui');
  const gt = useGameText();
  const aTitle = gt('achievements', achievement.id, 'title', achievement.title);
  const isHidden = !unlocked && (achievement.hidden === true);
  const cls = [
    'ach-badge',
    unlocked ? 'ach-badge-unlocked' : 'ach-badge-locked',
    selected ? 'ach-badge-selected' : '',
  ].filter(Boolean).join(' ');
  const tooltip = unlocked
    ? aTitle
    : (isHidden ? t('common.unknown') : aTitle);
  const iconChar = unlocked ? achievement.icon : LOCKED_ICON;
  return (
    <button
      type="button"
      className={cls}
      onClick={() => onSelect(achievement.id)}
      aria-label={unlocked ? aTitle : t('achievement.lockedAriaLabel')}
      title={tooltip}
    >
      <span className="ach-badge-icon">{iconChar}</span>
      {unlocked && <span className="ach-badge-check" aria-hidden="true">✓</span>}
    </button>
  );
}

/**
 * Achievements tab body for the Codex modal. Grid of badges with the
 * trophy plaque popping over the Codex when one is tapped.
 *
 * History: the old layout rendered a `.ach-detail` panel inline after the
 * grid as `position: sticky; bottom: 0`. That covered neighbouring badges
 * when one near the bottom was tapped, and the design was the older
 * flat-purple style from before the Sanctum pass. Replaced with the
 * AchievementPlaque overlay (matching the tutorial card / Petition Tablet
 * brass + lacquer + vermillion vocabulary). See
 * `_design/achievement-detail-study/` for the comparison study.
 *
 * (The legacy category tab strip was already gone before this change —
 * achievements are a flat list now.)
 */
function AchievementsBody({ achievements }) {
  const [selectedId, setSelectedId] = useState(null);

  const visible = achievements?.visible ?? [];

  // Count panel opens for the "Patience, Young Grasshopper" achievement.
  // Fires once per mount (the modal mounts every time the tab opens).
  useEffect(() => {
    try { recordStat('achievementsPanelOpens', 1); } catch {}
  }, []);

  const selected = selectedId ? visible.find(a => a.id === selectedId) : null;
  const selectedUnlocked = selected ? achievements.isUnlocked(selected.id) : false;

  return (
    <>
      <div className="ach-progress-meta">
        <span className="ach-modal-progress">
          {achievements.unlockedCount} / {achievements.totalCount}
        </span>
      </div>

      <div className="ach-progress-bar">
        <div
          className="ach-progress-fill"
          style={{ width: `${(achievements.unlockedCount / Math.max(1, achievements.totalCount)) * 100}%` }}
        />
      </div>

      <div className="ach-grid">
        {visible.map(a => (
          <AchievementBadge
            key={a.id}
            achievement={a}
            unlocked={achievements.isUnlocked(a.id)}
            selected={a.id === selectedId}
            onSelect={(id) => setSelectedId(prev => prev === id ? null : id)}
          />
        ))}
      </div>

      {selected && (
        <AchievementPlaque
          achievement={selected}
          unlocked={selectedUnlocked}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}

export default AchievementsBody;
