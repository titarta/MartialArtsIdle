import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fmt } from '../utils/format';
import './reincarnationConfirm.css';

/**
 * ReincarnationConfirmModal: the gate before the Eternal Tree.
 *
 * Reincarnation is the one irreversible act in the game — it wipes the
 * current life. This modal is the decision point. Confirming opens the
 * Eternal Tree full-screen with no way out but to turn the wheel.
 *
 * Visual concept: "Threshold of Lives". A silhouetted Eternal Tree sits
 * behind everything; the dharma Wheel of Rebirth turns in its crown; the
 * roots descend into the warning beneath. Jade leaves pulse at the branch
 * tips — the only thing in the modal that is alive. The cinnabar 渡
 * (dù — crossing) seal is stamped on the wheel, the cultivation glyph for
 * crossing the threshold between realms.
 *
 * Two states:
 *   ready  (realm ≥ Saint) — the rite is open. Wheel turns, leaves pulse.
 *   closed (below Saint)   — the threshold is sealed. Wheel stilled, leaves
 *                            withered, seal greyed.
 */

// Eight spokes of the dharma wheel, precomputed on a 100×100 viewBox. Hub at
// r=8, rim at r=37; each spoke also carries a stud where it meets the rim.
const SPOKES = Array.from({ length: 8 }, (_, i) => {
  const a = (i * 45) * Math.PI / 180;
  return {
    x1: +(50 + 8  * Math.cos(a)).toFixed(2),
    y1: +(50 + 8  * Math.sin(a)).toFixed(2),
    x2: +(50 + 37 * Math.cos(a)).toFixed(2),
    y2: +(50 + 37 * Math.sin(a)).toFixed(2),
  };
});

// Rising qi-motes drifting up behind the sigil. Fixed positions so the layout
// is deterministic (no per-render randomness).
const EMBERS = [
  { left: '14%', top: '46%', delay: '0.0s', dur: '7.0s' },
  { left: '82%', top: '40%', delay: '1.4s', dur: '8.5s' },
  { left: '30%', top: '30%', delay: '2.6s', dur: '6.4s' },
  { left: '68%', top: '52%', delay: '0.8s', dur: '9.0s' },
  { left: '48%', top: '20%', delay: '3.4s', dur: '7.6s' },
  { left: '90%', top: '24%', delay: '2.0s', dur: '8.2s' },
  { left: '8%',  top: '26%', delay: '1.1s', dur: '6.8s' },
  { left: '58%', top: '44%', delay: '4.2s', dur: '7.2s' },
];

/**
 * Silhouetted Eternal Tree drawn behind everything in the card. Trunk runs
 * vertically through the middle, crown branches open at the top (around the
 * wheel position), roots descend through the bottom (around the warning +
 * actions). Jade leaf-clusters pulse at the branch tips. Withered in the
 * closed state — the rite is sealed and the tree dreams.
 */
function EternalTreeBackdrop({ stilled }) {
  return (
    <svg
      className={`rc-tree${stilled ? ' rc-tree-stilled' : ''}`}
      viewBox="0 0 200 360"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* Roots — descend through the lower half of the card */}
      <g className="rc-tree-roots">
        <path className="rc-tree-root" d="M100 224 C 80 250, 55 272, 38 320" />
        <path className="rc-tree-root" d="M100 224 C 120 250, 145 272, 162 320" />
        <path className="rc-tree-root" d="M100 224 L 100 326" />
        <path className="rc-tree-root rc-tree-root-thin" d="M100 232 C 86 262, 68 294, 58 332" />
        <path className="rc-tree-root rc-tree-root-thin" d="M100 232 C 114 262, 132 294, 142 332" />
      </g>
      {/* Trunk */}
      <path className="rc-tree-trunk" d="M100 60 L100 222" />
      {/* Crown branches — open outward around where the wheel sits */}
      <g className="rc-tree-crown">
        <path className="rc-tree-branch" d="M100 74 C 75 56, 48 50, 26 32" />
        <path className="rc-tree-branch" d="M100 74 C 125 56, 152 50, 174 32" />
        <path className="rc-tree-branch" d="M100 92 C 70 82, 42 94, 20 86" />
        <path className="rc-tree-branch" d="M100 92 C 130 82, 158 94, 180 86" />
        <path className="rc-tree-branch rc-tree-branch-mid" d="M100 112 C 80 108, 60 120, 44 134" />
        <path className="rc-tree-branch rc-tree-branch-mid" d="M100 112 C 120 108, 140 120, 156 134" />
        <path className="rc-tree-branch rc-tree-branch-mid" d="M100 136 C 88 138, 76 148, 70 162" />
        <path className="rc-tree-branch rc-tree-branch-mid" d="M100 136 C 112 138, 124 148, 130 162" />
      </g>
      {/* Leaf clusters at the branch tips — the only thing in the modal that
          is alive. Jade green, faint glow, slow staggered pulse. */}
      <g className="rc-tree-leaves">
        <circle className="rc-tree-leaf"       cx="26"  cy="32"  r="3.6" />
        <circle className="rc-tree-leaf"       cx="174" cy="32"  r="3.6" />
        <circle className="rc-tree-leaf"       cx="20"  cy="86"  r="2.9" />
        <circle className="rc-tree-leaf"       cx="180" cy="86"  r="2.9" />
        <circle className="rc-tree-leaf rc-tree-leaf-small" cx="44"  cy="134" r="2.4" />
        <circle className="rc-tree-leaf rc-tree-leaf-small" cx="156" cy="134" r="2.4" />
        <circle className="rc-tree-leaf rc-tree-leaf-small" cx="70"  cy="162" r="1.9" />
        <circle className="rc-tree-leaf rc-tree-leaf-small" cx="130" cy="162" r="1.9" />
      </g>
    </svg>
  );
}

/**
 * The dharma Wheel of Rebirth. Spinning rim with 8 spokes + studs; a
 * counter-spinning motes ring outside it; a glow halo behind. A cinnabar
 * 渡 (dù) seal — the cultivation glyph for "crossing" major realms — is
 * stamped at the lower-right, vow-style.
 */
function WheelSigil({ stilled }) {
  return (
    <div className={`rc-sigil${stilled ? ' rc-sigil-stilled' : ''}`} aria-hidden="true">
      <span className="rc-sigil-glow" />
      <svg className="rc-wheel-svg" viewBox="0 0 100 100" width="108" height="108">
        <circle className="rc-wheel-motes" cx="50" cy="50" r="47" />
        <g className="rc-wheel-spin">
          <circle className="rc-wheel-rim"  cx="50" cy="50" r="37" />
          <circle className="rc-wheel-rim2" cx="50" cy="50" r="29" />
          {SPOKES.map((s, i) => (
            <line key={i} className="rc-wheel-spoke" x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
          ))}
          {SPOKES.map((s, i) => (
            <circle key={`s${i}`} className="rc-wheel-stud" cx={s.x2} cy={s.y2} r="2.1" />
          ))}
          <circle className="rc-wheel-hub"      cx="50" cy="50" r="7.5" />
          <circle className="rc-wheel-hub-core" cx="50" cy="50" r="3.2" />
        </g>
      </svg>
      <span className="rc-sigil-seal">渡</span>
    </div>
  );
}

export default function ReincarnationConfirmModal({
  canReincarnate,
  karma = 0,
  realmName,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation('ui');

  // Esc backs out (same as "Hold the wheel"). Confirm is never key-bound:
  // turning the wheel must be a deliberate tap.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="rc-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('reincarnation.title')}
      onClick={onCancel}
    >
      <div className={`rc-card${canReincarnate ? '' : ' rc-card-closed'}`} onClick={(e) => e.stopPropagation()}>
        <EternalTreeBackdrop stilled={!canReincarnate} />
        <div className="rc-embers" aria-hidden="true">
          {EMBERS.map((e, i) => (
            <span
              key={i}
              className="rc-ember"
              style={{ left: e.left, top: e.top, animationDelay: e.delay, animationDuration: e.dur }}
            />
          ))}
        </div>

        <div className="rc-content">
          <WheelSigil stilled={!canReincarnate} />
          <div className="rc-eyebrow">{t('reincarnationModal.eyebrow')}</div>

          {canReincarnate ? (
            <>
              <h2 className="rc-title">{t('reincarnationModal.titleOpen')}</h2>
              <p className="rc-body">{t('reincarnationModal.bodyOpen')}</p>
              <div className="rc-ledger">
                <div className="rc-ledger-row rc-lose">
                  <span className="rc-ledger-mark" aria-hidden="true">✕</span>
                  <span>{t('reincarnationModal.loseRow')}</span>
                </div>
                <div className="rc-ledger-row rc-keep">
                  <span className="rc-ledger-mark" aria-hidden="true">◈</span>
                  <span>{t('reincarnationModal.keepRow')}</span>
                </div>
              </div>
              {karma > 0 && (
                <div className="rc-karma-cartouche">
                  <span className="rc-karma-label">{t('reincarnationModal.karmaCarried')}</span>
                  <span className="rc-karma-value">{fmt(karma)}</span>
                </div>
              )}
              <div className="rc-warn"><span>{t('reincarnationModal.warn')}</span></div>
              <div className="rc-actions">
                <button type="button" className="rc-btn rc-cancel" onClick={onCancel}>
                  {t('reincarnationModal.cancelBtn')}
                </button>
                <button type="button" className="rc-btn rc-confirm" onClick={onConfirm}>
                  <span className="rc-confirm-glyph" aria-hidden="true">輪</span>
                  {t('reincarnationModal.confirmBtn')}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="rc-title">{t('reincarnationModal.titleLocked')}</h2>
              <p className="rc-body">{t('reincarnationModal.bodyLocked')}</p>
              {realmName && (
                <div className="rc-karma-cartouche rc-karma-cartouche-realm">
                  <span className="rc-karma-label">{t('reincarnationModal.youStandAt')}</span>
                  <span className="rc-karma-value">{realmName}</span>
                </div>
              )}
              <div className="rc-actions rc-actions-single">
                <button type="button" className="rc-btn rc-cancel" onClick={onCancel}>
                  {t('reincarnationModal.understoodBtn')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
