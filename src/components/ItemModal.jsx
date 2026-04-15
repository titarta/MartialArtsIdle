import { useTranslation } from 'react-i18next';
import { RARITY } from '../data/items';

const BASE = import.meta.env.BASE_URL;

function ItemModal({ item, quantity, onClose }) {
  const { t }       = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  if (!item) return null;

  const rarity = RARITY[item.rarity];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>x</button>
        <div className="modal-sprite">
          <img
            src={`${BASE}sprites/items/${item.id}.png`}
            alt={tGame(`items.${item.id}.name`, { defaultValue: item.name })}
            className="modal-icon"
          />
        </div>
        <h2 className="modal-title">
          {tGame(`items.${item.id}.name`, { defaultValue: item.name })}
        </h2>
        <span className="modal-rarity" style={{ color: rarity.color }}>
          {t(`quality.${item.rarity}`, { defaultValue: rarity.label })}
        </span>
        <p className="modal-desc">
          {tGame(`items.${item.id}.desc`, { defaultValue: item.description })}
        </p>
        <div className="modal-qty">
          {t('itemModal.owned', { qty: quantity })}
        </div>
      </div>
    </div>
  );
}

export default ItemModal;
