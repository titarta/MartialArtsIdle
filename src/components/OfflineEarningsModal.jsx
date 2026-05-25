import { useTranslation } from 'react-i18next';
import { fmt } from '../utils/format';

// Duration chip hides below this threshold. Below 15 min, "6m of Quiet
// Practice" reads as a diminished reward; the hero qi number + CTAs still
// stand on their own without it. See _design/offline-earnings-pass/notes.md.
const DURATION_VISIBILITY_THRESHOLD_MS = 15 * 60 * 1000;

/**
 * Format an away-duration in ms as "Xh Ym" or "Ym". Used inside the
 * duration chip on the offline-earnings modal.
 *
 *  – 3h 22m for any value >= 1h
 *  – 47m   for values under 1h
 */
function formatAwayDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * "Emergence from Seclusion" — shown once when the player returns after
 * 5+ minutes away. Stages a small ceremony around the qi number rather
 * than a generic notification: dark veil → lacquer scroll → 修 calligraphy
 * watermark → hero qi number with rising ember motes → ranked CTAs.
 *
 * Collect (gold, full-width) is the dominant primary; Watch ×2 (jade pill)
 * is the deliberately-secondary doubler. When onDoubleCollect is null the
 * Watch ×2 button is omitted entirely (no broken button).
 */
function OfflineEarningsModal({ amount, durationMs = 0, onCollect, onDoubleCollect }) {
  const { t } = useTranslation('ui');

  const showDuration = durationMs >= DURATION_VISIBILITY_THRESHOLD_MS;
  const durationText = showDuration ? formatAwayDuration(durationMs) : '';

  return (
    <div className="offline-stage">
      <div className="offline-scroll">

        <div className="offline-eyebrow">
          {t('offlineModal.eyebrow', { defaultValue: 'Returned from Seclusion' })}
        </div>
        <div className="offline-welcome">
          {t('offlineModal.title', { defaultValue: 'Welcome Back, Cultivator' })}
        </div>
        <div className="offline-rule" />

        {showDuration && (
          <div className="offline-duration">
            <span className="offline-duration-mark" aria-hidden="true">时</span>
            <span className="offline-duration-text">
              <strong>{durationText}</strong>
              {' '}
              {t('offlineModal.durationSuffix', { defaultValue: 'of Quiet Practice' })}
            </span>
          </div>
        )}

        <div className="offline-hero">
          <div className="offline-embers" aria-hidden="true">
            <span /><span /><span /><span /><span />
          </div>
          <div className="offline-hero-label">
            {t('offlineModal.qiLabel', { defaultValue: 'Qi Gathered' })}
          </div>
          <div className="offline-hero-number">
            <span className="offline-hero-plus">+</span>{fmt(amount)}
          </div>
          <div className="offline-hero-unit">
            {t('offlineModal.qiUnit', { defaultValue: 'Qi' })}
          </div>
        </div>

        <div className="offline-actions">
          <button
            type="button"
            className="offline-btn-primary"
            onClick={onCollect}
          >
            <span className="offline-btn-glyph" aria-hidden="true">收</span>
            {t('offlineModal.collect', { defaultValue: 'Collect' })}
          </button>

          {onDoubleCollect && (
            <button
              type="button"
              className="offline-btn-secondary"
              onClick={onDoubleCollect}
            >
              <span className="offline-ad-mark" aria-hidden="true">AD</span>
              {t('offlineModal.watch', { defaultValue: 'Watch' })}
              <span className="offline-mult-dot" aria-hidden="true">·</span>
              <span className="offline-mult">×2</span>
            </button>
          )}
        </div>

        <div className="offline-footer-note">
          {t('offlineModal.footerNote', {
            defaultValue: 'Your sect cultivated in silence while you rested.',
          })}
        </div>

      </div>
    </div>
  );
}

export default OfflineEarningsModal;
