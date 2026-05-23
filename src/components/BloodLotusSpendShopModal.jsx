import { useState, useEffect, useMemo } from 'react';
import { SHOP_ITEMS, SHOP_CATEGORIES, SHOP_ITEMS_BY_ID } from '../data/shopItems';

const BASE = import.meta.env.BASE_URL;

/** Live "X:YY left" countdown for a timed buff. Runs its own 1 Hz tick so
 *  re-rendering this small label doesn't drag the whole inventory hook
 *  into a per-second update. */
function BuffCountdown({ expiresAtMs }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remainingMs = Math.max(0, expiresAtMs - now);
  const totalSec = Math.floor(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const label =
    h > 0 ? `${h}h ${String(m).padStart(2, '0')}m`
  : m > 0 ? `${m}m ${String(s).padStart(2, '0')}s`
  :         `${s}s`;
  return <span className="bls-buff-countdown">{label} left</span>;
}

/**
 * One row in the items list. Layout: icon · name+desc · cost+CTA.
 * The CTA reflects ownership state:
 *   permanent owned → "Owned"
 *   stackable maxed → "Maxed"
 *   timed active    → "Active · 3h 12m left"
 *   otherwise       → "Buy · 50"
 */
function ShopItemRow({ item, ownership, balance, onBuy, busy }) {
  const { state, label, disabled } = (() => {
    // Permanent
    if (item.ownership === 'permanent' && ownership.hasQol(item.id)) {
      return { state: 'owned', label: 'Owned', disabled: true };
    }
    // Stackable
    if (item.ownership === 'stackable') {
      const cur = ownership.getStack(item.id);
      const cap = item.maxStack ?? Infinity;
      if (cur >= cap) return { state: 'maxed', label: `Maxed (${cur}/${cap})`, disabled: true };
    }
    // Timed — show countdown if active, still allow more purchases to extend
    if (item.ownership === 'timed') {
      const active = ownership.activeBuffs.find(b => b.id === item.id);
      if (active) {
        return { state: 'active', label: `Buy · ${item.cost}`, disabled: balance < item.cost || busy };
      }
    }
    // Oneshot — show owned count, allow another purchase
    if (item.ownership === 'oneshot') {
      const cur = ownership.getConsumable(item.id);
      if (cur > 0) {
        return { state: 'owned-some', label: `Buy · ${item.cost}`, disabled: balance < item.cost || busy };
      }
    }
    // Default — can buy if affordable
    return { state: 'buyable', label: `Buy · ${item.cost}`, disabled: balance < item.cost || busy };
  })();

  const stackCount = item.ownership === 'stackable' ? ownership.getStack(item.id) : 0;
  const oneshotCount = item.ownership === 'oneshot' ? ownership.getConsumable(item.id) : 0;
  const activeBuff   = item.ownership === 'timed' ? ownership.activeBuffs.find(b => b.id === item.id) : null;

  return (
    <div className={`bls-item bls-item-${state}`}>
      <div className="bls-item-icon">{item.icon}</div>
      <div className="bls-item-body">
        <div className="bls-item-name">
          {item.name}
          {stackCount > 0 && <span className="bls-item-tag">×{stackCount}</span>}
          {oneshotCount > 0 && <span className="bls-item-tag">×{oneshotCount}</span>}
          {activeBuff && <BuffCountdown expiresAtMs={activeBuff.expiresAtMs} />}
        </div>
        <div className="bls-item-desc">{item.desc}</div>
      </div>
      <button
        type="button"
        className="bls-item-buy"
        onClick={() => onBuy(item.id)}
        disabled={disabled}
      >
        {label}
      </button>
    </div>
  );
}

/**
 * Blood Lotus Spend Shop — modal where players SPEND their Blood Lotus
 * on buffs, consumables, and QoL. The IAP "buy more Blood Lotus" flow
 * is a separate modal reached via the "Need more? Top up" button at
 * the bottom of this one.
 *
 * Tab row mirrors the Progress Hub chip pattern (.ach-tabs/.ach-tab)
 * for visual consistency.
 */
export default function BloodLotusSpendShopModal({
  inventory,
  balance,
  onClose,
  onOpenTopUp,
}) {
  const [tab, setTab] = useState('buff');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null); // { msg, kind: 'ok' | 'err' }

  const itemsByCategory = useMemo(() => {
    const out = new Map();
    for (const cat of SHOP_CATEGORIES) out.set(cat.id, []);
    for (const item of SHOP_ITEMS) out.get(item.category)?.push(item);
    return out;
  }, []);

  // Auto-clear the flash banner after 2.5s so it doesn't pile up.
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(id);
  }, [flash]);

  const handleBuy = (itemId) => {
    if (busy) return;
    setBusy(true);
    const result = inventory.purchase(itemId);
    setBusy(false);
    if (result.ok) {
      const item = SHOP_ITEMS_BY_ID[itemId];
      setFlash({ msg: `Purchased: ${item?.name ?? itemId}`, kind: 'ok' });
    } else {
      setFlash({ msg: result.error ?? 'Purchase failed', kind: 'err' });
    }
  };

  const items = itemsByCategory.get(tab) ?? [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bls-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="bls-header">
          <img
            src={`${BASE}sprites/items/blood_lotus.png`}
            className="bls-header-icon"
            alt=""
            draggable="false"
          />
          <span className="bls-header-title">Blood Lotus Shop</span>
          <span className="bls-header-balance">
            {balance.toLocaleString()} <span className="bls-header-balance-suffix">BL</span>
          </span>
        </div>

        <div className="ach-tabs bls-tabs">
          {SHOP_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`ach-tab${tab === cat.id ? ' ach-tab-active' : ''}`}
              onClick={() => setTab(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {flash && (
          <div className={`bls-flash bls-flash-${flash.kind}`}>{flash.msg}</div>
        )}

        <div className="bls-body">
          {items.length === 0 ? (
            <div className="bls-empty">
              {tab === 'cosmetic'
                ? 'Cosmetic skins and particle sets arrive in a future update.'
                : 'Nothing here yet.'}
            </div>
          ) : (
            items.map(item => (
              <ShopItemRow
                key={item.id}
                item={item}
                ownership={inventory}
                balance={balance}
                onBuy={handleBuy}
                busy={busy}
              />
            ))
          )}
        </div>

        <button
          type="button"
          className="bls-topup"
          onClick={onOpenTopUp}
        >
          Need more Blood Lotus? <span className="bls-topup-cta">Top Up</span>
        </button>
      </div>
    </div>
  );
}
