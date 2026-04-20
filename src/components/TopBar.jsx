import { useRef, useEffect, useState } from 'react';

const BASE = import.meta.env.BASE_URL;

export default function TopBar({
  jadeBalance,
  onNavigate,
  onOpenShop,
  onOpenJourney,
  onOpenAchievements,
  hasNewAchievement,
  activeModal,
  onOpenReincarnation,
  reincarnationUnlocked,
}) {
  return (
    <div className="top-bar">
      <button
        className={`home-hud-jade${activeModal === 'shop' ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenShop}
        aria-label="Blood Lotus Shop"
      >
        <img
          src={`${BASE}sprites/items/blood_lotus.png`}
          className="home-hud-jade-icon"
          alt=""
          draggable="false"
        />
        <span className="home-hud-jade-amount">{jadeBalance ?? 0}</span>
      </button>
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
      <button
        className={`home-hud-journey${activeModal === 'journey' ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenJourney}
        aria-label="Cultivation Journey"
      >
        🗺️
      </button>
      <button
        className={`home-hud-trophy${activeModal === 'achievements' ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenAchievements}
        aria-label="Achievements"
      >
        🏆
        {hasNewAchievement && <span className="home-hud-trophy-badge" />}
      </button>
      <button className="home-hud-settings" onClick={() => onNavigate('settings')} aria-label="Settings">
        ⚙
      </button>
    </div>
  );
}
