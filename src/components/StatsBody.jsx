import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { fmt, fmtRate } from '../utils/format';
import { STATS_KEYS, STAT_CATEGORIES } from '../data/statsKeys';

/**
 * Stats tab body for the Progress Hub modal.
 *
 * Cookie-Clicker-style: two parallel buckets (current Run, Lifetime),
 * selectable via a segmented control at the top. Sections render in the
 * order declared by STAT_CATEGORIES; rows in the order declared by
 * STATS_KEYS, with three extra snapshot rows pinned to the top of the
 * Cultivation section (current Qi balance, current Qi/s, run-started-at)
 * — these read live values and don't live in mai_stats.
 *
 * Lifetime-only keys (e.g. `livesLived`) render "—" in Run mode so the
 * row still occupies its slot — switching modes doesn't shuffle the
 * vertical rhythm.
 */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatSinceDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDuration(totalSec) {
  if (!Number.isFinite(totalSec) || totalSec < 0) totalSec = 0;
  totalSec = Math.floor(totalSec);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

/** Render a Date-in-the-past as a coarse "X ago" string. Cookie Clicker
 *  uses "1 day, 1 hour ago" — we mirror that, truncating at the second-
 *  largest unit so the readout stays human. */
function formatTimeAgo(ts) {
  if (!ts) return '—';
  const diffMs = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr  = Math.floor(min / 60);
  if (hr < 24) {
    const rmin = min % 60;
    return rmin > 0 ? `${hr}h ${rmin}m ago` : `${hr}h ago`;
  }
  const day = Math.floor(hr / 24);
  const rhr = hr % 24;
  return rhr > 0 ? `${day}d ${rhr}h ago` : `${day}d ago`;
}

function formatValue(value, format) {
  switch (format) {
    case 'qi':       return fmt(value);
    case 'rate':     return `${fmtRate(value)}/s`;
    case 'duration': return formatDuration(value);
    case 'karma':    return `${fmt(value)} ◈`;
    case 'int':
    default:         return fmt(value);
  }
}

// Build-time injected version (vite.config.js → define.__MAI_VERSION__).
// Wrapped in a runtime check so the file doesn't crash if the define
// somehow isn't present (e.g. a Jest run without the same defines).
const APP_VERSION = (typeof __MAI_VERSION__ !== 'undefined') ? __MAI_VERSION__ : 'dev';

function StatsBody({ stats, qiRef, rateRef, achievements }) {
  const { t } = useTranslation('ui');
  const [mode, setMode] = useState('lifetime'); // 'run' | 'lifetime'

  // Snapshot rows (Current Qi, Current Qi/s, Run started X ago) tick at
  // 1 Hz while the modal is mounted. Cheap — no rAF needed, the player
  // doesn't need 60fps updates on a stats panel.
  const [live, setLive] = useState({ qi: 0, rate: 0, now: Date.now() });
  useEffect(() => {
    const update = () => setLive({
      qi:   qiRef?.current   ?? 0,
      rate: rateRef?.current ?? 0,
      now:  Date.now(),
    });
    update(); // immediate first paint
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [qiRef, rateRef]);

  const bucket = mode === 'run' ? stats.run : stats.lifetime;

  // Group keys by category so we can render headed sections.
  const grouped = useMemo(() => {
    const out = new Map();
    for (const cat of STAT_CATEGORIES) out.set(cat.id, []);
    for (const def of STATS_KEYS) {
      // Skip achievement-support keys flagged hidden. They use the same
      // run/lifetime storage but should not appear in the player-facing
      // Stats tab (peakTapsPerSec, longestHoldSec, audioToggles, etc).
      if (def.hidden) continue;
      out.get(def.category)?.push(def);
    }
    return out;
  }, []);

  // Achievement completion summary (rendered as an extra row at the top
  // of the Meta section). Cookie Clicker repeats this even though the
  // Achievements panel is right there — surfacing it in Stats is honest
  // about the size of the game.
  const achTotal     = achievements?.totalCount    ?? 0;
  const achUnlocked  = achievements?.unlockedCount ?? 0;
  const achPct       = achTotal > 0 ? Math.round((achUnlocked / achTotal) * 100) : 0;

  return (
    <>
      {/* Run / Lifetime toggle. Reuses the .stg-segment style from
          SettingsScreen so the control reads as a familiar segmented
          chooser. */}
      <div className="stg-segment stats-mode-segment">
        <button
          className={`stg-segment-btn${mode === 'run' ? ' stg-segment-active' : ''}`}
          onClick={() => setMode('run')}
        >
          {t('statsPanel.currentRun')}
        </button>
        <button
          className={`stg-segment-btn${mode === 'lifetime' ? ' stg-segment-active' : ''}`}
          onClick={() => setMode('lifetime')}
        >
          {t('statsPanel.lifetime')}
        </button>
      </div>

      <div className="stats-sections">
        {STAT_CATEGORIES.map(cat => {
          const rows = grouped.get(cat.id) ?? [];
          if (rows.length === 0) return null;
          return (
            <section key={cat.id} className="stats-section">
              <div className="stats-section-label">{cat.label}</div>
              {/* Reuse the canonical .pdm-stats grouped-row container so
                  the Stats tab matches the producer/crystal detail modal
                  visual family. */}
              {/* `pdm-stats-grid` modifier turns the canonical .pdm-stats
                  container into a 2-column grid for density. Emphasised
                  rows (Achievements completion) get the standard
                  `.pdm-stat-row-emph` class which spans both columns. */}
              <div className="pdm-stats pdm-stats-grid">
                {/* Snapshot rows pinned to the top of the Cultivation
                    section. These read live numbers (Qi balance, Qi/s,
                    run-started-at) instead of accumulating in mai_stats.
                    Run / Lifetime toggle doesn't change them — they're
                    always "right now" / "current run". */}
                {cat.id === 'cultivation' && (
                  <>
                    <div className="pdm-stat-row">
                      <span className="pdm-stat-label">{t('statsPanel.currentQi')}</span>
                      <span className="pdm-stat-value">{fmt(live.qi)}</span>
                    </div>
                    <div className="pdm-stat-row">
                      <span className="pdm-stat-label">{t('statsPanel.currentQiRate')}</span>
                      <span className="pdm-stat-value">{fmtRate(live.rate)}/s</span>
                    </div>
                    <div className="pdm-stat-row">
                      <span className="pdm-stat-label">{t('statsPanel.runStarted')}</span>
                      <span className="pdm-stat-value">{formatTimeAgo(stats.runStartedTs)}</span>
                    </div>
                  </>
                )}
                {rows.map(def => {
                  const showDash = mode === 'run' && def.lifetimeOnly;
                  const raw      = showDash ? null : (bucket[def.key] ?? 0);
                  const display  = showDash ? '—' : formatValue(raw, def.format);
                  return (
                    <div key={def.key} className="pdm-stat-row">
                      <span className="pdm-stat-label">{def.label}</span>
                      <span className="pdm-stat-value">{display}</span>
                    </div>
                  );
                })}
                {/* Achievement completion summary pinned at the bottom
                    of the Meta section. Same treatment as CC — surfaces
                    the "you're 2% in" reality check on the stats panel.
                    The pdm-stat-row-emph rule both tints the row and
                    spans both grid columns. */}
                {cat.id === 'meta' && achTotal > 0 && (
                  <div className="pdm-stat-row pdm-stat-row-emph">
                    <span className="pdm-stat-label">{t('statsPanel.achievementsUnlocked')}</span>
                    <span className="pdm-stat-value">
                      {achUnlocked} / {achTotal} ({achPct}%)
                    </span>
                  </div>
                )}
              </div>
            </section>
          );
        })}

        <div className="stats-footer">
          {t('statsPanel.footer', { date: formatSinceDate(stats.sinceTs), version: APP_VERSION })}
        </div>
      </div>
    </>
  );
}

export default StatsBody;
