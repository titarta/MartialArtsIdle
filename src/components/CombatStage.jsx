import { useRef, useEffect, useState } from 'react';
import SpriteAnimator from './SpriteAnimator';
import { getSprites, FW, FH } from '../sprites/spriteGen';

const SCALE = 3;   // 32×3=96px wide, 40×3=120px tall on screen

/**
 * CombatStage — two pixel-art fighters above the HP bars.
 *
 * - Idle: looping guard stance with subtle breathing animation
 * - On attack: switches to attack spritesheet (wind-up → strike → return),
 *              plays once, then reverts. Combined with a small lunge translate.
 * - On hit: target flashes white (player hit) or red (enemy hit)
 * - On KO: losing fighter tilts and fades
 */
export default function CombatStage({ phase, playerAttackRef, enemyAttackRef }) {
  const sprites = getSprites();

  const [pAnim, setPAnim] = useState('idle');
  const [eAnim, setEAnim] = useState('idle');

  const pRef     = useRef(null);   // outer wrapper — receives lunge translate
  const eRef     = useRef(null);
  const pFlashRef = useRef(null);
  const eFlashRef = useRef(null);

  const isFighting = phase === 'fighting';
  const isWon      = phase === 'won';
  const isLost     = phase === 'lost';

  // Register callbacks invoked directly from the rAF combat loop
  useEffect(() => {
    playerAttackRef.current = () => {
      setPAnim('attack');
      // Lunge toward enemy (right)
      pRef.current?.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(16px)', offset: 0.4 },
          { transform: 'translateX(0)' },
        ],
        { duration: 400, easing: 'ease-in-out' },
      );
      // Flash enemy white on hit
      eFlashRef.current?.animate(
        [
          { opacity: 1, background: 'rgba(255,255,255,0.8)' },
          { opacity: 0, background: 'rgba(255,255,255,0)' },
        ],
        { duration: 250, easing: 'ease-out' },
      );
    };

    enemyAttackRef.current = () => {
      setEAnim('attack');
      // Lunge toward player (left, since enemy faces left via CSS flip)
      eRef.current?.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-16px)', offset: 0.4 },
          { transform: 'translateX(0)' },
        ],
        { duration: 400, easing: 'ease-in-out' },
      );
      // Flash player red on hit
      pFlashRef.current?.animate(
        [
          { opacity: 1, background: 'rgba(255,80,60,0.65)' },
          { opacity: 0, background: 'rgba(255,80,60,0)' },
        ],
        { duration: 250, easing: 'ease-out' },
      );
    };

    return () => {
      playerAttackRef.current = null;
      enemyAttackRef.current  = null;
    };
  }, [playerAttackRef, enemyAttackRef]);

  // Snap back to idle when fight ends
  useEffect(() => {
    if (phase !== 'fighting') {
      setPAnim('idle');
      setEAnim('idle');
    }
  }, [phase]);

  const pSrc    = pAnim === 'attack' ? sprites.playerAttack : sprites.playerIdle;
  const eSrc    = eAnim === 'attack' ? sprites.enemyAttack  : sprites.enemyIdle;

  return (
    <div className={`combat-stage ${isFighting ? 'stage-fighting' : ''}`}>

      {/* ── Player (left side, faces right) ─── */}
      <div ref={pRef} className={`stage-side ${isLost ? 'stage-ko' : ''}`}>
        <div ref={pFlashRef} className="stage-flash" />
        <SpriteAnimator
          src={pSrc}
          frameWidth={FW}
          frameHeight={FH}
          frameCount={4}
          fps={pAnim === 'attack' ? 10 : (isFighting ? 6 : 4)}
          loop={pAnim !== 'attack'}
          onComplete={pAnim === 'attack' ? () => setPAnim('idle') : undefined}
          scale={SCALE}
        />
      </div>

      {/* ── Centre ─── */}
      <div className="stage-centre">
        {isFighting && <span className="stage-clash">⚔</span>}
      </div>

      {/* ── Enemy (right side, sprite faces right → CSS flips to face left) ─── */}
      <div ref={eRef} className={`stage-side ${isWon ? 'stage-ko' : ''}`}>
        <div ref={eFlashRef} className="stage-flash" />
        <SpriteAnimator
          src={eSrc}
          frameWidth={FW}
          frameHeight={FH}
          frameCount={4}
          fps={eAnim === 'attack' ? 10 : (isFighting ? 6 : 4)}
          loop={eAnim !== 'attack'}
          onComplete={eAnim === 'attack' ? () => setEAnim('idle') : undefined}
          scale={SCALE}
          className="sprite-flipped"
        />
      </div>

    </div>
  );
}
