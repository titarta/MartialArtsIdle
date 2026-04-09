function InventoryScreen() {
  return (
    <div className="screen inventory-screen">
      <h1>Inventory</h1>
      <p className="subtitle">Your collected items</p>
      <div className="card-grid">
        <div className="card">
          <h2>Weapons</h2>
          <p>No weapons yet.</p>
        </div>
        <div className="card">
          <h2>Armor</h2>
          <p>No armor yet.</p>
        </div>
        <div className="card">
          <h2>Potions</h2>
          <p>No potions yet.</p>
        </div>
      </div>
    </div>
  );
}

export default InventoryScreen;
