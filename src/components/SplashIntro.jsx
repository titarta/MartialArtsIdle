/**
 * SplashIntro — "The Long Road" cold open.
 *
 * The splash IS the game's painted world. home.png (the cultivation hall
 * with mountains visible through its central archway) sits as the backdrop,
 * heavily vignetted so the archway opening becomes the focal point. Three
 * brushed marks compose over it:
 *   1. 道 — large vermilion seal in the archway sky (the dao)
 *   2. Title.png — suspended in the archway with a warm gold backlight
 *   3. A small hooded silhouette — the player standing at the threshold,
 *      with a thin shaft of qi rising from his crown
 *
 * No frame, no particles, no competing game-sprite assets. The painting
 * carries atmosphere; the silhouettes carry meaning.
 *
 * Lifecycle:
 *   'enter' → 'leave' (520 ms flash + scale-out) → unmount
 *   Dismiss on pointerdown / keydown / 8 s auto-timeout. The dismiss
 *   gesture doubles as AudioManager.unlock() so the cultivation BGM
 *   (buffered at boot) starts in sync with the white flash.
 */
import { useEffect, useRef, useState } from 'react';
import { AudioManager } from '../audio';
import './splashIntro.css';

const BASE = import.meta.env.BASE_URL;
const AUTO_DISMISS_MS = 8000;
const LEAVE_MS        = 520;

/**
 * Hooded cultivator silhouette, facing the archway (back to camera). Single
 * SVG path — no sprite dependency, scales perfectly at any size, and reads
 * as "the player" rather than "this specific NPC sprite". The silhouette
 * tech ties cleanly into the painted background because pure-black shapes
 * always sit confidently against any backdrop.
 */
function CultivatorSilhouette() {
  return (
    <svg viewBox="0 0 50 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        fill="#020207"
        d="
          M25 6
          C 21 6, 19 9, 19 13
          C 19 15, 19.5 17, 20.5 18.5
          L 17 22
          C 14 24, 12 28, 12 32
          L 12 44
          C 12 46, 11 47.5, 10 49
          L 6  58
          C 5  60, 5  62, 6  64
          L 8  72
          L 6  88
          L 17 88
          L 19 76
          L 20 64
          L 21 60
          L 21 56
          L 29 56
          L 29 60
          L 30 64
          L 31 76
          L 33 88
          L 44 88
          L 42 72
          L 44 64
          C 45 62, 45 60, 44 58
          L 40 49
          C 39 47.5, 38 46, 38 44
          L 38 32
          C 38 28, 36 24, 33 22
          L 29.5 18.5
          C 30.5 17, 31 15, 31 13
          C 31  9, 29  6, 25 6
          Z
        "
      />
    </svg>
  );
}

export default function SplashIntro({ onDone }) {
  const [state, setState] = useState('enter');
  const armedRef = useRef(true);

  const dismiss = () => {
    if (!armedRef.current) return;
    armedRef.current = false;
    // The tap IS the audio-unlock gesture — the cultivation BGM was
    // requested by App.jsx at boot and is buffered behind this unlock.
    try { AudioManager.unlock(); } catch {}
    setState('leave');
    window.setTimeout(() => { onDone?.(); }, LEAVE_MS);
  };

  useEffect(() => {
    const autoT = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    const onKey = (e) => { if (!e.repeat) dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(autoT);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="mai-splash"
      data-state={state}
      role="dialog"
      aria-label="The Long Road to Heaven — press to begin"
      onPointerDown={dismiss}
      style={{ '--mai-splash-bg': `url(${BASE}backgrounds/home.png)` }}
    >
      <div className="mai-splash__world" aria-hidden="true" />
      <div className="mai-splash__vignette" aria-hidden="true" />
      <div className="mai-splash__shroud" aria-hidden="true" />

      <div className="mai-splash__stage">
        <div className="mai-splash__glyph" aria-hidden="true">道</div>

        <div className="mai-splash__title">
          <img
            src={`${BASE}Title.png`}
            alt="The Long Road to Heaven"
            draggable={false}
          />
          <div className="mai-splash__title-shimmer" aria-hidden="true" />
        </div>

        <div className="mai-splash__silhouette" aria-hidden="true">
          <CultivatorSilhouette />
        </div>

        <div className="mai-splash__prompt">Press to Begin</div>
      </div>

      <div className="mai-splash__flash" aria-hidden="true" />
    </div>
  );
}
