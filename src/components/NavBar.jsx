import { useTranslation } from 'react-i18next';

const BASE = import.meta.env.BASE_URL;

const SCREENS = [
  { id: 'home',       tKey: 'nav.home'                              },
  { id: 'combat',     tKey: 'nav.worlds'                            },
  { id: 'character',  tKey: 'nav.character', emoji: '⚔'            },
  { id: 'collection', tKey: 'nav.collection', sprite: 'inventory'  },
  { id: 'production', tKey: 'nav.craft',      emoji: '⚗'           },
  { id: 'settings',   tKey: 'nav.config',     emoji: '⚙'           },
];

function NavBar({ currentScreen, onNavigate, badges = {} }) {
  const { t } = useTranslation('ui');

  return (
    <nav className="navbar">
      {SCREENS.map((screen) => {
        const label = t(screen.tKey);
        const hasBadge = badges[screen.id] && currentScreen !== screen.id;
        return (
          <button
            key={screen.id}
            className={`nav-btn ${currentScreen === screen.id ? 'active' : ''}`}
            onClick={() => onNavigate(screen.id)}
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
              {hasBadge && <span className="nav-badge-dot" />}
            </div>
            <span className="nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default NavBar;
