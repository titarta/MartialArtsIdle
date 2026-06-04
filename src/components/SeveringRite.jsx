/**
 * SeveringRite — the cinematic between confirming reincarnation and the
 * Eternal Tree screen opening.
 *
 * Plays as a single ~2.4 second ceremony, picking up the modal's
 * vocabulary so the confirmation and the rite read as one continuous
 * gesture:
 *
 *   0     ms  blackout (radial void) fades in
 *   200   ms  渡 (dù) seal materialises, cinnabar, with a pulsing halo
 *   1000  ms  THE GONG — bell SFX, haptic buzz, white flash, seal flares
 *   1100  ms  seal scales out + dissolves into motes
 *   1300  ms  the seed at the trunk base lights gold
 *   1400  ms  trunk draws itself upward (stroke-dashoffset)
 *   1800  ms  branches unfurl
 *   2020  ms  leaves bloom one by one in jade (tight staggers, 280ms each)
 *   2400  ms  onComplete → App swaps to 'rising' (cross-fade begins)
 *
 * Reduced-motion users skip the cinematic entirely (immediate
 * onComplete) — the rite is for those who chose to see it.
 *
 * SFX placeholder: crystal_level_up is reused as the gong stinger
 * until a bespoke severing bell is recorded.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AudioManager } from '../audio';
import './severingRite.css';

// Total cinematic duration (ms). onComplete fires at this mark, aligned
// so that the LAST leaf finishes blooming the same frame the fade begins —
// no perceptual idle hold between "tree complete" and "fade-out start".
const RITE_MS = 2400;
// The moment of severing — SFX + haptic + white flash all align here.
const GONG_MS = 1000;

function CinematicTree() {
  return (
    <svg viewBox="0 0 400 620" className="sr-tree-svg" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      {/* Glowing seed at trunk base — first thing to light when the tree begins */}
      <circle className="sr-tree-seed-glow" cx="200" cy="480" r="34" />
      <circle className="sr-tree-seed"      cx="200" cy="480" r="11" />

      {/* Trunk grows upward from the seed */}
      <path className="sr-tree-trunk" d="M200 480 L200 200" />

      {/* Roots descend after the trunk anchors */}
      <g className="sr-tree-roots">
        <path className="sr-tree-root" d="M200 480 C 178 510, 138 540, 96 590" />
        <path className="sr-tree-root" d="M200 480 C 222 510, 262 540, 304 590" />
        <path className="sr-tree-root" d="M200 480 L200 600" />
        <path className="sr-tree-root sr-tree-root-thin" d="M200 488 C 158 522, 108 562, 60 596" />
        <path className="sr-tree-root sr-tree-root-thin" d="M200 488 C 242 522, 292 562, 340 596" />
      </g>

      {/* Crown branches unfurl outward */}
      <g className="sr-tree-crown">
        <path className="sr-tree-branch" d="M200 215 C 132 165, 70 142, 24 92" />
        <path className="sr-tree-branch" d="M200 215 C 268 165, 330 142, 376 92" />
        <path className="sr-tree-branch" d="M200 248 C 140 220, 78 240, 32 226" />
        <path className="sr-tree-branch" d="M200 248 C 260 220, 322 240, 368 226" />
        <path className="sr-tree-branch sr-tree-branch-mid" d="M200 286 C 162 280, 116 300, 78 322" />
        <path className="sr-tree-branch sr-tree-branch-mid" d="M200 286 C 238 280, 284 300, 322 322" />
        <path className="sr-tree-branch sr-tree-branch-mid" d="M200 330 C 174 332, 148 348, 138 372" />
        <path className="sr-tree-branch sr-tree-branch-mid" d="M200 330 C 226 332, 252 348, 262 372" />
      </g>

      {/* Leaves bloom at the branch tips, jade-green, staggered */}
      <g className="sr-tree-leaves">
        <circle className="sr-tree-leaf"               cx="24"  cy="92"  r="8" />
        <circle className="sr-tree-leaf"               cx="376" cy="92"  r="8" />
        <circle className="sr-tree-leaf"               cx="32"  cy="226" r="6.5" />
        <circle className="sr-tree-leaf"               cx="368" cy="226" r="6.5" />
        <circle className="sr-tree-leaf sr-tree-leaf-small" cx="78"  cy="322" r="5" />
        <circle className="sr-tree-leaf sr-tree-leaf-small" cx="322" cy="322" r="5" />
        <circle className="sr-tree-leaf sr-tree-leaf-small" cx="138" cy="372" r="4.2" />
        <circle className="sr-tree-leaf sr-tree-leaf-small" cx="262" cy="372" r="4.2" />
        <circle className="sr-tree-leaf sr-tree-leaf-small" cx="80"  cy="148" r="4" />
        <circle className="sr-tree-leaf sr-tree-leaf-small" cx="320" cy="148" r="4" />
      </g>
    </svg>
  );
}

export default function SeveringRite({ onComplete, fading = false }) {
  useEffect(() => {
    // Honour reduced-motion: skip the rite entirely and advance to the tree.
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      const t = setTimeout(() => onComplete?.(), 80);
      return () => clearTimeout(t);
    }

    // The gong moment — bell SFX + haptic + flash. Aligned visually with
    // the seal's peak via CSS animation-delay.
    const gongTimer = setTimeout(() => {
      try { AudioManager.playSfx('crystal_level_up'); } catch {}
      try { navigator.vibrate?.(90); } catch {}
    }, GONG_MS);

    // Auto-advance to the Eternal Tree screen at the end.
    const endTimer = setTimeout(() => onComplete?.(), RITE_MS);

    return () => {
      clearTimeout(gongTimer);
      clearTimeout(endTimer);
    };
  }, [onComplete]);

  return createPortal(
    <div className={`sr-overlay${fading ? ' sr-fading' : ''}`} role="presentation" aria-hidden="true">
      {/* Deep void backdrop — fades in over the world below */}
      <div className="sr-void" />

      {/* Rising motes through the entire cinematic */}
      <div className="sr-motes">
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className="sr-mote"
            style={{
              left:  `${(i * 7.3) % 100}%`,
              top:   `${30 + ((i * 13) % 60)}%`,
              animationDelay:    `${(i * 0.18) % 2.4}s`,
              animationDuration: `${4.4 + ((i * 0.3) % 2.6)}s`,
            }}
          />
        ))}
      </div>

      {/* 渡 seal — the vow-stamp grows, holds, then shatters at the gong */}
      <div className="sr-seal">
        <span className="sr-seal-halo" />
        <span className="sr-seal-glyph">渡</span>
      </div>

      {/* White flash punches at the gong */}
      <div className="sr-flash" />

      {/* The Eternal Tree grows from the seed after the seal breaks */}
      <div className="sr-tree-wrap">
        <CinematicTree />
      </div>
    </div>,
    document.body
  );
}
