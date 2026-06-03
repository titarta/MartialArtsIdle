import { useState, useRef } from 'react';
import {
  getAudioTimeline,
  saveAudioTimeline,
  resetAudioTimeline,
  AUDIO_TIMELINE_DEFAULTS,
} from '../data/audioTimeline';

/**
 * Audio Lab: designer-only timeline tool for placing the per-beat sounds of the
 * crystal-evolution and major-breakthrough cinematics. Reached via ?audioLab in
 * dev or the deployed designer build (tree-shaken out of ship builds; see the
 * HomeScreen AUDIO_LAB_ON mount guard).
 *
 * Drag a sound marker along the timeline (or nudge it) to set when it fires,
 * relative to the overlay mount. Reference lines mark the animation's visual
 * beats so a riser can be placed AHEAD of its beat. Replay runs the REAL
 * cinematic with the current timings so you see + hear the alignment. Tunings
 * persist to localStorage (the live game uses them immediately); Export gives
 * the JSON to bake into data/audioTimeline.js.
 */

const COLORS = ['#f5c842', '#56d364', '#58a6ff', '#f78fb3', '#c084fc'];

export default function AudioLab() {
  const [tl, setTl]   = useState(() => getAudioTimeline());
  const [showExport, setShowExport] = useState(false);
  const [collapsed, setCollapsed]   = useState(false);

  const commit = (next) => { setTl(next); saveAudioTimeline(next); };

  const setSoundT = (key, id, t) => {
    const next = structuredClone(tl);
    const seq  = next[key];
    const s = seq.sounds.find((x) => x.id === id);
    if (s) s.t = Math.max(0, Math.min(seq.playMs, Math.round(t)));
    commit(next);
  };

  const resetSeq = (key) => {
    const next = structuredClone(tl);
    next[key].sounds = structuredClone(AUDIO_TIMELINE_DEFAULTS[key].sounds);
    commit(next);
  };

  const replay = (key) => {
    saveAudioTimeline(tl); // the overlay reads localStorage on mount
    if (key === 'crystal') {
      window.dispatchEvent(new CustomEvent('mai:crystal-evolve', {
        detail: { previousTier: 1, newTier: 2, newLevel: 10 },
      }));
    } else {
      window.dispatchEvent(new CustomEvent('mai:char-evolve', {
        detail: { newRealmIndex: 24, realmName: 'Audio Lab' },
      }));
    }
  };

  const exportJson = JSON.stringify(
    Object.fromEntries(Object.keys(tl).map((k) => [k, { sounds: tl[k].sounds.map(({ id, t }) => ({ id, t })) }])),
    null, 2,
  );

  return (
    <div style={S.panel}>
      <div style={S.titleRow}>
        <strong style={{ color: '#f5c842' }}>Audio Lab</strong>
        <span style={S.hint}>drag a marker or nudge to time each sound, then Replay</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button style={S.btn} onClick={() => setShowExport((x) => !x)}>{showExport ? 'Hide JSON' : 'Export'}</button>
          <button style={S.btn} onClick={() => { resetAudioTimeline(); setTl(getAudioTimeline()); }}>Reset all</button>
          <button style={S.btn} onClick={() => setCollapsed((x) => !x)}>{collapsed ? '▲' : '▼'}</button>
        </div>
      </div>

      {!collapsed && Object.keys(tl).map((key) => (
        <Sequence key={key} seq={tl[key]} onSetT={(id, t) => setSoundT(key, id, t)} onReplay={() => replay(key)} onReset={() => resetSeq(key)} />
      ))}

      {showExport && (
        <div style={{ padding: '6px 10px' }}>
          <div style={S.hint}>Paste these `t` values into AUDIO_TIMELINE_DEFAULTS in data/audioTimeline.js:</div>
          <textarea readOnly value={exportJson} style={S.export} onFocus={(e) => e.target.select()} />
        </div>
      )}
    </div>
  );
}

function Sequence({ seq, onSetT, onReplay, onReset }) {
  const barRef = useRef(null);
  const pct = (t) => `${(t / seq.playMs) * 100}%`;

  const startDrag = (id) => (e) => {
    e.preventDefault();
    const bar = barRef.current;
    const toT = (clientX) => {
      const r = bar.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * seq.playMs;
    };
    const move = (ev) => onSetT(id, toT(ev.clientX ?? ev.touches?.[0]?.clientX ?? 0));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    move(e); // jump to grab point immediately
  };

  return (
    <div style={S.seq}>
      <div style={S.seqHead}>
        <strong>{seq.label}</strong>
        <span style={S.hint}>{seq.playMs}ms</span>
        <button style={{ ...S.btn, ...S.replay }} onClick={onReplay}>▶ Replay</button>
        <button style={S.btn} onClick={onReset}>Reset</button>
      </div>

      <div ref={barRef} style={S.bar}>
        {/* Visual beat reference lines */}
        {seq.beats.map((b) => (
          <div key={b.label} style={{ ...S.beat, left: `${b.pct}%` }}>
            <span style={S.beatLabel}>{b.label}</span>
          </div>
        ))}
        {/* Draggable sound markers */}
        {seq.sounds.map((s, i) => (
          <div
            key={s.id}
            onPointerDown={startDrag(s.id)}
            title={`${s.id} @ ${s.t}ms`}
            style={{ ...S.marker, left: pct(s.t), borderColor: COLORS[i % COLORS.length], color: COLORS[i % COLORS.length] }}
          >
            {s.label}
          </div>
        ))}
      </div>

      <div style={S.rows}>
        {seq.sounds.map((s, i) => (
          <div key={s.id} style={S.row}>
            <span style={{ color: COLORS[i % COLORS.length], minWidth: 70 }}>{s.label}</span>
            <button style={S.nudge} onClick={() => onSetT(s.id, s.t - 50)}>-50</button>
            <button style={S.nudge} onClick={() => onSetT(s.id, s.t - 10)}>-10</button>
            <input
              type="number" value={s.t} step={10}
              onChange={(e) => onSetT(s.id, Number(e.target.value))}
              style={S.num}
            />
            <span style={S.hint}>ms</span>
            <button style={S.nudge} onClick={() => onSetT(s.id, s.t + 10)}>+10</button>
            <button style={S.nudge} onClick={() => onSetT(s.id, s.t + 50)}>+50</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const S = {
  panel: {
    position: 'fixed', left: 8, right: 8, bottom: 8, zIndex: 99999,
    background: 'rgba(12,14,18,0.96)', border: '1px solid #2a323c', borderRadius: 10,
    color: '#e6edf3', font: '12px ui-monospace, monospace', boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
    maxHeight: '70vh', overflowY: 'auto',
  },
  titleRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderBottom: '1px solid #2a323c' },
  hint: { color: '#8b949e', fontSize: 11 },
  seq: { padding: '8px 10px', borderBottom: '1px solid #1c232c' },
  seqHead: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 },
  bar: {
    position: 'relative', height: 30, background: '#161b22', border: '1px solid #2a323c',
    borderRadius: 6, marginBottom: 8, touchAction: 'none',
  },
  beat: { position: 'absolute', top: -14, bottom: 0, width: 1, background: 'rgba(139,148,158,0.5)' },
  beatLabel: { position: 'absolute', top: -2, left: 3, fontSize: 9, color: '#8b949e', whiteSpace: 'nowrap', transform: 'translateY(-100%)' },
  marker: {
    position: 'absolute', top: 3, bottom: 3, transform: 'translateX(-50%)',
    padding: '0 6px', display: 'flex', alignItems: 'center', cursor: 'ew-resize',
    background: 'rgba(0,0,0,0.6)', border: '1.5px solid', borderRadius: 5, fontSize: 10,
    fontWeight: 700, whiteSpace: 'nowrap', userSelect: 'none',
  },
  rows: { display: 'flex', flexDirection: 'column', gap: 4 },
  row: { display: 'flex', alignItems: 'center', gap: 6 },
  num: { width: 64, background: '#0d1116', color: '#e6edf3', border: '1px solid #2a323c', borderRadius: 4, padding: '2px 4px', font: 'inherit' },
  nudge: { background: '#1c232c', color: '#e6edf3', border: '1px solid #2a323c', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', font: 'inherit' },
  btn: { background: '#1c232c', color: '#e6edf3', border: '1px solid #2a323c', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', font: 'inherit' },
  replay: { borderColor: '#56d364', color: '#56d364' },
  export: { width: '100%', height: 120, background: '#0d1116', color: '#9cd2ff', border: '1px solid #2a323c', borderRadius: 6, font: '11px ui-monospace, monospace', marginTop: 4 },
};
