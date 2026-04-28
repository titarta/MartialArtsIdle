import { useTranslation } from 'react-i18next';
import { RARITY } from '../data/materials';

const BASE = import.meta.env.BASE_URL;

function ItemModal({ item, quantity, onClose }) {
  const { t }       = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  if (!item) return null;

  const rarity = RARITY[item.rarity] ?? { color: '#9ca3af', label: item.rarity };
  const itemName = tGame(`items.${item.id}.name`, { defaultValue: item.name });
  const itemDesc = tGame(`items.${item.id}.desc`, { defaultValue: item.description });
  const rarityLabel = t(`quality.${item.rarity}`, { defaultValue: rarity.label });

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={itemName}
      onClick={onClose}
    >
      <div className="coll-modal-panel" onClick={(e) => e.stopPropagation()}>
        <header className="coll-modal-header">
          <span className="coll-modal-gem" style={{ color: rarity.color }}>◆</span>
          <div className="coll-modal-titles">
            <div className="coll-modal-title" style={{ color: rarity.color }}>{itemName}</div>
            <div className="coll-modal-subtitle">{rarityLabel}</div>
          </div>
          <button
            type="button"
            className="modal-close coll-modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <div className="coll-modal-body">
          <div className="coll-modal-sprite">
            <img
              src={`${BASE}sprites/items/${item.id}.png`}
              alt={itemName}
              className="coll-modal-sprite-img"
            />
          </div>
          <p className="coll-modal-desc">{itemDesc}</p>
          <div className="coll-modal-qty">
            {t('itemModal.owned', { qty: quantity })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ItemModal;
