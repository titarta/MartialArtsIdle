/**
 * SectMergeSheet — full-screen overlay that hosts the SectMerge promotion grid.
 *
 * Mirrors MiniGameMode's overlay/scrim/frame structure so the chrome feels
 * consistent with the existing minigame stack, but with its own kicker and
 * glyph so the player knows this is the persistent Roster — not a one-shot
 * session game.
 *
 * The grid itself reads state from DiscipleMergeContext (provided at App.jsx
 * level), so the sheet is purely a presentation shell.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import SectMerge from './minigames/SectMerge';
import './minigames/minigames.css';

export default function SectMergeSheet({ onClose }) {
  useEffect(() => {
    document.body.classList.add('sheet-open');
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('sheet-open');
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="mg-overlay" role="dialog" aria-modal="true" aria-label="The Roster · disciple promotions">
      <div className="mg-scrim" aria-hidden="true" onClick={onClose} />
      <div className="mg-frame">
        <header className="mg-header">
          <div className="mg-head-titles">
            <div className="mg-kicker">Disciple Promotions</div>
            <h2 className="mg-title">The Roster</h2>
          </div>
          <div className="mg-glyph" aria-hidden="true">升</div>
          <button type="button" className="mg-close" onClick={onClose} aria-label="Close roster">✕</button>
        </header>
        <div className="mg-stage">
          <SectMerge />
        </div>
      </div>
    </div>,
    document.body
  );
}
