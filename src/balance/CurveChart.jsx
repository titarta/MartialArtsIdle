/**
 * CurveChart — a lightweight SVG line chart for the Balance Dashboard.
 *
 * No charting dependency: full control over log/linear axes and, crucially,
 * draggable per-point fine-tuning. Renders two series — the dim BASELINE (the
 * real live-game value) and the bright TUNED curve (formula + point overrides)
 * — plus a hover crosshair readout. Drag any tuned point vertically to override
 * it; overridden points render in amber.
 */
import { useRef, useState, useCallback } from 'react';
import { fmt } from '../utils/format';

const VB_W = 760;
const VB_H = 440;
const PAD = { l: 70, r: 18, t: 18, b: 42 };
const PLOT_W = VB_W - PAD.l - PAD.r;
const PLOT_H = VB_H - PAD.t - PAD.b;

function niceLinearTicks(min, max, count = 5) {
  if (!(max > min)) return [min];
  const span = max - min;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const stepN = norm >= 5 ? 5 : norm >= 2 ? 2 : 1;
  const step = stepN * mag;
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(v);
  return ticks;
}

function logTicks(min, max) {
  const lo = Math.floor(Math.log10(min));
  const hi = Math.ceil(Math.log10(max));
  const ticks = [];
  for (let e = lo; e <= hi; e++) ticks.push(Math.pow(10, e));
  return ticks;
}

export default function CurveChart({ curve, xs, baselineYs, tunedYs, overrides, onDragPoint }) {
  const svgRef = useRef(null);
  const [dragX, setDragX] = useState(null);
  const [hover, setHover] = useState(null); // { idx }

  const log = !!curve.y.log;
  const { from, to } = curve.x;

  // ── y domain across both series (positive floor for log) ──────────────────
  let yMin = Infinity, yMax = -Infinity;
  for (const v of baselineYs) { if (Number.isFinite(v)) { yMin = Math.min(yMin, v); yMax = Math.max(yMax, v); } }
  for (const v of tunedYs)    { if (Number.isFinite(v)) { yMin = Math.min(yMin, v); yMax = Math.max(yMax, v); } }
  if (!Number.isFinite(yMin)) { yMin = 0; yMax = 1; }
  if (log) {
    yMin = Math.max(yMin, 1e-6);
    if (yMin <= 0) yMin = 1e-6;
    if (yMax <= yMin) yMax = yMin * 10;
  } else {
    if (yMax === yMin) yMax = yMin + 1;
    const pad = (yMax - yMin) * 0.06;
    yMin -= pad; yMax += pad;
    if (!log && yMin > 0 && yMin < (yMax - yMin)) yMin = Math.min(yMin, 0); // include 0 baseline when sensible
  }

  const xToPx = (x) => PAD.l + ((x - from) / ((to - from) || 1)) * PLOT_W;
  const yToPx = (v) => {
    if (log) {
      const lo = Math.log10(yMin), hi = Math.log10(yMax);
      const t = (Math.log10(Math.max(v, yMin)) - lo) / ((hi - lo) || 1);
      return PAD.t + (1 - t) * PLOT_H;
    }
    const t = (v - yMin) / ((yMax - yMin) || 1);
    return PAD.t + (1 - t) * PLOT_H;
  };
  const pxToY = (py) => {
    const t = 1 - (py - PAD.t) / PLOT_H;
    if (log) {
      const lo = Math.log10(yMin), hi = Math.log10(yMax);
      return Math.pow(10, lo + t * (hi - lo));
    }
    return yMin + t * (yMax - yMin);
  };

  const pathFor = (ys) => xs.map((x, i) => {
    const v = ys[i];
    if (!Number.isFinite(v)) return null;
    return `${i === 0 ? 'M' : 'L'}${xToPx(x).toFixed(1)},${yToPx(v).toFixed(1)}`;
  }).filter(Boolean).join(' ');

  // ── pointer → viewBox coords (exact, aspect-safe) ─────────────────────────
  const toVb = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const loc = pt.matrixTransform(m.inverse());
    return { x: loc.x, y: loc.y };
  }, []);

  const nearestIdx = useCallback((vbx) => {
    const xData = from + ((vbx - PAD.l) / PLOT_W) * (to - from);
    let best = 0, bestD = Infinity;
    for (let i = 0; i < xs.length; i++) {
      const d = Math.abs(xs[i] - xData);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }, [xs, from, to]);

  // Plain function (no manual useCallback): the project's React Compiler
  // memoizes it, and it closes over render-scope scales (pxToY etc.) that a
  // manual dep list can't cleanly capture.
  const onMove = (e) => {
    const { x, y } = toVb(e);
    if (dragX != null) {
      const val = pxToY(Math.max(PAD.t, Math.min(PAD.t + PLOT_H, y)));
      onDragPoint?.(dragX, val);
    } else {
      setHover({ idx: nearestIdx(x) });
    }
  };

  const endDrag = () => setDragX(null);

  const xTicks = (() => {
    const span = to - from;
    const stepN = span <= 6 ? 1 : span <= 12 ? 2 : Math.ceil(span / 8);
    const t = [];
    for (let x = from; x <= to; x += stepN) t.push(x);
    if (t[t.length - 1] !== to) t.push(to);
    return t;
  })();
  const yTicks = log ? logTicks(yMin, yMax) : niceLinearTicks(yMin, yMax, 5);

  const hi = hover?.idx ?? null;

  return (
    <div className="bd-chart-wrap">
      <svg
        ref={svgRef}
        className="bd-chart"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerLeave={() => { setHover(null); endDrag(); }}
      >
        {/* plot frame */}
        <rect x={PAD.l} y={PAD.t} width={PLOT_W} height={PLOT_H} className="bd-chart-frame" />

        {/* y grid + labels */}
        {yTicks.map((v, i) => {
          const py = yToPx(v);
          if (py < PAD.t - 1 || py > PAD.t + PLOT_H + 1) return null;
          return (
            <g key={`y${i}`}>
              <line x1={PAD.l} y1={py} x2={PAD.l + PLOT_W} y2={py} className="bd-grid" />
              <text x={PAD.l - 8} y={py + 3} className="bd-axis-lbl" textAnchor="end">{fmt(v)}</text>
            </g>
          );
        })}

        {/* x grid + labels */}
        {xTicks.map((x, i) => {
          const px = xToPx(x);
          return (
            <g key={`x${i}`}>
              <line x1={px} y1={PAD.t} x2={px} y2={PAD.t + PLOT_H} className="bd-grid" />
              <text x={px} y={PAD.t + PLOT_H + 16} className="bd-axis-lbl" textAnchor="middle">{x}</text>
            </g>
          );
        })}

        {/* axis titles */}
        <text x={PAD.l + PLOT_W / 2} y={VB_H - 6} className="bd-axis-title" textAnchor="middle">{curve.x.label}</text>
        <text x={14} y={PAD.t + PLOT_H / 2} className="bd-axis-title" textAnchor="middle"
              transform={`rotate(-90 14 ${PAD.t + PLOT_H / 2})`}>{curve.y.label}{log ? ' (log)' : ''}</text>

        {/* baseline (dim, dashed) */}
        <path d={pathFor(baselineYs)} className="bd-series-base" />
        {/* tuned (bright) */}
        <path d={pathFor(tunedYs)} className="bd-series-tuned" />

        {/* draggable points */}
        {xs.map((x, i) => {
          const v = tunedYs[i];
          if (!Number.isFinite(v)) return null;
          const overridden = overrides && Object.prototype.hasOwnProperty.call(overrides, x);
          const isHi = i === hi;
          return (
            <circle
              key={x}
              cx={xToPx(x)} cy={yToPx(v)}
              r={overridden ? 4.5 : isHi ? 4 : 2.2}
              className={`bd-pt${overridden ? ' bd-pt-ovr' : ''}${isHi ? ' bd-pt-hi' : ''}`}
              onPointerDown={(e) => { e.preventDefault(); setDragX(x); }}
            />
          );
        })}

        {/* hover crosshair */}
        {hi != null && Number.isFinite(tunedYs[hi]) && (
          <line x1={xToPx(xs[hi])} y1={PAD.t} x2={xToPx(xs[hi])} y2={PAD.t + PLOT_H} className="bd-crosshair" />
        )}
      </svg>

      {/* hover readout */}
      <div className="bd-readout">
        {hi != null ? (
          <>
            <span className="bd-ro-x">{curve.pointLabel ? curve.pointLabel(xs[hi]) : `${curve.x.label} ${xs[hi]}`}</span>
            <span className="bd-ro-tuned">tuned {fmt(tunedYs[hi])}</span>
            <span className="bd-ro-base">baseline {fmt(baselineYs[hi])}</span>
            {overrides && Object.prototype.hasOwnProperty.call(overrides, xs[hi]) && (
              <span className="bd-ro-ovr">overridden</span>
            )}
          </>
        ) : (
          <span className="bd-ro-hint">hover for values · drag a point to override</span>
        )}
      </div>
    </div>
  );
}
