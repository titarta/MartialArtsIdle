/**
 * CodexSectionsBody — generic renderer for the per-minigame codex tabs.
 *
 * Each minigame's data module exposes a `getXxxCodexEntries()` helper that
 * returns an array of sections, each with `{ id, label, entries }`. An
 * entry shape:
 *   {
 *     id:         string,
 *     name:       string ('???' when locked),
 *     desc:       string | null,
 *     hint:       string | null (shown when locked, gives a recipe hint),
 *     discovered: boolean,
 *     // optional, used by some sections:
 *     sprite:     string | null,  // /sprites/path.png OR a 128×128 sheet
 *     color:      string | null,  // hex for an orb placeholder
 *     badge:      string | null,  // ×N badge for sect ranks
 *   }
 *
 * Locked entries render as silhouettes — gray-out sprite, '???' name,
 * hint text. Discovered entries show the real name + description.
 */

const BASE = import.meta.env.BASE_URL;
const url  = (s) => (typeof s === 'string' && s.startsWith('/')) ? `${BASE}${s.replace(/^\//, '')}` : s;

function EntryRow({ entry }) {
  return (
    <div className={`cx-entry ${entry.discovered ? 'cx-entry-on' : 'cx-entry-off'}`}>
      <div className="cx-entry-icon">
        {entry.sprite ? (
          <img src={url(entry.sprite)} alt="" className="cx-entry-sprite" draggable="false" />
        ) : entry.color ? (
          <span className="cx-entry-orb" style={{ background: entry.color }} />
        ) : (
          <span className="cx-entry-glyph">?</span>
        )}
        {entry.badge && <span className="cx-entry-badge">{entry.badge}</span>}
      </div>
      <div className="cx-entry-body">
        <div className="cx-entry-name">{entry.name}</div>
        {entry.discovered && entry.desc && <div className="cx-entry-desc">{entry.desc}</div>}
        {!entry.discovered && entry.hint && <div className="cx-entry-hint">{entry.hint}</div>}
      </div>
    </div>
  );
}

export default function CodexSectionsBody({ sections, progress }) {
  return (
    <div className="cx-body">
      {progress && (
        <div className="cx-progress">
          Discovered <strong>{progress.discovered}</strong> / {progress.total}
        </div>
      )}
      {sections.map((section) => (
        <section key={section.id} className="cx-section">
          <h3 className="cx-section-h">{section.label}</h3>
          <div className="cx-section-grid">
            {section.entries.map((e) => (
              <EntryRow key={e.id} entry={e} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
