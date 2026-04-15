import { useTranslation } from 'react-i18next';

/**
 * Shown once when the player returns after 5+ minutes away.
 * Offers normal collect or doubled collect via rewarded ad.
 */
function OfflineEarningsModal({ amount, onCollect, onDoubleCollect }) {
  const { t } = useTranslation('ui');

  return (
    <div className="modal-overlay">
      <div className="modal-content offline-modal">
        <h2 className="modal-title">{t('offlineModal.title')}</h2>
        <p className="offline-flavour">
          "{t('offlineModal.message')}"
        </p>

        <div className="offline-amount">
          +{amount.toLocaleString()} Qi
        </div>

        <div className="offline-actions">
          <button className="save-btn" onClick={onCollect}>
            {t('offlineModal.collect')}
          </button>

          {onDoubleCollect && (
            <button className="ad-reward-btn offline-double-btn" onClick={onDoubleCollect}>
              {t('offlineModal.collectDouble')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OfflineEarningsModal;
