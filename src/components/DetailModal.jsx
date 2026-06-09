import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

/**
 * DetailModal — centered modal primitive used by Crystal Detail and
 * Producer Detail (the two "inspector" surfaces).
 *
 * Why a centered modal and not a bottom sheet:
 * the earlier sheet implementation used a partial 70vh slide-up with a
 * decorative grab handle, but swipe-to-dismiss was never wired up. That
 * promised draggability the surface didn't deliver, and the 70vh cap
 * clipped the producer detail content on shorter viewports without any
 * scroll affordance to hint that the rest was reachable. Centered modal
 * sizes to content, has a real close button, and never overlaps the
 * navbar (the shared .modal-overlay padding reserves nav + safe-area).
 *
 * - Dismisses on backdrop tap.
 * - Dismisses on Escape.
 * - Locks body scroll while open.
 * - Mounted via portal to document.body so screen z-index buckets
 *   (.home-screen z:1, .et-screen z:1, etc.) can't trap the overlay
 *   below the navbar.
 */
export default function DetailModal({ open, onClose, children, className = '', ariaLabel }) {
  const { t } = useTranslation('ui');
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

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? t('common.details')}
      onClick={onClose}
    >
      <div
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
