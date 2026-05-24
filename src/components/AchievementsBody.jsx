import { useState, useEffect } from 'react';
import { recordStat } from '../systems/statsRecorder';

const LOCKED_ICON = '?';
const LOCKED_TITLE = '???';
const LOCKED_DESC  = 'Keep cultivating to reveal this achievement.';

/**
 * Single achievement square. Cookie-Clicker-style badge: just the icon
 * (or a red "?" when locked) so many entries fit in a small grid. Tap
 * to surface the title and description in the sticky drawer.
 *
 * Locked rendering respects two hide modes:
 *   hidden:true     title and desc both hidden as "???"
 *   secretDesc:true title visible, desc hidden as "???"
 */
function AchievementBadge({ achievement, unlocked, selected, onSelect }) {
  const isHidden = !unlocked && (achievement.hidden === true);
  const cls = [
    'ach-badge',
    unlocked ? 'ach-badge-unlocked' : 'ach-badge-locked',
    selected ? 'ach-badge-selected' : '',
  ].filter(Boolean).join(' ');
  const tooltip = unlocked
    ? achievement.title
    : (isHidden ? LOCKED_TITLE : achievement.title);
  const iconChar = unlocked ? achievement.icon : LOCKED_ICON;
  return (
    <button
      type="button"
      className={cls}
      onClick={() => onSelect(achievement.id)}
      aria-label={unlocked ? achievement.title : 'Locked achievement'}
      title={tooltip}
    >
      <span className="ach-badge-icon">{iconChar}</span>
      {unlocked && <span className="ach-badge-check" aria-hidden="true">✓</span>}
    </button>
  );
}

/**
 * Achievements tab body for the Progress Hub modal. Grid of badges
 * with a sticky detail drawer below.
 *
 * The legacy category tab strip is gone because the new flat list has
 * no categories. If a future category dimension comes back (e.g.
 * filter by "cultivation vs meta") we can reintroduce a chip row here.
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

  // Detail-drawer rendering: respect hidden / secretDesc on locked
  // entries. Unlocked entries always show full content.
  let detailTitle = '';
  let detailDesc  = '';
  let detailIcon  = LOCKED_ICON;
  if (selected) {
    if (selectedUnlocked) {
      detailTitle = selected.title;
      detailDesc  = selected.desc;
      detailIcon  = selected.icon;
    } else if (selected.hidden) {
      detailTitle = LOCKED_TITLE;
      detailDesc  = LOCKED_DESC;
    } else if (selected.secretDesc) {
      detailTitle = selected.title;
      detailDesc  = LOCKED_TITLE;
    } else {
      detailTitle = selected.title;
      detailDesc  = selected.desc;
    }
  }

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
        <div className={`ach-detail${selectedUnlocked ? ' ach-detail-unlocked' : ' ach-detail-locked'}`}>
          <button
            type="button"
            className="ach-detail-close"
            onClick={() => setSelectedId(null)}
            aria-label="Close achievement detail"
          >✕</button>
          <div className="ach-detail-icon">{detailIcon}</div>
          <div className="ach-detail-body">
            <div className="ach-detail-title">{detailTitle}</div>
            <div className="ach-detail-desc">{detailDesc}</div>
          </div>
        </div>
      )}
    </>
  );
}

export default AchievementsBody;
