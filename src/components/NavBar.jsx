function NavBar({ currentScreen, onNavigate }) {
  const screens = [
    { id: 'home', label: 'Home' },
    { id: 'training', label: 'Training' },
    { id: 'combat', label: 'Combat' },
    { id: 'shop', label: 'Shop' },
    { id: 'stats', label: 'Stats' },
  ];

  return (
    <nav className="navbar">
      {screens.map((screen) => (
        <button
          key={screen.id}
          className={`nav-btn ${currentScreen === screen.id ? 'active' : ''}`}
          onClick={() => onNavigate(screen.id)}
        >
          {screen.label}
        </button>
      ))}
    </nav>
  );
}

export default NavBar;
