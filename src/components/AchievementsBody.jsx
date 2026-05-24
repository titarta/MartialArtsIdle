import { useState, useMemo } from 'react';
import { CATEGORIES, CATEGORY_LABELS } from '../data/achievements';

/**
 * Single achievement square — Cookie-Clicker-style badge. Shows just the
 * icon (or a red "?" when locked) and packs many entries into a small
 * grid. Tap to select and reveal details in the sticky drawer below the
 * grid.
 */
function AchievementBadge({ achievement, unlocked, selected, onSelect }) {
  const cls = [
    'ach-badge',
    unlocked ? 'ach-badge-unlocked' : 'ach-badge-locked',
    selected ? 'ach-badge-selected' : '',
  ].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={cls}
      onClick={() => onSelect(achievement.id)}
      aria-label={unlocked ? achievement.title : 'Locked achievement'}
      title={unlocked ? achievement.title : '???'}
    >
      <span className="ach-badge-icon">{unlocked ? achievement.icon : '?'}</span>
      {unlocked && <span className="ach-badge-check" aria-hidden="true">✓</span>}
    </button>
  );
}

/**
 * Achievements tab body for the Progress Hub modal. Cookie-Clicker
 * pattern: grid of square icon badges instead of full-row cards. Tapping
 * a badge surfaces the title + description in a sticky drawer pinned to
 * the bottom of the scrollable area — info appears without scrolling
 * the grid away.
 *
 * Density win: ~6 badges per row instead of 1 card per row → roughly
 * 6× the entries visible at once on the same screen height.
 *
 * The hub chip already reads "Achievements" — body skips the redundant
 * header title and surfaces just the unlocked/total count.
 */
function AchievementsBody({ achievements }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedId,     setSelectedId]     = useState(null);

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
          style={{ width: `${(achievements.unlockedCount / achievements.totalCount) * 100}%` }}
        />
      </div>

      <div className="ach-tabs ach-subtabs">
        <button
          className={`ach-tab${activeCategory === 'all' ? ' ach-tab-active' : ''}`}
          onClick={() => { setActiveCategory('all'); setSelectedId(null); }}
        >
          All
        </button>
        {categoriesWithEntries.map(cat => (
          <button
            key={cat}
            className={`ach-tab${activeCategory === cat ? ' ach-tab-active' : ''}`}
            onClick={() => { setActiveCategory(cat); setSelectedId(null); }}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="ach-grid">
        {filtered.map(a => (
          <AchievementBadge
            key={a.id}
            achievement={a}
            unlocked={achievements.isUnlocked(a.id)}
            selected={a.id === selectedId}
            onSelect={(id) => setSelectedId(prev => prev === id ? null : id)}
          />
        ))}
      </div>

      {/* Sticky detail drawer — shows the selected achievement's full
          card. `position: sticky; bottom: 0` keeps it visible regardless
          of grid scroll. Tap the same badge again (or the ✕) to close. */}
      {selected && (
        <div className={`ach-detail${selectedUnlocked ? ' ach-detail-unlocked' : ' ach-detail-locked'}`}>
          <button
            type="button"
            className="ach-detail-close"
            onClick={() => setSelectedId(null)}
            aria-label="Close achievement detail"
          >✕</button>
          <div className="ach-detail-icon">
            {selectedUnlocked ? selected.icon : '?'}
          </div>
          <div className="ach-detail-body">
            <div className="ach-detail-title">
              {selectedUnlocked ? selected.title : 'Locked'}
            </div>
            <div className="ach-detail-desc">
              {selectedUnlocked ? selected.desc : 'Keep cultivating to reveal this achievement.'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AchievementsBody;
