import { useState, useMemo } from 'react';
import { fmt } from '../utils/format';
import { STATS_KEYS, STAT_CATEGORIES } from '../data/statsKeys';

/**
 * Stats tab body for the Progress Hub modal.
 *
 * Cookie-Clicker-style: two parallel buckets (current Run, Lifetime),
 * selectable via a segmented control at the top. Sections render in the
 * order declared by STAT_CATEGORIES; rows in the order declared by
 * STATS_KEYS.
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

function formatValue(value, format) {
  switch (format) {
    case 'qi':       return fmt(value);
    case 'duration': return formatDuration(value);
    case 'karma':    return `${fmt(value)} ◈`;
    case 'int':
    default:         return fmt(value);
  }
}

function StatsBody({ stats }) {
  const [mode, setMode] = useState('lifetime'); // 'run' | 'lifetime'

  const bucket = mode === 'run' ? stats.run : stats.lifetime;

  // Group keys by category so we can render headed sections.
  const grouped = useMemo(() => {
    const out = new Map();
    for (const cat of STAT_CATEGORIES) out.set(cat.id, []);
    for (const def of STATS_KEYS) {
      out.get(def.category)?.push(def);
    }
    return out;
  }, []);

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
          Current Run
        </button>
        <button
          className={`stg-segment-btn${mode === 'lifetime' ? ' stg-segment-active' : ''}`}
          onClick={() => setMode('lifetime')}
        >
          Lifetime
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
              <div className="pdm-stats">
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
              </div>
            </section>
          );
        })}

        <div className="stats-footer">
          Tracking since {formatSinceDate(stats.sinceTs)}
        </div>
      </div>
    </>
  );
}

export default StatsBody;
