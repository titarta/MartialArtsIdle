import { useEffect, useRef, useState } from 'react';

/**
 * CrimsonOrbitLayer — orbital VFX for the premium Crimson Aura (x2) buff.
 *
 * Mixed crimson qi orbs + blood-crystal shards (PixelLab art in public/vfx/)
 * ride two crossed elliptical rings around the cultivator. Depth is carried by
 * SCALE only (no fade); each body crosses in FRONT of the sprite on the near
 * arc and BEHIND it on the far arc, and slowly self-rotates so it feels alive.
 *
 * Self-contained: it watches `document.body` for the `body-crimson-aura-active`
 * class (toggled in App.jsx from the active buff list) and only renders +
 * animates while the buff is live. Lives INSIDE `.home-fighter-stage`, which is
 * its own stacking context (transform) with the cultivator sprite at z-index:2,
 * so per-body z-index (1 behind / 3 front) gives true occlusion. overflow is
 * visible there, so the wider-than-sprite orbits are not clipped.
 *
 * Motion is driven by a single rAF loop writing transforms straight to DOM refs
 * (no React re-render per frame). Honours the global VFX-off toggle
 * (`.vfx-disabled`) and prefers-reduced-motion (renders one static frame).
 *
 * Geometry was tuned interactively in design/orbital-mockup.html — the consts
 * below are the picked values; adjust them here to retune.
 */

const BASE = import.meta.env.BASE_URL || '/';
const TAU  = Math.PI * 2;
const D2R  = Math.PI / 180;
const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd   = () => Math.random() * 2 - 1;

const ORB   = [0, 1, 2, 3].map((n) => `${BASE}vfx/crimson_orb_${n}.png`);
const SHARD = [0, 1, 2, 3].map((n) => `${BASE}vfx/crimson_shard_${n}.png`);

// ── Tunables (picked in the mockup) ─────────────────────────────────────────
const LEAN      = 78;    // ring tilt toward viewer (deg); higher = flatter ellipse
const FAR_SCALE = 0.70;  // body scale at the back of the arc
const NEAR_SCALE= 1.16;  // body scale at the front of the arc
const DEVIATION = 0.35;  // per-body orbit offset (own near-copy of the curve)
const CENTER_Y  = 0.46;  // orbit centre as a fraction of the box height (chest)
const PHASE_OFFSET_B = 0.785; // pi/4: half the 90deg body spacing → bodies thread
                             // the GAP at the front cross (sweep-tuned: peak
                             // separation, collisions at 0/pi/2/pi/3pi/2).

// Two crossed rings: same size + centre, opposite roll + spin. Bodies mix orbs
// and shards so every one of the 8 sprites appears. szFrac = fraction of box.
const RINGS = [
  {
    key: 'A', az: 30, speed: 0.60, rFrac: 0.95,
    bodies: [
      { src: ORB[0],   szFrac: 0.12 },
      { src: SHARD[0], szFrac: 0.14 },
      { src: ORB[1],   szFrac: 0.12 },
      { src: SHARD[1], szFrac: 0.14 },
    ],
  },
  {
    // Same crossed ellipse, counter-rotating, but phase-led by PHASE_OFFSET_B
    // so at the visible FRONT crossing the rings are off-synched: each body
    // threads the GAP between the other ring's bodies instead of colliding
    // head-on. (The back crossing is hidden behind the cultivator.)
    key: 'B', az: -30, speed: -0.60, rFrac: 0.95,
    bodies: [
      { src: SHARD[2], szFrac: 0.14 },
      { src: ORB[2],   szFrac: 0.12 },
      { src: SHARD[3], szFrac: 0.14 },
      { src: ORB[3],   szFrac: 0.12 },
    ],
  },
];

/** Project a ring point to screen offset (x,y) + depth (z, +ve = nearer). */
function project(R, theta, axDeg, azDeg) {
  const lx = R * Math.cos(theta);
  const ly = R * Math.sin(theta);
  const ax = axDeg * D2R;
  const y1 = ly * Math.cos(ax);
  const z1 = ly * Math.sin(ax);
  const az = azDeg * D2R;
  const x2 = lx * Math.cos(az) - y1 * Math.sin(az);
  const y2 = lx * Math.sin(az) + y1 * Math.cos(az);
  return { x: x2, y: y2, z: z1 };
}

export default function CrimsonOrbitLayer() {
  const [active, setActive] = useState(
    () => typeof document !== 'undefined' &&
          document.body.classList.contains('body-crimson-aura-active')
  );
  const wrapRef = useRef(null);

  // Watch the body class so we mount/unmount with the buff.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const sync = () => setActive(document.body.classList.contains('body-crimson-aura-active'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Build the bodies + run the orbit loop while active.
  useEffect(() => {
    if (!active) return undefined;
    const wrap = wrapRef.current;
    if (!wrap) return undefined;

    const reduce = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // create body <img> elements
    const bodies = [];
    RINGS.forEach((ring) => {
      const n = ring.bodies.length;
      ring.bodies.forEach((bd, i) => {
        const el = document.createElement('img');
        el.src = bd.src;
        el.alt = '';
        el.className = 'crimson-orbit-body';
        el.dataset.ring = ring.key;
        el.draggable = false;
        el.style.position = 'absolute';
        el.style.left = '0';
        el.style.top = '0';
        wrap.appendChild(el);
        bodies.push({
          el, ringKey: ring.key, az: ring.az, speed: ring.speed, rFrac: ring.rFrac, szFrac: bd.szFrac,
          cxOff: ring.cxOff || 0, cyOff: ring.cyOff || 0,
          phase: (i / n) * TAU,
          // fixed per-body orbit-offset factors → each rides its own near-copy
          rJit: rnd(), axJit: rnd(), azJit: rnd(), cxJit: rnd(), cyJit: rnd(),
          spin0: Math.random() * 360, spinRate: 14 + Math.random() * 16, spinDir: Math.random() < 0.5 ? -1 : 1,
        });
      });
    });

    let w = wrap.clientWidth || 240;
    let h = wrap.clientHeight || 240;
    const sizeBodies = () => {
      const m = Math.min(w, h);
      for (const b of bodies) {
        const s = b.szFrac * m;
        b.el.style.width = `${s}px`;
        b.el.style.height = `${s}px`;
      }
    };
    const measure = () => { w = wrap.clientWidth || w; h = wrap.clientHeight || h; sizeBodies(); };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(wrap);

    let raf = 0;
    let t0 = 0;
    const tick = (ts) => {
      if (!t0) t0 = ts;
      const t = reduce ? 0 : (ts - t0) / 1000;

      if (!document.body.classList.contains('vfx-disabled')) {
        const half = Math.min(w, h) / 2;
        const cx = w * 0.5;
        const cy = h * CENTER_Y;
        const zref = half * 0.95 * Math.sin(82 * D2R);
        for (const b of bodies) {
          const ax = clamp(LEAN + b.axJit * 5 * DEVIATION, 40, 88);
          const az = b.az + b.azJit * 7 * DEVIATION;
          // Ring B leads by a phase offset so the two rings are off-synched at
          // the front crossing — each body threads the gap between the other
          // ring's bodies instead of colliding head-on.
          const phaseOff = b.ringKey === 'B' ? PHASE_OFFSET_B : 0;
          const theta = b.phase + phaseOff + t * b.speed;
          const R = b.rFrac * half * (1 + b.rJit * 0.08 * DEVIATION);
          const p = project(R, theta, ax, az);
          const depthT = clamp((p.z / zref + 1) / 2, 0, 1);
          const scale = lerp(FAR_SCALE, NEAR_SCALE, depthT);
          const spin = b.spin0 + t * b.spinRate * b.spinDir;
          const px = cx + p.x + b.cxOff * half * 2 + b.cxJit * half * 0.05 * DEVIATION;
          const py = cy + p.y + b.cyOff * half * 2 + b.cyJit * half * 0.04 * DEVIATION;
          b.el.style.transform =
            `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) translate(-50%,-50%) scale(${scale.toFixed(3)}) rotate(${spin.toFixed(1)}deg)`;
          // Continuous depth-sorted z, NOT binary. Centred on the cultivator
          // sprite (lifted to z:10 by .body-crimson-aura-active CSS while this
          // is active) so bodies sort smoothly front-to-back, but FLOORED at 2
          // so they never dip below the Heavenly Qi halo (z:1) — the orbit
          // always rides in front of that gold ring.
          b.el.style.zIndex = Math.max(2, Math.round(10 + (p.z / zref) * 8));
        }
      }
      if (!reduce) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      bodies.forEach((b) => b.el.remove());
    };
  }, [active]);

  if (!active) return null;
  return <div className="crimson-orbit-layer" ref={wrapRef} aria-hidden="true" />;
}
