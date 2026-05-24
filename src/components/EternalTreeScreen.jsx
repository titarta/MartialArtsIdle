import { useMemo, useRef } from 'react';
import { NODES, NODES_BY_ID } from '../data/reincarnationTree';
import { fmt } from '../utils/format';

// ── Layout constants ──────────────────────────────────────────────────────────
const COL_W   = 120; // px per column
const ROW_H   = 100; // px per row
const NODE_W  = 80;
const NODE_H  = 64;
const PADDING = 40;  // canvas padding

// Pre-compute pixel center for each node
function nodeCenter(n) {
  return {
    cx: PADDING + n.col * COL_W + NODE_W / 2,
    cy: PADDING + n.row * ROW_H + NODE_H / 2,
  };
}

// Build edge list from node prereqs
function buildEdges() {
  const edges = [];
  for (const n of NODES) {
    for (const pid of n.prereqs) {
      if (NODES_BY_ID[pid]) {
        edges.push({ from: pid, to: n.id });
      }
    }
  }
  return edges;
}
const EDGES = buildEdges();

const ARROW_SIZE = 10; // px — arrowhead length in user-space

/** Border-to-border endpoints for an edge.
 *  Since edges only go right (Δcol>0) or down (Δrow>0), we can snap
 *  the exit/entry points to the exact node faces.
 */
function edgeEndpoints(fromNode, toNode) {
  const fc = nodeCenter(fromNode);
  const tc = nodeCenter(toNode);
  const isRight = toNode.col > fromNode.col;
  if (isRight) {
    return {
      x1: fc.cx + NODE_W / 2,
      y1: fc.cy,
      x2: tc.cx - NODE_W / 2,
      y2: tc.cy,
    };
  }
  // Downward
  return {
    x1: fc.cx,
    y1: fc.cy + NODE_H / 2,
    x2: tc.cx,
    y2: tc.cy - NODE_H / 2,
  };
}

// Canvas dimensions
const NUM_COLS = Math.max(...NODES.map(n => n.col)) + 1;
const NUM_ROWS = Math.max(...NODES.map(n => n.row)) + 1;
const CANVAS_W = PADDING * 2 + NUM_COLS * COL_W;
const CANVAS_H = PADDING * 2 + NUM_ROWS * ROW_H;

// ── Node component ────────────────────────────────────────────────────────────
function TreeNode({ node, state, karma, onBuy, tooltipRef }) {
  const center = nodeCenter(node);
  const x = center.cx - NODE_W / 2;
  const y = center.cy - NODE_H / 2;

  const isPurchased  = state === 'purchased';
  const isAvailable  = state === 'available';
  const isLocked     = state === 'locked';
  const isComingSoon = node.id === 'n_2';

  const canBuy = isAvailable && !isComingSoon && karma >= node.cost;

  const bg = isPurchased ? '#4a1d8a'
           : isAvailable ? '#2a1850'
           : '#161020';
  const border = isPurchased ? '#c084fc'
               : isAvailable ? '#7c3aed'
               : '#3b2a55';
  const textColor = isPurchased ? '#e9d5ff'
                  : isAvailable ? '#c4b5fd'
                  : '#6b5f80';
  const opacity = isLocked ? 0.5 : 1;

  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: canBuy ? 'pointer' : 'default', opacity }}
      onClick={canBuy ? () => onBuy(node.id, node.cost) : undefined}
      onMouseEnter={(e) => {
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'block';
          tooltipRef.current.innerHTML = `<strong>${node.label}</strong><br/>${node.description}${
            isComingSoon ? '' : `<br/><span style="color:#a78bfa">Cost: ${node.cost} karma</span>`
          }${
            isPurchased ? '<br/><span style="color:#86efac">✓ Purchased</span>' : ''
          }${
            canBuy ? '<br/><span style="color:#fde68a">Click to purchase</span>' : ''
          }${
            isAvailable && !canBuy && !isComingSoon ? '<br/><span style="color:#fca5a5">Not enough karma</span>' : ''
          }`;
        }
      }}
      onMouseMove={(e) => {
        if (tooltipRef.current) {
          const rect = e.currentTarget.closest('svg').getBoundingClientRect();
          tooltipRef.current.style.left = (e.clientX - rect.left + 12) + 'px';
          tooltipRef.current.style.top  = (e.clientY - rect.top  - 8) + 'px';
        }
      }}
      onMouseLeave={() => {
        if (tooltipRef.current) tooltipRef.current.style.display = 'none';
      }}
    >
      {/* Glow for purchased */}
      {isPurchased && (
        <rect
          x={-3} y={-3} width={NODE_W + 6} height={NODE_H + 6}
          rx={19} ry={19}
          fill="none"
          stroke="#a855f7"
          strokeWidth={2}
          opacity={0.5}
          style={{ filter: 'blur(2px)' }}
        />
      )}
      {/* Body */}
      <rect
        width={NODE_W} height={NODE_H}
        rx={16} ry={16}
        fill={bg}
        stroke={border}
        strokeWidth={isPurchased ? 2 : 1}
      />
      {/* Label */}
      <text
        x={NODE_W / 2} y={NODE_H / 2 - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
        fontSize={11}
        fontWeight={isPurchased ? 'bold' : 'normal'}
        style={{ userSelect: 'none', fontFamily: 'inherit' }}
      >
        {node.label}
      </text>
      {/* Cost / status badge */}
      <text
        x={NODE_W / 2} y={NODE_H / 2 + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={isPurchased ? '#86efac' : isComingSoon ? '#7c3aed' : textColor}
        fontSize={10}
        style={{ userSelect: 'none', fontFamily: 'inherit' }}
      >
        {isPurchased ? '✓ owned' : isComingSoon ? '✦ soon' : `${node.cost} karma`}
      </text>
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EternalTreeScreen({
  karma,
  karmaEarnedThisLife,
  tree,
  lives,
  realmIndex,
  onReincarnate,
  onClose,
}) {
  const tooltipRef = useRef(null);

  const { purchased, isAvailable, buyNode } = tree;

  // Node states
  const nodeStates = useMemo(() => {
    const out = {};
    for (const n of NODES) {
      if (purchased.has(n.id)) {
        out[n.id] = 'purchased';
      } else if (isAvailable(n.id)) {
        out[n.id] = 'available';
      } else {
        out[n.id] = 'locked';
      }
    }
    return out;
  }, [purchased, isAvailable]);

  const handleBuy = (id, cost) => {
    if (karma < cost) return;
    buyNode(id);
  };

  const karmaSpentOnTree = purchased.size;
  const canReincarnate   = realmIndex >= 24;

  // Next karma costs 1,000,000 + karmaEarnedThisLife × 10,000 Qi (0-indexed: k-th point).
  const nextKarmaQiCost = useMemo(() => {
    const k = Math.max(0, Math.floor(karmaEarnedThisLife ?? 0));
    return 1_000_000 + k * 10_000;
  }, [karmaEarnedThisLife]);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      zIndex: 1000,
      overflowY: 'auto',
      padding: '24px 16px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', maxWidth: 480,
        marginBottom: 8,
      }}>
        <h2 style={{ margin: 0, color: '#e9d5ff', fontSize: 20, fontWeight: 'bold' }}>
          Eternal Tree
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none',
            color: '#a78bfa', fontSize: 22, cursor: 'pointer', lineHeight: 1,
          }}
        >✕</button>
      </div>

      {/* Karma stats bar */}
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#1e1030',
        border: '1px solid #3b2a55',
        borderRadius: 12,
        padding: '10px 16px',
        marginBottom: 16,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ color: '#c4b5fd', fontSize: 13 }}>
            ◈ <strong style={{ color: '#e9d5ff' }}>{karma}</strong> karma unspent
          </span>
          <span style={{ color: '#c4b5fd', fontSize: 13 }}>
            <strong style={{ color: '#e9d5ff' }}>{karmaSpentOnTree}</strong> spent on tree
          </span>
          <span style={{ color: '#c4b5fd', fontSize: 13 }}>
            <strong style={{ color: '#e9d5ff' }}>{lives ?? 0}</strong> lives lived
          </span>
        </div>
        <div style={{ color: '#7c6a9a', fontSize: 11 }}>
          Next karma: {fmt(nextKarmaQiCost)} Qi earned this life
          (earned {karmaEarnedThisLife ?? 0} karma this life)
        </div>
      </div>

      {/* Tree SVG */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <svg
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            {/* Lit arrow — both nodes purchased */}
            <marker
              id="arrow-lit"
              markerWidth={ARROW_SIZE} markerHeight={ARROW_SIZE * 0.7}
              refX={ARROW_SIZE} refY={ARROW_SIZE * 0.35}
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path
                d={`M0,0 L0,${ARROW_SIZE * 0.7} L${ARROW_SIZE},${ARROW_SIZE * 0.35} z`}
                fill="#c084fc"
              />
            </marker>
            {/* Mid arrow — source purchased, target not yet */}
            <marker
              id="arrow-mid"
              markerWidth={ARROW_SIZE} markerHeight={ARROW_SIZE * 0.7}
              refX={ARROW_SIZE} refY={ARROW_SIZE * 0.35}
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path
                d={`M0,0 L0,${ARROW_SIZE * 0.7} L${ARROW_SIZE},${ARROW_SIZE * 0.35} z`}
                fill="#7c3aed"
              />
            </marker>
            {/* Dim arrow — source not purchased */}
            <marker
              id="arrow-dim"
              markerWidth={ARROW_SIZE} markerHeight={ARROW_SIZE * 0.7}
              refX={ARROW_SIZE} refY={ARROW_SIZE * 0.35}
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path
                d={`M0,0 L0,${ARROW_SIZE * 0.7} L${ARROW_SIZE},${ARROW_SIZE * 0.35} z`}
                fill="#2d1b4e"
              />
            </marker>
          </defs>

          {/* Edges */}
          {EDGES.map(({ from, to }) => {
            const bothPurchased = nodeStates[from] === 'purchased' && nodeStates[to] === 'purchased';
            const fromPurchased = nodeStates[from] === 'purchased';
            const { x1, y1, x2, y2 } = edgeEndpoints(NODES_BY_ID[from], NODES_BY_ID[to]);
            // Shorten line endpoint so arrowhead tip lands exactly on node border
            const markerId = bothPurchased ? 'arrow-lit' : fromPurchased ? 'arrow-mid' : 'arrow-dim';
            return (
              <line
                key={`${from}-${to}`}
                x1={x1} y1={y1}
                x2={x2} y2={y2}
                stroke={bothPurchased ? '#c084fc' : fromPurchased ? '#7c3aed' : '#2d1b4e'}
                strokeWidth={bothPurchased ? 2.5 : fromPurchased ? 1.5 : 1}
                strokeDasharray={fromPurchased ? undefined : '5 4'}
                opacity={bothPurchased ? 1 : fromPurchased ? 0.7 : 0.4}
                markerEnd={`url(#${markerId})`}
              />
            );
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

        {/* Floating tooltip */}
        <div
          ref={tooltipRef}
          style={{
            display: 'none',
            position: 'absolute',
            background: '#1e1030',
            border: '1px solid #7c3aed',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: '#e9d5ff',
            pointerEvents: 'none',
            zIndex: 10,
            maxWidth: 200,
            lineHeight: 1.5,
          }}
        />
      </div>

      {/* Reincarnate button */}
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#1e1030',
        border: '1px solid #3b2a55',
        borderRadius: 12,
        padding: '14px 16px',
        textAlign: 'center',
      }}>
        <div style={{ color: '#c4b5fd', fontSize: 13, marginBottom: 10 }}>
          Reincarnation resets your cultivation and producers but preserves
          karma, tree nodes, and law library.
        </div>
        <button
          onClick={canReincarnate ? onReincarnate : undefined}
          disabled={!canReincarnate}
          style={{
            background: canReincarnate ? '#5b21b6' : '#2a1850',
            border: `1px solid ${canReincarnate ? '#a855f7' : '#3b2a55'}`,
            color: canReincarnate ? '#e9d5ff' : '#6b5f80',
            borderRadius: 8,
            padding: '10px 28px',
            fontSize: 14,
            fontWeight: 'bold',
            cursor: canReincarnate ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          {canReincarnate ? '✦ Reincarnate' : 'Reach Saint realm to reincarnate'}
        </button>
      </div>
    </div>
  );
}
