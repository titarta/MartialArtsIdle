import { useState, useMemo } from 'react';
import { CATEGORIES, CATEGORY_LABELS } from '../data/achievements';

function AchievementCard({ achievement, unlocked }) {
  return (
    <div className={`ach-card${unlocked ? ' ach-card-unlocked' : ' ach-card-locked'}`}>
      <div className="ach-card-icon">{achievement.icon}</div>
      <div className="ach-card-body">
        <div className="ach-card-title">{achievement.title}</div>
        <div className="ach-card-desc">{unlocked ? achievement.desc : '???'}</div>
      </div>
      {unlocked && <div className="ach-card-check">✓</div>}
    </div>
  );
}

/**
 * Achievements tab body for the Progress Hub modal. Extracted from the
 * old standalone AchievementsModal so it can be rendered as one of three
 * tabs. The hub chip already reads "Achievements" — body skips the
 * redundant header title and surfaces just the unlocked/total count
 * inline with the progress bar.
 *
 * Sub-tabs (All / per-category) sit below the progress meta in their
 * own row so they're visually distinct from the parent hub tabs.
 */
function AchievementsBody({ achievements }) {
  const [activeCategory, setActiveCategory] = useState('all');

  // Use the FEATURE-filtered visible list from the hook so combat/laws/etc.
  // achievements don't appear in v1. Falls back to an empty list if the
  // hook hasn't surfaced one (older consumers).
  const visible = achievements?.visible ?? [];

  // Hide category tabs that have no visible entries — keeps the chip row
  // tight in v1 (only "Cultivation" survives there).
  const categoriesWithEntries = useMemo(
    () => CATEGORIES.filter(cat => visible.some(a => a.category === cat)),
    [visible],
  );

  const filtered = activeCategory === 'all'
    ? visible
    : visible.filter(a => a.category === activeCategory);

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
          style={{ width: `${(achievements.unlockedCount / achievements.totalCount) * 100}%` }}
        />
      </div>

      <div className="ach-tabs ach-subtabs">
        <button
          className={`ach-tab${activeCategory === 'all' ? ' ach-tab-active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          All
        </button>
        {categoriesWithEntries.map(cat => (
          <button
            key={cat}
            className={`ach-tab${activeCategory === cat ? ' ach-tab-active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="ach-list">
        {filtered.map(a => (
          <AchievementCard
            key={a.id}
            achievement={a}
            unlocked={achievements.isUnlocked(a.id)}
          />
        ))}
      </div>
    </>
  );
}

export default AchievementsBody;
