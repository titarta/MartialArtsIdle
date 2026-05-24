import { useEffect } from 'react';

/**
 * Bottom Sheet primitive — mobile-native inspector that slides up from the
 * bottom of the viewport and keeps the world visible behind a translucent
 * scrim. Used by Crystal Detail + Producer Detail (per nav-audit verdict:
 * those are inspectors over a world, not transactions, so they deserve a
 * sheet rather than a modal).
 *
 * - Dismisses on backdrop tap.
 * - Dismisses on Escape (keyboard / external trigger).
 * - Locks body scroll while open.
 * - Caller controls height via the `className` prop (defaults to ~70vh cap).
 * - Children render inside .sheet-body — they own padding/scroll.
 *
 * Swipe-to-dismiss is intentionally NOT implemented in v1; the backdrop tap
 * is the canonical dismiss action on mobile and the swipe handler is a polish
 * follow-up tracked in the nav-audit doc.
 */
export default function Sheet({ open, onClose, children, className = '', ariaLabel }) {
  // Body scroll lock — touchmove on the backdrop should not scroll the
  // page underneath. We add a class instead of inline style so multiple
  // sheets / modals don't fight (CSS uses `body:has(.sheet-overlay)` so
  // a stale lock from a torn-down sheet can never strand the body).
  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add('sheet-open');
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('sheet-open');
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="sheet-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? 'Sheet'}
      onClick={onClose}
    >
      <div
        className={`sheet${className ? ` ${className}` : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
