import { useEffect, useMemo, useRef, useState } from 'react';
import { NODES, NODES_BY_ID } from '../data/reincarnationTree';
import { fmt } from '../utils/format';
import './eternalTree.css';

// ── Layout ───────────────────────────────────────────────────────────────────
const NODE_R  = 30;
const COL_W   = 132;
const ROW_H   = 116;
const PADDING = 70;

/** Preview nodes for visualisation. NOT part of the real save data — they
 *  render like locked real nodes (sigil + cost) so you can see how the full
 *  tree would shape up. The player cannot purchase them. */
const PLACEHOLDER_NODES = [
  // Row 0
  { id: 'p_a', label: 'Iron Tendons',    glyph: '筋', col: 2, row: 0, cost: 2, placeholder: true, description: 'Body tempered first. +permanent vitality.' },
  { id: 'p_b', label: 'Stone Skin',      glyph: '岩', col: 3, row: 0, cost: 2, placeholder: true, description: 'Skin like a quiet mountain. Lessens combat damage.' },
  { id: 'p_c', label: 'Sky-Eye',         glyph: '瞳', col: 4, row: 0, cost: 3, placeholder: true, description: 'See further than this life. Reveals hidden drops.' },
  // Row 1
  { id: 'p_d', label: 'Untamed Heart',   glyph: '勇', col: 2, row: 1, cost: 3, placeholder: true, description: 'Courage fuelled by past lives. +breakthrough chance.' },
  { id: 'p_e', label: 'Quiet Mind',      glyph: '靜', col: 3, row: 1, cost: 3, placeholder: true, description: 'A still pond reflects the moon. +focus duration.' },
  { id: 'p_f', label: 'Soul Anchor',     glyph: '魂', col: 4, row: 1, cost: 4, placeholder: true, description: 'Soul roots deepen. Reduces reincarnation cost.' },
  // Row 2
  { id: 'p_g', label: 'Twin Stars',      glyph: '雙', col: 1, row: 2, cost: 3, placeholder: true, description: 'Pair the daos. +1 active law slot.' },
  { id: 'p_h', label: 'Thunder Stride',  glyph: '雷', col: 2, row: 2, cost: 4, placeholder: true, description: 'Travel between cells of the heavens. +realm speed.' },
  { id: 'p_i', label: 'Wind Whisper',    glyph: '風', col: 3, row: 2, cost: 4, placeholder: true, description: 'Hear the dao on the breeze. +qi spark rate.' },
  { id: 'p_j', label: 'Mist Veil',       glyph: '霧', col: 4, row: 2, cost: 5, placeholder: true, description: 'Step beyond ambushes. Combat enemies hit softer first.' },
  // Row 3
  { id: 'p_k', label: 'Lotus Bloom',     glyph: '蓮', col: 1, row: 3, cost: 4, placeholder: true, description: 'The lotus rises from mud. +pill effect.' },
  { id: 'p_l', label: 'Threads of Fate', glyph: '命', col: 2, row: 3, cost: 5, placeholder: true, description: 'Read the weave. +rare drop chance.' },
  { id: 'p_m', label: 'Auspicious Star', glyph: '辰', col: 3, row: 3, cost: 5, placeholder: true, description: 'Born under a kind sign. +artefact roll quality.' },
  { id: 'p_n', label: 'Three Treasures', glyph: '三', col: 4, row: 3, cost: 5, placeholder: true, description: 'Jing, qi, shen aligned. +cultivation speed.' },
  // Row 4 — deeper / keystones
  { id: 'p_o', label: 'Eternal Anchor',  glyph: '永', col: 1, row: 4, cost: 6, placeholder: true, description: 'A pillar across lives. Preserves a small qi reserve through reincarnation.' },
  { id: 'p_p', label: 'Heavenward',      glyph: '昇', col: 2, row: 4, cost: 6, placeholder: true, description: 'Climb past the ninth heaven. Unlocks higher realms sooner.' },
  { id: 'p_q', label: 'Beyond Form',     glyph: '玄', col: 3, row: 4, cost: 7, placeholder: true, description: 'The dao without name. +karma earned per life.' },
  { id: 'p_r', label: 'Crown of Lives',  glyph: '冕', col: 4, row: 4, cost: 8, placeholder: true, description: 'The crown of one thousand lives. All gains amplified.' },
];

const ALL_NODES = [...NODES, ...PLACEHOLDER_NODES];
const ALL_NODES_BY_ID = Object.fromEntries(ALL_NODES.map(n => [n.id, n]));

const NUM_COLS = Math.max(...ALL_NODES.map(n => n.col)) + 1;
const NUM_ROWS = Math.max(...ALL_NODES.map(n => n.row)) + 1;
const CANVAS_W = PADDING * 2 + (NUM_COLS - 1) * COL_W;
const CANVAS_H = PADDING * 2 + (NUM_ROWS - 1) * ROW_H;

const nodeCenter = (n) => ({
  cx: PADDING + n.col * COL_W,
  cy: PADDING + n.row * ROW_H,
});

function edgePath(a, b) {
  const fa = nodeCenter(a);
  const fb = nodeCenter(b);
  const dx = fb.cx - fa.cx, dy = fb.cy - fa.cy;
  const len = Math.hypot(dx, dy);
  if (len < 1) return '';
  const ux = dx / len, uy = dy / len;
  const sx = fa.cx + ux * NODE_R, sy = fa.cy + uy * NODE_R;
  const ex = fb.cx - ux * NODE_R, ey = fb.cy - uy * NODE_R;
  // gentle bow, alternating direction so neighbours read distinctly
  const mx = (sx + ex) / 2, my = (sy + ey) / 2;
  const bow = Math.min(18, len * 0.08);
  const sign = (a.row + b.col) % 2 === 0 ? 1 : -1;
  const cx = mx + (-uy) * bow * sign;
  const cy = my + (ux) * bow * sign;
  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

// Grid adjacency edges (horizontal, vertical, AND diagonal between neighbours).
const EDGES = (() => {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < ALL_NODES.length; i++) {
    for (let j = i + 1; j < ALL_NODES.length; j++) {
      const a = ALL_NODES[i], b = ALL_NODES[j];
      const dr = Math.abs(a.row - b.row), dc = Math.abs(a.col - b.col);
      if (dr <= 1 && dc <= 1 && (dr + dc) > 0) {
        const k = [a.id, b.id].sort().join('|');
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ from: a.id, to: b.id });
      }
    }
  }
  return out;
})();

// Per-node calligraphy sigil (real nodes only; placeholders carry their own).
const NODE_GLYPH = {
  n_1: '道', n_2: '星', n_3: '晶', n_4: '眼',
  n_5: '儉', n_6: '響', n_7: '長',
};

function makeStars(count) {
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const arr = [];
  for (let i = 0; i < count; i++) {
    const r = rnd();
    const kind = r < 0.06 ? 'gold' : r < 0.18 ? 'bri' : 'reg';
    arr.push({
      left:     (rnd() * 100).toFixed(2) + '%',
      top:      (rnd() * 100).toFixed(2) + '%',
      delay:    (rnd() * 5).toFixed(2) + 's',
      duration: (2 + rnd() * 4).toFixed(2) + 's',
      kind,
    });
  }
  return arr;
}

// ── Node ─────────────────────────────────────────────────────────────────────
function TreeNode({ node, state, karma, isSelected, onSelect }) {
  const { cx, cy } = nodeCenter(node);
  const isPlaceholder = !!node.placeholder;
  const isPurchased   = state === 'purchased';
  const isAvailable   = state === 'available';
  const isComingSoon  = node.id === 'n_2';
  const canBuy = !isPlaceholder && isAvailable && !isComingSoon && karma >= node.cost;

  const variant = isPlaceholder ? 'placeholder'
                : isPurchased   ? 'owned'
                : canBuy        ? 'can'
                : isAvailable   ? 'avail'
                :                  'locked';
  const cls = `et-node et-node-${variant}${isComingSoon ? ' et-node-soon' : ''}${isSelected ? ' et-node-selected' : ''}`;
  const glyph = NODE_GLYPH[node.id] ?? node.glyph ?? '◇';

  return (
    <g
      className={cls}
      transform={`translate(${cx},${cy})`}
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
      style={{ cursor: 'pointer' }}
    >
      <circle className="et-node-halo" r={NODE_R + 7} />
      <circle className="et-node-disc" r={NODE_R} />
      <text className="et-node-glyph" x={0} y={2} textAnchor="middle" dominantBaseline="middle">{glyph}</text>
      <text className="et-node-badge" x={0} y={NODE_R + 16} textAnchor="middle">
        {isPurchased ? '✓' : isComingSoon ? '✦' : (node.cost != null ? `${node.cost}` : '✦')}
      </text>
      <text className="et-node-label" x={0} y={NODE_R + 31} textAnchor="middle">
        {node.label.toUpperCase()}
      </text>
    </g>
  );
}

/** Compute the action button state for the bottom detail card. */
function detailAction(node, state, karma) {
  if (!node) return null;
  if (node.placeholder)         return { text: 'Preview only',                disabled: true,  variant: 'soft' };
  if (state === 'purchased')    return { text: '✓ Anchored',                  disabled: true,  variant: 'owned' };
  if (node.id === 'n_2')        return { text: '✦ Coming soon',               disabled: true,  variant: 'soft' };
  if (state !== 'available')    return { text: 'Prerequisites still bound',   disabled: true,  variant: 'soft' };
  if (karma < node.cost)        return { text: `Need ${node.cost - karma} more karma`, disabled: true, variant: 'poor' };
  return { text: `Anchor for ${node.cost} karma`, disabled: false, variant: 'go' };
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function EternalTreeScreen({
  karma, karmaEarnedThisLife, cumulativeQi = 0, qiForNextKarma = 0,
  tree, lives, realmIndex,
  onReincarnate, onClose,
}) {
  const stageRef = useRef(null);
  const stars = useMemo(() => makeStars(140), []);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // useReincarnationTree exposes `buy`, not `buyNode` — the old name in this
  // screen quietly broke every Anchor click with a "buyNode is not a function"
  // throw, so karma never moved and nothing was ever purchased.
  const { purchased, isAvailable, buy: buyNode } = tree;

  const nodeStates = useMemo(() => {
    const out = {};
    for (const n of NODES) {
      if (purchased.has(n.id)) out[n.id] = 'purchased';
      else if (isAvailable(n.id)) out[n.id] = 'available';
      else out[n.id] = 'locked';
    }
    return out;
  }, [purchased, isAvailable]);

  // ── Pan / Zoom ────────────────────────────────────────────────────────────
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // Keep latest state in a ref so non-React listeners read fresh values.
  const liveRef = useRef({ pan, scale });
  liveRef.current = { pan, scale };
  const dragRef  = useRef(null);
  const pinchRef = useRef(null);

  const clampScale = (s) => Math.max(0.4, Math.min(2.5, s));

  const fitToStage = () => {
    const el = stageRef.current; if (!el) return 1;
    const r = el.getBoundingClientRect();
    return Math.max(0.45, Math.min(1, Math.min((r.width - 40) / CANVAS_W, (r.height - 40) / CANVAS_H)));
  };

  // Start at 1.0 so nodes are visible at full size; user can pinch/wheel to adjust.

  // Non-passive touch listeners for pinch + drag.
  useEffect(() => {
    const el = stageRef.current; if (!el) return undefined;
    const tDist = (a, b) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

    const onTS = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchRef.current = { startDist: tDist(e.touches[0], e.touches[1]), startScale: liveRef.current.scale };
        dragRef.current = null;
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        dragRef.current = { sx: t.clientX, sy: t.clientY, px: liveRef.current.pan.x, py: liveRef.current.pan.y, moved: false };
      }
    };
    const onTM = (e) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const d = tDist(e.touches[0], e.touches[1]);
        setScale(clampScale(pinchRef.current.startScale * (d / pinchRef.current.startDist)));
      } else if (e.touches.length === 1 && dragRef.current) {
        const t = e.touches[0];
        const dx = t.clientX - dragRef.current.sx;
        const dy = t.clientY - dragRef.current.sy;
        if (Math.hypot(dx, dy) > 5) {
          e.preventDefault();
          dragRef.current.moved = true;
          setPan({ x: dragRef.current.px + dx, y: dragRef.current.py + dy });
        }
      }
    };
    const onTE = (e) => {
      if (e.touches.length === 0) { dragRef.current = null; pinchRef.current = null; }
    };
    el.addEventListener('touchstart', onTS, { passive: false });
    el.addEventListener('touchmove',  onTM, { passive: false });
    el.addEventListener('touchend',   onTE);
    el.addEventListener('touchcancel',onTE);
    return () => {
      el.removeEventListener('touchstart', onTS);
      el.removeEventListener('touchmove',  onTM);
      el.removeEventListener('touchend',   onTE);
      el.removeEventListener('touchcancel',onTE);
    };
  }, []);

  // Mouse drag (movement threshold keeps node taps working).
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button')) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y, moved: false };
  };
  const onMouseMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    if (Math.hypot(dx, dy) > 4) {
      dragRef.current.moved = true;
      setPan({ x: dragRef.current.px + dx, y: dragRef.current.py + dy });
    }
  };
  const onMouseUp = () => { dragRef.current = null; };
  const onWheel = (e) => {
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => clampScale(s * factor));
  };

  const zoomIn    = () => setScale(s => clampScale(s * 1.2));
  const zoomOut   = () => setScale(s => clampScale(s / 1.2));
  const zoomReset = () => { setScale(fitToStage()); setPan({ x: 0, y: 0 }); };

  // ── Karma side ──────────────────────────────────────────────────────────
  const handleSelect = (id) => setSelectedNodeId(id);
  const handleAnchor = () => {
    const node = selectedNodeId ? ALL_NODES_BY_ID[selectedNodeId] : null;
    if (!node || node.placeholder) return;
    const st = nodeStates[node.id];
    if (st !== 'available' || node.id === 'n_2') return;
    if (karma < node.cost) return;
    buyNode(node.id);
  };
  const selectedNode  = selectedNodeId ? ALL_NODES_BY_ID[selectedNodeId] : null;
  const selectedState = selectedNode && !selectedNode.placeholder ? nodeStates[selectedNode.id] : null;
  const action        = detailAction(selectedNode, selectedState, karma);
  const karmaSpentOnTree = purchased.size;
  const canReincarnate   = realmIndex >= 24;
  const qiToNext = Math.max(0, (qiForNextKarma ?? 0) - (cumulativeQi ?? 0));
  const progress = qiForNextKarma > 0
    ? Math.max(0, Math.min(1, (cumulativeQi ?? 0) / qiForNextKarma))
    : 0;

  return (
    <div className="et-screen" role="dialog" aria-modal="true" aria-label="Eternal Tree">
      <div className="et-stars" aria-hidden="true">
        {stars.map((s, i) => (
          <span key={i}
            className={`et-star${s.kind === 'bri' ? ' et-star-bri' : s.kind === 'gold' ? ' et-star-gold' : ''}`}
            style={{ left: s.left, top: s.top, animationDelay: s.delay, animationDuration: s.duration }}
          />
        ))}
      </div>

      <header className="et-bar et-bar-top">
        <div className="et-bar-titles">
          <div className="et-eyebrow">Between Lives</div>
          <h1 className="et-title">Eternal Tree</h1>
        </div>
        <div className="et-bar-chips">
          <div className="et-chip"><span className="et-chip-sigil">◈</span><b>{karma}</b><span>karma</span></div>
          <div className="et-chip et-chip-soft"><b>{karmaSpentOnTree}</b><span>anchored</span></div>
          <div className="et-chip et-chip-soft"><b>{lives ?? 0}</b><span>{(lives ?? 0) === 1 ? 'life' : 'lives'}</span></div>
        </div>
        {/* Close ✕ only when a cancel path is allowed. In the committed
            reincarnation flow no onClose is passed, so there is no way out but
            to turn the wheel. */}
        {onClose && (
          <button className="et-close" onClick={onClose} aria-label="Close">✕</button>
        )}
      </header>

      <div
        className="et-stage"
        ref={stageRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onClick={(e) => {
          // Tap on empty stage area dismisses any selected node.
          if (e.target.closest('.et-node, .et-detail, .et-zoom')) return;
          if (selectedNodeId !== null) setSelectedNodeId(null);
        }}
      >
        <div className="et-zoom">
          <button type="button" onClick={zoomIn}    aria-label="Zoom in">+</button>
          <button type="button" onClick={zoomReset} aria-label="Fit to view">⤢</button>
          <button type="button" onClick={zoomOut}   aria-label="Zoom out">−</button>
        </div>
        <div
          className="et-content"
          style={{
            width: CANVAS_W, height: CANVAS_H,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          }}
        >
          <svg className="et-canvas" width={CANVAS_W} height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}>
            {/* Grid adjacency edges */}
            {EDGES.map(({ from, to }) => {
              const a = ALL_NODES_BY_ID[from];
              const b = ALL_NODES_BY_ID[to];
              const aReal = !a.placeholder, bReal = !b.placeholder;
              const aOwn = aReal && nodeStates[a.id] === 'purchased';
              const bOwn = bReal && nodeStates[b.id] === 'purchased';
              const aAvail = aReal && nodeStates[a.id] === 'available' && a.id !== 'n_2';
              const bAvail = bReal && nodeStates[b.id] === 'available' && b.id !== 'n_2';
              const lit   = aOwn && bOwn;
              const pulse = !lit && ((aOwn && bAvail) || (bOwn && aAvail));
              const cls = `et-edge ${lit ? 'et-edge-lit' : pulse ? 'et-edge-pulse' : 'et-edge-dim'}`;
              return <path key={`${from}-${to}`} className={cls} d={edgePath(a, b)} />;
            })}
            {/* Nodes */}
            {ALL_NODES.map(n => (
              <TreeNode
                key={n.id}
                node={n}
                state={n.placeholder ? 'placeholder' : nodeStates[n.id]}
                karma={karma}
                isSelected={selectedNodeId === n.id}
                onSelect={handleSelect}
              />
            ))}
          </svg>
        </div>

        {/* Detail card — pinned just above the footer when a node is selected */}
        {selectedNode && (
          <div className="et-detail" onClick={(e) => e.stopPropagation()}>
            <div className="et-detail-row">
              <div className="et-detail-glyph" aria-hidden="true">
                {NODE_GLYPH[selectedNode.id] ?? selectedNode.glyph ?? '◇'}
              </div>
              <div className="et-detail-body">
                <div className="et-detail-name">{selectedNode.label}</div>
                <div className="et-detail-desc">
                  {selectedNode.description ?? 'A future path of karma.'}
                </div>
              </div>
              <button
                type="button"
                className="et-detail-close"
                onClick={(e) => { e.stopPropagation(); setSelectedNodeId(null); }}
                aria-label="Close details"
              >✕</button>
            </div>
            {action && (
              <button
                type="button"
                className={`et-detail-action et-detail-action-${action.variant}`}
                disabled={action.disabled}
                onClick={(e) => { e.stopPropagation(); if (!action.disabled) handleAnchor(); }}
              >
                {action.text}
              </button>
            )}
          </div>
        )}
      </div>

      <footer className="et-bar et-bar-bot">
        <div className="et-progress">
          <div className="et-progress-meta">
            <span>Next karma at {fmt(qiForNextKarma)} Qi</span>
            <span>{fmt(qiToNext)} to go</span>
          </div>
          <div className="et-progress-bar">
            <div className="et-progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <button
          type="button"
          className={`et-reincarnate${canReincarnate ? '' : ' et-reincarnate-locked'}`}
          onClick={canReincarnate ? onReincarnate : undefined}
          disabled={!canReincarnate}
        >
          <span className="et-reincarnate-glyph" aria-hidden="true">輪</span>
          <span>{canReincarnate ? 'Reincarnate' : 'Reach Saint'}</span>
        </button>
      </footer>
    </div>
  );
}
