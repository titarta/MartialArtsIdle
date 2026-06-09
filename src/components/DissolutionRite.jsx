/**
 * DissolutionRite — the cinematic at the moment of actual reincarnation.
 *
 * The intro Severing Rite is SHARP (gong, white flash, fast wheel, life
 * growing). THIS rite is SOFT: it is the moment the cultivator's current
 * life lets go. Realm, qi, producers, crystal, all dissolve.
 *
 * Metaphor: a jade-gold lotus blooms at the centre over a translucent
 * 寂 (jì, "stillness") calligraphy seal. The cultivator's life-essence
 * is the golden core; the eight petals are the attachments that bound
 * them to this realm. At the bell, the petals detach one by one and
 * drift upward as embers. Only the core remains. It streams downward
 * into the karma SEED — the one thing that survives the wheel. A warm
 * dawn blooms outward as the page reloads.
 *
 * Beats (≈4.0s total):
 *   0     ms  void washes in; star bokeh + brass sutra seam at top
 *   300   ms  lotus blooms (core + 8 jade petals with inner gold light)
 *   1000  ms  whisper: "<realm> returns to the wheel" with 歸 glyph
 *   1300  ms  heartbeat 1 — core pulses, petals brighten
 *   1700  ms  heartbeat 2 — softer
 *   2100  ms  THE BELL — soft chime + 寂 seal blooms behind the lotus
 *   2300  ms  petals detach (8 × 75ms stagger: top first, sides, bottom)
 *   2300  ms  ember-motes rise from each petal as it lets go
 *   3000  ms  the core dims, streams down to the seed position
 *   3300  ms  karma SEED materialises (ui/karma.png — same as Eternal Tree)
 *   3500  ms  DAWN warm gold blooms outward across the screen
 *   3600  ms  whiteout begins (so the reload happens under a clean wash)
 *   4000  ms  onComplete → handleReincarnate → wipe + page reload
 *
 * Reduced-motion users skip the cinematic entirely.
 *
 * STUCK-RITE BUG (fixed 2026-06-09)
 * --------------------------------
 * Before this rev, the useEffect depended on `onComplete`. App.jsx passes
 * an inline arrow there, and the cultivation tick re-renders App at 1Hz,
 * so onComplete's identity changed every second. The effect cleanup
 * cleared all four setTimeouts before they could fire. Result: the
 * cinematic never bell-tolled, never bloomed dawn, never advanced.
 * Pattern bug also caused the bell SFX to be repeatedly rescheduled — if
 * the timing happened to align with a brief unmount/remount in dev, the
 * player heard click-like chime echoes ("phantom button sounds"). Fixed
 * by stashing onComplete in a ref and running the effect once on mount.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AudioManager } from '../audio';
import './dissolutionRite.css';

const BASE = import.meta.env.BASE_URL;

const TOTAL_MS  = 4000;
const BELL_MS   = 2100;
const DAWN_MS   = 3500;
// Whiteout begins 400ms before onComplete fires so the warm wash is
// already at ~70% by the time the page reload is invoked. The whiteout
// HOLDS through the browser's unavoidable reload delay (~100-1500ms),
// masking the otherwise frozen "dawn end-state" frame.
const FINISH_MS = 3600;

// Petal detach order — top first (12 o'clock), then the upper sides,
// then the lower sides, then bottom. Reads as "the rooted things let
// go LAST", which feels right for the release metaphor.
//
// Petals are numbered clockwise from top:
//   0=top   1=NE  2=E   3=SE   4=bottom   5=SW   6=W   7=NW
const PETAL_DETACH_ORDER = [0, 7, 1, 6, 2, 5, 3, 4];
const PETAL_STAGGER_MS = 75;

const PETALS = Array.from({ length: 8 }, (_, i) => ({
  index: i,
  angleDeg: i * 45,
  // detachStartMs is RELATIVE to bloom start (300ms). Used for both the
  // petal's own detach animation and the ember timing per petal.
  detachStartMs: 2000 + PETAL_DETACH_ORDER.indexOf(i) * PETAL_STAGGER_MS,
}));

// Embers — 4 per petal, scattered along the petal's outward direction.
// Deterministic so each reincarnation plays the same. The (--dx, --dy)
// pair sets the rise vector in the petal's local axis; combined with
// the petal's rotation it traces a believable upward drift.
const EMBERS_PER_PETAL = 4;
const EMBERS = PETALS.flatMap((p) => {
  // Petal points in direction (angleDeg - 90deg) in standard math.
  // Convert to screen coordinates (Y inverted).
  const a = (p.angleDeg - 90) * Math.PI / 180;
  return Array.from({ length: EMBERS_PER_PETAL }, (_, j) => {
    const jitter = ((j * 13 + p.index * 7) % 11) - 5;     // -5..+5 deg
    const ja = a + jitter * Math.PI / 180;
    const startR = 16 + ((j * 5 + p.index * 3) % 7);      // 16..22 (% of vmin)
    // Start position relative to lotus centre (50%, 46%):
    const left = 50 + Math.cos(ja) * startR * 0.6;
    const top  = 46 + Math.sin(ja) * startR * 0.6;
    // Drift vector — bias upward, swing out radially.
    const driftR = 60 + ((j * 11 + p.index * 9) % 18);    // 60..78 vh upward bias
    const dx = Math.cos(ja) * 12;                         // small horizontal swing
    const dy = -Math.abs(Math.sin(ja)) * 14 - driftR * 0.5;
    return {
      key:      `${p.index}-${j}`,
      left:     `${left.toFixed(2)}%`,
      top:      `${top.toFixed(2)}%`,
      delay:    (p.detachStartMs + j * 80) / 1000,        // seconds
      duration: (1.7 + ((j * 0.11 + p.index * 0.07) % 0.7)).toFixed(2),
      dx:       `${dx.toFixed(1)}vmin`,
      dy:       `${dy.toFixed(1)}vh`,
    };
  });
});

// Star bokeh — soft scattered stars in the void. Deterministic.
const BOKEH = Array.from({ length: 36 }, (_, i) => {
  const r = (i * 1103515245 + 12345) >>> 0; // deterministic pseudo-random
  return {
    left:  `${((r >>> 0) % 10000) / 100}%`,
    top:   `${((r >>> 7) % 10000) / 100}%`,
    delay: `${(((r >>> 11) % 400) / 100).toFixed(2)}s`,
    size:  ((r >>> 17) & 3) === 0 ? 'dr-star-bri' : '',
  };
});

export default function DissolutionRite({ onComplete, realmName }) {
  const { t } = useTranslation('ui');
  // Latest onComplete in a ref so the timer effect can run once on mount
  // and still call the freshest callback. App.jsx's cultivation tick
  // re-renders this component at 1Hz with a new inline `onComplete`
  // arrow; without the ref the effect re-runs every tick and clears its
  // own setTimeouts before they can fire — the rite never advances. See
  // the long comment at the top of the file.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const [finishing, setFinishing] = useState(false);
  const whisper = useMemo(() => (
    realmName ? t('reincarnationModal.whisperReturns', { realm: realmName }) : t('reincarnationModal.whisperFallback')
  ), [realmName, t]);

  useEffect(() => {
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      const t = setTimeout(() => onCompleteRef.current?.(), 80);
      return () => clearTimeout(t);
    }

    // Bell — soft single tone at the moment of letting go. The try/catch
    // around playSfx is essential: AudioManager throws if the page hasn't
    // had a user gesture yet (rare here because the player already
    // tapped Reincarnate, but defensive).
    const bellTimer = setTimeout(() => {
      try { AudioManager.playSfx('crystal_level_up'); } catch {}
      try { navigator.vibrate?.(45); } catch {}
    }, BELL_MS);

    // Dawn — softer tone as the new light blooms.
    const dawnTimer = setTimeout(() => {
      try { AudioManager.playSfx('crystal_tap_max'); } catch {}
    }, DAWN_MS);

    // Warm whiteout begins 400ms before onComplete so the page reload
    // happens under a clean wash, not a frozen dawn frame.
    const finishTimer = setTimeout(() => setFinishing(true), FINISH_MS);

    // Auto-advance to the actual wipe + reload.
    const endTimer = setTimeout(() => onCompleteRef.current?.(), TOTAL_MS);

    return () => {
      clearTimeout(bellTimer);
      clearTimeout(dawnTimer);
      clearTimeout(finishTimer);
      clearTimeout(endTimer);
    };
  }, []); // run-once on mount; deliberate

  return createPortal(
    <div
      className={`dr-overlay${finishing ? ' dr-finishing' : ''}`}
      role="presentation"
      aria-hidden="true"
    >
      {/* Void backdrop fades in over the Eternal Tree */}
      <div className="dr-void" />

      {/* Brass hairline at the top edge — same sutra-seam vocabulary as
          the Crucible and Eternal Tree, so the rite reads as a continuation
          of sect ceremony rather than a separate aesthetic. */}
      <div className="dr-sutra" aria-hidden="true" />

      {/* Star bokeh — soft scattered stars to give the void depth */}
      <div className="dr-bokeh" aria-hidden="true">
        {BOKEH.map((b, i) => (
          <span
            key={i}
            className={`dr-star ${b.size}`}
            style={{ left: b.left, top: b.top, animationDelay: b.delay }}
          />
        ))}
      </div>

      {/* The 寂 (stillness) seal — large translucent calligraphy that ghosts
          in behind the lotus at the bell moment. Reads as the meditation
          word the cultivator is letting go INTO. */}
      <div className="dr-seal" aria-hidden="true">寂</div>

      {/* The lotus — golden core surrounded by 8 jade-gold petals. SVG so
          the petals can rotate cleanly around the centre and detach with
          a CSS animation. Each <g> carries its own --angle + --detach
          CSS variables, picked up by the keyframes. */}
      <div className="dr-lotus">
        <svg
          viewBox="0 0 400 400"
          className="dr-lotus-svg"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="dr-core-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#fff5dc" />
              <stop offset="45%"  stopColor="#ffe6b0" />
              <stop offset="100%" stopColor="rgba(220, 138, 68, 0)" />
            </radialGradient>
            <linearGradient id="dr-petal-grad" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%"   stopColor="#a9e2c6" stopOpacity="0.95" />
              <stop offset="55%"  stopColor="#6ec896" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#2f6a48" stopOpacity="0.65" />
            </linearGradient>
            <linearGradient id="dr-petal-inner" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%"   stopColor="#fff0b8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffc34f" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* 8 outer petals. Each is a teardrop pointing UP from (200,200)
              to (200,70). The whole <g> rotates around the centre by
              petalIndex × 45deg, so they fan around like a real lotus. */}
          {PETALS.map((p) => (
            <g
              key={p.index}
              className="dr-lotus-petal"
              style={{
                ['--angle']: `${p.angleDeg}deg`,
                ['--detach']: `${p.detachStartMs}ms`,
              }}
            >
              <path
                className="dr-lotus-petal-outer"
                d="M200 200 C 168 150, 168 100, 200 60 C 232 100, 232 150, 200 200 Z"
              />
              <path
                className="dr-lotus-petal-inner"
                d="M200 200 C 184 158, 184 118, 200 88 C 216 118, 216 158, 200 200 Z"
              />
            </g>
          ))}

          {/* Inner core — the cultivator's life-essence. Holds steady
              while the petals detach, then collapses + streams down to
              the seed position. */}
          <circle className="dr-lotus-core-halo" cx="200" cy="200" r="64" fill="url(#dr-core-grad)" />
          <circle className="dr-lotus-core"      cx="200" cy="200" r="22" />
        </svg>
      </div>

      {/* Whisper — the realm name returns to the wheel */}
      <div className="dr-whisper">
        <span className="dr-whisper-glyph" aria-hidden="true">歸</span>
        <span className="dr-whisper-text">{whisper}</span>
      </div>

      {/* Embers — rise from each petal as it detaches */}
      <div className="dr-embers" aria-hidden="true">
        {EMBERS.map((e) => (
          <span
            key={e.key}
            className="dr-ember"
            style={{
              left: e.left, top: e.top,
              ['--dx']: e.dx,
              ['--dy']: e.dy,
              animationDelay: `${e.delay}s`,
              animationDuration: `${e.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Karma seed — what survives. Uses ui/karma.png so the player
          recognises it as "oh, that's karma" without being told. Lands
          right where the lotus core streamed down to. */}
      <div className="dr-seed">
        <span className="dr-seed-halo" />
        <img
          className="dr-seed-icon"
          src={`${BASE}ui/karma.png`}
          alt=""
          draggable="false"
          aria-hidden="true"
        />
      </div>

      {/* Dawn — warm gold light blooms outward, covers everything */}
      <div className="dr-dawn" />
    </div>,
    document.body,
  );
}
