/**
 * BalanceDashboard, a dev-only progression-curve editor (mounted on ?balance).
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
  CURVES, CURVE_COUNTS, groupedCurves, sampleXs, defaultParams, baselineFn, auditCurves,
  shapeMult, newShapeTransform,
} from './curves';
import { buildExport } from './apply';
import CurveChart from './CurveChart';
import { fmt } from '../utils/format';
import './balance.css';

const GROUPS = groupedCurves();
const AUDIT = auditCurves(); // dev assertion: defaults must reproduce baseline
const POINT_TABLE_CAP = 64;  // domains up to this size get a fully editable points table
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const tidy = (v) => (Number.isFinite(v) ? Number(v.toPrecision(6)) : 0);

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

  const entry = tuning[key] ?? { params: defaults, overrides: {}, shape: [] };
  const params = entry.params;
  const overrides = entry.overrides;
  const shape = entry.shape ?? [];

  const setEntry = useCallback((updater) => {
    setTuning(t => {
      const cur = t[key] ?? { params: { ...defaults }, overrides: {}, shape: [] };
      return { ...t, [key]: updater(cur) };
    });
  }, [key, defaults]);

  const addShape = () => setEntry(e => ({ ...e, shape: [...(e.shape ?? []), newShapeTransform(curve.x.from, curve.x.to)] }));
  const updShape = (i, field, v) => setEntry(e => ({ ...e, shape: (e.shape ?? []).map((t, k) => (k === i ? { ...t, [field]: v } : t)) }));
  const delShape = (i) => setEntry(e => ({ ...e, shape: (e.shape ?? []).filter((_, k) => k !== i) }));

  const setParam = (k, v) => setEntry(e => ({ ...e, params: { ...e.params, [k]: v } }));
  const setBand  = (name, field, v) => setEntry(e => ({
    ...e,
    params: { ...e.params, bands: { ...e.params.bands, [name]: { ...(e.params.bands?.[name] ?? {}), [field]: v } } },
  }));
  const setPoint = (x, v) => setEntry(e => ({ ...e, overrides: { ...e.overrides, [x]: v } }));
  const resetPoint = (x) => setEntry(e => { const o = { ...e.overrides }; delete o[x]; return { ...e, overrides: o }; });
  const resetPoints = () => setEntry(e => ({ ...e, overrides: {} }));
  const resetParams = () => setEntry(e => ({ ...e, params: { ...defaults } }));
  const resetAll = () => setEntry(() => ({ params: { ...defaults }, overrides: {}, shape: [] }));

  // ── series ────────────────────────────────────────────────────────────────
  const xs = useMemo(() => sampleXs(curve), [curve]);
  const base = baselineFn(curve, variant);
  const baselineYs = useMemo(() => xs.map(x => base(x)), [xs, base]);
  const tunedYs = useMemo(
    () => xs.map(x => (Object.prototype.hasOwnProperty.call(overrides, x) ? overrides[x] : curve.fn(x, params) * shapeMult(shape, x))),
    [xs, overrides, params, curve, shape],
  );

  const exp = useMemo(
    () => buildExport(curve, { params, defaults, overrides, variantLabel: variant?.label, xs, baseFn: base, tunedYs }),
    [curve, params, defaults, overrides, variant, xs, base, tunedYs],
  );

  const copy = (text, which) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(c => (c === which ? null : c)), 1400);
    });
  };

  const ovrKeys = Object.keys(overrides).map(Number).sort((a, b) => a - b);
  const dirty = ovrKeys.length > 0 || shape.length > 0 || JSON.stringify(params) !== JSON.stringify(defaults);

  const hasFormula = curve.paramsSpec.length > 0;
  // Baseline pass → fine-tune: snapshot the current formula (and shape overlay)
  // onto every point as an override, so each point can then be nudged.
  const bakeFormula = () => setEntry(e => ({
    ...e,
    overrides: Object.fromEntries(xs.map(x => [x, curve.fn(x, e.params) * shapeMult(e.shape ?? [], x)])),
  }));

  return (
    <div className="bd-root">
      <header className="bd-top">
        <div className="bd-brand">Balance <b>Dashboard</b></div>
        <div className="bd-top-meta">
          {AUDIT.length === 0
            ? <span className="bd-audit-ok">✓ {CURVE_COUNTS.exact} exact · {CURVE_COUNTS.approx} fitted baseline</span>
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
              {curve.paramsSpec.length > 0 && <button className="bd-mini" onClick={resetParams}>reset</button>}
            </div>
            {curve.paramsSpec.length === 0 ? (
              <p className="bd-hint">Lookup table: no formula. Tune values point-by-point below.</p>
            ) : curve.paramsSpec.map(s => {
              if (s.type === 'bands') {
                return (
                  <div key={s.key} className="bd-bands">
                    <div className="bd-bands-grid bd-bands-head">
                      <span>{s.label}</span>
                      {s.cols.map(c => <span key={c.key} title={c.title}>{c.label}</span>)}
                    </div>
                    {s.bandDefs.map((bd) => {
                      const b = params.bands?.[bd.name] ?? {};
                      return (
                        <div key={bd.name} className="bd-bands-grid bd-band-row">
                          <span className="bd-band-name" title={`${bd.stages} stage${bd.stages === 1 ? '' : 's'}`}>{bd.name}</span>
                          {s.cols.map(c => {
                            const off = c.key === 'jump' && bd.firstRealm;
                            return (
                              <input
                                key={c.key}
                                className="bd-band-inp"
                                type="number"
                                step={c.step ?? 'any'}
                                disabled={off}
                                value={off ? '' : tidy(b[c.key] ?? 0)}
                                onChange={e => setBand(bd.name, c.key, e.target.value === '' ? 0 : Number(e.target.value))}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              }
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
              <label className="bd-sec-title">Points ({ovrKeys.length} tuned)</label>
              <div className="bd-sec-actions">
                {hasFormula && (
                  <button className="bd-mini" onClick={bakeFormula}
                    title="Snapshot the formula onto every point so you can fine-tune each one">
                    bake formula
                  </button>
                )}
                {ovrKeys.length > 0 && <button className="bd-mini" onClick={resetPoints}>clear</button>}
              </div>
            </div>
            {xs.length <= POINT_TABLE_CAP ? (
              <div className="bd-pts bd-pts-all">
                {xs.map((x, i) => {
                  const ov = hasOwn(overrides, x);
                  return (
                    <div key={x} className={`bd-pt-row${ov ? ' bd-pt-row-ovr' : ''}`}>
                      <span className="bd-pt-x">{curve.pointLabel ? curve.pointLabel(x) : `${curve.x.label} ${x}`}</span>
                      <input
                        className="bd-pt-val"
                        type="number"
                        value={tidy(tunedYs[i])}
                        onChange={e => setPoint(x, Number(e.target.value))}
                      />
                      <button className="bd-mini bd-pt-rst" disabled={!ov}
                        onClick={() => resetPoint(x)} title="Reset to formula / baseline">↺</button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <p className="bd-hint">{xs.length} points. Drag on the chart, or bake the formula to edit every point numerically.</p>
                {ovrKeys.length > 0 && (
                  <div className="bd-pts">
                    {ovrKeys.map(x => (
                      <div key={x} className="bd-pt-row bd-pt-row-ovr">
                        <span className="bd-pt-x">{curve.pointLabel ? curve.pointLabel(x) : x}</span>
                        <input className="bd-pt-val" type="number" value={overrides[x]}
                          onChange={e => setPoint(x, Number(e.target.value))} />
                        <button className="bd-mini" onClick={() => resetPoint(x)}>↺</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="bd-sec">
            <div className="bd-sec-row">
              <label className="bd-sec-title">Shape overlay ({shape.length})</label>
              <button className="bd-mini" onClick={addShape}>+ add</button>
            </div>
            {shape.length === 0 ? (
              <p className="bd-hint">
                Bend any part of this curve, on top of its formula: add a transform over an X range.
                curve 1 = linear, &gt;1 = exponential / hyperbolic; set from = to for an instant jump.
                Stack several to mix shapes across X. amt 1 = no-op.
              </p>
            ) : (
              <>
                <div className="bd-shape-grid bd-shape-head">
                  <span>from</span><span>to</span><span>×amt</span><span>curve</span><span /></div>
                {shape.map((tr, i) => (
                  <div key={i} className="bd-shape-grid bd-shape-row">
                    <input className="bd-band-inp" type="number" step={curve.x.step || 1} value={tr.from}
                      onChange={e => updShape(i, 'from', Number(e.target.value))} />
                    <input className="bd-band-inp" type="number" step={curve.x.step || 1} value={tr.to}
                      onChange={e => updShape(i, 'to', Number(e.target.value))} />
                    <input className="bd-band-inp" type="number" step="0.1" value={tr.amt}
                      onChange={e => updShape(i, 'amt', Number(e.target.value))} />
                    <input className="bd-band-inp" type="number" step="0.1" value={tr.curve}
                      onChange={e => updShape(i, 'curve', Number(e.target.value))} />
                    <button className="bd-mini bd-shape-del" onClick={() => delShape(i)} title="remove">✕</button>
                  </div>
                ))}
                {curve.apply?.kind !== 'override' && (
                  <p className="bd-hint">Preview only on this formula curve. It applies live on override-backed curves (realms, tree); for others, bake the formula then export the points.</p>
                )}
              </>
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
