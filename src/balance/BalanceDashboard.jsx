/**
 * BalanceDashboard — a dev-only progression-curve editor (mounted on ?balance).
 *
 * Left: grouped curve list. Center: chart (baseline vs tuned, draggable points).
 * Right: blurb, variant picker, formula params (slider + number), point-override
 * table, and export (override JSON for live domains, snippet for hook constants).
 *
 * Fully separate from the designer; reads the game's real exported formulas so
 * the baseline never drifts, and never mutates the player save.
 */
import { useMemo, useState, useCallback } from 'react';
import {
  CURVES, groupedCurves, sampleXs, defaultParams, baselineFn, auditCurves,
} from './curves';
import { buildExport } from './apply';
import CurveChart from './CurveChart';
import { fmt } from '../utils/format';
import './balance.css';

const GROUPS = groupedCurves();
const AUDIT = auditCurves(); // dev assertion: defaults must reproduce baseline

export default function BalanceDashboard() {
  const [selId, setSelId] = useState(CURVES[0].id);
  const [variantByCurve, setVariantByCurve] = useState({});
  const [tuning, setTuning] = useState({}); // key -> { params, overrides }
  const [copied, setCopied] = useState(null);

  const curve = CURVES.find(c => c.id === selId) ?? CURVES[0];
  const variant = curve.variants
    ? (curve.variants.find(v => v.id === variantByCurve[curve.id]) ?? curve.variants[0])
    : null;
  const key = `${curve.id}::${variant?.id ?? '-'}`;
  const defaults = useMemo(() => defaultParams(curve, variant), [curve, variant]);

  const entry = tuning[key] ?? { params: defaults, overrides: {} };
  const params = entry.params;
  const overrides = entry.overrides;

  const setEntry = useCallback((updater) => {
    setTuning(t => {
      const cur = t[key] ?? { params: { ...defaults }, overrides: {} };
      return { ...t, [key]: updater(cur) };
    });
  }, [key, defaults]);

  const setParam = (k, v) => setEntry(e => ({ ...e, params: { ...e.params, [k]: v } }));
  const setPoint = (x, v) => setEntry(e => ({ ...e, overrides: { ...e.overrides, [x]: v } }));
  const resetPoint = (x) => setEntry(e => { const o = { ...e.overrides }; delete o[x]; return { ...e, overrides: o }; });
  const resetPoints = () => setEntry(e => ({ ...e, overrides: {} }));
  const resetParams = () => setEntry(e => ({ ...e, params: { ...defaults } }));
  const resetAll = () => setEntry(() => ({ params: { ...defaults }, overrides: {} }));

  // ── series ────────────────────────────────────────────────────────────────
  const xs = useMemo(() => sampleXs(curve), [curve]);
  const base = baselineFn(curve, variant);
  const baselineYs = useMemo(() => xs.map(x => base(x)), [xs, base]);
  const tunedYs = useMemo(
    () => xs.map(x => (Object.prototype.hasOwnProperty.call(overrides, x) ? overrides[x] : curve.fn(x, params))),
    [xs, overrides, params, curve],
  );

  const exp = useMemo(
    () => buildExport(curve, { params, defaults, overrides, variantLabel: variant?.label }),
    [curve, params, defaults, overrides, variant],
  );

  const copy = (text, which) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(c => (c === which ? null : c)), 1400);
    });
  };

  const ovrKeys = Object.keys(overrides).map(Number).sort((a, b) => a - b);
  const dirty = ovrKeys.length > 0 || JSON.stringify(params) !== JSON.stringify(defaults);

  return (
    <div className="bd-root">
      <header className="bd-top">
        <div className="bd-brand">Balance <b>Dashboard</b></div>
        <div className="bd-top-meta">
          {AUDIT.length === 0
            ? <span className="bd-audit-ok">✓ {CURVES.length} curves match live game</span>
            : <span className="bd-audit-bad">⚠ {AUDIT.length} baseline mismatches (see console)</span>}
          <span className="bd-top-hint">read-only on game state · ?balance</span>
        </div>
      </header>

      <div className="bd-body">
        {/* ── curve list ─────────────────────────────────────────────── */}
        <nav className="bd-list">
          {GROUPS.map(g => (
            <div key={g.name} className="bd-group">
              <div className="bd-group-name">{g.name}</div>
              {g.curves.map(c => (
                <button
                  key={c.id}
                  className={`bd-list-item${c.id === selId ? ' bd-list-item-active' : ''}`}
                  onClick={() => setSelId(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* ── chart ──────────────────────────────────────────────────── */}
        <main className="bd-main">
          <div className="bd-main-head">
            <h2>{curve.label}{variant ? <span className="bd-variant-tag"> · {variant.label}</span> : null}</h2>
            <div className="bd-legend">
              <span className="bd-lg bd-lg-base">baseline (live)</span>
              <span className="bd-lg bd-lg-tuned">tuned</span>
            </div>
          </div>
          <CurveChart
            curve={curve}
            xs={xs}
            baselineYs={baselineYs}
            tunedYs={tunedYs}
            overrides={overrides}
            onDragPoint={setPoint}
          />
          <p className="bd-blurb">{curve.blurb}</p>
        </main>

        {/* ── tuning panel ───────────────────────────────────────────── */}
        <aside className="bd-panel">
          {curve.variants && (
            <section className="bd-sec">
              <label className="bd-sec-title">Variant</label>
              <select
                className="bd-select"
                value={variant?.id}
                onChange={e => setVariantByCurve(m => ({ ...m, [curve.id]: e.target.value }))}
              >
                {curve.variants.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </section>
          )}

          <section className="bd-sec">
            <div className="bd-sec-row">
              <label className="bd-sec-title">Formula params</label>
              <button className="bd-mini" onClick={resetParams}>reset</button>
            </div>
            {curve.paramsSpec.map(s => {
              const val = params[s.key];
              const hasRange = Number.isFinite(s.min) && Number.isFinite(s.max);
              return (
                <div key={s.key} className="bd-param">
                  <div className="bd-param-head">
                    <span className="bd-param-lbl">{s.label}</span>
                    <input
                      className="bd-param-num"
                      type="number"
                      step={s.step ?? 'any'}
                      value={val}
                      onChange={e => setParam(s.key, e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                  </div>
                  {hasRange && (
                    <input
                      className="bd-param-range"
                      type="range"
                      min={s.min} max={s.max} step={s.step ?? (s.max - s.min) / 100}
                      value={val}
                      onChange={e => setParam(s.key, Number(e.target.value))}
                    />
                  )}
                </div>
              );
            })}
          </section>

          <section className="bd-sec">
            <div className="bd-sec-row">
              <label className="bd-sec-title">Point overrides ({ovrKeys.length})</label>
              {ovrKeys.length > 0 && <button className="bd-mini" onClick={resetPoints}>clear</button>}
            </div>
            {ovrKeys.length === 0 ? (
              <p className="bd-hint">Drag points on the chart, or edit a value below.</p>
            ) : (
              <div className="bd-pts">
                {ovrKeys.map(x => (
                  <div key={x} className="bd-pt-row">
                    <span className="bd-pt-x">{curve.pointLabel ? curve.pointLabel(x) : x}</span>
                    <input
                      className="bd-pt-val"
                      type="number"
                      value={overrides[x]}
                      onChange={e => setPoint(x, Number(e.target.value))}
                    />
                    <button className="bd-mini" onClick={() => resetPoint(x)}>↺</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bd-sec bd-export">
            <div className="bd-sec-row">
              <label className="bd-sec-title">Export / apply</label>
              {dirty && <button className="bd-mini" onClick={resetAll}>reset all</button>}
            </div>

            {exp.overrideJSON && (
              <div className="bd-exp-block">
                <div className="bd-exp-label">
                  Override → <code>src/data/config/{exp.overrideDomain}.override.json</code>
                  <span className="bd-exp-live">live on reload</span>
                </div>
                <pre className="bd-code">{exp.overrideJSON}</pre>
                <button className="bd-btn" onClick={() => copy(exp.overrideJSON, 'ovr')}>
                  {copied === 'ovr' ? 'Copied ✓' : 'Copy override JSON'}
                </button>
              </div>
            )}

            {exp.snippet && (
              <div className="bd-exp-block">
                <div className="bd-exp-label">Snippet → <code>{curve.apply?.target}</code></div>
                <pre className="bd-code">{exp.snippet}</pre>
                <button className="bd-btn" onClick={() => copy(exp.snippet, 'snip')}>
                  {copied === 'snip' ? 'Copied ✓' : 'Copy snippet'}
                </button>
              </div>
            )}

            {!exp.overrideJSON && !exp.snippet && (
              <p className="bd-hint">Tune a param or drag a point to produce an export.</p>
            )}
          </section>

          <div className="bd-stat">
            peak tuned {fmt(Math.max(...tunedYs.filter(Number.isFinite)))} · base {fmt(Math.max(...baselineYs.filter(Number.isFinite)))}
          </div>
        </aside>
      </div>
    </div>
  );
}
