import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { QI_SPARK_BY_ID, SPARK_COPY } from '../data/qiSparks';

const BASE = import.meta.env.BASE_URL;
const MODAL_ID = 'active-buffs';

/**
 * Format a buff countdown as a clock string.
 *
 * Always returns H:MM:SS (or HH:MM:SS for 10h+) so the chip cadence
 * stays consistent: every tick the seconds digit changes, every 60
 * ticks the minutes change, etc. Avoiding the "Ns vs M:SS vs H:MM:SS"
 * format-switch keeps the chip width stable too (no-movement rule).
 */
function fmtBuffClock(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

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
 * countdown bar. This popover is the ONLY place temporary buffs are
 * surfaced; the Cultivation > Sparks tab no longer lists them since
 * the chip already covers that surface comprehensively.
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

function ActiveBuffsChip({ activeSparks, activeBuffs, furnaceBuffs }) {
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
    // Furnace timed pill buffs (added 2026-06-09). Same shape as the other
    // two sources after normalisation. The chip surfaces every alchemy
    // buff alongside the others — single source of truth for "what's
    // currently boosting me."
    const furnaceEntries = (furnaceBuffs ?? [])
      .filter(b => b?.expiresAt && b.expiresAt > t)
      .map(b => ({
        key:       `furnace:${b.pillId}:${b.consumedAt}`,
        name:      b.name ?? 'Pill',
        icon:      '丹', // Cinzel/Ma Shan Zheng calligraphy glyph for "pill"
        expiresAt: b.expiresAt,
        total:     b.durationMs ?? Math.max(1, b.expiresAt - t),
      }));
    return [...sparkEntries, ...shopEntries, ...furnaceEntries].sort((a, b) => a.expiresAt - b.expiresAt);
  }, [activeSparks, activeBuffs, furnaceBuffs, now]);

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
        <span className="tb-buffs-chip-timer">{fmtBuffClock(chipTimer)}</span>
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
                // Source prefix on the key drives the v10 coloured-stripe
                // on the left edge of the row (spark / shop / ad / etc.).
                const source = String(b.key).split(':')[0];
                return (
                  <li
                    key={b.key}
                    data-source={source}
                    className={`abp-row${rowUrgent ? ' abp-row-urgent' : ''}`}
                  >
                    <div className="abp-row-icon">
                      <BuffIcon icon={b.icon} />
                    </div>
                    <div className="abp-row-body">
                      <div className="abp-row-name">{b.name}</div>
                      <div className="abp-row-bar">
                        <div className="abp-row-bar-fill" style={{ '--p': progress }} />
                      </div>
                    </div>
                    <div className="abp-row-timer">{fmtBuffClock(secsLeft)}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export default ActiveBuffsChip;
