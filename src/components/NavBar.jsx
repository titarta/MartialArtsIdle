import { useTranslation } from 'react-i18next';

const BASE = import.meta.env.BASE_URL;

const SCREENS = [
  { id: 'home',       tKey: 'nav.home'   },
  { id: 'combat',     tKey: 'nav.worlds' },
  { id: 'build',      tKey: 'nav.equip'  },
  { id: 'inventory',  tKey: 'nav.items'  },
  { id: 'production', tKey: 'nav.craft', emoji: '⚗' },
  { id: 'stats',      tKey: 'nav.stats'  },
  { id: 'settings',   tKey: 'nav.config', emoji: '⚙' },
];

function NavBar({ currentScreen, onNavigate }) {
  const { t } = useTranslation('ui');

  return (
    <nav className="navbar">
      {SCREENS.map((screen) => {
        const label = t(screen.tKey);
        return (
          <button
            key={screen.id}
            className={`nav-btn ${currentScreen === screen.id ? 'active' : ''}`}
            onClick={() => onNavigate(screen.id)}
          >
            {screen.emoji ? (
              <span className="nav-icon-emoji">{screen.emoji}</span>
            ) : (
              <img
                src={`${BASE}sprites/nav/${screen.id}.png`}
                alt={label}
                className="nav-icon-img"
              />
            )}
            <span className="nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default NavBar;
