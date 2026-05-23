import { useRef, useEffect, useState } from 'react';
import { FEATURES } from '../data/featureFlags';
import { fmt as fmtNum } from '../utils/format';

const BASE = import.meta.env.BASE_URL;

// Live QI readout — qiRef is a mutable ref updated outside React (no state
// re-renders), so we poll it via rAF and write directly to the DOM. Same
// pattern as QiProgressChip in HomeScreen.
function QiLiveText({ qiRef }) {
  const spanRef = useRef(null);
  useEffect(() => {
    if (!qiRef) return;
    let raf;
    const tick = () => {
      if (spanRef.current) spanRef.current.textContent = fmtNum(qiRef.current ?? 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [qiRef]);
  return <span ref={spanRef}>—</span>;
}

export default function TopBar({
  bloodLotusBalance,
  onOpenShop,
  onOpenProgress,
  onOpenSettings,
  hasNewAchievement,
  activeModal,
  onOpenReincarnation,
  reincarnationUnlocked,
  onOpenCrystal,
  crystalUnlocked,
  qiRef,
  karma,
}) {
  return (
    <div className="top-bar">
      <button
        className={`home-hud-blood-lotus${(activeModal === 'lotus-shop' || activeModal === 'shop') ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenShop}
        aria-label="Blood Lotus Shop"
      >
        <img
          src={`${BASE}sprites/items/blood_lotus.png`}
          className="home-hud-blood-lotus-icon"
          alt=""
          draggable="false"
        />
        <span className="home-hud-blood-lotus-amount">{bloodLotusBalance ?? 0}</span>
      </button>
      <div className="topbar-currencies">
        <div className="topbar-currency-row" aria-label="Current Qi">
          <img
            src={`${BASE}ui/qi.png`}
            className="topbar-currency-icon"
            alt=""
            draggable="false"
          />
          <QiLiveText qiRef={qiRef} />
        </div>
        <div className="topbar-currency-row" aria-label="Current Karma">
          <img
            src={`${BASE}ui/karma.png`}
            className="topbar-currency-icon"
            alt=""
            draggable="false"
          />
          <span>{karma ?? 0}</span>
        </div>
      </div>
      <div className="home-hud-spacer" />
      {reincarnationUnlocked && (
        <button
          className="home-hud-reinc"
          onClick={onOpenReincarnation}
          aria-label="Reincarnation"
        >
          ☸
        </button>
      )}
      {/* v1: Crystal feed lives inline beneath the crystal sprite. The 🪨
          top-bar trigger is preserved for v2 (stone-fed combat flow). */}
      {crystalUnlocked && FEATURES.combat && (
        <button
          className="home-hud-crystal"
          onClick={onOpenCrystal}
          aria-label="Qi Crystal"
        >
          🪨
        </button>
      )}
      {/* Progress hub — replaces the previous Journey + Achievements
          buttons with a single 📊 entry point that opens a 3-tab modal
          (Journey / Achievements / Stats). Achievement badge dot now
          surfaces on this button so the unread signal survives the
          consolidation. */}
      <button
        className={`home-hud-progress${activeModal === 'progress' ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenProgress}
        aria-label="Progress"
      >
        📊
        {hasNewAchievement && <span className="home-hud-trophy-badge" />}
      </button>
      <button
        className={`home-hud-settings${activeModal === 'settings' ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenSettings}
        aria-label="Settings"
      >
        ⚙
      </button>
    </div>
  );
}
