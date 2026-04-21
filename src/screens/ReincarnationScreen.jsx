// @refresh reset
import { useState } from 'react';
import { NODES, NODE_DESCRIPTIONS, TREE_TOTAL_COST, PEAK_INDEX, SAINT_UNLOCK_INDEX } from '../data/reincarnationTree';

/**
 * Reincarnation tab — displays karma, the passive tree, and the
 * Reincarnate button. Unlocks at Saint Early Stage.
 */
function ReincarnationScreen({ karma, tree, lives, highestReached, peakKarmaTotal, realmIndex = 0, onReincarnate }) {
  const [confirm, setConfirm] = useState(false);
  const [hover,   setHover]   = useState(null);

  // Must currently be in Saint realm (index 24) or beyond to reincarnate —
  // not just have ever reached it. This prevents cheap post-wipe resets.
  const canReincarnateNow = realmIndex >= SAINT_UNLOCK_INDEX;

  const doReincarnate = () => {
    if (!canReincarnateNow) return;
    setConfirm(false);
    onReincarnate();
  };

  // Arrange nodes by row (top = row 2) for display
  const byRow = [2, 1, 0].map(r => NODES.filter(n => n.row === r).sort((a, b) => a.col - b.col));

  return (
    <div className="screen">
      <h1>Reincarnation</h1>
      <p className="subtitle">
        Reset your cultivation to claim Reincarnation Karma. Spend karma in the Eternal Tree for
        permanent buffs that survive every rebirth.
      </p>

      <div className="save-section">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'baseline' }}>
          <div><b>Karma:</b> {karma}</div>
          <div style={{ opacity: 0.75 }}>Lives: {lives}</div>
          <div style={{ opacity: 0.75 }}>Peak progress: {highestReached}/{PEAK_INDEX}</div>
          <div style={{ opacity: 0.75 }}>Full peak yields {peakKarmaTotal} karma</div>
        </div>

        <div className="save-buttons" style={{ marginTop: '8px' }}>
          {confirm ? (
            <div className="wipe-confirm">
              <span className="wipe-confirm-label">
                Rebirth wipes QI, realms, pills, inventory, artefacts, techniques and other
                laws. Your active law, Karma and the Eternal Tree survive. Continue?
              </span>
              <button className="save-btn save-btn-danger" onClick={doReincarnate}>Yes, reincarnate</button>
              <button className="save-btn" onClick={() => setConfirm(false)}>Cancel</button>
            </div>
          ) : (
            <button
              className="save-btn save-btn-danger"
              onClick={() => setConfirm(true)}
              disabled={!canReincarnateNow}
              title={canReincarnateNow ? undefined : 'Reach Saint realm in this life to reincarnate'}
            >
              Reincarnate
            </button>
          )}
          {!canReincarnateNow && !confirm && (
            <span style={{ marginLeft: '12px', fontSize: '0.9em', opacity: 0.7 }}>
              Reach Saint realm to reincarnate
            </span>
          )}
        </div>
      </div>

      <div className="save-section">
        <h2>Eternal Tree</h2>
        <p className="subtitle">Total cost: {TREE_TOTAL_COST} karma.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          {byRow.map((row, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {row.map(node => {
                const purchased = tree.isPurchased(node.id);
                const available = tree.isAvailable(node.id);
                const affordable = tree.canBuy(node.id);
                const state = purchased ? 'purchased' : available ? (affordable ? 'affordable' : 'locked-cost') : 'locked-prereq';
                const bg =
                  state === 'purchased'    ? 'rgba(120, 200, 120, 0.25)' :
                  state === 'affordable'   ? 'rgba(180, 180, 80, 0.25)'  :
                  state === 'locked-cost'  ? 'rgba(80, 80, 80, 0.25)'    :
                                             'rgba(40, 40, 40, 0.35)';
                const border =
                  state === 'purchased'   ? '2px solid #6c6' :
                  state === 'affordable'  ? '2px solid #cc6' :
                                            '2px solid #555';
                return (
                  <button
                    key={node.id}
                    className="save-btn"
                    onClick={() => { if (affordable) tree.buy(node.id); }}
                    onMouseEnter={() => setHover(node.id)}
                    onMouseLeave={() => setHover(h => h === node.id ? null : h)}
                    disabled={!affordable && !purchased}
                    style={{
                      background: bg,
                      border,
                      padding: '12px',
                      minHeight: '80px',
                      cursor: purchased ? 'default' : (affordable ? 'pointer' : 'not-allowed'),
                      opacity: available || purchased ? 1 : 0.55,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      textAlign: 'center',
                    }}
                    title={NODE_DESCRIPTIONS[node.id]}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.95em' }}>
                      {state === 'locked-prereq' ? '🔒 ' : ''}{node.label}
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '0.85em', opacity: 0.8 }}>
                      {purchased ? '✓ Owned' : `${node.cost} karma`}
                    </div>
                    {hover === node.id && (
                      <div style={{ marginTop: '6px', fontSize: '0.75em', opacity: 0.75 }}>
                        {NODE_DESCRIPTIONS[node.id]}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReincarnationScreen;

export { SAINT_UNLOCK_INDEX };
