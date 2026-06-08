import { useTranslation } from 'react-i18next';
import LockTooltip from './LockTooltip';

const BASE = import.meta.env.BASE_URL;

const SCREENS = [
  { id: 'home',         tKey: 'nav.home'                              },
  // The qi-investment shop (Cookie-Clicker-style producers + upgrades),
  // labelled "Sect" in the nav — the producers are the sect's pavilions.
  // The route id stays 'cultivation' so navigation/routing is unchanged.
  { id: 'cultivation',  tKey: 'nav.cultivation', sprite: 'sect'      },
  // Journey — chronicle screen promoted out of the ProgressHubModal during
  // the nav-audit (verdict: place-you-live-in, not a check-on surface).
  { id: 'journey',      tKey: 'nav.journey'                          },
  // worlds / character / production tabs were retired with the v1 Cookie-
  // Clicker pivot. The combat / gear / crafting screens they pointed at
  // are gone too. Top-bar tree / codex / settings cover everything else.
];

function NavBar({ currentScreen, onNavigate, badges = {}, isUnlocked = () => true, isHidden = () => false, getHint = () => null, getDesc = () => null }) {
  const { t } = useTranslation('ui');

  // Drop flag-hidden tabs entirely (combat etc.) so players don't see locks
  // they can never unlock in this build.
  const visibleScreens = SCREENS.filter((screen) => !isHidden(screen.id));

  return (
    <nav className="navbar">
      {visibleScreens.map((screen) => {
        const label    = t(screen.tKey);
        const unlocked = isUnlocked(screen.id);
        const hint     = !unlocked ? getHint(screen.id) : null;
        const desc     = !unlocked ? getDesc(screen.id) : null;
        const hasBadge = unlocked && badges[screen.id] && currentScreen !== screen.id;
        return (
          <button
            key={screen.id}
            className={`nav-btn ${currentScreen === screen.id ? 'active' : ''}${!unlocked ? ' nav-btn-locked' : ''}`}
            onClick={() => { if (!unlocked) return; onNavigate(screen.id); }}
            aria-label={hint ? `${label} — ${hint}` : label}
          >
            <div className="nav-icon-wrap">
              {screen.emoji ? (
                <span className="nav-icon-emoji">{screen.emoji}</span>
              ) : (
                <img
                  src={`${BASE}sprites/nav/${screen.sprite ?? screen.id}.png`}
                  alt={label}
                  className="nav-icon-img"
                />
              )}
              {hasBadge   && <span className="nav-badge-dot" />}
              {!unlocked  && <span className="nav-lock-seal" aria-hidden="true">封</span>}
            </div>
            <span className="nav-label">{label}</span>
            {!unlocked && <LockTooltip desc={desc} hint={hint} position="above" />}
          </button>
        );
      })}
    </nav>
  );
}

export default NavBar;
