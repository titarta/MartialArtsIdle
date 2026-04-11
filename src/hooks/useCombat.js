import { useState, useEffect, useRef, useCallback } from 'react';
import { calcDamage, getCooldown } from '../data/techniques';

const DEFAULT_ATK_CD = 2.0;
const ENEMY_ATK_CD   = 2.5;
const MAX_LOG        = 20;

export default function useCombat() {
  // ─── All mutable fight state in one ref ──────────────────────────────────
  // Rule: rAF loop reads/writes ONLY via stateRef — never via React closure.
  const stateRef = useRef({
    phase: 'idle',
    pHp: 0, pMaxHp: 0,
    eHp: 0, eMaxHp: 0, eAtk: 0,
    eAtkTimer:  ENEMY_ATK_CD,
    cds:    [Infinity, Infinity, Infinity],
    maxCds: [Infinity, Infinity, Infinity],
    dAtkTimer:  DEFAULT_ATK_CD,
    defBuff:   { mult: 1, endsAt: 0 },
    dodgeBuff: { chance: 0, endsAt: 0 },
    stats:    null,
    equipped: [null, null, null],
  });

  const lastTRef = useRef(performance.now());

  // ─── React state — phase transitions and log only ────────────────────────
  const [phase, setPhase] = useState('idle');
  const [enemy, setEnemy] = useState({ name: '', maxHp: 0 });
  const [log,   setLog]   = useState([]);

  // ─── DOM refs — HP bars + cooldown overlays, patched at 60fps ────────────
  const pHpBarRef     = useRef(null);
  const eHpBarRef     = useRef(null);
  const pHpTextRef    = useRef(null);
  const eHpTextRef    = useRef(null);
  const cdOverlayRefs = useRef([null, null, null]); // conic gradient per slot

  // ─── Hit callback refs — set by CombatScreen to trigger VFX ─────────────
  // Called from rAF loop; stable via ref, no closure needed.
  const onPlayerHitRef = useRef(null);
  const onEnemyHitRef  = useRef(null);
  const onHealRef      = useRef(null);

  // ─── startFight — writes snapshot into refs, then fires React transition ─
  const startFight = useCallback((stats, equippedTechs) => {
    const { essence, soul, body } = stats;
    const total  = essence + soul + body;
    const pMaxHp = Math.max(100, Math.floor((essence + body) * 12 + soul * 4));
    const eMaxHp = Math.max(200, Math.floor(total * 10));
    const eAtk   = Math.max(10,  Math.floor((essence + body) * 0.15));
    const eName  = 'Training Dummy';

    const cds    = equippedTechs.map(t => t ? 0        : Infinity);
    const maxCds = equippedTechs.map(t => t ? getCooldown(t.type, t.quality) : Infinity);

    stateRef.current = {
      phase: 'fighting',
      pHp: pMaxHp, pMaxHp,
      eHp: eMaxHp, eMaxHp, eAtk,
      eAtkTimer:  ENEMY_ATK_CD,
      cds:    [...cds],
      maxCds: [...maxCds],
      dAtkTimer:  DEFAULT_ATK_CD,
      defBuff:   { mult: 1, endsAt: 0 },
      dodgeBuff: { chance: 0, endsAt: 0 },
      stats:    { ...stats },
      equipped: [...equippedTechs],
    };

    lastTRef.current = performance.now();
    setEnemy({ name: eName, maxHp: eMaxHp });
    setPhase('fighting');
    setLog([{ msg: `${eName} appears!`, kind: 'system' }]);
  }, []);

  // ─── rAF game loop ────────────────────────────────────────────────────────
  useEffect(() => {
    let raf;

    const patchBars = (s) => {
      if (pHpBarRef.current)
        pHpBarRef.current.style.width = `${(s.pHp / s.pMaxHp) * 100}%`;
      if (eHpBarRef.current)
        eHpBarRef.current.style.width = `${(s.eHp / s.eMaxHp) * 100}%`;
      if (pHpTextRef.current)
        pHpTextRef.current.textContent = `${Math.ceil(s.pHp)} / ${s.pMaxHp}`;
      if (eHpTextRef.current)
        eHpTextRef.current.textContent = `${Math.ceil(s.eHp)} / ${s.eMaxHp}`;

      // Circular cooldown overlays via conic-gradient
      for (let i = 0; i < 3; i++) {
        const el = cdOverlayRefs.current[i];
        if (!el) continue;
        const cd = s.cds[i], maxCd = s.maxCds[i];
        if (!isFinite(cd) || !isFinite(maxCd) || maxCd === 0) {
          el.style.background = 'none';
          continue;
        }
        const pct = cd <= 0 ? 0 : cd / maxCd;
        const deg = Math.round(pct * 360);
        el.style.background = deg === 0
          ? 'none'
          : `conic-gradient(from -90deg, rgba(0,0,0,0.72) ${deg}deg, transparent ${deg}deg)`;
      }
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);

      const s = stateRef.current;
      if (s.phase !== 'fighting') return;

      const dt     = Math.min((now - lastTRef.current) / 1000, 0.1);
      lastTRef.current = now;
      const nowSec = now / 1000;

      const { stats, equipped, cds, maxCds } = s;
      const logs = [];
      let techFired = false;

      // ── Technique cooldowns ──────────────────────────────────────────────
      for (let i = 0; i < 3; i++) {
        if (!isFinite(cds[i])) continue;
        cds[i] = Math.max(0, cds[i] - dt);
        if (cds[i] > 0 || techFired) continue;

        const tech = equipped[i];
        if (!tech) continue;
        if (tech.type === 'Heal' && s.pHp > s.pMaxHp * 0.5) continue;

        techFired = true;
        cds[i] = maxCds[i];

        if (tech.type === 'Attack') {
          const dmg = calcDamage(tech, stats.essence, stats.soul, stats.body, stats.lawElement);
          s.eHp = Math.max(0, s.eHp - dmg);
          onEnemyHitRef.current?.(dmg);
          logs.push({ msg: `${tech.name} → ${dmg.toLocaleString()} dmg`, kind: 'damage' });

        } else if (tech.type === 'Heal') {
          const heal = Math.floor(s.pMaxHp * (tech.healPercent ?? 0.25));
          s.pHp = Math.min(s.pMaxHp, s.pHp + heal);
          onHealRef.current?.(heal);
          logs.push({ msg: `${tech.name} → +${heal.toLocaleString()} HP`, kind: 'heal' });

        } else if (tech.type === 'Defend') {
          s.defBuff = { mult: tech.defMult ?? 1.5, endsAt: nowSec + (tech.buffDuration ?? 5) };
          logs.push({ msg: `${tech.name} → DEF ×${tech.defMult ?? 1.5} (${tech.buffDuration ?? 5}s)`, kind: 'buff' });

        } else if (tech.type === 'Dodge') {
          s.dodgeBuff = { chance: tech.dodgeChance ?? 0.4, endsAt: nowSec + (tech.buffDuration ?? 4) };
          logs.push({ msg: `${tech.name} → ${Math.round((tech.dodgeChance ?? 0.4) * 100)}% dodge (${tech.buffDuration ?? 4}s)`, kind: 'buff' });
        }
      }

      // ── Default attack ───────────────────────────────────────────────────
      s.dAtkTimer = Math.max(0, s.dAtkTimer - dt);
      if (s.dAtkTimer <= 0) {
        s.dAtkTimer = DEFAULT_ATK_CD;
        if (s.eHp > 0) {
          const dmg = Math.max(5, Math.floor(stats.essence + stats.body));
          s.eHp = Math.max(0, s.eHp - dmg);
          onEnemyHitRef.current?.(dmg);
          logs.push({ msg: `Basic attack → ${dmg.toLocaleString()} dmg`, kind: 'damage' });
        }
      }

      // ── Enemy dead → victory ─────────────────────────────────────────────
      if (s.eHp <= 0) {
        s.eHp   = 0;
        s.phase = 'won';
        logs.push({ msg: 'Enemy defeated! Victory!', kind: 'system' });
        if (logs.length) setLog(prev => [...logs, ...prev].slice(0, MAX_LOG));
        patchBars(s);
        setPhase('won');
        return;
      }

      // ── Enemy attacks ────────────────────────────────────────────────────
      s.eAtkTimer = Math.max(0, s.eAtkTimer - dt);
      if (s.eAtkTimer <= 0) {
        s.eAtkTimer = ENEMY_ATK_CD;

        if (s.dodgeBuff.endsAt > nowSec && Math.random() < s.dodgeBuff.chance) {
          logs.push({ msg: 'Enemy attack — dodged!', kind: 'dodge' });
        } else {
          const defMult = s.defBuff.endsAt > nowSec ? s.defBuff.mult : 1;
          const def     = (stats.essence + stats.body) * defMult;
          const dmg     = Math.max(1, Math.floor(s.eAtk * 100 / (100 + def)));
          s.pHp         = Math.max(0, s.pHp - dmg);
          onPlayerHitRef.current?.(dmg);
          logs.push({ msg: `Enemy hits → −${dmg} HP`, kind: 'damage-taken' });
        }
      }

      // ── Player dead → loss ───────────────────────────────────────────────
      if (s.pHp <= 0) {
        s.pHp   = 0;
        s.phase = 'lost';
        logs.push({ msg: 'You were defeated…', kind: 'system' });
        if (logs.length) setLog(prev => [...logs, ...prev].slice(0, MAX_LOG));
        patchBars(s);
        setPhase('lost');
        return;
      }

      if (logs.length) setLog(prev => [...logs, ...prev].slice(0, MAX_LOG));
      patchBars(s);
    };

    lastTRef.current = performance.now();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // intentionally empty — all reads go via refs

  return {
    phase, enemy, log, stateRef, startFight,
    pHpBarRef, eHpBarRef, pHpTextRef, eHpTextRef,
    cdOverlayRefs,
    onPlayerHitRef, onEnemyHitRef, onHealRef,
  };
}
