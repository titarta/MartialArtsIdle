/**
 * Shown once when the player returns after 5+ minutes away.
 * Offers normal collect or doubled collect via rewarded ad.
 */
function OfflineEarningsModal({ amount, onCollect, onDoubleCollect }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content offline-modal">
        <h2 className="modal-title">Welcome Back</h2>
        <p className="offline-flavour">
          "While you were away, the heavens continued to nourish your foundation."
        </p>

        <div className="offline-amount">
          +{amount.toLocaleString()} Qi
        </div>

        <div className="offline-actions">
          <button className="save-btn" onClick={onCollect}>
            Collect
          </button>

          {onDoubleCollect && (
            <button className="ad-reward-btn offline-double-btn" onClick={onDoubleCollect}>
              ✦ Watch Ad — Collect ×2
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OfflineEarningsModal;
