/**
 * LawUniquesViewer — read-only designer view of every LAW_UNIQUE, grouped
 * by its `pool` assignment. No editing surface: the underlying data lives
 * in src/data/lawUniques.js and must be edited there. This panel exists so
 * designers can audit which uniques belong to which pool and spot gaps.
 */
import { useMemo, useState } from 'react';
import { LAW_UNIQUES, LAW_UNIQUE_POOLS } from '../../data/lawUniques.js';

export default function LawUniquesViewer() {
  const [activePool, setActivePool] = useState('all');

  // Group uniques by pool once — no records or edits to react to.
  const groups = useMemo(() => {
    const g = {};
    for (const pool of LAW_UNIQUE_POOLS) g[pool] = [];
    for (const u of LAW_UNIQUES) {
      const p = u.pool ?? 'general';
      (g[p] ??= []).push(u);
    }
    return g;
  }, []);

  const poolsToShow = activePool === 'all' ? LAW_UNIQUE_POOLS : [activePool];

  return (
    <div className="dz-viewer">
      <header className="dz-viewer-header">
        <h2>Law Uniques</h2>
        <p className="dz-viewer-sub">
          {LAW_UNIQUES.length} uniques across {LAW_UNIQUE_POOLS.length} pools. Read-only — edit
          <code> src/data/lawUniques.js</code> to change assignments.
        </p>
      </header>

      <div className="dz-viewer-tabs">
        <button
          className={`dz-viewer-tab ${activePool === 'all' ? 'active' : ''}`}
          onClick={() => setActivePool('all')}
        >
          All ({LAW_UNIQUES.length})
        </button>
        {LAW_UNIQUE_POOLS.map(pool => (
          <button
            key={pool}
            className={`dz-viewer-tab ${activePool === pool ? 'active' : ''}`}
            onClick={() => setActivePool(pool)}
          >
            {pool} ({groups[pool]?.length ?? 0})
          </button>
        ))}
      </div>

      <div className="dz-viewer-body">
        {poolsToShow.map(pool => {
          const items = groups[pool] ?? [];
          return (
            <section key={pool} className="dz-viewer-section">
              <h3 className="dz-viewer-section-title">
                {pool}
                <span className="dz-viewer-count">{items.length}</span>
              </h3>
              {items.length === 0 ? (
                <p className="dz-viewer-empty">No uniques in this pool.</p>
              ) : (
                <ul className="dz-viewer-list">
                  {items.map(u => (
                    <UniqueRow key={u.id} unique={u} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function UniqueRow({ unique }) {
  const { id, range, description } = unique;
  const min = range?.min ?? 0;
  const max = range?.max ?? 0;
  // Render the description twice if it's a function — once with min, once
  // with max — so designers see both ends of the roll range.
  const descMin = typeof description === 'function' ? description(min) : (description ?? '');
  const descMax = typeof description === 'function' ? description(max) : null;
  const same = descMax === null || descMin === descMax;
  const sample = same ? descMin : `${descMin}  →  ${descMax}`;
  return (
    <li className="dz-viewer-row">
      <code className="dz-viewer-id">{id}</code>
      <span className="dz-viewer-range">
        {min === max ? min : `${min}–${max}`}
      </span>
      <span className="dz-viewer-desc">{sample}</span>
    </li>
  );
}

