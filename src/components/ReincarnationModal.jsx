import { useState } from 'react';
import { NODES, NODE_DESCRIPTIONS, TREE_TOTAL_COST, PEAK_INDEX, SAINT_UNLOCK_INDEX } from '../data/reincarnationTree';

const NODE_ICONS = {
  pills2x:   '💊',
  mining2x:  '⛏️',
  gather2x:  '🌿',
  focus3x:   '🧘',
  heaven2x:  '✨',
  stones3x:  '💎',
  damage3x:  '⚔️',
  stats1000: '💪',
  qis2x:     '🌀',
};

// Connector lines: [from_id, to_id] — bottom row → middle → top
const CONNECTIONS = [
  ['pills2x',  'focus3x'],
  ['pills2x',  'heaven2x'],
  ['mining2x', 'focus3x'],
  ['mining2x', 'heaven2x'],
  ['mining2x', 'stones3x'],
  ['gather2x', 'heaven2x'],
  ['gather2x', 'stones3x'],
  ['focus3x',  'damage3x'],
  ['focus3x',  'stats1000'],
  ['heaven2x', 'damage3x'],
  ['heaven2x', 'stats1000'],
  ['heaven2x', 'qis2x'],
  ['stones3x', 'stats1000'],
  ['stones3x', 'qis2x'],
];

// Grid constants — must match CSS .reinc-node cell size
const CELL_W  = 100; // px, must match --reinc-cell-w
const CELL_H  = 100; // px, must match --reinc-cell-h
const GAP     = 10;  // px, must match grid gap
const COLS    = 3;
const ROWS    = 3;

// Centre of a node in the SVG coordinate system (origin = grid top-left)
function nodeCentre(node) {
  const col        = node.col;            // 0-2
  const rowFromTop = 2 - node.row;       // row 2 → rowFromTop 0 (top)
  return {
    x: col * (CELL_W + GAP) + CELL_W / 2,
    y: rowFromTop * (CELL_H + GAP) + CELL_H / 2,
  };
}

const SVG_W = COLS * CELL_W + (COLS - 1) * GAP;
const SVG_H = ROWS * CELL_H + (ROWS - 1) * GAP;

const NODES_BY_ID = Object.fromEntries(NODES.map(n => [n.id, n]));

function TreeConnectors({ purchased }) {
  return (
    <svg
      className="reinc-tree-svg"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {CONNECTIONS.map(([fromId, toId]) => {
        const from = NODES_BY_ID[fromId];
        const to   = NODES_BY_ID[toId];
        if (!from || !to) return null;
        const p1     = nodeCentre(from);
        const p2     = nodeCentre(to);
        const active = purchased.has(fromId) && purchased.has(toId);
        const partial = purchased.has(fromId) || purchased.has(toId);
        return (
          <line
            key={`${fromId}-${toId}`}
            x1={p1.x} y1={p1.y}
            x2={p2.x} y2={p2.y}
            className={`reinc-conn${active ? ' reinc-conn-active' : partial ? ' reinc-conn-partial' : ''}`}
          />
        );
      })}
    </svg>
  );
}

function ReincarnationModal({
  karma, tree, lives,
  highestReached, peakKarmaTotal,
  realmIndex,
  onReincarnate, onClose,
}) {
  const [phase,       setPhase]       = useState('info');
  const [hoveredNode, setHoveredNode] = useState(null);

  const canReincarnateNow = realmIndex >= SAINT_UNLOCK_INDEX;

  const doReincarnate = () => {
    onReincarnate();
    onClose();
  };

  const byRow = [2, 1, 0].map(r =>
    NODES.filter(n => n.row === r).sort((a, b) => a.col - b.col)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="reinc-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="reinc-header">
          <span className="reinc-header-icon">☸</span>
          <div className="reinc-header-text">
            <div className="reinc-title">Reincarnation</div>
            <div className="reinc-subtitle">{lives} {lives === 1 ? 'life' : 'lives'} lived</div>
          </div>
          <div className="reinc-karma-badge">
            <span className="reinc-karma-gem">◈</span>
            {karma} Karma
          </div>
          <button className="journey-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Phase tabs */}
        <div className="reinc-tabs">
          <button
            className={`reinc-tab${phase === 'info' ? ' reinc-tab-active' : ''}`}
            onClick={() => setPhase('info')}
          >
            Overview
          </button>
          <button
            className={`reinc-tab${phase === 'tree' ? ' reinc-tab-active' : ''}`}
            onClick={() => setPhase('tree')}
          >
            Eternal Tree
          </button>
        </div>

        {/* ── INFO PHASE ── */}
        {phase === 'info' && (
          <div className="reinc-info">
            <div className="reinc-info-cards">
              <div className="reinc-info-card reinc-info-card-lost">
                <div className="reinc-info-card-title">Lost on Rebirth</div>
                <ul className="reinc-info-list">
                  <li>QI &amp; cultivation progress</li>
                  <li>Inventory &amp; materials</li>
                  <li>Artefacts &amp; techniques</li>
                  <li>Pills &amp; discoveries</li>
                  <li>Gathering / mining unlocks</li>
                </ul>
              </div>
              <div className="reinc-info-card reinc-info-card-kept">
                <div className="reinc-info-card-title">Survives Rebirth</div>
                <ul className="reinc-info-list">
                  <li>Active Law</li>
                  <li>Karma &amp; Eternal Tree</li>
                  <li>Lives counter</li>
                </ul>
              </div>
            </div>

            <div className="reinc-info-stats">
              <div className="reinc-stat">
                <span className="reinc-stat-label">Peak Progress</span>
                <span className="reinc-stat-value">{highestReached} / {PEAK_INDEX}</span>
              </div>
              <div className="reinc-stat">
                <span className="reinc-stat-label">Full Peak Yields</span>
                <span className="reinc-stat-value">{peakKarmaTotal} karma</span>
              </div>
              <div className="reinc-stat">
                <span className="reinc-stat-label">Full Tree Cost</span>
                <span className="reinc-stat-value">{TREE_TOTAL_COST} karma</span>
              </div>
            </div>

            <div className="reinc-actions">
              <button className="reinc-btn-secondary" onClick={() => setPhase('tree')}>
                View Eternal Tree →
              </button>
              {canReincarnateNow ? (
                <button className="reinc-btn-danger" onClick={() => setPhase('confirm')}>
                  ☸ Reincarnate
                </button>
              ) : (
                <div className="reinc-locked-hint">
                  Reach Saint realm to reincarnate
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TREE PHASE ── */}
        {phase === 'tree' && (
          <div className="reinc-tree-phase">
            <div className="reinc-tree-karma-bar">
              <span className="reinc-tree-karma-label">Available Karma</span>
              <span className="reinc-tree-karma-val">◈ {karma}</span>
            </div>

            <div className="reinc-tree-container">
              <TreeConnectors purchased={tree.purchased} />
              <div className="reinc-tree-grid">
                {byRow.map((row, rowIdx) => (
                  <div key={rowIdx} className="reinc-tree-row">
                    {row.map(node => {
                      const purchased  = tree.isPurchased(node.id);
                      const available  = tree.isAvailable(node.id);
                      const affordable = tree.canBuy(node.id);
                      const state = purchased    ? 'purchased'
                        : available ? (affordable ? 'affordable' : 'locked-cost')
                        : 'locked-prereq';

                      return (
                        <button
                          key={node.id}
                          className={`reinc-node reinc-node-${state}`}
                          onClick={() => { if (affordable) tree.buy(node.id); }}
                          onMouseEnter={() => setHoveredNode(node.id)}
                          onMouseLeave={() => setHoveredNode(h => h === node.id ? null : h)}
                          onTouchStart={() => setHoveredNode(node.id)}
                          onTouchEnd={() => setHoveredNode(null)}
                          disabled={!affordable && !purchased}
                          title={NODE_DESCRIPTIONS[node.id]}
                        >
                          <span className="reinc-node-icon">{NODE_ICONS[node.id]}</span>
                          <span className="reinc-node-label">{node.label}</span>
                          <span className="reinc-node-cost">
                            {purchased ? '✓ Owned' : `${node.cost} ◈`}
                          </span>
                          {hoveredNode === node.id && (
                            <div className="reinc-node-tooltip">{NODE_DESCRIPTIONS[node.id]}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {canReincarnateNow && (
              <div className="reinc-actions">
                <button className="reinc-btn-danger" onClick={() => setPhase('confirm')}>
                  ☸ Reincarnate Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CONFIRM PHASE ── */}
        {phase === 'confirm' && (
          <div className="reinc-confirm">
            <div className="reinc-confirm-icon">☸</div>
            <div className="reinc-confirm-title">Begin a New Life?</div>
            <div className="reinc-confirm-text">
              QI, realms, pills, inventory, artefacts, and techniques will be wiped.
              Your active Law, Karma, and the Eternal Tree survive.
            </div>
            <div className="reinc-actions reinc-actions-confirm">
              <button className="reinc-btn-secondary" onClick={() => setPhase('tree')}>
                ← Spend Karma First
              </button>
              <button className="reinc-btn-danger" onClick={doReincarnate}>
                Yes, Reincarnate
              </button>
            </div>
            <button className="reinc-confirm-cancel" onClick={() => setPhase('info')}>
              Cancel
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default ReincarnationModal;
