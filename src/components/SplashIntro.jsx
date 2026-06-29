/**
 * SplashIntro — wuxia cold-open shown on every cold launch.
 *
 * One full-screen overlay, ~3.2 s of choreography, then a tap-to-begin
 * prompt persists. Any pointer / key / 8 s auto-timeout dismisses with a
 * white flash + scale-out. The dismiss gesture doubles as the audio-unlock
 * event the browser requires before BGM can play, so the cultivation track
 * (already requested at boot, buffered behind the unlock gate) kicks in
 * the instant the splash leaves.
 *
 * State machine:
 *   'enter'  → animations playing
 *   'leave'  → flash + fade-out (480 ms)
 *   unmount  → onDone() fires, App reveals
 *
 * Reduced-motion users keep the composition but lose the choreography
 * (handled in splashIntro.css).
 */
import { useEffect, useRef, useState, useMemo } from 'react';
import { AudioManager } from '../audio';
import './splashIntro.css';

const BASE = import.meta.env.BASE_URL;

/** Choreography total before "tap" becomes the meaningful action. */
const SHOW_PROMPT_AT_MS = 2800;
/** Auto-dismiss if the player never interacts. Idle players want to land
 *  in the home screen so they can collect offline earnings — don't strand. */
const AUTO_DISMISS_MS  = 8000;
/** Match the leave animation length in splashIntro.css. */
const LEAVE_MS = 480;

function buildParticles(count) {
  // Pre-compute particle styles ONCE — keeps the React tree static and lets
  // CSS handle the per-particle drift. Pairs sapphire / gold so the column
  // shares the game's qi palette (--qi-aura-core variants).
  const out = [];
  for (let i = 0; i < count; i++) {
    const gold = i % 3 === 0;
    const size = 2 + Math.random() * 3;          // 2-5 px
    const dur  = 6 + Math.random() * 6;          // 6-12 s
    const delay = -Math.random() * dur;          // negative → mid-cycle start
    const left = Math.random() * 100;            // anywhere across width
    const drift = (Math.random() * 60 - 30) | 0; // -30 to +30 px lateral
    const peak = 0.45 + Math.random() * 0.45;    // 0.45-0.90 opacity
    out.push({
      '--mai-p-size':  `${size.toFixed(1)}px`,
      '--mai-p-dur':   `${dur.toFixed(2)}s`,
      '--mai-p-delay': `${delay.toFixed(2)}s`,
      '--mai-p-left':  `${left.toFixed(1)}%`,
      '--mai-p-drift': `${drift}px`,
      '--mai-p-peak':  peak.toFixed(2),
      '--mai-p-color': gold ? 'rgba(255, 220, 130, 0.85)' : 'rgba(120, 200, 255, 0.85)',
      '--mai-p-glow':  gold ? 'rgba(255, 200, 90, 0.6)'   : 'rgba(120, 200, 255, 0.6)',
    });
  }
  return out;
}

export default function SplashIntro({ onDone }) {
  const [state, setState] = useState('enter');
  const armedRef = useRef(true);
  const particles = useMemo(() => buildParticles(42), []);

  const dismiss = () => {
    if (!armedRef.current) return;
    armedRef.current = false;
    // The tap IS the audio-unlock gesture — call unlock so the BGM that
    // App.jsx requested at boot (and buffered) starts on the same frame
    // the splash starts fading out.
    try { AudioManager.unlock(); } catch {}
    setState('leave');
    window.setTimeout(() => { onDone?.(); }, LEAVE_MS);
  };

  useEffect(() => {
    // Auto-dismiss safety net so an absent player isn't blocked.
    const autoT = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    const onKey = (e) => {
      // Any key dismisses — Escape/Enter/Space included.
      if (e.repeat) return;
      dismiss();
    };
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
    >
      <div className="mai-splash__frame">
        <div className="mai-splash__corner mai-splash__corner--tl">✦</div>
        <div className="mai-splash__corner mai-splash__corner--tr">✦</div>
        <div className="mai-splash__corner mai-splash__corner--bl">✦</div>
        <div className="mai-splash__corner mai-splash__corner--br">✦</div>

        <div className="mai-splash__particles" aria-hidden="true">
          {particles.map((style, i) => <span key={i} style={style} />)}
        </div>

        <div className="mai-splash__stage">
          <div className="mai-splash__glyph" aria-hidden="true">道</div>

          <div className="mai-splash__cultivator">
            <img
              src={`${BASE}sprites/cultivator/t5_saint_focused.png`}
              alt=""
              draggable={false}
            />
            <div className="mai-splash__crystal">
              <img
                src={`${BASE}crystals/crystal_5.png`}
                alt=""
                draggable={false}
              />
            </div>
            <div className="mai-splash__ring mai-splash__ring--1" />
            <div className="mai-splash__ring mai-splash__ring--2" />
            <div className="mai-splash__ring mai-splash__ring--3" />
          </div>

          <div className="mai-splash__logo">
            <img
              src={`${BASE}Title.png`}
              alt="The Long Road to Heaven"
              draggable={false}
            />
            <div className="mai-splash__logo-shimmer" aria-hidden="true" />
          </div>

          <div className="mai-splash__prompt">Press to Begin</div>
        </div>
      </div>

      <div className="mai-splash__flash" aria-hidden="true" />
    </div>
  );
}
