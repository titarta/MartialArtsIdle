function CombatScreen() {
  return (
    <div className="screen combat-screen">
      <h1>Combat Arena</h1>
      <p className="subtitle">Test your might</p>
      <div className="card-grid">
        <div className="card">
          <h2>Sparring</h2>
          <p>Practice against training dummies.</p>
        </div>
        <div className="card">
          <h2>Tournament</h2>
          <p>Compete against other fighters.</p>
        </div>
        <div className="card">
          <h2>Boss Fight</h2>
          <p>Challenge powerful masters.</p>
        </div>
      </div>
    </div>
  );
}

export default CombatScreen;
