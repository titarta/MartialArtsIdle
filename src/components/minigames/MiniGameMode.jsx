import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { getMinigame, computeReward } from '../../data/minigames';
import { fmt } from '../../utils/format';
import SectMerge from './SectMerge';
import SpiritGarden from './SpiritGarden';
import PillRefinement from './PillRefinement';
import './minigames.css';

const BASE = import.meta.env.BASE_URL;
const spriteUrl = (s) =>
  (typeof s === 'string' && s.startsWith('/')) ? `${BASE}${s.replace(/^\//, '')}` : s;

const GAMES = { merge: SectMerge, garden: SpiritGarden, refine: PillRefinement };

/**
 * Shared cash-out banner. Every minigame funnels its 0..1 performance score
 * through here so payouts read identically: a qi burst + the "minutes of
 * production" it represents.
 */
export function MiniGameResult({ ratePerSec, performance01, label, onCollect, onAgain, againLabel }) {
  const { t } = useTranslation('ui');
  const { qi, minutes } = computeReward(ratePerSec, performance01);
  return (
    <div className="mg-result" role="status">
      <div className="mg-result-label">{label}</div>
      <div className="mg-result-qi">+{fmt(Math.round(qi))}<span className="mg-result-qi-unit"> Qi</span></div>
      <div className="mg-result-min">{t('minigame.minOfProduction', { n: minutes.toFixed(1) })}</div>
      <div className="mg-result-actions">
        <button type="button" className="mg-btn mg-btn-primary" onClick={() => onCollect?.(qi)}>{t('common.collect')}</button>
        {onAgain && <button type="button" className="mg-btn mg-btn-ghost" onClick={onAgain}>{againLabel ?? t('minigame.again')}</button>}
      </div>
    </div>
  );
}

function ComingSoon({ meta }) {
  const { t } = useTranslation('ui');
  return (
    <div className="mg-soon">
      <div className="mg-soon-glyph" aria-hidden="true">{meta.glyph}</div>
      <div className="mg-soon-name">{meta.name}</div>
      <p className="mg-soon-tag">{meta.tagline}</p>
      <div className="mg-soon-badge">{meta.mode}</div>
      <div className="mg-soon-note">{t('minigame.comingSoon')}</div>
    </div>
  );
}

/**
 * Full-screen minigame overlay. Portals to body (like DetailModal) so it sits
 * above the nav and every screen z-bucket. Routes the stage to the producer's
 * bespoke game, or a coming-soon teaser.
 */
export default function MiniGameMode({ producer, owned = 0, ratePerSec = 0, onAward, recruit, qi, spendQi, onClose }) {
  const { t } = useTranslation('ui');
  const meta = producer ? getMinigame(producer.id) : null;

  useEffect(() => {
    document.body.classList.add('sheet-open');
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('sheet-open');
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!producer || !meta) return null;

  const mythicSprite = producer.sprites?.[3] ?? producer.sprites?.[0];
  const Game = meta.component ? GAMES[meta.component] : null;

  return createPortal(
    <div className="mg-overlay" role="dialog" aria-modal="true" aria-label={`${meta.name}`}>
      <div className="mg-scrim" aria-hidden="true" />
      <div className="mg-frame">
        <header className="mg-header">
          <div className="mg-head-sprite-wrap">
            <img className="mg-head-sprite" src={spriteUrl(mythicSprite)} alt="" draggable={false} />
          </div>
          <div className="mg-head-titles">
            <div className="mg-kicker">{meta.mode}</div>
            <h2 className="mg-title">{meta.name}</h2>
          </div>
          <div className="mg-glyph" aria-hidden="true">{meta.glyph}</div>
          <button type="button" className="mg-close" onClick={onClose} aria-label={t('minigame.leaveAriaLabel')}>✕</button>
        </header>

        <div className="mg-stage">
          {Game
            ? <Game producer={producer} owned={owned} ratePerSec={ratePerSec} onAward={onAward} recruit={recruit} qi={qi} spendQi={spendQi} />
            : <ComingSoon meta={meta} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
