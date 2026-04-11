import { useEffect, useRef, useState, useCallback } from 'react';
import SpriteAnimator from '../components/SpriteAnimator';
import { TYPE_COLOR, getCooldown } from '../data/techniques';

const BASE = import.meta.env.BASE_URL;

const LOG_COLOR = {
  damage:           'var(--accent)',
  'damage-taken':   '#f97316',
  heal:             '#4ade80',
  buff:             '#60a5fa',
  dodge:            '#facc15',
  system:           'var(--text-muted)',
};

// ── Isometric cube SVG ────────────────────────────────────────────────────────
function TechCube({ color = '#555', size = 32 }) {
  const w = size, h = size;
  const pts = (arr) => arr.map(p => p.join(',')).join(' ');
  const top   = [[w/2,0],   [w,h/4],   [w/2,h/2], [0,h/4]];
  const left  = [[0,h/4],   [w/2,h/2], [w/2,h],   [0,h*3/4]];
  const right = [[w/2,h/2], [w,h/4],   [w,h*3/4], [w/2,h]];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display:'block', flexShrink:0 }}>
      <polygon points={pts(top)}   fill={color} opacity="0.95" />
      <polygon points={pts(left)}  fill={color} opacity="0.50" />
      <polygon points={pts(right)} fill={color} opacity="0.70" />
      <polygon points={pts(top)}   fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
      <polygon points={pts(left)}  fill="none" stroke="rgba(0,0,0,0.35)"       strokeWidth="0.5" />
      <polygon points={pts(right)} fill="none" stroke="rgba(0,0,0,0.25)"       strokeWidth="0.5" />
    </svg>
  );
}

let _floatId = 0;

function CombatScreen({ cultivation, techniques, combat }) {
  const { phase, enemy, log, startFight } = combat;
  const { equippedTechniques } = techniques;

  const [floats, setFloats] = useState([]);
  const playerSpriteRef = useRef(null);
  const enemySpriteRef  = useRef(null);

  const addFloat = useCallback((value, kind, side) => {
    const id = ++_floatId;
    setFloats(prev => [...prev, { id, value, kind, side }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 900);
  }, []);

  const triggerShake = useCallback((ref) => {
    const el = ref?.current;
    if (!el) return;
    el.classList.remove('combat-shake');
    void el.offsetWidth;
    el.classList.add('combat-shake');
    setTimeout(() => el.classList.remove('combat-shake'), 400);
  }, []);

  // Wire hit callbacks into useCombat refs
  useEffect(() => {
    combat.onEnemyHitRef.current = (dmg) => {
      addFloat(dmg, 'damage', 'right');
      triggerShake(enemySpriteRef);
    };
    combat.onPlayerHitRef.current = (dmg) => {
      addFloat(dmg, 'damage', 'left');
      triggerShake(playerSpriteRef);
    };
    combat.onHealRef.current = (heal) => {
      addFloat(heal, 'heal', 'left');
    };
    return () => {
      combat.onEnemyHitRef.current  = null;
      combat.onPlayerHitRef.current = null;
      combat.onHealRef.current      = null;
    };
  }, [combat, addFloat, triggerShake]);

  const handleStart = () => {
    const qi  = cultivation.qiRef.current;
    const law = cultivation.activeLaw;
    startFight(
      {
        essence:    Math.floor(qi * law.essenceMult),
        soul:       Math.floor(qi * law.soulMult),
        body:       Math.floor(qi * law.bodyMult),
        lawElement: law.element,
      },
      equippedTechniques,
    );
  };

  const isFighting = phase === 'fighting';

  return (
    <div className="screen combat-screen">
      <h1>Combat Arena</h1>
      <p className="subtitle">{cultivation.realmName}</p>

      {/* ── Battle field ─────────────────────────────────────────────────── */}
      <div className="combat-field">

        {/* Player */}
        <div className="combat-fighter-col">
          <span className="combat-fighter-label">You</span>
          <div className="combat-hp-wrap">
            <div className="hp-bar-track">
              <div ref={combat.pHpBarRef} className="hp-bar-fill player-hp-fill" style={{ width:'100%' }} />
            </div>
            <span ref={combat.pHpTextRef} className="hp-bar-text">—</span>
          </div>
          <div className="combat-sprite-wrap" ref={playerSpriteRef}>
            <SpriteAnimator
              src={`${BASE}sprites/fighter-idle.png`}
              frameWidth={64} frameHeight={64} frameCount={6}
              fps={isFighting ? 10 : 6} scale={2.5}
            />
          </div>
        </div>

        <span className="combat-vs">vs</span>

        {/* Enemy */}
        <div className="combat-fighter-col">
          <span className="combat-fighter-label">{phase === 'idle' ? 'Enemy' : enemy.name}</span>
          <div className="combat-hp-wrap">
            <div className="hp-bar-track">
              <div
                ref={combat.eHpBarRef}
                className="hp-bar-fill enemy-hp-fill"
                style={{ width: phase === 'idle' ? '100%' : undefined }}
              />
            </div>
            <span ref={combat.eHpTextRef} className="hp-bar-text">
              {phase === 'idle' ? '—' : `0 / ${enemy.maxHp}`}
            </span>
          </div>
          <div className="combat-sprite-wrap" ref={enemySpriteRef}>
            <SpriteAnimator
              src={`${BASE}sprites/fighter-idle.png`}
              frameWidth={64} frameHeight={64} frameCount={6}
              fps={isFighting ? 10 : 6} scale={2.5}
              style={{ transform: 'scaleX(-1)', filter: 'hue-rotate(200deg) saturate(2)' }}
            />
          </div>
        </div>

        {/* Floating numbers */}
        {floats.map(f => (
          <div
            key={f.id}
            className={`dmg-float dmg-float-${f.kind} dmg-float-${f.side}`}
          >
            {f.kind === 'heal' ? `+${f.value}` : `-${f.value}`}
          </div>
        ))}
      </div>

      {/* ── Technique circles ────────────────────────────────────────────── */}
      <div className="combat-tech-row">
        {[0, 1, 2].map(i => {
          const tech  = equippedTechniques[i];
          const color = tech ? TYPE_COLOR[tech.type] : 'rgba(255,255,255,0.12)';

          return (
            <div key={i} className={`combat-tech-slot${!tech ? ' combat-tech-empty' : ''}`}>
              <div className="combat-tech-circle" style={{ borderColor: color, boxShadow: tech ? `0 0 8px ${color}44` : 'none' }}>
                <TechCube color={tech ? color : '#444'} size={32} />
                <div
                  ref={el => { combat.cdOverlayRefs.current[i] = el; }}
                  className="combat-tech-overlay"
                />
              </div>
              <span className="combat-tech-name" style={{ color: tech ? color : 'var(--text-muted)' }}>
                {tech ? tech.name : `— ${['I','II','III'][i]} —`}
              </span>
              {tech && (
                <span className="combat-tech-cd">{getCooldown(tech.type, tech.quality).toFixed(1)}s</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Phase banner + action button ──────────────────────────────────── */}
      {phase === 'idle' && (
        <button className="combat-start-btn" onClick={handleStart}>Start Fight</button>
      )}
      {phase === 'won' && (
        <div className="combat-result combat-result-won">
          <span>Victory!</span>
          <button className="combat-start-btn" onClick={handleStart}>Fight Again</button>
        </div>
      )}
      {phase === 'lost' && (
        <div className="combat-result combat-result-lost">
          <span>Defeated</span>
          <button className="combat-start-btn" onClick={handleStart}>Retry</button>
        </div>
      )}

      {/* ── Combat log ───────────────────────────────────────────────────── */}
      {log.length > 0 && (
        <div className="combat-log">
          {log.map((entry, i) => (
            <p key={i} style={{ color: LOG_COLOR[entry.kind] ?? 'var(--text-secondary)' }}>
              {entry.msg}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default CombatScreen;
