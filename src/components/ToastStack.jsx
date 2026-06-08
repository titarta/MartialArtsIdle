import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const MAX_VISIBLE      = 3;
const DEFAULT_DURATION = 4000;

/**
 * ToastStack — Sanctum "temple notice" toasts.
 *
 * Each toast is a brass-bordered dark-lacquer plaque with:
 *   . a vermillion wax-seal stamp on the left (Ma Shan Zheng glyph)
 *   . a small-caps brass kicker line and a cream message body
 *   . optional brass 'View' CTA and the unified modal-close X
 *   . peek cards stacked behind the top one, dimmer, slightly inset
 *
 * Data fields on each toast:
 *   - id            unique string
 *   - type          'unlock' | 'achievement' | 'info' (drives stamp tint)
 *   - kicker        small-caps label above the message (optional)
 *   - glyph         single CJK character for the stamp (defaults '印')
 *   - message       main body text
 *   - targetScreen  if set, renders the View CTA
 *   - targetParam   forwarded to onNavigate
 *   - duration      ms before auto-dismiss (default 4000)
 */
function ToastCard({ toast, isPeek, depth = 0, onDismiss, onNavigate }) {
  const { t } = useTranslation('ui');
  const glyph  = toast.glyph  ?? '印';
  const kicker = toast.kicker ?? null;
  const type   = toast.type   ?? 'info';

  function handleNavigate() {
    if (toast.targetScreen) onNavigate(toast.targetScreen, toast.targetParam ?? null);
    onDismiss(toast.id);
  }

  return (
    <div
      className={`toast-card${isPeek ? ' toast-peek' : ' toast-card-top'}`}
      data-toast-type={type}
      style={isPeek ? {
        position: 'absolute',
        top:     `${depth * 5}px`,
        left:    `${depth * 4}px`,
        right:   `${depth * 4}px`,
        zIndex:  MAX_VISIBLE - depth,
        opacity: 1 - depth * 0.25,
      } : undefined}
    >
      {/* Vermillion banner ribbon along the top edge - ceremonial accent. */}
      <span className="toast-ribbon" aria-hidden="true" />

      <div className="toast-stamp" aria-hidden="true">
        <span className="toast-stamp-glyph">{glyph}</span>
      </div>

      <div className="toast-body">
        {kicker && <div className="toast-kicker">{kicker}</div>}
        <div className="toast-message">{toast.message}</div>
      </div>

      {!isPeek && (
        <div className="toast-actions">
          {toast.targetScreen && (
            <button className="toast-go" onClick={handleNavigate}>
              <span className="toast-go-label">{t('toast.viewBtn')}</span>
              <span className="toast-go-arrow" aria-hidden="true">→</span>
            </button>
          )}
          <button
            className="modal-close toast-dismiss"
            onClick={() => onDismiss(toast.id)}
            aria-label={t('toast.dismissAriaLabel')}
          >✕</button>
        </div>
      )}
    </div>
  );
}

function ToastStack({ toasts, onDismiss, onNavigate }) {
  const { t } = useTranslation('ui');

  const visible  = toasts.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, toasts.length - MAX_VISIBLE);
  const top      = visible[0] ?? null;
  const topId    = top?.id ?? null;

  // Auto-dismiss the top toast after its duration. Resets on each new top
  // toast. MUST be declared before any early return so the hook count is the
  // same whether or not there are toasts — otherwise React throws "Rendered
  // more hooks than during the previous render" the moment a toast appears.
  useEffect(() => {
    if (!top) return undefined;
    const ms = top.duration ?? DEFAULT_DURATION;
    const timer = setTimeout(() => onDismiss(top.id), ms);
    return () => clearTimeout(timer);
  }, [topId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!toasts.length) return null;

  return (
    <div className="toast-stack">
      <div className="toast-stage">

        {/* Peek cards — absolute behind the top, slivers of brass-trim
            visible to communicate the queue. */}
        {visible.slice(1).map((toast, i) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            isPeek
            depth={i + 1}
            onDismiss={onDismiss}
            onNavigate={onNavigate}
          />
        ))}

        {/* Top card — in flow, defines stage height. */}
        <ToastCard
          toast={top}
          onDismiss={onDismiss}
          onNavigate={onNavigate}
        />

        {overflow > 0 && (
          <div className="toast-overflow">{t('toast.overflow', { n: overflow })}</div>
        )}
      </div>
    </div>
  );
}

export default ToastStack;
