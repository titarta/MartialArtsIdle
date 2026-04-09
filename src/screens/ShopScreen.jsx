function ShopScreen() {
  return (
    <div className="screen shop-screen">
      <h1>Shop</h1>
      <p className="subtitle">Equip yourself for battle</p>
      <div className="card-grid">
        <div className="card">
          <h2>Weapons</h2>
          <p>Swords, staffs, and more.</p>
        </div>
        <div className="card">
          <h2>Armor</h2>
          <p>Protect yourself in combat.</p>
        </div>
        <div className="card">
          <h2>Potions</h2>
          <p>Restore health and boost stats.</p>
        </div>
      </div>
    </div>
  );
}

export default ShopScreen;
