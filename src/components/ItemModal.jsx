import { RARITY } from '../data/items';

const BASE = import.meta.env.BASE_URL;

function ItemModal({ item, quantity, onClose }) {
  if (!item) return null;

  const rarity = RARITY[item.rarity];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>x</button>
        <div className="modal-sprite">
          <img
            src={`${BASE}sprites/items/${item.id}.png`}
            alt={item.name}
            className="modal-icon"
          />
        </div>
        <h2 className="modal-title">{item.name}</h2>
        <span className="modal-rarity" style={{ color: rarity.color }}>
          {rarity.label}
        </span>
        <p className="modal-desc">{item.description}</p>
        <div className="modal-qty">Owned: <strong>{quantity}</strong></div>
      </div>
    </div>
  );
}

export default ItemModal;
