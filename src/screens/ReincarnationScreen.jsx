// @refresh reset
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NODES, NODE_DESCRIPTIONS, TREE_TOTAL_COST, PEAK_INDEX, SAINT_UNLOCK_INDEX } from '../data/reincarnationTree';

/**
 * Reincarnation tab — displays karma, the passive tree, and the
 * Reincarnate button. Unlocks at Saint Early Stage.
 */
function ReincarnationScreen({ karma, tree, lives, highestReached, peakKarmaTotal, realmIndex = 0, onReincarnate }) {
  const { t } = useTranslation('ui');
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
    <div className="screen reinc-screen">
      <header className="coll-page-header">
        <h1>{t('reincarnation.title')}</h1>
        <span className="coll-page-subtitle">
          {t('reincarnation.subtitle')}
        </span>
      </header>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="reinc-info-stats">
        <div className="reinc-stat">
          <span className="reinc-stat-label">{t('reincarnation.karmaLabel')}</span>
          <span className="reinc-stat-value">{karma}</span>
        </div>
        <div className="reinc-stat">
          <span className="reinc-stat-label">{t('reincarnation.livesLabel')}</span>
          <span className="reinc-stat-value">{lives}</span>
        </div>
        <div className="reinc-stat">
          <span className="reinc-stat-label">{t('reincarnation.peakProgressLabel')}</span>
          <span className="reinc-stat-value">{highestReached} / {PEAK_INDEX}</span>
        </div>
        <div className="reinc-stat">
          <span className="reinc-stat-label">{t('reincarnation.peakYieldLabel')}</span>
          <span className="reinc-stat-value">{t('reincarnation.karmaUnit', { n: peakKarmaTotal })}</span>
        </div>
      </div>

      {/* ── Reincarnate action ─────────────────────────────────────────────── */}
      {confirm ? (
        <div className="reinc-actions reinc-actions-confirm">
          <span className="reinc-locked-hint">
            {t('reincarnation.confirmText')}
          </span>
          <button className="reinc-btn-danger" onClick={doReincarnate}>{t('reincarnation.confirmBtn')}</button>
          <button className="reinc-btn-secondary" onClick={() => setConfirm(false)}>{t('common.cancel')}</button>
        </div>
      ) : (
        <div className="reinc-actions">
          <button
            className="reinc-btn-danger"
            onClick={() => setConfirm(true)}
            disabled={!canReincarnateNow}
            title={canReincarnateNow ? undefined : t('reincarnation.lockedTitle')}
          >
            {t('reincarnation.reincarnateBtn')}
          </button>
          {!canReincarnateNow && (
            <span className="reinc-locked-hint">{t('reincarnation.lockedHint')}</span>
          )}
        </div>
      )}

      {/* ── Eternal Tree ──────────────────────────────────────────────────── */}
      <div className="reinc-tree-phase">
        <div className="reinc-tree-karma-bar">
          <span className="reinc-tree-karma-label">{t('reincarnation.treeLabel')}</span>
          <span className="reinc-tree-karma-val">{t('reincarnation.karmaUnit', { n: TREE_TOTAL_COST })}</span>
        </div>

        <div className="reinc-tree-grid">
          {byRow.map((row, idx) => (
            <div key={idx} className="reinc-tree-row">
              {row.map(node => {
                const purchased  = tree.isPurchased(node.id);
                const available  = tree.isAvailable(node.id);
                const affordable = tree.canBuy(node.id);
                const state =
                  purchased  ? 'purchased'    :
                  available  ? (affordable ? 'affordable' : 'locked-cost') :
                               'locked-prereq';
                return (
                  <button
                    key={node.id}
                    className={`reinc-node reinc-node-${state}`}
                    onClick={() => { if (affordable) tree.buy(node.id); }}
                    onMouseEnter={() => setHover(node.id)}
                    onMouseLeave={() => setHover(h => h === node.id ? null : h)}
                    disabled={!affordable && !purchased}
                  >
                    <span className="reinc-node-label">
                      {state === 'locked-prereq' ? '🔒 ' : ''}{node.label}
                    </span>
                    <span className="reinc-node-cost">
                      {purchased ? t('reincarnation.nodeOwned') : t('reincarnation.karmaUnit', { n: node.cost })}
                    </span>
                    {hover === node.id && (
                      <div className="reinc-node-tooltip">{NODE_DESCRIPTIONS[node.id]}</div>
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
