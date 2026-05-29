import { useRef, useEffect } from 'react';
import { fmt as fmtNum } from '../utils/format';

const BASE = import.meta.env.BASE_URL;

// Live QI readout. qiRef is a mutable ref updated outside React (no
// state re-renders), so we poll it via rAF and write directly to the
// DOM. Same pattern as QiProgressChip in HomeScreen.
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
  onOpenShop,        // IAP "Top Up Blood Lotus" modal
  onOpenLotusShop,   // SPEND shop (buffs / consumables / QoL / cosmetics)
  onOpenProgress,
  onOpenSettings,
  hasNewAchievement,
  activeModal,
  currentScreen,
  onOpenReincarnation,
  reincarnationUnlocked,
  qiRef,
  karma,
}) {
  return (
    <div className="top-bar">
      {/* Top Up button: opens the IAP modal where Blood Lotus is bought
          with real money. Shows the player's current balance so it
          doubles as the balance readout. */}
      <button
        className={`home-hud-blood-lotus${activeModal === 'shop' ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenShop}
        aria-label="Top Up Blood Lotus"
      >
        <img
          src={`${BASE}sprites/items/blood_lotus.png`}
          className="home-hud-blood-lotus-icon"
          alt=""
          draggable="false"
        />
        <span className="home-hud-blood-lotus-amount">{bloodLotusBalance ?? 0}</span>
      </button>
      {/* Spend Shop button. Sits right next to Top Up. Opens the Blood
          Lotus Shop where the balance is SPENT on buffs / consumables /
          QoL / cosmetics. Icon-only (balance lives on the Top Up
          button just to the left). */}
      <button
        className={`home-hud-lotus-shop${currentScreen === 'spirit-bazaar' ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenLotusShop}
        aria-label="Spirit Bazaar"
      >
        <img
          src={`${BASE}ui/shop_nav.png`}
          className="home-hud-lotus-shop-icon"
          alt=""
          draggable="false"
        />
      </button>
      {/* Currency pair: qi + karma flank a fixed brass divider.
          Each slot has a min-width and pulls its icon-value pair toward
          the divider (qi right-aligned, karma left-aligned). Qi values
          grow into the unused space on the LEFT of the qi slot and
          karma values grow into the unused space on the RIGHT of the
          karma slot, so the divider's screen position never shifts as
          the qi readout changes scale. Per home-pass/home-v2-mockup. */}
      <div className="topbar-currencies">
        <div className="topbar-currency-row topbar-currency-qi" aria-label="Current Qi">
          <img
            src={`${BASE}ui/qi.png`}
            className="topbar-currency-icon"
            alt=""
            draggable="false"
          />
          <QiLiveText qiRef={qiRef} />
        </div>
        <span className="topbar-currency-sep" aria-hidden="true" />
        <div className="topbar-currency-row topbar-currency-karma" aria-label="Current Karma">
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
          className={`home-hud-reinc${currentScreen === 'reincarnation' ? ' top-bar-btn--active' : ''}`}
          onClick={onOpenReincarnation}
          aria-label="Reincarnation"
        >
          <img
            src={`${BASE}sprites/nav/eternal_tree.png`}
            className="topbar-nav-icon"
            alt=""
            draggable="false"
          />
        </button>
      )}
      {/* Codex. Single entry point that opens a tabbed modal (Wardrobe
          + Achievements + Stats). Achievement badge dot lives on this
          button so the unread signal stays surfaced even after the
          content-audit rename from "Annals" to "Codex". */}
      <button
        className={`home-hud-progress${activeModal === 'codex' ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenProgress}
        aria-label="Codex"
      >
        <img
          src={`${BASE}sprites/nav/codex.png`}
          className="topbar-nav-icon"
          alt=""
          draggable="false"
        />
        {hasNewAchievement && <span className="home-hud-trophy-badge" />}
      </button>
      <button
        className={`home-hud-settings${currentScreen === 'settings' ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenSettings}
        aria-label="Settings"
      >
        <img
          src={`${BASE}sprites/nav/settings.png`}
          className="topbar-nav-icon"
          alt=""
          draggable="false"
        />
      </button>
    </div>
  );
}
