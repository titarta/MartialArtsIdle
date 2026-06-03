/**
 * SectMerge — drag-and-drop 4×4 promotion grid for the Sect minigame.
 *
 * Pointer events handle both touch and mouse:
 *   pointerdown on a tile → start drag (record fromIdx + initial position)
 *   pointermove (window)  → update ghost position + resolve drop target via
 *                            document.elementFromPoint
 *   pointerup (window)    → resolve drop via merge.drop(fromIdx, toIdx)
 *
 * Drop semantics live in data/discipleMerge.js (resolveDrop). This component
 * only does the input layer + animation flags.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import useDiscipleMerge from '../../hooks/useDiscipleMerge';
import { TIERS, GRID_SIZE, gridIsFull, BONUS_PER_BOARD_SUM } from '../../data/discipleMerge';

const BASE = import.meta.env.BASE_URL;
const spriteUrl = (s) =>
  (typeof s === 'string' && s.startsWith('/')) ? `${BASE}${s.replace(/^\//, '')}` : s;

function Tile({ tile }) {
  const t = TIERS[tile.tier];
  return (
    <div className="dmg-tile">
      <img
        className="dmg-tile-sprite"
        src={spriteUrl(t.sprite)}
        alt={t.rank}
        draggable={false}
      />
      {t.badge && <span className="dmg-tile-badge">{t.badge}</span>}
      <span className="dmg-tile-tier">T{tile.tier}</span>
    </div>
  );
}

export default function SectMerge() {
  const merge = useDiscipleMerge();
  const [drag, setDrag] = useState(null);          // { fromIdx, x, y, pointerId } | null
  const [overIdx, setOverIdx] = useState(null);    // current drop-target index
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [animFlags, setAnimFlags] = useState({});  // { [idx]: 'merge' | 'spawn' }
  const animTimers = useRef([]);

  // Cleanup any pending anim timers on unmount.
  useEffect(() => () => { animTimers.current.forEach(clearTimeout); }, []);

  if (!merge) return null;

  const { state, place, drop, seclude, sum, perDiscipleBonusPct } = merge;
  const tiles = state.tiles;
  const full = gridIsFull(tiles);

  const flagAnim = (idx, kind, ms = 700) => {
    setAnimFlags(prev => ({ ...prev, [idx]: kind }));
    const t = setTimeout(() => {
      setAnimFlags(prev => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
    }, ms);
    animTimers.current.push(t);
  };

  // ── Pointer drag ──────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((idx) => (e) => {
    if (!tiles[idx]) return;
    // Skip secondary buttons (right click, middle click)
    if (e.button !== undefined && e.button !== 0) return;
    setDrag({ fromIdx: idx, x: e.clientX, y: e.clientY, pointerId: e.pointerId });
    setSelectedIdx(idx);
    setOverIdx(null);
  }, [tiles]);

  // Track pointer globally while dragging.
  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      if (e.pointerId !== drag.pointerId) return;
      e.preventDefault();
      const nx = e.clientX, ny = e.clientY;
      setDrag(d => d ? { ...d, x: nx, y: ny } : d);
      const el = document.elementFromPoint(nx, ny);
      const cell = el?.closest('.dmg-cell');
      if (cell && cell.dataset.idx !== undefined) {
        const i = Number(cell.dataset.idx);
        setOverIdx(i === drag.fromIdx ? null : i);
      } else {
        setOverIdx(null);
      }
    };
    const onUp = (e) => {
      if (e.pointerId !== drag.pointerId) return;
      const fromIdx = drag.fromIdx;
      let toIdx = overIdx;
      // Resolve toIdx one more time in case state lag missed it.
      if (toIdx === null) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const cell = el?.closest('.dmg-cell');
        if (cell && cell.dataset.idx !== undefined) {
          const i = Number(cell.dataset.idx);
          if (i !== fromIdx) toIdx = i;
        }
      }
      setDrag(null);
      setOverIdx(null);
      if (toIdx === null) return;
      const result = drop(fromIdx, toIdx);
      if (result?.action === 'merge') {
        flagAnim(toIdx, 'merge', 720);
        setSelectedIdx(null);
      } else if (result?.action === 'move' || result?.action === 'swap') {
        // Source slot is now empty (move) or has the dst tile (swap); keep no selection.
        setSelectedIdx(null);
      }
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, overIdx, drop]);

  // ── Tap (no-drag click) → toggle selection for inspect / seclude ──────────
  const handleCellClick = (idx) => {
    if (drag) return;
    if (!tiles[idx]) {
      // Empty cell with no selection → quick place
      if (selectedIdx === null) {
        const out = place();
        if (out?.placed) flagAnim(out.idx, 'spawn', 420);
      } else {
        setSelectedIdx(null);
      }
      return;
    }
    setSelectedIdx(idx === selectedIdx ? null : idx);
  };

  // ── Place / seclude ───────────────────────────────────────────────────────
  const handlePlace = () => {
    const out = place();
    if (out?.placed) flagAnim(out.idx, 'spawn', 420);
  };
  const handleSeclude = () => {
    if (selectedIdx === null) return;
    seclude(selectedIdx);
    setSelectedIdx(null);
  };

  // ── Derived for render ────────────────────────────────────────────────────
  const draggedTile = drag ? tiles[drag.fromIdx] : null;
  const selectedTile = selectedIdx !== null ? tiles[selectedIdx] : null;

  return (
    <div className="dmg">

      {/* Stats banner */}
      <div className="dmg-stats">
        <div className="dmg-stat">
          <div className="dmg-stat-k">Board sum</div>
          <div className="dmg-stat-v dmg-stat-violet">{sum}</div>
        </div>
        <div className="dmg-stat">
          <div className="dmg-stat-k">Per-disciple qi/s</div>
          <div className="dmg-stat-v dmg-stat-gold">×{(1 + perDiscipleBonusPct).toFixed(2)}</div>
        </div>
        <div className="dmg-stat">
          <div className="dmg-stat-k">Bonus</div>
          <div className="dmg-stat-v dmg-stat-cyan">+{(perDiscipleBonusPct * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Grid */}
      <div className="dmg-grid">
        {tiles.map((tile, i) => {
          const isSel = selectedIdx === i && !drag;
          const isDragSrc = drag?.fromIdx === i;
          const isOver = overIdx === i;
          let dropKind = '';
          if (isOver && draggedTile) {
            if (!tile) dropKind = 'dmg-drop-move';
            else if (tile.tier === draggedTile.tier && tile.tier < TIERS.length - 1) dropKind = 'dmg-drop-merge';
            else if (tile.tier === draggedTile.tier) dropKind = 'dmg-drop-maxed';
            else dropKind = 'dmg-drop-swap';
          }
          const animClass = animFlags[i] ? `dmg-anim-${animFlags[i]}` : '';
          const cls = [
            'dmg-cell',
            tile ? 'dmg-has-tile' : 'dmg-empty',
            isSel ? 'dmg-selected' : '',
            isDragSrc ? 'dmg-drag-src' : '',
            dropKind,
            animClass,
          ].filter(Boolean).join(' ');
          return (
            <div
              key={tile ? `t-${tile.id}` : `e-${i}`}
              className={cls}
              data-idx={i}
              onPointerDown={tile ? handlePointerDown(i) : undefined}
              onClick={() => handleCellClick(i)}
            >
              {tile ? <Tile tile={tile} /> : <span className="dmg-empty-plus">+</span>}
            </div>
          );
        })}
      </div>

      {/* Drag ghost */}
      {drag && draggedTile && (
        <div
          className="dmg-ghost"
          style={{ left: `${drag.x}px`, top: `${drag.y}px` }}
        >
          <Tile tile={draggedTile} />
        </div>
      )}

      {/* Selection / inspect bar */}
      <div className="dmg-sel">
        {selectedTile ? (
          <>
            <div className="dmg-sel-info">
              <div className="dmg-sel-name">
                <span className="dmg-sel-tier">T{selectedTile.tier}</span>
                {TIERS[selectedTile.tier].rank}
              </div>
              <div className="dmg-sel-sub">
                Value {TIERS[selectedTile.tier].value} · contributes +{(TIERS[selectedTile.tier].value * BONUS_PER_BOARD_SUM * 100).toFixed(2)}% to per-disciple qi/s
              </div>
            </div>
            <button type="button" className="dmg-seclude" onClick={handleSeclude}>
              Seclude
            </button>
          </>
        ) : (
          <div className="dmg-sel-empty">
            Drag two same-rank disciples to promote · drag a different rank to swap · tap an empty cell to place
          </div>
        )}
      </div>

      {/* Place action */}
      <div className="dmg-actions">
        <button
          type="button"
          className="mg-btn mg-btn-primary dmg-place"
          onClick={handlePlace}
          disabled={full}
        >
          {full ? 'Grounds full · promote or seclude to free space' : '+ Place a Disciple'}
        </button>
      </div>

      <div className="dmg-hint">
        Board sum lifts every disciple's per-unit qi/s in the main loop. Each rank you raise compounds the bonus.
      </div>

    </div>
  );
}
