import { useState, useEffect, useRef } from 'react';
import { MiniGameResult } from './MiniGameMode';

const BASE = import.meta.env.BASE_URL;
const url = (s) => (typeof s === 'string' && s.startsWith('/')) ? `${BASE}${s.replace(/^\//, '')}` : s;

// ── STARTING VALUES (tune later) ───────────────────────────────────────────
const BREW_MS   = 6000;        // length of the flame phase
const TICK_MS   = 60;          // sim cadence
const DRIFT     = 0.16;        // heat lost per second when not stoking
const STOKE     = 0.14;        // heat gained per stoke tap
const ZONE      = [0.55, 0.82];// the "true flame" sweet band
const MAX_PICKS = 3;

const REAGENTS = [
  { id: 'jade',   name: 'Jade Heart Flower', sprite: '/sprites/items/jade_heart_flower.png' },
  { id: 'dragon', name: 'Dragon Saliva Grass', sprite: '/sprites/items/dragon_saliva_grass.png' },
  { id: 'flame',  name: 'Crimson Flame Crystal', sprite: '/sprites/items/crimson_flame_crystal.png' },
  { id: 'cold',   name: 'Deep Sea Cold Iron', sprite: '/sprites/items/deep_sea_cold_iron.png' },
  { id: 'dew',    name: 'Heaven Spirit Dew', sprite: '/sprites/items/heaven_spirit_dew.png' },
];

const RECIPES = [
  { has: ['jade', 'dew'],     pill: 'Profound Accumulation Pill', sprite: '/sprites/items/profound_accumulation_pill.png', buff: '+Qi/s for a time' },
  { has: ['flame', 'dragon'], pill: 'Breakthrough Golden Pill',   sprite: '/sprites/items/breakthrough_golden_pill.png',   buff: 'Surges breakthrough qi' },
];
const resolvePill = (picks) => {
  for (const r of RECIPES) if (r.has.every((h) => picks.includes(h))) return r;
  return { pill: 'Muddled Spirit Pill', sprite: '/sprites/items/profound_accumulation_pill.png', buff: 'A modest tonic' };
};

export default function PillRefinement({ ratePerSec, onAward }) {
  const [picks, setPicks]   = useState([]);
  const [phase, setPhase]   = useState('select');     // select | brew | result
  const [heat, setHeat]     = useState(0.3);
  const [inZone, setInZone] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const loop = useRef(null);
  const heatRef = useRef(0.3);

  useEffect(() => () => clearInterval(loop.current), []);

  const togglePick = (id) => {
    if (phase !== 'select') return;
    setPicks((p) => p.includes(id) ? p.filter((x) => x !== id) : (p.length >= MAX_PICKS ? p : [...p, id]));
  };

  const light = () => {
    if (picks.length === 0) return;
    setPhase('brew'); setHeat(0.3); heatRef.current = 0.3; setInZone(0); setElapsed(0);
    const dt = TICK_MS / 1000;
    loop.current = setInterval(() => {
      heatRef.current = Math.max(0, heatRef.current - DRIFT * dt);
      setHeat(heatRef.current);
      setInZone((z) => z + (heatRef.current >= ZONE[0] && heatRef.current <= ZONE[1] ? dt : 0));
      setElapsed((e) => {
        const ne = e + dt;
        if (ne >= BREW_MS / 1000) { clearInterval(loop.current); setPhase('result'); }
        return ne;
      });
    }, TICK_MS);
  };

  const stoke = () => {
    if (phase !== 'brew') return;
    heatRef.current = Math.min(1, heatRef.current + STOKE);
    setHeat(heatRef.current);
  };

  const reset = () => { setPicks([]); setPhase('select'); setHeat(0.3); setInZone(0); setElapsed(0); };

  const performance = elapsed > 0 ? Math.min(1, inZone / (BREW_MS / 1000)) : 0;
  const pill = resolvePill(picks);
  const inBand = heat >= ZONE[0] && heat <= ZONE[1];

  return (
    <div className="rf">
      {phase === 'select' && (
        <>
          <div className="rf-prompt">Fold up to {MAX_PICKS} reagents into the cauldron.</div>
          <div className="rf-tray">
            {REAGENTS.map((r) => {
              const on = picks.includes(r.id);
              return (
                <button key={r.id} type="button" className={`rf-reagent${on ? ' rf-reagent-on' : ''}`} onClick={() => togglePick(r.id)}>
                  <img src={url(r.sprite)} alt="" draggable={false} />
                  <span className="rf-reagent-name">{r.name}</span>
                </button>
              );
            })}
          </div>
          <div className="rf-foretell">Likely yield: <strong>{pill.pill}</strong></div>
          <div className="rf-actionbar">
            <button type="button" className="mg-btn mg-btn-primary" disabled={picks.length === 0} onClick={light}>
              Light the furnace
            </button>
          </div>
        </>
      )}

      {phase === 'brew' && (
        <div className="rf-brew">
          <div className="rf-gauge">
            <div className="rf-zone" style={{ bottom: `${ZONE[0] * 100}%`, height: `${(ZONE[1] - ZONE[0]) * 100}%` }} />
            <div className={`rf-heat${inBand ? ' rf-heat-true' : ''}`} style={{ height: `${heat * 100}%` }} />
            <div className="rf-needle" style={{ bottom: `${heat * 100}%` }} />
          </div>
          <div className="rf-brew-side">
            <div className="rf-readout">
              <span className="rf-readout-label">Flame</span>
              <span className={`rf-readout-state${inBand ? ' rf-readout-true' : ''}`}>{inBand ? 'True' : heat < ZONE[0] ? 'Cold' : 'Wild'}</span>
            </div>
            <div className="rf-progress"><div className="rf-progress-fill" style={{ width: `${(elapsed / (BREW_MS / 1000)) * 100}%` }} /></div>
            <button type="button" className="mg-btn mg-btn-primary rf-stoke" onClick={stoke}>Stoke 火</button>
            <div className="rf-tip">Keep the flame in the band until the pill sets.</div>
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className="rf-result-wrap">
          <div className="rf-pill">
            <img src={url(pill.sprite)} alt="" draggable={false} />
            <div className="rf-pill-name">{pill.pill}</div>
            <div className="rf-pill-buff">{pill.buff}</div>
          </div>
          <MiniGameResult
            ratePerSec={ratePerSec}
            performance01={performance}
            label={performance >= 0.66 ? 'Flawless refinement' : performance >= 0.4 ? 'Stable pill' : 'Cracked pill'}
            onCollect={(qi) => { onAward?.(qi); reset(); }}
            onAgain={reset}
            againLabel="New brew"
          />
        </div>
      )}
    </div>
  );
}
