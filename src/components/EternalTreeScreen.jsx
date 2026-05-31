import { useMemo, useRef } from 'react';
import { NODES, NODES_BY_ID } from '../data/reincarnationTree';
import { fmt } from '../utils/format';
import './eternalTree.css';

// ── Layout ───────────────────────────────────────────────────────────────────
const COL_W   = 138;
const ROW_H   = 92;
const NODE_R  = 30;
const PADDING = 44;

const NUM_COLS  = Math.max(...NODES.map(n => n.col)) + 1;
const NUM_ROWS  = Math.max(...NODES.map(n => n.row)) + 1;
const CANVAS_W  = PADDING * 2 + NUM_COLS * COL_W;
const CANVAS_H  = PADDING * 2 + NUM_ROWS * ROW_H;

const nodeCenter = (n) => ({
  cx: PADDING + n.col * COL_W + COL_W / 2,
  cy: PADDING + n.row * ROW_H + ROW_H / 2,
});

/** Gentle Bézier curve between two node centres, starting/ending on the disc
 *  edge. Bow direction alternates by a deterministic hash so adjacent edges
 *  don't all curve the same way. */
function edgePath(from, to) {
  const f = nodeCenter(from);
  const t = nodeCenter(to);
  const dx = t.cx - f.cx, dy = t.cy - f.cy;
  const len = Math.hypot(dx, dy);
  if (len < 1) return '';
  const ux = dx / len, uy = dy / len;
  const sx = f.cx + ux * NODE_R, sy = f.cy + uy * NODE_R;
  const ex = t.cx - ux * NODE_R, ey = t.cy - uy * NODE_R;
  const mx = (sx + ex) / 2, my = (sy + ey) / 2;
  const bow = 24 + Math.min(40, len * 0.18);
  const sign = (from.row + to.col) % 2 === 0 ? 1 : -1;
  const cx = mx + (-uy) * bow * sign;
  const cy = my + (ux) * bow * sign;
  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

const EDGES = (() => {
  const out = [];
  for (const n of NODES) for (const pid of n.prereqs) if (NODES_BY_ID[pid]) out.push({ from: pid, to: n.id });
  return out;
})();

// CJK sigil per node — each path of karma gets its own glyph so the
// constellation reads as faces, not words.
const NODE_GLYPH = {
  n_1: '道', // Devoted Path
  n_2: '星', // Star Disciple (coming soon)
  n_3: '晶', // Crystalline Focus
  n_4: '眼', // Discerning Eye
  n_5: '儉', // Frugal Cultivation
  n_6: '響', // Sect Resonance
  n_7: '長', // Senior's Guidance
};

// Starfield — deterministic so it doesn't dance on each render.
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
function TreeNode({ node, state, karma, onBuy, tooltipRef }) {
  const { cx, cy } = nodeCenter(node);
  const isPurchased  = state === 'purchased';
  const isAvailable  = state === 'available';
  const isLocked     = state === 'locked';
  const isComingSoon = node.id === 'n_2';
  const canBuy = isAvailable && !isComingSoon && karma >= node.cost;

  const variant = isPurchased ? 'owned'
                : canBuy      ? 'can'
                : isAvailable ? 'avail'
                :               'locked';
  const cls = `et-node et-node-${variant}${isComingSoon ? ' et-node-soon' : ''}`;

  const onEnter = (e) => {
    const tt = tooltipRef.current; if (!tt) return;
    const parts = [`<strong>${node.label}</strong>`, `<div>${node.description}</div>`];
    if (isComingSoon)       parts.push('<div class="et-tt-soon">✦ coming soon</div>');
    else if (isPurchased)   parts.push('<div class="et-tt-owned">✓ anchored</div>');
    else {
      parts.push(`<div class="et-tt-cost">${node.cost} karma</div>`);
      if (canBuy)            parts.push('<div class="et-tt-go">tap to anchor</div>');
      else if (isAvailable)  parts.push(`<div class="et-tt-poor">need ${node.cost - karma} more karma</div>`);
      else                   parts.push('<div class="et-tt-soon">prerequisites still bound</div>');
    }
    tt.innerHTML = parts.join('');
    tt.style.display = 'block';
  };
  const onMove = (e) => {
    const tt = tooltipRef.current; if (!tt) return;
    const svg = e.currentTarget.closest('svg');
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    tt.style.left = (e.clientX - r.left + 14) + 'px';
    tt.style.top  = (e.clientY - r.top  - 8) + 'px';
  };
  const onLeave = () => { if (tooltipRef.current) tooltipRef.current.style.display = 'none'; };

  return (
    <g
      className={cls}
      transform={`translate(${cx},${cy})`}
      onClick={canBuy ? () => onBuy(node.id, node.cost) : undefined}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <circle className="et-node-halo" r={NODE_R + 7} />
      <circle className="et-node-disc" r={NODE_R} />
      <text className="et-node-glyph" x={0} y={2} textAnchor="middle" dominantBaseline="middle">
        {NODE_GLYPH[node.id] ?? '◇'}
      </text>
      <text className="et-node-badge" x={0} y={NODE_R + 17} textAnchor="middle">
        {isPurchased ? '✓' : isComingSoon ? '✦' : `${node.cost}`}
      </text>
      <text className="et-node-label" x={0} y={NODE_R + 33} textAnchor="middle">
        {node.label.toUpperCase()}
      </text>
    </g>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function EternalTreeScreen({
  karma,
  karmaEarnedThisLife,
  cumulativeQi = 0,
  qiForNextKarma = 0,
  tree,
  lives,
  realmIndex,
  onReincarnate,
  onClose,
}) {
  const tooltipRef = useRef(null);
  const stars = useMemo(() => makeStars(120), []);

  const { purchased, isAvailable, buyNode } = tree;

  const nodeStates = useMemo(() => {
    const out = {};
    for (const n of NODES) {
      if (purchased.has(n.id)) out[n.id] = 'purchased';
      else if (isAvailable(n.id)) out[n.id] = 'available';
      else out[n.id] = 'locked';
    }
    return out;
  }, [purchased, isAvailable]);

  const handleBuy = (id, cost) => { if (karma >= cost) buyNode(id); };

  const karmaSpentOnTree = purchased.size;
  const canReincarnate   = realmIndex >= 24;

  const qiToNext  = Math.max(0, (qiForNextKarma ?? 0) - (cumulativeQi ?? 0));
  const progress  = qiForNextKarma > 0
    ? Math.max(0, Math.min(1, (cumulativeQi ?? 0) / qiForNextKarma))
    : 0;

  return (
    <div className="et-screen" role="dialog" aria-modal="true" aria-label="Eternal Tree">
      <div className="et-stars" aria-hidden="true">
        {stars.map((s, i) => (
          <span
            key={i}
            className={`et-star${s.kind === 'bri' ? ' et-star-bri' : s.kind === 'gold' ? ' et-star-gold' : ''}`}
            style={{ left: s.left, top: s.top, animationDelay: s.delay, animationDuration: s.duration }}
          />
        ))}
      </div>

      <div className="et-content">
        <header className="et-header">
          <div className="et-eyebrow">Between Lives</div>
          <h1 className="et-title">Eternal Tree</h1>
          <button className="et-close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        {/* Karma card */}
        <section className="et-karma-card" aria-label="Karma">
          <div className="et-karma-main">
            <span className="et-karma-sigil" aria-hidden="true">◈</span>
            <span className="et-karma-val">{karma}</span>
            <span className="et-karma-lbl">karma unspent</span>
          </div>
          <div className="et-karma-meta">
            <span><b>{karmaSpentOnTree}</b> anchored</span>
            <span><b>{lives ?? 0}</b> {(lives ?? 0) === 1 ? 'life' : 'lives'} lived</span>
            <span><b>{karmaEarnedThisLife ?? 0}</b> earned this life</span>
          </div>
          <div className="et-karma-progress" title={`${fmt(qiToNext)} Qi to next karma`}>
            <div className="et-karma-progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="et-karma-meta" style={{ marginTop: -2 }}>
            <span style={{ fontSize: 10.5 }}>Next karma at {fmt(qiForNextKarma)} total Qi</span>
            <span style={{ fontSize: 10.5 }}>{fmt(qiToNext)} to go</span>
          </div>
        </section>

        {/* Constellation */}
        <div className="et-canvas-wrap">
          <div className="et-watermark" aria-hidden="true">業</div>
          <svg
            className="et-canvas"
            width={CANVAS_W}
            height={CANVAS_H}
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          >
            {/* Edges first (behind nodes) */}
            {EDGES.map(({ from, to }) => {
              const fState = nodeStates[from];
              const tState = nodeStates[to];
              const lit   = fState === 'purchased' && tState === 'purchased';
              const pulse = fState === 'purchased' && tState !== 'purchased';
              const cls   = `et-edge ${lit ? 'et-edge-lit' : pulse ? 'et-edge-pulse' : 'et-edge-dim'}`;
              return <path key={`${from}-${to}`} className={cls} d={edgePath(NODES_BY_ID[from], NODES_BY_ID[to])} />;
            })}

            {/* Nodes */}
            {NODES.map(n => (
              <TreeNode
                key={n.id}
                node={n}
                state={nodeStates[n.id]}
                karma={karma}
                onBuy={handleBuy}
                tooltipRef={tooltipRef}
              />
            ))}
          </svg>

          <div ref={tooltipRef} className="et-tooltip" />
        </div>

        {/* Reincarnate */}
        <section className="et-reincarnate-wrap">
          <p className="et-reincarnate-blurb">
            Reincarnation resets your cultivation and producers, but karma and the anchored tree endure across lives.
          </p>
          <button
            type="button"
            className={`et-reincarnate${canReincarnate ? '' : ' et-reincarnate-locked'}`}
            onClick={canReincarnate ? onReincarnate : undefined}
            disabled={!canReincarnate}
          >
            <span className="et-reincarnate-glyph" aria-hidden="true">輪</span>
            <span>{canReincarnate ? 'Reincarnate' : 'Reach Saint to reincarnate'}</span>
          </button>
        </section>
      </div>
    </div>
  );
}
