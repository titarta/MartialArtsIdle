import { useEffect } from 'react';
import { fmt } from '../utils/format';
import './reincarnationConfirm.css';

/**
 * ReincarnationConfirmModal: the single gate before the Eternal Tree.
 *
 * Reincarnation is the one irreversible act in the game (it wipes the current
 * life). This modal is the decision point. Confirming opens the Eternal Tree
 * full screen with no way out but to reincarnate, so the warning lives here.
 *
 * Two states:
 *   - ready  (realm >= Saint): the full warning, "Turn the Wheel" / "Not yet".
 *     The wheel turns.
 *   - closed (below Saint):    explains the gate, single dismiss. The wheel is
 *     stilled and dimmed.
 */

// Eight spokes of the dharma wheel, precomputed on a 100x100 viewBox. Hub at
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
  // Esc backs out (same as "Not yet"). Confirm is never key-bound: turning the
  // wheel must be a deliberate tap.
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
      aria-label="Reincarnation"
      onClick={onCancel}
    >
      <div className={`rc-card${canReincarnate ? '' : ' rc-card-closed'}`} onClick={(e) => e.stopPropagation()}>
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
          <div className="rc-eyebrow">The Wheel of Rebirth</div>

          {canReincarnate ? (
            <>
              <h2 className="rc-title">Sever this life?</h2>
              <p className="rc-body">
                To turn the wheel is to end this incarnation. Your realm, your qi, and
                all you have built this life will dissolve into the void.
              </p>
              <div className="rc-ledger">
                <div className="rc-ledger-row rc-lose">
                  <span className="rc-ledger-mark" aria-hidden="true">✕</span>
                  <span>This life undone: realm, qi, producers, every gain.</span>
                </div>
                <div className="rc-ledger-row rc-keep">
                  <span className="rc-ledger-mark" aria-hidden="true">◈</span>
                  <span>Your karma and the Eternal Tree endure across lives.</span>
                </div>
              </div>
              {karma > 0 && (
                <div className="rc-karma">You carry <b>{fmt(karma)}</b> karma into the dark.</div>
              )}
              <div className="rc-warn"><span>There is no coming back</span></div>
              <div className="rc-actions">
                <button type="button" className="rc-btn rc-cancel" onClick={onCancel}>
                  Not yet
                </button>
                <button type="button" className="rc-btn rc-confirm" onClick={onConfirm}>
                  <span className="rc-confirm-glyph" aria-hidden="true">輪</span>
                  Turn the Wheel
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="rc-title">The wheel is closed</h2>
              <p className="rc-body">
                Only at the <b>Saint</b> realm does the cycle open to you. Cultivate
                further, then return to sever this life and begin anew.
              </p>
              {realmName && <div className="rc-karma">You stand at <b>{realmName}</b>.</div>}
              <div className="rc-actions rc-actions-single">
                <button type="button" className="rc-btn rc-cancel" onClick={onCancel}>
                  Understood
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
