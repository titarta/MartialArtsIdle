function BuildScreen() {
  return (
    <div className="screen build-screen">
      <h1>Build</h1>
      <p className="subtitle">Gear, laws, and techniques</p>

      <section className="build-section">
        <h2 className="build-section-title">Artefacts</h2>
        <div className="card-grid">
          <div className="card build-slot">
            <span className="build-slot-label">Weapon</span>
            <p className="build-slot-empty">Empty</p>
          </div>
          <div className="card build-slot">
            <span className="build-slot-label">Armour</span>
            <p className="build-slot-empty">Empty</p>
          </div>
          <div className="card build-slot">
            <span className="build-slot-label">Accessory</span>
            <p className="build-slot-empty">Empty</p>
          </div>
        </div>
      </section>

      <section className="build-section">
        <h2 className="build-section-title">Cultivation Law</h2>
        <div className="card build-slot-wide">
          <span className="build-slot-label">Active Law</span>
          <p className="build-slot-empty">No law cultivated</p>
        </div>
      </section>

      <section className="build-section">
        <h2 className="build-section-title">Secret Techniques</h2>
        <div className="card-grid">
          <div className="card build-slot">
            <span className="build-slot-label">Technique I</span>
            <p className="build-slot-empty">None</p>
          </div>
          <div className="card build-slot">
            <span className="build-slot-label">Technique II</span>
            <p className="build-slot-empty">None</p>
          </div>
          <div className="card build-slot">
            <span className="build-slot-label">Technique III</span>
            <p className="build-slot-empty">None</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default BuildScreen;
