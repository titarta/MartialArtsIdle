import { useRef, useEffect } from 'react';
import SpriteAnimator from './SpriteAnimator';

const BASE        = import.meta.env.BASE_URL;
const FRAME_W     = 64;
const FRAME_H     = 64;
const FRAME_COUNT = 5;   // fighter-idle.png has 5 frames
const SCALE       = 2;

/**
 * CombatStage — renders two pixel-art fighters above the HP cards.
 * Registers lunge + flash animations with the combat rAF loop via refs.
 */
export default function CombatStage({ phase, playerAttackRef, enemyAttackRef }) {
  const pLungeRef = useRef(null);
  const eLungeRef = useRef(null);
  const pFlashRef = useRef(null);
  const eFlashRef = useRef(null);

  const isFighting = phase === 'fighting';
  const isWon      = phase === 'won';
  const isLost     = phase === 'lost';

  // Register callbacks that the rAF combat loop calls directly
  useEffect(() => {
    playerAttackRef.current = () => {
      pLungeRef.current?.animate(
        [
          { transform: 'translateX(0) scaleX(1)' },
          { transform: 'translateX(52px) scaleX(0.9)', offset: 0.35 },
          { transform: 'translateX(0) scaleX(1)' },
        ],
        { duration: 420, easing: 'ease-in-out' },
      );
      eFlashRef.current?.animate(
        [
          { opacity: 1, background: 'rgba(255, 255, 255, 0.85)' },
          { opacity: 0, background: 'rgba(255, 255, 255, 0)' },
        ],
        { duration: 280, easing: 'ease-out' },
      );
    };

    enemyAttackRef.current = () => {
      eLungeRef.current?.animate(
        [
          { transform: 'translateX(0) scaleX(1)' },
          { transform: 'translateX(-52px) scaleX(0.9)', offset: 0.35 },
          { transform: 'translateX(0) scaleX(1)' },
        ],
        { duration: 420, easing: 'ease-in-out' },
      );
      pFlashRef.current?.animate(
        [
          { opacity: 1, background: 'rgba(255, 80, 60, 0.7)' },
          { opacity: 0, background: 'rgba(255, 80, 60, 0)' },
        ],
        { duration: 280, easing: 'ease-out' },
      );
    };

    // Clear on unmount so stale refs don't fire
    return () => {
      playerAttackRef.current = null;
      enemyAttackRef.current  = null;
    };
  }, [playerAttackRef, enemyAttackRef]);

  return (
    <div className={`combat-stage ${isFighting ? 'stage-fighting' : ''}`}>

      {/* ── Player (left, faces right) ─── */}
      <div className={`stage-side stage-side-player ${isLost ? 'stage-ko' : ''}`}>
        <div ref={pLungeRef} className="stage-lunge">
          <div ref={pFlashRef} className="stage-flash" />
          <SpriteAnimator
            src={`${BASE}sprites/fighter-idle.png`}
            frameWidth={FRAME_W}
            frameHeight={FRAME_H}
            frameCount={FRAME_COUNT}
            fps={isFighting ? 8 : 5}
            scale={SCALE}
          />
        </div>
      </div>

      {/* ── Centre divider ─── */}
      <div className="stage-centre">
        {isFighting && <span className="stage-clash">⚔</span>}
      </div>

      {/* ── Enemy (right, faces left via CSS) ─── */}
      <div className={`stage-side stage-side-enemy ${isWon ? 'stage-ko' : ''}`}>
        <div ref={eLungeRef} className="stage-lunge">
          <div ref={eFlashRef} className="stage-flash" />
          <SpriteAnimator
            src={`${BASE}sprites/fighter-idle.png`}
            frameWidth={FRAME_W}
            frameHeight={FRAME_H}
            frameCount={FRAME_COUNT}
            fps={isFighting ? 8 : 5}
            scale={SCALE}
            className="sprite-enemy"
          />
        </div>
      </div>

    </div>
  );
}
