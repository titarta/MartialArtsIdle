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
 *   - closed (below Saint):    explains the gate, single dismiss.
 */
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
      <div className="rc-card" onClick={(e) => e.stopPropagation()}>
        <div className="rc-wheel-wrap" aria-hidden="true">
          <span className="rc-wheel-ring" />
          <span className="rc-wheel">輪</span>
        </div>
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
            <div className="rc-warn">There is no coming back.</div>
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
  );
}
