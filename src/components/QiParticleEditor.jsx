import { useState, useRef, useCallback, useMemo } from 'react';

// ── Path data — mirrors the CSS offset-path values in App.css ────────────────
// Format: [startX, startY, cp1X, cp1Y, cp2X, cp2Y, endX, endY]
// Coordinate space = the CSS path() space:
//   x=0..200  left–right of the 200px wide particle container
//   y=0       bottom of the crystal (top of the gap)
//   y≈70      top of the player / start of the aura
const INITIAL_PATHS = {
  A: [  10,  0,   30, 30,  140, 30,  100, 70],
  B: [  50,  0,   40, 30,  110, 50,  100, 70],
  C: [  80,  0,  110, 20,   70, 50,  100, 70],
  D: [ 120,  0,   90, 20,  130, 50,  100, 70],
  E: [ 150,  0,  160, 30,   90, 50,  100, 70],
  F: [ 190,  0,  170, 30,   60, 30,  100, 70],
  G: [  65, 12, -170, 18, -100, 62,   48, 82],
  H: [ 135, 12,  370, 18,  300, 62,  152, 82],
  I: [  48, 14, -295,  8, -210, 68,   28, 88],
  J: [ 152, 14,  495,  8,  410, 68,  172, 88],
};

const PATH_INFO = {
  A: { color: '#3b82f6', label: 'A · base',   rung: 0 },
  B: { color: '#60a5fa', label: 'B · base',   rung: 0 },
  C: { color: '#93c5fd', label: 'C · base',   rung: 0 },
  D: { color: '#93c5fd', label: 'D · base',   rung: 0 },
  E: { color: '#60a5fa', label: 'E · base',   rung: 0 },
  F: { color: '#3b82f6', label: 'F · base',   rung: 0 },
  G: { color: '#f97316', label: 'G · rung 2', rung: 2 },
  H: { color: '#f97316', label: 'H · rung 2', rung: 2 },
  I: { color: '#ef4444', label: 'I · rung 4', rung: 4 },
  J: { color: '#ef4444', label: 'J · rung 4', rung: 4 },
};

// SVG world-space viewport — must contain all extreme control points
const VB_X = -460, VB_Y = -100, VB_W = 1120, VB_H = 280;

// Point slots within the flat [x0,y0, cx1,cy1, cx2,cy2, x1,y1] array
const PT_START = 0;
const PT_CP1   = 1;
const PT_CP2   = 2;
const PT_END   = 3;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCoords(path, pt) {
  return [path[pt * 2], path[pt * 2 + 1]];
}

function svgPoint(svgEl, clientX, clientY) {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(svgEl.getScreenCTM().inverse());
}

function formatPath(name, p) {
  const [x0, y0, cx1, cy1, cx2, cy2, x1, y1] = p.map(Math.round);
  // Right-align numbers to match existing code style
  const pad = (n, w = 4) => String(n).padStart(w);
  return `.home-qi-particle-path${name} { offset-path: path('M ${pad(x0)} ${pad(y0)} C ${pad(cx1)} ${pad(cy1)}, ${pad(cx2)} ${pad(cy2)}, ${pad(x1)} ${pad(y1)}'); }`;
}

// ── Editor ───────────────────────────────────────────────────────────────────

export default function QiParticleEditor() {
  const [paths, setPaths] = useState(() =>
    Object.fromEntries(
      Object.entries(INITIAL_PATHS).map(([k, v]) => [k, [...v]])
    )
  );
  const [selectedPath, setSelectedPath] = useState(null);
  const [dragging,     setDragging]     = useState(null); // { pathId, pt }
  const [saveStatus,   setSaveStatus]   = useState('idle');
  const [copied,       setCopied]       = useState(false);
  const svgRef = useRef(null);

  // ── CSS output ─────────────────────────────────────────────────────────────
  const cssLines = useMemo(() => {
    const pathIds = Object.keys(INITIAL_PATHS);
    return pathIds.map(id => formatPath(id, paths[id])).join('\n');
  }, [paths]);

  // ── Drag handling ───────────────────────────────────────────────────────────
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

  // ── Save to file via Vite dev-server middleware ───────────────────────────
  const doSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/__particle-save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          paths: Object.fromEntries(
            Object.entries(paths).map(([k, v]) => [k, v.map(Math.round)])
          ),
        }),
      });
      const json = await res.json();
      setSaveStatus(json.ok ? 'saved' : 'error');
    } catch {
      setSaveStatus('error');
    }
    setTimeout(() => setSaveStatus('idle'), 2500);
  }, [paths]);

  const doCopy = useCallback(() => {
    navigator.clipboard.writeText(cssLines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [cssLines]);

  const doReset = useCallback(() => {
    setPaths(Object.fromEntries(
      Object.entries(INITIAL_PATHS).map(([k, v]) => [k, [...v]])
    ));
  }, []);

  // ── Render a single path with handles ──────────────────────────────────────
  function renderOnePath(pathId) {
    const p      = paths[pathId];
    const info   = PATH_INFO[pathId];
    const isSel  = selectedPath === pathId;
    const [x0, y0]    = getCoords(p, PT_START);
    const [cx1, cy1]  = getCoords(p, PT_CP1);
    const [cx2, cy2]  = getCoords(p, PT_CP2);
    const [x1, y1]    = getCoords(p, PT_END);
    const d = `M ${x0} ${y0} C ${cx1} ${cy1} ${cx2} ${cy2} ${x1} ${y1}`;
    const baseOpacity = isSel ? 1 : 0.45;

    return (
      <g key={pathId}>

        {/* ── Bezier curve ── */}
        <path
          d={d}
          stroke={info.color}
          strokeWidth={isSel ? 2 : 1.2}
          fill="none"
          strokeOpacity={baseOpacity}
          style={{ cursor: 'pointer' }}
          onClick={() => setSelectedPath(isSel ? null : pathId)}
        />

        {/* ── Animated particle preview (3 dots staggered) ── */}
        {[0, 0.33, 0.66].map(offset => (
          <circle key={offset} r={isSel ? 4 : 2.5} fill={info.color} opacity={isSel ? 0.9 : 0.4}>
            <animateMotion
              dur="2.4s"
              begin={`${-(offset * 2.4).toFixed(2)}s`}
              repeatCount="indefinite"
              path={d}
            />
          </circle>
        ))}

        {/* ── Guide lines (selected only) ── */}
        {isSel && (
          <>
            <line x1={x0} y1={y0} x2={cx1} y2={cy1}
              stroke={info.color} strokeWidth={0.8}
              strokeDasharray="4 3" strokeOpacity={0.5} />
            <line x1={x1} y1={y1} x2={cx2} y2={cy2}
              stroke={info.color} strokeWidth={0.8}
              strokeDasharray="4 3" strokeOpacity={0.5} />
          </>
        )}

        {/* ── START handle (filled circle) ── */}
        <circle
          cx={x0} cy={y0} r={isSel ? 6 : 4}
          fill={info.color} stroke="#fff" strokeWidth={1}
          opacity={baseOpacity}
          style={{ cursor: 'grab' }}
          onPointerDown={e => onHandleDown(e, pathId, PT_START)}
        />

        {/* ── CP1 handle (open square, selected only) ── */}
        {isSel && (
          <rect
            x={cx1 - 5} y={cy1 - 5} width={10} height={10}
            fill="#1a1a2e" stroke={info.color} strokeWidth={1.5}
            style={{ cursor: 'grab' }}
            onPointerDown={e => onHandleDown(e, pathId, PT_CP1)}
          />
        )}
        {isSel && (
          <text x={cx1} y={cy1 - 8} textAnchor="middle"
            fill={info.color} fontSize={7} style={{ pointerEvents: 'none' }}>①</text>
        )}

        {/* ── CP2 handle (open square, selected only) ── */}
        {isSel && (
          <rect
            x={cx2 - 5} y={cy2 - 5} width={10} height={10}
            fill="#1a1a2e" stroke={info.color} strokeWidth={1.5}
            style={{ cursor: 'grab' }}
            onPointerDown={e => onHandleDown(e, pathId, PT_CP2)}
          />
        )}
        {isSel && (
          <text x={cx2} y={cy2 - 8} textAnchor="middle"
            fill={info.color} fontSize={7} style={{ pointerEvents: 'none' }}>②</text>
        )}

        {/* ── END handle (filled circle) ── */}
        <circle
          cx={x1} cy={y1} r={isSel ? 6 : 4}
          fill={info.color} stroke="#fff" strokeWidth={1}
          strokeDasharray={isSel ? 'none' : '2 2'}
          opacity={baseOpacity}
          style={{ cursor: 'grab' }}
          onPointerDown={e => onHandleDown(e, pathId, PT_END)}
        />
      </g>
    );
  }

  // ── Coordinate readout for selected path ──────────────────────────────────
  const selP   = selectedPath ? paths[selectedPath] : null;
  const selClr = selectedPath ? PATH_INFO[selectedPath].color : '#888';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#0f0f1a', color: '#ccc',
      fontFamily: '"Courier New", monospace', fontSize: 12,
      userSelect: 'none',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 14px', background: '#13132a',
        borderBottom: '1px solid #2a2a4a', flexShrink: 0,
      }}>
        <strong style={{ color: '#a78bfa', fontSize: 13 }}>⚡ Qi Particle Path Editor</strong>
        <span style={{ color: '#555', fontSize: 11 }}>
          Click a curve or its start/end dot to select · drag ●START ■① ■② ●END handles · 💾 saves to App.css
        </span>

        {/* Path selector chips */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {Object.entries(PATH_INFO).map(([id, info]) => {
            const isSel = selectedPath === id;
            return (
              <button key={id}
                onClick={() => setSelectedPath(isSel ? null : id)}
                style={{
                  padding: '2px 9px', borderRadius: 4, fontSize: 11, fontWeight: 'bold',
                  cursor: 'pointer', border: `1.5px solid ${info.color}`,
                  background: isSel ? info.color : 'transparent',
                  color: isSel ? '#fff' : info.color,
                  transition: 'all 0.1s',
                }}
              >{id}</button>
            );
          })}
          <button onClick={() => setSelectedPath(null)}
            style={{
              padding: '2px 9px', borderRadius: 4, fontSize: 11,
              cursor: 'pointer', border: '1.5px solid #444',
              background: 'transparent', color: '#666',
            }}>✕ none</button>
        </div>
      </div>

      {/* ── SVG Canvas ─────────────────────────────────────────────────────── */}
      <svg
        ref={svgRef}
        style={{ flex: 1, width: '100%', display: 'block' }}
        viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={onSvgMove}
        onPointerUp={onSvgUp}
      >
        {/* Background */}
        <rect x={VB_X} y={VB_Y} width={VB_W} height={VB_H} fill="#0f0f1a" />

        {/* Faint vertical grid at key x positions */}
        {[-400, -300, -200, -100, 0, 100, 200, 300, 400, 500].map(gx => (
          <line key={gx} x1={gx} y1={VB_Y} x2={gx} y2={VB_Y + VB_H}
            stroke={gx === 0 || gx === 200 ? '#2a2a4a' : '#181828'}
            strokeWidth={gx === 100 ? 0.8 : 0.5}
            strokeDasharray={gx === 100 ? '6 4' : 'none'} />
        ))}
        {/* Horizontal at y=0 and y=70 */}
        <line x1={VB_X} y1={0}  x2={VB_X + VB_W} y2={0}  stroke="#2a2a4a" strokeWidth={0.8} />
        <line x1={VB_X} y1={70} x2={VB_X + VB_W} y2={70} stroke="#2a2a4a" strokeWidth={0.8} />

        {/* Container rect — the gap between crystal and player */}
        <rect x={0} y={0} width={200} height={70} fill="#151525" stroke="#2a2a5a" strokeWidth={1} />
        <text x={100} y={38} textAnchor="middle" fill="#2a2a5a" fontSize={9} style={{ pointerEvents: 'none' }}>
          particle container 200×70
        </text>

        {/* Crystal silhouette */}
        <rect x={64} y={-75} width={72} height={72} rx={6}
          fill="#1a1a3f" stroke="#6366f1" strokeWidth={1} />
        <text x={100} y={-46} textAnchor="middle" fill="#818cf8" fontSize={9}>CRYSTAL</text>
        <text x={100} y={-34} textAnchor="middle" fill="#4a4a88" fontSize={7}>72 px · center x=100</text>
        {/* Crystal bottom-centre indicator */}
        <circle cx={100} cy={0} r={2} fill="#6366f1" opacity={0.6} />

        {/* Player aura circle */}
        <ellipse cx={100} cy={112} rx={68} ry={50}
          fill="none" stroke="#22c55e" strokeWidth={1} strokeDasharray="5 4" strokeOpacity={0.5} />
        <ellipse cx={100} cy={112} rx={35} ry={26}
          fill="#0d1f0d" stroke="#16a34a" strokeWidth={0.5} strokeOpacity={0.4} />
        <text x={100} y={116} textAnchor="middle" fill="#4ade80" fontSize={9} opacity={0.7}>PLAYER AURA</text>

        {/* Corner labels */}
        <text x={3}   y={-3}  fill="#3a3a6a" fontSize={7}>x=0</text>
        <text x={197} y={-3}  fill="#3a3a6a" fontSize={7} textAnchor="end">x=200</text>
        <text x={103} y={-3}  fill="#3a3a6a" fontSize={7}>x=100</text>
        <text x={VB_X + 4} y={-2}  fill="#3a3a6a" fontSize={7}>y=0</text>
        <text x={VB_X + 4} y={68}  fill="#3a3a6a" fontSize={7}>y=70</text>

        {/* ── All paths ── */}
        {Object.keys(INITIAL_PATHS).map(id => renderOnePath(id))}
      </svg>

      {/* ── Bottom panel: CSS output + controls ────────────────────────────── */}
      <div style={{
        display: 'flex', height: 160, flexShrink: 0,
        background: '#0b0b18', borderTop: '1px solid #2a2a4a',
      }}>
        {/* CSS preview */}
        <pre style={{
          flex: 1, margin: 0, padding: '8px 14px',
          color: '#67e8f9', fontSize: 11, overflowY: 'auto',
          whiteSpace: 'pre', lineHeight: 1.6,
        }}>
          {cssLines}
        </pre>

        {/* Right sidebar: coordinate readout + action buttons */}
        <div style={{
          width: 200, padding: '10px 12px', borderLeft: '1px solid #2a2a4a',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {/* Coordinate display for selected path */}
          {selP ? (
            <div style={{ fontSize: 10, lineHeight: 1.7, color: '#888', marginBottom: 4 }}>
              <div style={{ color: selClr, fontWeight: 'bold', marginBottom: 2 }}>
                {PATH_INFO[selectedPath].label}
              </div>
              <div>M  {selP[0]} {selP[1]}</div>
              <div>C  {selP[2]} {selP[3]},</div>
              <div>   {selP[4]} {selP[5]},</div>
              <div>   {selP[6]} {selP[7]}</div>
            </div>
          ) : (
            <div style={{ color: '#444', fontSize: 10, lineHeight: 1.6 }}>
              Click a curve or header chip to select a path and see coordinates.
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 'auto' }}>
            <button onClick={doCopy} style={btnStyle('#1e3a5f', '#60a5fa', '#2563eb')}>
              {copied ? '✓ Copied!' : '📋 Copy CSS'}
            </button>
            <button onClick={doSave} disabled={saveStatus === 'saving'}
              style={btnStyle(
                saveStatus === 'error' ? '#3f0000' : '#0f2a1a',
                saveStatus === 'error' ? '#f87171' : saveStatus === 'saved' ? '#4ade80' : '#86efac',
                saveStatus === 'error' ? '#ef4444' : '#16a34a',
              )}>
              {saveStatus === 'saving' ? '⏳ Saving…'
                : saveStatus === 'saved'  ? '✓ Saved to App.css!'
                : saveStatus === 'error'  ? '✗ Error — copy instead'
                : '💾 Save to App.css'}
            </button>
            <button onClick={doReset} style={btnStyle('#1a1a1a', '#666', '#3a3a3a')}>
              ↩ Reset to current CSS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function btnStyle(bg, fg, border) {
  return {
    padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11,
    border: `1px solid ${border}`, background: bg, color: fg,
    fontFamily: 'inherit',
  };
}
