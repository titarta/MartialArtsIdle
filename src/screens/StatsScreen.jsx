function StatsScreen() {
  return (
    <div className="screen stats-screen">
      <h1>Character Stats</h1>
      <p className="subtitle">Your progress</p>
      <div className="stats-list">
        <div className="stat-row">
          <span className="stat-label">Rank</span>
          <span className="stat-value">Novice Disciple</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Strength</span>
          <span className="stat-value">1</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Agility</span>
          <span className="stat-value">1</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Spirit</span>
          <span className="stat-value">1</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Gold</span>
          <span className="stat-value">0</span>
        </div>
      </div>
    </div>
  );
}

export default StatsScreen;
