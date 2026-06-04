/**
 * DissolutionRite — the cinematic at the moment of actual reincarnation.
 *
 * Where the SeveringRite (between confirm + Eternal Tree) is SHARP and
 * ceremonial (gong, white flash, fast wheel), THIS rite is SOFT. It is
 * the moment the player's character actually downgrades — realm, qi,
 * producers, crystal, all dissolve. The tone is grief-with-acceptance,
 * not violence.
 *
 * The metaphor: the player's life-essence becomes a glowing orb. It
 * beats three times (heartbeat gradually slowing). Then it BREATHES OUT
 * — karma-motes stream upward as the orb fades to nothing. The motes
 * coalesce at the bottom into a single golden SEED, the thing that
 * survives the wheel. A warm dawn light blooms outward from the seed —
 * the new life. The page reloads beneath the dawn, so the visual
 * crossing into the new home screen is invisible.
 *
 * Beats (≈3.4s total):
 *   0     ms  the void fades over the Eternal Tree
 *   400   ms  the life-essence orb materialises, soft gold halo
 *   1000  ms  HEARTBEAT 1 — the orb pulses brighter
 *   1480  ms  HEARTBEAT 2 — slightly weaker
 *   1400  ms  soft CHIME (focus_tick) + haptic
 *   1500  ms  whisper text appears (the realm name returns to the wheel)
 *   1800  ms  the orb begins dissolving (blur + opacity fade)
 *   1800  ms  karma-motes start rising from the orb position
 *   2400  ms  the seed materialises at the bottom, persistent gentle pulse
 *   2800  ms  the DAWN — soft tone + warm gold light expands outward
 *   3400  ms  onComplete → handleReincarnate → wipe + page reload
 *
 * Reduced-motion users skip the cinematic entirely (immediate onComplete).
 *
 * SFX placeholders: focus_tick for the chime moment, crystal_tap_max for
 * the dawn. Both are reused until bespoke samples are recorded; pattern
 * mirrors the SeveringRite + merge tier-up.
 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AudioManager } from '../audio';
import './dissolutionRite.css';

const BASE = import.meta.env.BASE_URL;

const TOTAL_MS  = 3400;
const CHIME_MS  = 1400;
const DAWN_MS   = 2800;
// Whiteout begins 400ms before onComplete fires so the warm wash is
// already at ~70% by the time window.location.reload() is invoked. The
// whiteout HOLDS through the browser's unavoidable reload delay
// (~100-1500ms depending on device + dev server), masking the otherwise
// frozen "dawn end state" the player would be stuck staring at.
const FINISH_MS = 3000;

// Deterministic mote scatter — same positions every play, no per-render
// randomness so the visual is identical across reincarnations.
const MOTES = Array.from({ length: 28 }, (_, i) => ({
  // Cluster around the orb's centre (50%) with a small spread
  left: 50 + ((i * 31) % 14) - 7,
  delay: 1.4 + (i * 0.04),
  duration: 2.4 + ((i * 0.07) % 1.1),
}));

export default function DissolutionRite({ onComplete, realmName }) {
  const [finishing, setFinishing] = useState(false);
  const whisper = useMemo(() => (
    realmName ? `${realmName} returns to the wheel` : 'All that was, returns'
  ), [realmName]);

  useEffect(() => {
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      const t = setTimeout(() => onComplete?.(), 80);
      return () => clearTimeout(t);
    }

    // The chime — soft single tone at the moment of letting go.
    const chimeTimer = setTimeout(() => {
      try { AudioManager.playSfx('focus_tick'); } catch {}
      try { navigator.vibrate?.(50); } catch {}
    }, CHIME_MS);

    // The dawn — soft tone as the new light blooms.
    const dawnTimer = setTimeout(() => {
      try { AudioManager.playSfx('crystal_tap_max'); } catch {}
    }, DAWN_MS);

    // Start the warm whiteout 400ms before onComplete so the page reload
    // happens under a clean wash, not a frozen dawn frame.
    const finishTimer = setTimeout(() => setFinishing(true), FINISH_MS);

    // Auto-advance to the actual wipe + reload.
    const endTimer = setTimeout(() => onComplete?.(), TOTAL_MS);

    return () => {
      clearTimeout(chimeTimer);
      clearTimeout(dawnTimer);
      clearTimeout(finishTimer);
      clearTimeout(endTimer);
    };
  }, [onComplete]);

  return createPortal(
    <div className={`dr-overlay${finishing ? ' dr-finishing' : ''}`} role="presentation" aria-hidden="true">
      <div className="dr-void" />

      {/* The Soul — central life-essence orb */}
      <div className="dr-soul">
        <span className="dr-soul-halo" />
        <span className="dr-soul-core" />
      </div>

      {/* Rising karma-motes — stream upward as the orb breathes out */}
      <div className="dr-motes">
        {MOTES.map((m, i) => (
          <span
            key={i}
            className="dr-mote"
            style={{
              left: `${m.left}%`,
              animationDelay: `${m.delay}s`,
              animationDuration: `${m.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Quiet whisper — the realm’s name returns to the wheel */}
      <div className="dr-whisper">{whisper}</div>

      {/* The Seed — what carries to the next life. This is literally karma:
          the sect's ledger of merit that survives the wheel. Use the same
          ui/karma.png sprite as the Eternal Tree header + the home topbar,
          so the player recognises "oh, that's karma" without being told. */}
      <div className="dr-seed">
        <span className="dr-seed-glow" />
        <img
          className="dr-seed-icon"
          src={`${BASE}ui/karma.png`}
          alt=""
          draggable="false"
          aria-hidden="true"
        />
      </div>

      {/* Dawn light blooms outward, covers the screen at unmount */}
      <div className="dr-dawn" />
    </div>,
    document.body
  );
}
