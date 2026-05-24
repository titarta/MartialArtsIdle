import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { QI_SPARK_BY_ID, SPARK_COPY } from '../data/qiSparks';

const BASE = import.meta.env.BASE_URL;
const MODAL_ID = 'active-buffs';

/**
 * ActiveBuffsChip
 *
 * TopBar surface for ALL currently-active temporary buffs, regardless
 * of source. Replaces two older parallel chips (.topbar-buff-chip on
 * the TopBar and .home-sparks-chip on the Home screen) so the player
 * sees every running buff in ONE place across every screen.
 *
 * Two data sources are merged into a single normalised list of
 * { key, name, icon, expiresAt, total } entries:
 *
 *   1. Timed Qi Sparks (qiSparks.activeSparks filtered to entries
 *      with a live expiresAt). This already includes transient
 *      mechanic-tier procs (Divine Qi T5's +25% qi/s for 20s,
 *      Pattern Click T5's x1.5 qi/s for 20s, etc.) because those
 *      effects materialise as timed spark instances in the same
 *      activeSparks pool. No extra plumbing needed there.
 *
 *   2. Paid shop timed buffs (shopInventory.activeBuffs). Each
 *      entry already carries item + expiresAtMs + effect.durationMs.
 *
 * To add a future source, normalise it into the same five-field
 * shape inside the merge below. Component stays source-agnostic.
 *
 * Hidden entirely (returns null) when nothing is buffing the player.
 * Tap opens a portal modal popover listing each buff with its own
 * countdown bar; the footer routes to Cultivation > Sparks where the
 * canonical permanent + legendary build view lives.
 */
function BuffIcon({ icon, fallback = '✦' }) {
  const ic = icon ?? fallback;
  if (typeof ic === 'string' && ic.startsWith('/')) {
    return (
      <img
        className="abp-row-icon-img"
        src={`${BASE}${ic.replace(/^\//, '')}`}
        alt=""
        draggable={false}
      />
    );
  }
  return <span className="abp-row-icon-emoji" aria-hidden="true">{ic}</span>;
}

function ActiveBuffsChip({ activeSparks, activeBuffs }) {
  const [open, setOpen] = useState(false);
  // Single 250ms tick drives chip countdown text AND popover bar fills.
  const [now, setNow] = useState(() => Date.now());

  const buffs = useMemo(() => {
    const t = now;
    const sparkEntries = (activeSparks ?? [])
      .filter(s => s?.expiresAt && s.expiresAt > t)
      .map(s => {
        const card = QI_SPARK_BY_ID[s.sparkId];
        const copy = SPARK_COPY[s.sparkId];
        return {
          key:       `spark:${s.instanceId}`,
          name:      card?.name ?? 'Buff',
          icon:      copy?.icon ?? '✦',
          expiresAt: s.expiresAt,
          total:     card?.duration ?? Math.max(1, s.expiresAt - t),
        };
      });
    const shopEntries = (activeBuffs ?? [])
      .filter(b => b?.expiresAtMs && b.expiresAtMs > t)
      .map(b => ({
        key:       `shop:${b.id}`,
        name:      b.item?.name ?? 'Buff',
        icon:      b.item?.icon ?? '✦',
        expiresAt: b.expiresAtMs,
        total:     b.item?.effect?.durationMs ?? Math.max(1, b.expiresAtMs - t),
      }));
    return [...sparkEntries, ...shopEntries].sort((a, b) => a.expiresAt - b.expiresAt);
  }, [activeSparks, activeBuffs, now]);

  // Tick only while something is buffing. Stops the timer when the
  // pool is empty so we don't burn cycles in the common idle case.
  const hasAny = buffs.length > 0;
  useEffect(() => {
    if (!hasAny) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [hasAny]);

  // ESC closes the popover.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Close when any other modal announces itself via the app-wide bus.
  useEffect(() => {
    const handler = (e) => { if (e.detail?.id !== MODAL_ID) setOpen(false); };
    window.addEventListener('mai:modal-opened', handler);
    return () => window.removeEventListener('mai:modal-opened', handler);
  }, []);

  // Auto-close when the last buff expires while the popover is open.
  useEffect(() => {
    if (!hasAny) setOpen(false);
  }, [hasAny]);

  if (!hasAny) return null;

  const soonest = buffs[0].expiresAt;
  const chipTimer = Math.max(0, Math.ceil((soonest - now) / 1000));
  const count = buffs.length;
  const isUrgent = chipTimer <= 10;

  const handleOpen = () => {
    window.dispatchEvent(new CustomEvent('mai:modal-opened', { detail: { id: MODAL_ID } }));
    setOpen(true);
  };

  const handleViewAll = () => {
    setOpen(false);
    // App.jsx listens and routes to Cultivation > Sparks tab. The link
    // is named "View all sparks" because that tab is the canonical
    // permanent + legendary build view; shop buffs are short-lived and
    // do not have a separate detail surface to deep-link to.
    try { window.dispatchEvent(new CustomEvent('mai:nav-sparks')); } catch {}
  };

  return (
    <>
      <button
        type="button"
        className={`tb-buffs-chip${isUrgent ? ' tb-buffs-chip-urgent' : ''}`}
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${count} active ${count === 1 ? 'buff' : 'buffs'}, tap to view`}
        title="Active buffs"
      >
        <span className="tb-buffs-chip-icon" aria-hidden="true">✦</span>
        <span className="tb-buffs-chip-count">{count}</span>
        <span className="tb-buffs-chip-sep" aria-hidden="true">·</span>
        <span className="tb-buffs-chip-timer">{chipTimer}s</span>
      </button>

      {open && createPortal(
        <div
          className="modal-overlay abp-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Active temporary buffs"
          onClick={() => setOpen(false)}
        >
          <div className="abp-popover" onClick={(e) => e.stopPropagation()}>
            <header className="abp-popover-header">
              <span className="abp-popover-title">Active buffs</span>
              <span className="abp-popover-count">{count}</span>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >✕</button>
            </header>

            <ul className="abp-popover-list">
              {buffs.map((b) => {
                const remainingMs = Math.max(0, b.expiresAt - now);
                const progress = Math.max(0, Math.min(1, remainingMs / b.total));
                const secsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
                const rowUrgent = secsLeft < 10;
                return (
                  <li key={b.key} className={`abp-row${rowUrgent ? ' abp-row-urgent' : ''}`}>
                    <div className="abp-row-icon">
                      <BuffIcon icon={b.icon} />
                    </div>
                    <div className="abp-row-body">
                      <div className="abp-row-name">{b.name}</div>
                      <div className="abp-row-bar">
                        <div className="abp-row-bar-fill" style={{ '--p': progress }} />
                      </div>
                    </div>
                    <div className="abp-row-timer">{secsLeft}s</div>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              className="abp-popover-link"
              onClick={handleViewAll}
            >
              View all sparks <span className="abp-arrow">→</span>
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export default ActiveBuffsChip;
