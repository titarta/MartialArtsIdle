/**
 * LockTooltip — hover tooltip card for locked UI elements.
 * Parent must have `position: relative` and no `pointer-events: none`.
 *
 * position: 'above' (default) | 'below'
 */
function LockTooltip({ desc, hint, position = 'above' }) {
  if (!desc && !hint) return null;
  return (
    <div className={`lock-tooltip lock-tooltip-${position}`} role="tooltip">
      {desc && <div className="ltip-desc">{desc}</div>}
      {hint && (
        <div className="ltip-hint">
          <span className="ltip-lock" aria-hidden="true">🔒</span>
          {hint}
        </div>
      )}
    </div>
  );
}

export default LockTooltip;
