import { useRef, useEffect, useState } from 'react';
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

// Lightweight 1s-tick countdown for the TopBar active-buff chip. Mirrors
// the BuffCountdown logic in SpiritBazaarScreen but trims the format to a
// single token (h+m or m+s or s) since the chip is space-constrained.
function ChipCountdown({ expiresAtMs }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remainingMs = Math.max(0, expiresAtMs - now);
  const totalSec = Math.floor(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  // Compact form. Drop seconds once we're over a minute so the chip stays
  // narrow and doesn't visibly reflow each second.
  const label =
    h > 0 ? `${h}h ${m}m`
  : m > 0 ? `${m}m`
  :         `${s}s`;
  return <span className="topbar-buff-chip-time">{label}</span>;
}

/**
 * ActiveBuffChip — surfaces the STRONGEST active timed buff inline with the
 * TopBar so the player can see they have a multiplier running while
 * cultivating (not just while shopping). Hidden entirely when no buffs are
 * active. Tap routes to the Spirit Bazaar where the full buff list lives.
 *
 * Sort policy: highest multiplier wins; ties break to the closest-to-
 * expiring buff so a stack of identical mults still shows real urgency.
 */
function ActiveBuffChip({ activeBuffs, onOpen }) {
  if (!activeBuffs || activeBuffs.length === 0) return null;
  const best = [...activeBuffs]
    .filter(b => Number.isFinite(b?.item?.effect?.mult))
    .sort((a, b) => {
      const am = a.item.effect.mult;
      const bm = b.item.effect.mult;
      if (bm !== am) return bm - am;             // higher mult first
      return a.expiresAtMs - b.expiresAtMs;      // then sooner-to-expire
    })[0];
  if (!best) return null;
  const mult = best.item.effect.mult;
  return (
    <button
      type="button"
      className="topbar-buff-chip"
      onClick={onOpen}
      aria-label={`Active buff: ${best.item?.name ?? ''}, tap to view bazaar`}
    >
      <span className="topbar-buff-chip-mult">×{mult}</span>
      <ChipCountdown expiresAtMs={best.expiresAtMs} />
    </button>
  );
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
  activeBuffs,       // From useShopInventory — same source the Bazaar uses.
}) {
  return (
    <div className="top-bar">
      {/* Top Up button — opens the IAP modal where Blood Lotus is bought
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
      {/* Spend Shop button — sits right next to the Top Up button. Opens
          the Blood Lotus Shop where the balance is SPENT on buffs /
          consumables / QoL / cosmetics. Icon-only (the balance lives on
          the Top Up button just to the left). */}
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
      <ActiveBuffChip activeBuffs={activeBuffs} onOpen={onOpenLotusShop} />
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
      {/* Progress hub — single 📊 entry point that opens a tabbed modal
          (Achievements + Stats; Journey was promoted to a bottom-nav screen
          in the nav-audit pass). Achievement badge dot lives on this button
          so the unread signal stays surfaced after consolidation. */}
      <button
        className={`home-hud-progress${activeModal === 'annals' ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenProgress}
        aria-label="Annals"
      >
        📊
        {hasNewAchievement && <span className="home-hud-trophy-badge" />}
      </button>
      <button
        className={`home-hud-settings${currentScreen === 'settings' ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenSettings}
        aria-label="Settings"
      >
        ⚙
      </button>
    </div>
  );
}
