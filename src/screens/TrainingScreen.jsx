function TrainingScreen() {
  return (
    <div className="screen training-screen">
      <h1>Training Grounds</h1>
      <p className="subtitle">Hone your skills</p>
      <div className="card-grid">
        <div className="card">
          <h2>Strength</h2>
          <p>Break boulders with your fists.</p>
        </div>
        <div className="card">
          <h2>Agility</h2>
          <p>Move like the wind.</p>
        </div>
        <div className="card">
          <h2>Spirit</h2>
          <p>Channel your inner energy.</p>
        </div>
      </div>
    </div>
  );
}

export default TrainingScreen;
