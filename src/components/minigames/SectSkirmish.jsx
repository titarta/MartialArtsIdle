import { useState, useEffect, useRef, useMemo } from 'react';
import { fmt } from '../../utils/format';
import {
  REGIMENS, REGIMEN_BY_ID,
  loadArmy, saveArmy, resolveDrill, defaultArmy,
  perDiscipleStr, drillLevel, armyPower, marchReward,
  DEV_MIN_TROOPS, pickFoe, tokenLayout, MAX_TOKENS,
  TACTICS, startingVigor, pushCost, pushCostRange, rollPushCost, rallyAmount, BUST_PENALTY,
} from '../../data/discipleArmy';
import SectMerge from './SectMerge';

function fmtDur(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

const START_TACTICS = { brace: 1, rally: 1, surge: 1 };

export default function SectSkirmish({ owned, ratePerSec, onAward, recruit }) {
  const troops = Math.max(owned || 0, DEV_MIN_TROOPS);

  const [army, setArmy]   = useState(defaultArmy);
  const [tab, setTab]     = useState('war');
  const [foe, setFoe]     = useState(pickFoe);
  const [now, setNow]     = useState(Date.now());

  // Climb state
  const [phase, setPhase]   = useState('idle');   // idle | climbing | result
  const [wave, setWave]     = useState(0);
  const [vigor, setVigor]   = useState(0);
  const [vigorMax, setVigorMax] = useState(0);
  const [tactics, setTactics]   = useState(START_TACTICS);
  const [braced, setBraced]     = useState(false);
  const [pushing, setPushing]   = useState(false);
  const [result, setResult]     = useState(null);
  const timers = useRef([]);

  useEffect(() => {
    const resolved = resolveDrill(loadArmy());
    saveArmy(resolved); setArmy(resolved);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (army.status !== 'drilling') return undefined;
    const id = setInterval(() => {
      setNow(Date.now());
      setArmy(prev => { if (prev.status !== 'drilling') return prev; const n = resolveDrill(prev); if (n !== prev) saveArmy(n); return n; });
    }, 1000);
    return () => clearInterval(id);
  }, [army.status]);

  const power  = useMemo(() => armyPower(troops, army.trainBonus), [troops, army.trainBonus]);
  const perStr = perDiscipleStr(army.trainBonus);
  const level  = drillLevel(army.trainBonus);
  const tier   = 1 + army.trainBonus;
  const tierCls = tier >= 1.6 ? 't3' : tier >= 1.25 ? 't2' : '';
  const commit = (next) => { saveArmy(next); setArmy(next); };

  const youCount = Math.min(MAX_TOKENS, Math.max(6, troops));
  const youPts = useMemo(() => tokenLayout('spear', youCount, { lo: 56, hi: 88 }), [youCount]);
  const foePts = useMemo(() => tokenLayout(foe.id, 12, { lo: 8, hi: 32 }), [foe]);

  const recruitCost = recruit?.cost ?? 0;
  const canRecruit  = !!recruit && recruit.qi >= recruitCost && phase === 'idle';

  // ── Climb ─────────────────────────────────────────────────────────────────
  const spoils = useMemo(() => marchReward(wave, army.bestWave, ratePerSec), [wave, army.bestWave, ratePerSec]);
  const [costLo, costHi] = pushCostRange(wave);
  const risky = vigor <= costHi;     // a push could break the line

  const beginAssault = () => {
    if (army.status !== 'ready' || phase !== 'idle') return;
    const v = startingVigor(power);
    setVigor(v); setVigorMax(v); setWave(0); setTactics(START_TACTICS);
    setBraced(false); setResult(null); setPhase('climbing');
  };

  const flashPush = () => { setPushing(true); timers.current.push(setTimeout(() => setPushing(false), 280)); };

  const finish = (atWave, busted) => {
    const r = marchReward(atWave, army.bestWave, ratePerSec);
    setResult({
      wave: atWave, busted,
      qi: busted ? r.qi * BUST_PENALTY : r.qi,
      minutes: busted ? r.minutes * BUST_PENALTY : r.minutes,
      isRecord: !busted && r.isRecord,
    });
    setPhase('result');
    commit({ ...army, status: 'spent', bestWave: Math.max(army.bestWave, atWave) });
  };

  const push = () => {
    if (phase !== 'climbing') return;
    if (braced) { setBraced(false); setWave(w => w + 1); flashPush(); return; }
    const cost = rollPushCost(wave);
    const nv = vigor - cost;
    if (nv <= 0) { flashPush(); finish(wave, true); }   // the line breaks at the wave reached
    else { setVigor(nv); setWave(w => w + 1); flashPush(); }
  };
  const bank = () => { if (phase === 'climbing') finish(wave, false); };

  const useTactic = (id) => {
    if (phase !== 'climbing' || (tactics[id] || 0) <= 0) return;
    setTactics(t => ({ ...t, [id]: t[id] - 1 }));
    if (id === 'brace') setBraced(true);
    else if (id === 'rally') setVigor(v => Math.min(vigorMax, v + rallyAmount(power)));
    else if (id === 'surge') { setWave(w => w + 2); flashPush(); }
  };

  const collect = () => {
    if (result) onAward?.(result.qi);
    setResult(null); setPhase('idle'); setWave(0); setFoe(pickFoe()); setTab('drill');
  };

  // ── Drill ───────────────────────────────────────────────────────────────────
  const startDrill = (reg) => {
    if (army.status === 'drilling') return;
    const t = Date.now();
    commit({ ...army, status: 'drilling', drill: { regimen: reg.id, startedAt: t, endsAt: t + reg.ms } });
  };
  const skipDrillDev = () => { if (army.status === 'drilling') commit(resolveDrill({ ...army, drill: { ...army.drill, endsAt: Date.now() } })); };
  const drillReg = army.drill ? REGIMEN_BY_ID[army.drill.regimen] : null;
  const drillRemain = army.drill ? army.drill.endsAt - now : 0;
  const drillPct = drillReg ? Math.min(1, 1 - drillRemain / drillReg.ms) : 0;

  const hostShift = phase === 'climbing' ? Math.min(34, wave * 2.5) : 0;

  return (
    <div className="da">
      {/* Army Power */}
      <div className="da-power">
        <div className="da-power-glyph" aria-hidden="true">兵</div>
        <div className="da-power-main">
          <div className="da-power-label">Army Power</div>
          <div className="da-power-value">{fmt(power)}</div>
          <div className="da-power-sub">{fmt(troops)} disciples × {perStr.toFixed(1)} might</div>
        </div>
        <div className="da-power-best">
          <div className="da-power-best-label">Furthest</div>
          <div className="da-power-best-val">Wave {army.bestWave}</div>
        </div>
      </div>

      {/* Grow levers */}
      <div className="da-grow">
        <button type="button" className="da-lever" disabled={!canRecruit} onClick={() => recruit?.buy()}>
          <span className="da-lever-glyph">徵</span>
          <span className="da-lever-body">
            <span className="da-lever-name">Recruit ×{recruit?.batch ?? 10}</span>
            <span className="da-lever-sub">More disciples · also grows Qi income</span>
          </span>
          <span className="da-lever-cost">{recruit ? fmt(recruitCost) : '—'}<span className="da-lever-unit"> Qi</span></span>
        </button>
        <button type="button" className="da-lever" onClick={() => setTab('drill')}>
          <span className="da-lever-glyph">練</span>
          <span className="da-lever-body">
            <span className="da-lever-name">Drill</span>
            <span className="da-lever-sub">Stronger disciples · costs time</span>
          </span>
          <span className="da-lever-cost da-lever-cost-time">Time ›</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="da-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'war'}
          className={`da-tab${tab === 'war' ? ' da-tab-on' : ''}`} onClick={() => setTab('war')}>
          <span className="da-tab-glyph">戰</span> War Front
        </button>
        <button type="button" role="tab" aria-selected={tab === 'drill'}
          className={`da-tab${tab === 'drill' ? ' da-tab-on' : ''}`} onClick={() => setTab('drill')}>
          <span className="da-tab-glyph">練</span> Drill Grounds
          {army.status === 'drilling' && <span className="da-tab-dot" aria-hidden="true" />}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'promote'}
          className={`da-tab${tab === 'promote' ? ' da-tab-on' : ''}`} onClick={() => setTab('promote')}>
          <span className="da-tab-glyph">升</span> Promotions
        </button>
      </div>

      {/* ─── WAR FRONT ─────────────────────────────────────────────────────── */}
      {tab === 'war' && (
        <div className="da-war">
          {phase === 'idle' && army.status === 'spent' && (
            <div className="da-spent">
              <div className="da-spent-glyph" aria-hidden="true">⚑</div>
              <div className="da-spent-title">Your army is spent</div>
              <div className="da-spent-text">They cannot march again until they recover. Send them to drill.</div>
              <button type="button" className="mg-btn mg-btn-primary" onClick={() => setTab('drill')}>To the Drill Grounds →</button>
            </div>
          )}
          {phase === 'idle' && army.status === 'drilling' && (
            <div className="da-spent">
              <div className="da-spent-glyph" aria-hidden="true">練</div>
              <div className="da-spent-title">The army is in seclusion</div>
              <div className="da-spent-text">Drilling completes in {fmtDur(drillRemain)}.</div>
            </div>
          )}

          {(army.status === 'ready' || phase !== 'idle') && (
            <>
              {/* Battlefield */}
              <div className={`da-field shape-spear patt-${foe.id}${pushing ? ' da-pushing' : ''}${result?.busted ? ' da-broken shake' : ''}`}>
                <div className="da-clashline" aria-hidden="true" />
                <div className="da-zone da-zone-foe">{phase === 'climbing' ? 'The line ahead' : 'The gauntlet'}</div>
                <div className="da-host da-host-foe">
                  {foePts.map((p, i) => <span key={i} className="da-unit u-foe" style={{ left: `${p.x}%`, top: `${p.y}%` }} />)}
                </div>
                <div className="da-host da-host-you" style={{ transform: `translateY(-${hostShift}%)` }}>
                  {youPts.map((p, i) => <span key={i} className={`da-unit u-you ${tierCls}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} />)}
                </div>
                <div className="da-zone da-zone-you">Your host</div>

                {phase === 'climbing' && (
                  <div className="da-wave-overlay">
                    <div className="da-wave-label">Wave</div>
                    <div className="da-wave-num">{wave}</div>
                  </div>
                )}
                {phase === 'result' && result && (
                  <div className="da-field-result">
                    {result.isRecord && <div className="da-record">◈ New Record ◈</div>}
                    <div className="da-fr-title">{result.busted ? `The line broke at Wave ${result.wave}` : `Banked at Wave ${result.wave}`}</div>
                    <div className="da-fr-qi">+{fmt(Math.round(result.qi))}<span> Qi</span></div>
                    <div className="da-fr-min">≈ {result.minutes.toFixed(1)} min{result.busted ? ' · spoils lost to the rout' : ' of production'}</div>
                    <button type="button" className="mg-btn mg-btn-primary" onClick={collect}>Collect &amp; regroup</button>
                  </div>
                )}
              </div>

              {/* Pre-assault */}
              {phase === 'idle' && army.status === 'ready' && (
                <>
                  <div className="da-muster">Push for spoils wave after wave. Bank before the line breaks, or lose most of it. Spend tactics to survive the deep waves.</div>
                  <button type="button" className="mg-btn mg-btn-primary da-march-btn" onClick={beginAssault}>March out</button>
                </>
              )}

              {/* Climb HUD */}
              {phase === 'climbing' && (
                <>
                  <div className="da-climb-hud">
                    <div className="da-vigor2">
                      <div className="da-vigor2-row">
                        <span className="da-hud-k">Vigor</span>
                        <span className="da-hud-v">{Math.max(0, Math.round(vigor))}/{vigorMax}</span>
                      </div>
                      <div className="da-vigor2-bar"><div className="da-vigor2-fill" style={{ width: `${Math.max(0, vigor / vigorMax * 100)}%` }} /></div>
                    </div>
                    <div className="da-spoils">
                      <span className="da-hud-k">Spoils if you bank</span>
                      <span className="da-spoils-v">+{fmt(Math.round(spoils.qi))} Qi</span>
                    </div>
                    <div className={`da-risk${risky ? ' da-risk-hot' : ''}`}>
                      Next push costs ~{costLo}–{costHi} Vigor{risky ? ' · the line could break!' : ''}
                    </div>
                  </div>

                  <div className="da-tactics">
                    {TACTICS.map(t => (
                      <button key={t.id} type="button" className="da-tactic"
                        disabled={(tactics[t.id] || 0) <= 0 || (t.id === 'brace' && braced)}
                        onClick={() => useTactic(t.id)} title={t.blurb}>
                        <span className="da-tactic-glyph">{t.glyph}</span>
                        <span className="da-tactic-name">{t.name}{t.id === 'brace' && braced ? ' ✓' : ''}</span>
                        <span className="da-tactic-ch">×{tactics[t.id] || 0}</span>
                      </button>
                    ))}
                  </div>

                  <div className="da-climb-actions">
                    <button type="button" className="mg-btn mg-btn-ghost da-bank" onClick={bank}>Bank &amp; retreat</button>
                    <button type="button" className={`mg-btn mg-btn-primary da-push${risky ? ' da-push-risky' : ''}`} onClick={push}>
                      {braced ? 'Push (Braced)' : 'Push on'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── DRILL GROUNDS ─────────────────────────────────────────────────── */}
      {tab === 'drill' && (
        <div className="da-drill">
          <div className="da-drill-banner">Drill costs <b>time</b>, not Qi. Your army trains while you are away (offline-safe) and comes back stronger and healed.</div>
          <div className="da-drill-stat">
            <span className="da-drill-stat-label">Per-disciple might</span>
            <span className="da-drill-stat-val">{perStr.toFixed(1)}</span>
            <span className="da-drill-stat-sub">Drill Lv {level}</span>
          </div>
          {army.status === 'drilling' && drillReg ? (
            <div className="da-drilling">
              <div className="da-drilling-glyph" aria-hidden="true">{drillReg.glyph}</div>
              <div className="da-drilling-name">{drillReg.name} underway</div>
              <div className="da-drilling-eta">Ready in {fmtDur(drillRemain)}</div>
              <div className="da-drill-bar"><div className="da-drill-bar-fill" style={{ width: `${drillPct * 100}%` }} /></div>
              <div className="da-drilling-gain">On completion: heal + {Math.round(drillReg.gain * 100)}% strength</div>
              {import.meta.env.DEV && <button type="button" className="mg-btn mg-btn-ghost da-skip" onClick={skipDrillDev}>Skip (dev)</button>}
            </div>
          ) : (
            <>
              <div className="da-drill-prompt">Choose how long to drill. A longer regimen heals fully and grants more strength.</div>
              <div className="da-regimens">
                {REGIMENS.map((r) => (
                  <button key={r.id} type="button" className="da-regimen" onClick={() => startDrill(r)}>
                    <span className="da-regimen-glyph">{r.glyph}</span>
                    <span className="da-regimen-body">
                      <span className="da-regimen-name">{r.name}</span>
                      <span className="da-regimen-blurb">{r.blurb}</span>
                    </span>
                    <span className="da-regimen-meta">
                      <span className="da-regimen-time">{fmtDur(r.ms)}</span>
                      <span className="da-regimen-gain">+{Math.round(r.gain * 100)}%</span>
                    </span>
                  </button>
                ))}
              </div>
              {army.status === 'spent' && <div className="da-hint">Your army is spent — any drill also heals them back to fighting strength.</div>}
            </>
          )}
        </div>
      )}

      {/* ─── PROMOTIONS (Merge grid) ───────────────────────────────────────── */}
      {tab === 'promote' && <SectMerge />}
    </div>
  );
}
