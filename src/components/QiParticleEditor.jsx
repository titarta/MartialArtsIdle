import { useState, useRef, useCallback, useMemo, useEffect } from 'react';

// ── Fallback path data (used when the load endpoint is unavailable) ───────────
// Format: [startX, startY, cp1X, cp1Y, cp2X, cp2Y, endX, endY]
const FALLBACK_PATHS = {
  A: [  45, -21,   30,  30,  133,  34,  128,  70],
  B: [  57,  -3,   40,  30,  110,  50,  100,  70],
  C: [  80,   0,  110,  20,   70,  50,  100,  70],
  D: [ 120,   0,   90,  20,  130,  50,  100,  70],
  E: [ 143,  -2,  160,  30,   90,  50,   99,  70],
  F: [ 152, -19,  170,  30,   60,  30,   72,  72],
  G: [  46, -42,    5, -22, -100,  62,   48,  82],
  H: [ 154, -43,  195, -22,  300,  62,  152,  82],
  I: [  53, -63, -181,   3,  -69,  84,   26, 124],
  J: [ 147, -63,  383,   8,  257,  94,  174, 129],
};
const FALLBACK_META = {
  A:{rung:0}, B:{rung:0}, C:{rung:0}, D:{rung:0}, E:{rung:0}, F:{rung:0},
  G:{rung:2}, H:{rung:2},
  I:{rung:4}, J:{rung:4},
};

// Color palette per rung tier
const RUNG_COLORS = { 0: '#3b82f6', 2: '#f97316', 4: '#ef4444' };
const RUNG_LABELS = { 0: 'always', 2: 'rung 2', 4: 'rung 4' };

// SVG world-space viewport — wide enough for extreme control points
const VB_X = -460, VB_Y = -110, VB_W = 1120, VB_H = 300;

const PT_START = 0, PT_CP1 = 1, PT_CP2 = 2, PT_END = 3;

// All letters available for new paths (A-Z minus those already used as fallback)
const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function getCoords(p, pt) { return [p[pt * 2], p[pt * 2 + 1]]; }

function svgPoint(svgEl, clientX, clientY) {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  return pt.matrixTransform(svgEl.getScreenCTM().inverse());
}

function fmtPath(name, p) {
  const pad = (n, w = 4) => String(Math.round(n)).padStart(w);
  const [x0,y0,cx1,cy1,cx2,cy2,x1,y1] = p;
  return `.home-qi-particle-path${name} { offset-path: path('M ${pad(x0)} ${pad(y0)} C ${pad(cx1)} ${pad(cy1)}, ${pad(cx2)} ${pad(cy2)}, ${pad(x1)} ${pad(y1)}'); }`;
}

// ── Editor ────────────────────────────────────────────────────────────────────

export default function QiParticleEditor() {
  const [paths,        setPaths]        = useState(null); // null = loading
  const [meta,         setMeta]         = useState(null);
  const [loadError,    setLoadError]    = useState(false);
  const [selectedPath, setSelectedPath] = useState(null);
  const [dragging,     setDragging]     = useState(null);
  const [saveStatus,   setSaveStatus]   = useState('idle');
  const [copied,       setCopied]       = useState(false);
  const svgRef = useRef(null);

  // ── Load current state from dev server on mount ───────────────────────────
  useEffect(() => {
    fetch('/__particle-load')
      .then(r => r.json())
      .then(({ ok, paths: p, meta: m }) => {
        if (ok && p && m) {
          setPaths(Object.fromEntries(Object.entries(p).map(([k,v]) => [k,[...v]])));
          setMeta(m);
        } else {
          throw new Error('bad response');
        }
      })
      .catch(() => {
        setPaths(Object.fromEntries(Object.entries(FALLBACK_PATHS).map(([k,v]) => [k,[...v]])));
        setMeta({ ...FALLBACK_META });
        setLoadError(true);
      });
  }, []);

  // ── CSS output ────────────────────────────────────────────────────────────
  const cssLines = useMemo(() => {
    if (!paths) return '';
    return Object.entries(paths).map(([id, p]) => fmtPath(id, p)).join('\n');
  }, [paths]);

  // ── Add a new path ────────────────────────────────────────────────────────
  const addPath = useCallback(() => {
    const used = new Set(Object.keys(paths ?? {}));
    const next = ALL_LETTERS.find(l => !used.has(l));
    if (!next) return; // A-Z exhausted
    // Default: gentle S-curve from crystal centre down to player aura centre
    const newP = [100, -10, 70, 20, 130, 50, 100, 80];
    setPaths(prev => ({ ...prev, [next]: newP }));
    setMeta(prev => ({ ...prev, [next]: { rung: 0 } }));
    setSelectedPath(next);
  }, [paths]);

  // ── Delete a path ─────────────────────────────────────────────────────────
  const deletePath = useCallback((id) => {
    setPaths(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setMeta(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedPath(cur => cur === id ? null : cur);
  }, []);

  // ── Set rung tier for selected path ───────────────────────────────────────
  const setRung = useCallback((id, rung) => {
    setMeta(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), rung } }));
  }, []);

  // ── Drag handling ─────────────────────────────────────────────────────────
  const onHandleDown = useCallback((e, pathId, pt) => {
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    setDragging({ pathId, pt });
    setSelectedPath(pathId);
  }, []);

  const onSvgMove = useCallback((e) => {
    if (!dragging) return;
    const { x, y } = svgPoint(svgRef.current, e.clientX, e.clientY);
    const { pathId, pt } = dragging;
    setPaths(prev => {
      const next = { ...prev, [pathId]: [...prev[pathId]] };
      next[pathId][pt * 2]     = Math.round(x);
      next[pathId][pt * 2 + 1] = Math.round(y);
      return next;
    });
  }, [dragging]);

  const onSvgUp = useCallback(() => setDragging(null), []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const doSave = useCallback(async () => {
    if (!paths || !meta) return;
    setSaveStatus('saving');
    try {
      const res = await fetch('/__particle-save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          paths: Object.fromEntries(
            Object.entries(paths).map(([k, v]) => [k, v.map(Math.round)])
          ),
          meta,
        }),
      });
      const json = await res.json();
      setSaveStatus(json.ok ? 'saved' : 'error');
    } catch {
      setSaveStatus('error');
    }
    setTimeout(() => setSaveStatus('idle'), 2500);
  }, [paths, meta]);

  const doCopy = useCallback(() => {
    navigator.clipboard.writeText(cssLines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [cssLines]);

  const doReset = useCallback(() => {
    setPaths(Object.fromEntries(Object.entries(FALLBACK_PATHS).map(([k,v]) => [k,[...v]])));
    setMeta({ ...FALLBACK_META });
  }, []);

  // ── Render a single path ──────────────────────────────────────────────────
  function renderPath(pathId) {
    if (!paths || !meta) return null;
    const p      = paths[pathId];
    const rung   = meta[pathId]?.rung ?? 0;
    const color  = RUNG_COLORS[rung] ?? '#888';
    const isSel  = selectedPath === pathId;
    const [x0,  y0]  = getCoords(p, PT_START);
    const [cx1, cy1] = getCoords(p, PT_CP1);
    const [cx2, cy2] = getCoords(p, PT_CP2);
    const [x1,  y1]  = getCoords(p, PT_END);
    const d = `M ${x0} ${y0} C ${cx1} ${cy1} ${cx2} ${cy2} ${x1} ${y1}`;

    return (
      <g key={pathId}>
        {/* Curve */}
        <path d={d} stroke={color} strokeWidth={isSel ? 2.2 : 1.2} fill="none"
          strokeOpacity={isSel ? 1 : 0.4} style={{ cursor: 'pointer' }}
          onClick={() => setSelectedPath(isSel ? null : pathId)} />

        {/* Animated preview dots */}
        {[0, 0.33, 0.66].map(off => (
          <circle key={off} r={isSel ? 4 : 2.5} fill={color} opacity={isSel ? 0.9 : 0.35}>
            <animateMotion dur="2.4s" begin={`${-(off * 2.4).toFixed(2)}s`}
              repeatCount="indefinite" path={d} />
          </circle>
        ))}

        {/* Guide lines when selected */}
        {isSel && <>
          <line x1={x0} y1={y0} x2={cx1} y2={cy1}
            stroke={color} strokeWidth={0.8} strokeDasharray="4 3" strokeOpacity={0.5} />
          <line x1={x1} y1={y1} x2={cx2} y2={cy2}
            stroke={color} strokeWidth={0.8} strokeDasharray="4 3" strokeOpacity={0.5} />
        </>}

        {/* START handle */}
        <circle cx={x0} cy={y0} r={isSel ? 6 : 4}
          fill={color} stroke="#fff" strokeWidth={1} opacity={isSel ? 1 : 0.45}
          style={{ cursor: 'grab' }}
          onPointerDown={e => onHandleDown(e, pathId, PT_START)} />

        {/* CP1 handle (selected only) */}
        {isSel && <>
          <rect x={cx1-5} y={cy1-5} width={10} height={10}
            fill="#1a1a2e" stroke={color} strokeWidth={1.5}
            style={{ cursor: 'grab' }}
            onPointerDown={e => onHandleDown(e, pathId, PT_CP1)} />
          <text x={cx1} y={cy1-8} textAnchor="middle"
            fill={color} fontSize={7} style={{ pointerEvents:'none' }}>①</text>
        </>}

        {/* CP2 handle (selected only) */}
        {isSel && <>
          <rect x={cx2-5} y={cy2-5} width={10} height={10}
            fill="#1a1a2e" stroke={color} strokeWidth={1.5}
            style={{ cursor: 'grab' }}
            onPointerDown={e => onHandleDown(e, pathId, PT_CP2)} />
          <text x={cx2} y={cy2-8} textAnchor="middle"
            fill={color} fontSize={7} style={{ pointerEvents:'none' }}>②</text>
        </>}

        {/* END handle */}
        <circle cx={x1} cy={y1} r={isSel ? 6 : 4}
          fill={color} stroke="#fff" strokeWidth={1} opacity={isSel ? 1 : 0.45}
          style={{ cursor: 'grab' }}
          onPointerDown={e => onHandleDown(e, pathId, PT_END)} />

        {/* Path label */}
        {isSel && (
          <text x={x0} y={y0 - 10} textAnchor="middle"
            fill={color} fontSize={9} fontWeight="bold" style={{ pointerEvents: 'none' }}>
            {pathId}
          </text>
        )}
      </g>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!paths) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
        height:'100vh', background:'#0f0f1a', color:'#a78bfa', fontFamily:'monospace', fontSize:14 }}>
        Loading paths from App.css…
      </div>
    );
  }

  const selP    = selectedPath ? paths[selectedPath] : null;
  const selRung = selectedPath ? (meta[selectedPath]?.rung ?? 0) : null;
  const selClr  = selRung != null ? RUNG_COLORS[selRung] : '#888';
  const usedIds = new Set(Object.keys(paths));
  const canAdd  = ALL_LETTERS.some(l => !usedIds.has(l));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100vh',
      background:'#0f0f1a', color:'#ccc',
      fontFamily:'"Courier New", monospace', fontSize:12,
      userSelect:'none',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
        padding:'7px 14px', background:'#13132a',
        borderBottom:'1px solid #2a2a4a', flexShrink:0,
      }}>
        <strong style={{ color:'#a78bfa', fontSize:13 }}>⚡ Qi Particle Path Editor</strong>
        {loadError && (
          <span style={{ color:'#f87171', fontSize:10 }}>
            ⚠ Could not load from server — showing defaults
          </span>
        )}
        <span style={{ color:'#444', fontSize:11 }}>
          Click a curve to select · drag ●START ■① ■② ●END · 💾 saves App.css + HomeScreen.jsx
        </span>

        {/* Path chips */}
        <div style={{ marginLeft:'auto', display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' }}>
          {Object.keys(paths).map(id => {
            const rung  = meta[id]?.rung ?? 0;
            const color = RUNG_COLORS[rung] ?? '#888';
            const isSel = selectedPath === id;
            return (
              <span key={id} style={{ display:'inline-flex', alignItems:'center', gap:2 }}>
                <button onClick={() => setSelectedPath(isSel ? null : id)}
                  style={{
                    padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:'bold',
                    cursor:'pointer', border:`1.5px solid ${color}`,
                    background: isSel ? color : 'transparent',
                    color: isSel ? '#fff' : color, transition:'all 0.1s',
                  }}>{id}</button>
                {/* Delete button — small ×, always visible */}
                <button onClick={() => deletePath(id)}
                  title={`Delete path ${id}`}
                  style={{
                    padding:'0 3px', borderRadius:3, fontSize:10,
                    cursor:'pointer', border:'1px solid #333',
                    background:'transparent', color:'#666', lineHeight:1,
                  }}>×</button>
              </span>
            );
          })}

          {/* Add path button */}
          {canAdd && (
            <button onClick={addPath}
              style={{
                padding:'2px 10px', borderRadius:4, fontSize:11, fontWeight:'bold',
                cursor:'pointer', border:'1.5px solid #4ade80',
                background:'transparent', color:'#4ade80',
              }}>+ Add spline</button>
          )}

          <button onClick={() => setSelectedPath(null)}
            style={{
              padding:'2px 8px', borderRadius:4, fontSize:11,
              cursor:'pointer', border:'1.5px solid #333',
              background:'transparent', color:'#555',
            }}>✕</button>
        </div>
      </div>

      {/* ── SVG Canvas ─────────────────────────────────────────────────────── */}
      <svg ref={svgRef}
        style={{ flex:1, width:'100%', display:'block' }}
        viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={onSvgMove}
        onPointerUp={onSvgUp}
      >
        <rect x={VB_X} y={VB_Y} width={VB_W} height={VB_H} fill="#0f0f1a" />

        {/* Grid */}
        {[-400,-300,-200,-100,0,100,200,300,400,500].map(gx => (
          <line key={gx} x1={gx} y1={VB_Y} x2={gx} y2={VB_Y+VB_H}
            stroke={gx===0||gx===200?'#2a2a4a':'#181828'} strokeWidth={0.5} />
        ))}
        <line x1={VB_X} y1={0}  x2={VB_X+VB_W} y2={0}  stroke="#2a2a4a" strokeWidth={0.8} />
        <line x1={VB_X} y1={70} x2={VB_X+VB_W} y2={70} stroke="#2a2a4a" strokeWidth={0.8} />

        {/* Container box */}
        <rect x={0} y={0} width={200} height={70} fill="#151525" stroke="#2a2a5a" strokeWidth={1} />
        <text x={100} y={40} textAnchor="middle" fill="#20203a" fontSize={9} style={{pointerEvents:'none'}}>
          container 200×70
        </text>

        {/* Crystal */}
        <rect x={64} y={-85} width={72} height={82} rx={5}
          fill="#1a1a3f" stroke="#6366f1" strokeWidth={1} />
        <text x={100} y={-52} textAnchor="middle" fill="#818cf8" fontSize={9}>CRYSTAL</text>
        <text x={100} y={-40} textAnchor="middle" fill="#4a4a88" fontSize={7}>72 px · center x=100</text>
        <circle cx={100} cy={0} r={2} fill="#6366f1" opacity={0.6} />

        {/* Player aura */}
        <ellipse cx={100} cy={120} rx={72} ry={54}
          fill="none" stroke="#22c55e" strokeWidth={1}
          strokeDasharray="5 4" strokeOpacity={0.4} />
        <ellipse cx={100} cy={120} rx={36} ry={27}
          fill="#0a1a0a" stroke="#16a34a" strokeWidth={0.5} strokeOpacity={0.3} />
        <text x={100} y={124} textAnchor="middle" fill="#4ade80" fontSize={9} opacity={0.6}>
          PLAYER AURA
        </text>

        {/* Labels */}
        <text x={3}   y={-3} fill="#2a2a5a" fontSize={7}>x=0</text>
        <text x={197} y={-3} fill="#2a2a5a" fontSize={7} textAnchor="end">x=200</text>
        <text x={103} y={-3} fill="#2a2a5a" fontSize={7}>x=100</text>
        <text x={VB_X+4} y={-2} fill="#2a2a5a" fontSize={7}>y=0</text>
        <text x={VB_X+4} y={68} fill="#2a2a5a" fontSize={7}>y=70</text>

        {/* Paths */}
        {Object.keys(paths).map(id => renderPath(id))}
      </svg>

      {/* ── Bottom panel ───────────────────────────────────────────────────── */}
      <div style={{
        display:'flex', height:170, flexShrink:0,
        background:'#0b0b18', borderTop:'1px solid #2a2a4a',
      }}>
        {/* CSS preview */}
        <pre style={{
          flex:1, margin:0, padding:'8px 14px',
          color:'#67e8f9', fontSize:11, overflowY:'auto',
          whiteSpace:'pre', lineHeight:1.6,
        }}>{cssLines}</pre>

        {/* Right sidebar */}
        <div style={{
          width:220, padding:'10px 12px', borderLeft:'1px solid #2a2a4a',
          display:'flex', flexDirection:'column', gap:6,
        }}>
          {/* Selected path info */}
          {selP ? (
            <div style={{ fontSize:10, lineHeight:1.7 }}>
              <div style={{ color:selClr, fontWeight:'bold', marginBottom:4 }}>
                Path {selectedPath} · {RUNG_LABELS[selRung]}
              </div>
              <div style={{ color:'#888' }}>
                <div>M  {selP[0]} {selP[1]}</div>
                <div>C  {selP[2]} {selP[3]},</div>
                <div>   {selP[4]} {selP[5]},</div>
                <div>   {selP[6]} {selP[7]}</div>
              </div>
              {/* Rung tier selector */}
              <div style={{ marginTop:6, display:'flex', gap:4 }}>
                {[0, 2, 4].map(r => (
                  <button key={r} onClick={() => setRung(selectedPath, r)}
                    style={{
                      flex:1, padding:'3px 0', borderRadius:3, fontSize:10,
                      cursor:'pointer', border:`1px solid ${RUNG_COLORS[r]}`,
                      background: selRung === r ? RUNG_COLORS[r] : 'transparent',
                      color: selRung === r ? '#fff' : RUNG_COLORS[r],
                    }}>{RUNG_LABELS[r]}</button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color:'#444', fontSize:10, lineHeight:1.6 }}>
              Click a curve or chip to select.<br />
              <span style={{ color:RUNG_COLORS[0] }}>■ blue = always on</span><br />
              <span style={{ color:RUNG_COLORS[2] }}>■ orange = rung 2+</span><br />
              <span style={{ color:RUNG_COLORS[4] }}>■ red = rung 4+</span>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:'auto' }}>
            <button onClick={doCopy} style={btn('#1e3a5f','#60a5fa','#2563eb')}>
              {copied ? '✓ Copied!' : '📋 Copy CSS'}
            </button>
            <button onClick={doSave} disabled={saveStatus==='saving'}
              style={btn(
                saveStatus==='error' ? '#3f0000' : '#0f2a1a',
                saveStatus==='error' ? '#f87171' : saveStatus==='saved' ? '#4ade80' : '#86efac',
                saveStatus==='error' ? '#ef4444' : '#16a34a',
              )}>
              {saveStatus==='saving' ? '⏳ Saving…'
               : saveStatus==='saved'  ? '✓ Saved!'
               : saveStatus==='error'  ? '✗ Error — use Copy'
               : '💾 Save to files'}
            </button>
            <button onClick={doReset} style={btn('#1a1a1a','#555','#333')}>
              ↩ Reset to defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function btn(bg, fg, border) {
  return {
    padding:'5px 10px', borderRadius:4, cursor:'pointer', fontSize:11,
    border:`1px solid ${border}`, background:bg, color:fg, fontFamily:'inherit',
  };
}
